// End-to-end MCP tests, synthetic users only. Authorization code + PKCE S256.
// Not part of `pnpm academy:test` or `pnpm health`. Run only with ACADEMY_E2E=1.
// A6b records what a still-valid token does after the user is re-enabled.
// C2 is the change that makes that status 401.
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import http from 'node:http';
import * as jose from 'jose';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, secret, int } from '../src/env.mjs';

if (process.env.ACADEMY_E2E !== '1') {
  console.log('academy mcp e2e skipped; set ACADEMY_E2E=1 to run against disposable Postgres and Keycloak');
  process.exit(0);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MCP = env('MCP_TEST_URL', env('MCP_RESOURCE_URL', 'http://127.0.0.1:18500/mcp'));
const MU = new URL(MCP);
const BASE = MU.origin;
const ISS = env('ACADEMY_OIDC_ISSUER').replace(/\/$/, '');
const REDIRECT = env('MCP_TEST_REDIRECT_URI', 'http://127.0.0.1:18599/callback');
const LESSON = 'report-or-evidence';
const AS_META = `${new URL(ISS).origin}/.well-known/oauth-authorization-server${new URL(ISS).pathname}`;
const CLIENT_ID = env('MCP_TEST_CLIENT_ID', env('MCP_CLIENT_ID', 'academy-mcp-client'));
const WRONG_CLIENT = env('MCP_TEST_WRONGAUD_CLIENT_ID', 'academy-mcp-wrongaud');
const LISTEN_PORT = int('MCP_PORT', Number(MU.port || 443));
const USERS = {
  a: env('TEST_MCP_LEARNER_A_USERNAME', 'mcp-learner-a'),
  b: env('TEST_MCP_LEARNER_B_USERNAME', 'mcp-learner-b'),
  c: env('TEST_MCP_LEARNER_C_USERNAME', 'mcp-learner-c'),
};
const PW = {
  a: secret('TEST_MCP_LEARNER_A_PASSWORD'),
  b: secret('TEST_MCP_LEARNER_B_PASSWORD'),
  c: secret('TEST_MCP_LEARNER_C_PASSWORD'),
};
const PGADMIN = env('ACADEMY_TEST_PGADMIN_USER', 'postgres');
const PGADMIN_PW = secret('ACADEMY_TEST_PGADMIN_PASSWORD');
const MCP_DB_USER = env('ACADEMY_MCP_DB_USER', 'academy_mcp');
const MCP_DB_PW = secret('ACADEMY_MCP_DB_PASSWORD');
const DBH = env('ACADEMY_DB_HOST', '127.0.0.1');
const DBP = int('ACADEMY_DB_PORT', 5432);
const DBN = env('ACADEMY_DB_NAME', 'academy');
const KC_SCRIPT = path.join(HERE, '../keycloak/kc_mcp_setup.py');
const EXPECTED = ['M1', 'M2', 'M3', 'A1', 'M4', 'A2', 'A3a', 'A4', 'A5', 'A6', 'A6b', 'A7', 'M5', 'A3b'];
const SECRET_VALUES = [PW.a, PW.b, PW.c, PGADMIN_PW, MCP_DB_PW];
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const EV = env('MCP_TEST_EVIDENCE_DIR', path.join(os.tmpdir(), 'academy-mcp-evidence'));
fs.mkdirSync(EV, { recursive: true });
const results = [];
const trace = [];
const stamp = () => new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' }) + ' CET';

function redactText(value) {
  let out = String(value);
  for (const secretValue of SECRET_VALUES) {
    if (secretValue && secretValue.length >= 8) out = out.split(secretValue).join('[REDACTED]');
  }
  return out.replace(new RegExp('ey' + 'J' + '[A-Za-z0-9_-]{8,}', 'g'), '[REDACTED]');
}
function log(entry) { trace.push({ t: stamp(), ...entry }); }
function check(id, name, ok, detail = {}) {
  const row = { id, name, result: ok ? 'PASS' : 'FAIL', detail };
  results.push(row);
  console.log(redactText(`${row.result} ${id} ${name} ${JSON.stringify(detail)}`));
}
const kc = (...args) => execFileSync('python3', [KC_SCRIPT, ...args], { encoding: 'utf8' }).trim();
const payload = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url'));

class Browser {
  constructor() { this.jar = new Map(); }
  async req(method, target, body) {
    const host = new URL(target).host;
    const headers = {};
    const jar = this.jar.get(host) || {};
    if (Object.keys(jar).length) headers.cookie = Object.entries(jar).map(([key, value]) => `${key}=${value}`).join('; ');
    if (body) headers['content-type'] = 'application/x-www-form-urlencoded';
    const response = await fetch(target, { method, headers, body, redirect: 'manual' });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0];
      const splitAt = pair.indexOf('=');
      jar[pair.slice(0, splitAt)] = pair.slice(splitAt + 1);
    }
    this.jar.set(host, jar);
    const text = await response.text();
    log({ ev: 'auth_http', method, path: new URL(target).pathname, status: response.status });
    return { r: response, text };
  }
}

async function login(user = 'a', clientId = CLIENT_ID, { disabled = false } = {}) {
  const browser = new Browser();
  const verifier = crypto.randomBytes(32).toString('base64url');
  const state = crypto.randomBytes(20).toString('base64url');
  const url = new URL(`${ISS}/protocol/openid-connect/auth`);
  const scope = clientId === CLIENT_ID ? 'openid academy-mcp' : 'openid';
  for (const [key, value] of Object.entries({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT,
    scope,
    state,
    code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
    resource: MCP,
    prompt: 'login',
  })) url.searchParams.set(key, value);
  let text = (await browser.req('GET', url)).text;
  const action = text.match(/id="kc-form-login"[^>]*action="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&');
  assert(action, 'Keycloak login form');
  const posted = await browser.req('POST', action, new URLSearchParams({ username: USERS[user], password: PW[user], credentialId: '' }));
  const r = posted.r;
  text = posted.text;
  if (disabled) {
    return { disabled: !r.headers.get('location') && /Account is disabled|account is disabled/i.test(text), status: r.status };
  }
  const location = r.headers.get('location');
  assert(location?.startsWith(REDIRECT), `login failed (${r.status})`);
  const callback = new URL(location);
  assert.equal(callback.searchParams.get('state'), state);
  assert.equal(callback.searchParams.get('iss'), ISS);
  const tokenResponse = await fetch(`${ISS}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: REDIRECT,
      code: callback.searchParams.get('code'),
      code_verifier: verifier,
      resource: MCP,
    }),
  });
  const body = await tokenResponse.json();
  assert.equal(tokenResponse.status, 200, `token exchange ${tokenResponse.status}`);
  log({
    ev: 'pkce_auth_complete',
    user,
    clientId,
    token_lifetime_s: body.expires_in,
    signature_alg: JSON.parse(Buffer.from(body.access_token.split('.')[0], 'base64url')).alg,
  });
  return body;
}

const clients = [];
async function connect(token) {
  const client = new Client({ name: 'academy-mcp-test', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(MCP), {
    requestInit: { headers: { authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  clients.push(client);
  log({ ev: 'mcp_initialize', status: 'ok', session_hash: hash(transport.sessionId).slice(0, 16) });
  return { c: client, t: transport, token };
}
async function call(session, name, args = {}) {
  const response = await session.c.callTool({ name, arguments: args });
  log({
    ev: 'tools/call',
    name,
    isError: response.isError === true,
    result_fields: response.structuredContent ? Object.keys(response.structuredContent) : [],
    status: response.structuredContent?.status,
  });
  return response;
}
const obj = (response) => response.structuredContent || JSON.parse(response.content[0].text);
async function raw(token, body, sessionId) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-11-25',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  if (sessionId) headers['mcp-session-id'] = sessionId;
  const response = await fetch(MCP, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await response.text();
  log({ ev: 'mcp_raw', method: body.method, status: response.status, challenge: response.headers.get('www-authenticate') });
  return { r: response, text };
}
async function query(sql, args = []) {
  const client = new pg.Client({ host: DBH, port: DBP, database: DBN, user: PGADMIN, password: PGADMIN_PW });
  await client.connect();
  try { return (await client.query(sql, args)).rows; } finally { await client.end(); }
}
const init = {
  jsonrpc: '2.0',
  id: 90,
  method: 'initialize',
  params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'probe', version: '1' } },
};

try {
  const meta = await (await fetch(`${BASE}/.well-known/oauth-protected-resource/mcp`)).json();
  const authorizationServer = await (await fetch(AS_META)).json();
  check('M1', 'RFC 9728 resource + RFC 8414 authorization-server discovery', meta.resource === MCP && meta.authorization_servers.includes(ISS) && authorizationServer.issuer === ISS && authorizationServer.code_challenge_methods_supported.includes('S256'), { resource: meta.resource, issuer: authorizationServer.issuer });

  const learnerC = await login('c');
  const learnerCClaims = payload(learnerC.access_token);
  const learnerA = await login('a');
  const learnerB = await login('b');
  const sessionA = await connect(learnerA.access_token);
  const sessionB = await connect(learnerB.access_token);
  const tools = await sessionA.c.listTools();
  check('M2', 'initialize + tools/list', tools.tools.map((tool) => tool.name).sort().join(',') === 'get_lesson,get_my_answer,list_lessons,save_answer', {
    names: tools.tools.map((tool) => tool.name),
    schemasStrict: tools.tools.every((tool) => tool.inputSchema.additionalProperties === false),
  });
  const lessons = obj(await call(sessionA, 'list_lessons'));
  const lesson = obj(await call(sessionA, 'get_lesson', { lesson_id: LESSON }));
  check('M3', 'curriculum via tools/call', lessons.lessons[0].id === LESSON && lesson.lesson.title === 'Report or evidence?' && Boolean(lesson.lesson.exercise.artifacts), { title: lesson.lesson.title });

  const before = obj(await call(sessionA, 'get_my_answer', { lesson_id: LESSON }));
  const text = JSON.stringify({
    claims: [
      { label: 'Evidenced', reason: 'A shows completion at 02:07:51 UTC.' },
      { label: 'Contradicted', reason: 'B is the complete manifest for the same run and lists two, not three.' },
      { label: 'Only claimed', reason: 'C supplies no restore log.' },
    ],
    limit: 'Fictional lesson. No proof of restore. Unicode: Zażółć gęślą jaźń — 📘\r\nTrailing spaces  \n',
  });
  const saved = obj(await call(sessionA, 'save_answer', { lesson_id: LESSON, text, expected_version: before.version }));
  await sessionA.t.terminateSession();
  await sessionA.c.close();
  const fresh = await login('a');
  const sessionA2 = await connect(fresh.access_token);
  const reread = obj(await call(sessionA2, 'get_my_answer', { lesson_id: LESSON }));
  check('A1', 'save → end MCP session → fresh PKCE login/token → exact bytes', saved.saved === true && fresh.access_token !== learnerA.access_token && Buffer.from(reread.text).equals(Buffer.from(text)), {
    bytes: Buffer.byteLength(text),
    sha256: hash(text),
    version: reread.version,
    fresh_token: true,
  });
  const learnerASubject = payload(fresh.access_token).sub;
  const identities = await query('SELECT id FROM academy_identities WHERE issuer=$1 AND subject=$2', [ISS, learnerASubject]);
  const owner = identities[0].id;
  const row = await query('SELECT content,version FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2', [owner, LESSON]);
  check('M4', 'same PostgreSQL row as lesson app (issuer/sub mapping)', row[0].content === text && row[0].version === reread.version, {
    db: DBN,
    table: 'academy_lesson_drafts',
    owner_source: 'validated (iss,sub)',
  });

  const beforeB = obj(await call(sessionB, 'get_my_answer', { lesson_id: LESSON }));
  const probes = [];
  for (const [kind, forged] of [
    ['A identity uuid', { owner_id: owner }],
    ['A sub', { sub: learnerASubject }],
    ['A identity uuid', { id: owner }],
    ['A sub', { owner_id: learnerASubject }],
    ['A sub', { subject: learnerASubject }],
  ]) {
    const readForged = await call(sessionB, 'get_my_answer', { lesson_id: LESSON, ...forged });
    const writeForged = await call(sessionB, 'save_answer', {
      lesson_id: LESSON,
      text: 'B forged overwrite',
      expected_version: reread.version,
      ...forged,
    });
    probes.push({ fields: Object.keys(forged), value: kind, get_error: readForged.isError === true, save_error: writeForged.isError === true });
  }
  const cross = await raw(learnerB.access_token, {
    jsonrpc: '2.0',
    id: 94,
    method: 'tools/call',
    params: { name: 'get_my_answer', arguments: { lesson_id: LESSON } },
  }, sessionA2.t.sessionId);
  const afterB = obj(await call(sessionB, 'get_my_answer', { lesson_id: LESSON }));
  const afterA = obj(await call(sessionA2, 'get_my_answer', { lesson_id: LESSON }));
  check('A2', 'B cannot read/overwrite A incl forged owner UUID/sub and A session', probes.every((probe) => probe.get_error && probe.save_error) && afterB.text === beforeB.text && afterA.text === text && cross.r.status === 404, {
    probes,
    b_has_own_answer: beforeB.found,
    b_unchanged: afterB.text === beforeB.text,
    a_sha256: hash(afterA.text),
    cross_session_status: cross.r.status,
  });

  const missing = await raw(null, init);
  const wrong = await login('a', WRONG_CLIENT);
  const wrongResponse = await raw(wrong.access_token, init);
  const parts = fresh.access_token.split('.');
  parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
  const tampered = await raw(parts.join('.'), init);
  const [header, , signature] = fresh.access_token.split('.');
  const swappedPayload = Buffer.from(JSON.stringify({ ...payload(fresh.access_token), sub: payload(learnerB.access_token).sub })).toString('base64url');
  const swapped = await raw([header, swappedPayload, signature].join('.'), init);
  const none = await raw([Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'), fresh.access_token.split('.')[1], ''].join('.'), init);
  const kid = JSON.parse(Buffer.from(header, 'base64url')).kid;
  const { privateKey } = await jose.generateKeyPair('RS256');
  const forgedJwt = await new jose.SignJWT(payload(fresh.access_token)).setProtectedHeader({ alg: 'RS256', kid, typ: 'JWT' }).sign(privateKey);
  const foreign = await raw(forgedJwt, init);
  const idToken = await raw(fresh.id_token, init);
  const garbage = await raw('not-a-jwt', init);
  const bad = {
    missing,
    wrong_audience: wrongResponse,
    tampered_signature: tampered,
    payload_sub_swapped: swapped,
    alg_none: none,
    foreign_key_same_kid: foreign,
    id_token_as_bearer: idToken,
    garbage,
  };
  check('A3a', 'missing, wrong-audience, tampered/forged tokens → 401 + WWW-Authenticate', Object.values(bad).every((item) => item.r.status === 401 && item.r.headers.get('www-authenticate')?.includes('resource_metadata=')), {
    ...Object.fromEntries(Object.entries(bad).map(([key, item]) => [key, item.r.status])),
    wrong_token_aud: payload(wrong.access_token).aud || null,
    missing_challenge: missing.r.headers.get('www-authenticate'),
  });

  const win = obj(await call(sessionA2, 'save_answer', { lesson_id: LESSON, text, expected_version: reread.version }));
  const stale = await call(sessionA2, 'save_answer', { lesson_id: LESSON, text: 'STALE MUST NOT WIN', expected_version: reread.version });
  const conflict = obj(stale);
  const afterConflict = obj(await call(sessionA2, 'get_my_answer', { lesson_id: LESSON }));
  check('A4', 'version conflict is MCP tool error with status 409, row unchanged', stale.isError === true && conflict.status === 409 && conflict.current_version === win.version && afterConflict.text === text, {
    ...conflict,
    http_note: 'MCP tools/call HTTP 200; tool error carries status 409 (MCP convention)',
  });

  const max = 'ą'.repeat(16384);
  const boundary = obj(await call(sessionA2, 'save_answer', { lesson_id: LESSON, text: max, expected_version: win.version }));
  const over = await call(sessionA2, 'save_answer', { lesson_id: LESSON, text: max + 'a', expected_version: boundary.version });
  const overAscii = await call(sessionA2, 'save_answer', { lesson_id: LESSON, text: 'x'.repeat(32769), expected_version: boundary.version });
  const afterOver = obj(await call(sessionA2, 'get_my_answer', { lesson_id: LESSON }));
  const restored = obj(await call(sessionA2, 'save_answer', { lesson_id: LESSON, text, expected_version: afterOver.version }));
  check('A5', '32 KiB UTF-8 boundary accepted; 32769 rejected; no overwrite', boundary.saved === true && obj(over).status === 413 && obj(overAscii).status === 413 && afterOver.text === max && restored.saved === true, {
    boundary_bytes: Buffer.byteLength(max),
    over_bytes: 32769,
    over_status: obj(over).status,
    ascii_status: obj(overAscii).status,
    restored_version: restored.version,
  });

  kc('disable', USERS.b);
  try {
    const disabled = await login('b', CLIENT_ID, { disabled: true });
    const existing = await raw(learnerB.access_token, init);
    const refresh = await fetch(`${ISS}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        refresh_token: learnerB.refresh_token,
        resource: MCP,
      }),
    });
    const refreshBody = await refresh.json();
    check('A6', 'disabled user: new auth + refresh refused; existing token introspection denies', disabled.disabled && refresh.status === 400 && existing.r.status === 401, {
      login_form_disabled: disabled.disabled,
      refresh_status: refresh.status,
      refresh_error: refreshBody.error,
      existing_token_status: existing.r.status,
      jwt_lifetime_s: payload(learnerB.access_token).exp - payload(learnerB.access_token).iat,
      introspection: 'per request; no cache; fail closed',
      clock_tolerance_s: 5,
    });
  } finally {
    kc('enable', USERS.b);
  }
  const reenabled = await raw(learnerB.access_token, init);
  const secondsLeft = payload(learnerB.access_token).exp - Math.floor(Date.now() / 1000);
  check('A6b', 'observation: old token after user is RE-enabled (still within exp)', true, {
    status: reenabled.r.status,
    seconds_left_before_exp: secondsLeft,
    note: 'disable does not by itself end Keycloak sessions; if 200, an un-expired token revives on re-enable',
  });

  const sockets = execFileSync('ss', ['-ltnp'], { encoding: 'utf8' }).split('\n');
  const ours = sockets.filter((line) => new RegExp(`:${LISTEN_PORT}\\b`).test(line));
  fs.writeFileSync(`${EV}/mcp-listeners.txt`, `${stamp()}\n${ours.join('\n')}\n`);
  const bind = env('MCP_HOST', '127.0.0.1');
  check('A7', `MCP listens only on ${bind}:${LISTEN_PORT}`, ours.length === 1 && ours[0].includes(`${bind}:${LISTEN_PORT}`), { listeners: ours });
  const origin = await fetch(MCP, {
    method: 'POST',
    headers: {
      Origin: 'https://evil.invalid',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fresh.access_token}`,
    },
    body: JSON.stringify(init),
  });
  const badHost = {
    status: await new Promise((resolve, reject) => {
      http.get({
        host: env('MCP_HOST', '127.0.0.1'),
        port: LISTEN_PORT,
        path: '/healthz',
        headers: { Host: `evil.invalid:${LISTEN_PORT}` },
      }, (response) => { response.resume(); resolve(response.statusCode); }).on('error', reject);
    }),
  };
  check('M5', 'DNS rebinding / foreign Origin denied', origin.status === 403 && badHost.status === 421, {
    foreign_origin: origin.status,
    foreign_host: badHost.status,
  });

  const waitMs = Math.max(0, (learnerCClaims.exp + 6) * 1000 - Date.now());
  console.log(`Waiting ${Math.ceil(waitMs / 1000)}s for a real Keycloak token to expire.`);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  const expired = await raw(learnerC.access_token, init);
  check('A3b', 'real signed Keycloak token expired → 401', expired.r.status === 401 && expired.r.headers.get('www-authenticate')?.includes('invalid_token'), {
    status: expired.r.status,
    token_lifetime_s: learnerCClaims.exp - learnerCClaims.iat,
    waited_s: Math.ceil(waitMs / 1000),
    seconds_past_exp: Math.floor(Date.now() / 1000) - learnerCClaims.exp,
  });
} catch (error) {
  check('HARNESS', 'uncaught error', false, {
    name: error.name,
    message: redactText(error.message),
    stack: redactText(error.stack || '').split('\n').slice(0, 6).join('\n'),
  });
} finally {
  for (const client of clients) {
    try { await client.close(); } catch { /* the session may already be closed */ }
  }
  fs.writeFileSync(`${EV}/mcp-results.json`, redactText(JSON.stringify({ run_at: stamp(), results }, null, 2)));
  fs.writeFileSync(`${EV}/mcp-trace.jsonl`, trace.map((entry) => redactText(JSON.stringify(entry))).join('\n') + '\n');
}

const passed = results.filter((row) => row.result === 'PASS').length;
console.log(`RESULT: ${passed}/${results.length} PASS`);
if (passed !== EXPECTED.length || results.map((row) => row.id).join(',') !== EXPECTED.join(',')) process.exitCode = 1;

async function denied(client, sql) {
  try {
    await client.query(sql);
    return false;
  } catch (error) {
    return error.code === '42501';
  }
}

const health = await (await fetch(`${BASE}/healthz`)).json();
if (health?.ok !== true || Object.keys(health).join(',') !== 'ok') {
  console.log(`FAIL healthz is not status only (${Object.keys(health).join(',')})`);
  process.exitCode = 1;
} else {
  console.log('PASS healthz is status only');
}
const bare = await fetch(`${BASE}/.well-known/oauth-protected-resource`);
await bare.body?.cancel();
if (bare.status !== 404) {
  console.log(`FAIL bare protected-resource metadata status ${bare.status}`);
  process.exitCode = 1;
} else {
  console.log('PASS bare protected-resource metadata is not served');
}

const reconcileSql = fs.readFileSync(path.join(HERE, '../../witnessops-academy-server/db/reconcile-academy-mcp.sql'), 'utf8');
const admin = new pg.Client({ host: DBH, port: DBP, database: DBN, user: PGADMIN, password: PGADMIN_PW });
const roleClient = new pg.Client({
  host: DBH,
  port: DBP,
  database: DBN,
  user: MCP_DB_USER,
  password: MCP_DB_PW,
});
try {
  await admin.connect();
  await admin.query('GRANT SELECT ON academy_sessions TO academy_mcp');
  await admin.query('GRANT DELETE ON academy_lesson_drafts TO academy_mcp');
  await admin.query('GRANT CREATE ON SCHEMA public TO academy_mcp');
  await admin.query(reconcileSql);
  await admin.query(reconcileSql);
  await roleClient.connect();
  await roleClient.query('SELECT id FROM academy_identities LIMIT 0');
  await roleClient.query('SELECT content FROM academy_lesson_drafts LIMIT 0');
  const roleChecks = {
    select_session: await denied(roleClient, 'SELECT token_hash FROM academy_sessions LIMIT 0'),
    delete_draft: await denied(roleClient, 'DELETE FROM academy_lesson_drafts'),
    drop: await denied(roleClient, 'DROP TABLE academy_lesson_drafts'),
    create: await denied(roleClient, 'CREATE TABLE academy_mcp_should_not (id integer)'),
    delete_session: await denied(roleClient, 'DELETE FROM academy_sessions'),
    insert_session: await denied(roleClient, 'INSERT INTO academy_sessions(token_hash, identity_id, csrf_token, expires_at) VALUES (\'x\', gen_random_uuid(), \'x\', now())'),
  };
  if (Object.values(roleChecks).every(Boolean)) {
    console.log('PASS academy_mcp allowlist survived a pre-existing overgrant');
  } else {
    console.log(`FAIL academy_mcp privilege probe ${JSON.stringify(roleChecks)}`);
    process.exitCode = 1;
  }
} catch (error) {
  console.log(redactText(`FAIL academy_mcp privilege probe ${error.message}`));
  process.exitCode = 1;
} finally {
  await roleClient.end().catch(() => {});
  await admin.end().catch(() => {});
}
