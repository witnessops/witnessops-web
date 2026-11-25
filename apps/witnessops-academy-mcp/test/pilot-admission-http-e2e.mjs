// Real HTTP/MCP pilot admission, synthetic disposable users only. No operational endpoints.
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import path from 'node:path';
import { env, secret, int } from '../src/env.mjs';

if (process.env.ACADEMY_E2E !== '1' || process.env.ACADEMY_INVITATIONS_DISPOSABLE !== '1' || process.env.ACADEMY_ACCESS_POLICY !== 'approved-free-pilot') {
  throw new Error('Explicit disposable approved-free-pilot profile required');
}

if (!['127.0.0.1', 'localhost', '::1'].includes(env('ACADEMY_DB_HOST'))) throw new Error('Disposable loopback database required');
const MCP = env('MCP_TEST_URL', env('MCP_RESOURCE_URL', 'http://127.0.0.1:18500/mcp'));
const ISS = env('ACADEMY_OIDC_ISSUER').replace(/\/$/, '');
const REDIRECT = env('MCP_TEST_REDIRECT_URI', 'http://127.0.0.1:18599/callback');
const LESSON = 'report-or-evidence';
const CLIENT_ID = env('MCP_TEST_CLIENT_ID', env('MCP_CLIENT_ID', 'academy-mcp-client'));
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
const SECRET_VALUES = [PW.a, PW.b, PW.c, PGADMIN_PW, MCP_DB_PW];
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


const operator = new pg.Pool({ host: DBH, port: DBP, database: DBN, user: PGADMIN, password: PGADMIN_PW });
const runtime = new pg.Pool({ host: DBH, port: DBP, database: DBN, user: env('ACADEMY_DB_USER'), password: secret('ACADEMY_DB_PASSWORD') });
const clients = [];
const invitations = [];
const obj = response => response.structuredContent || JSON.parse(response.content[0].text);
const cases = [
 ['list_lessons', {}],
 ['get_lesson', { lesson_id: LESSON }],
 ['get_my_answer', { lesson_id: LESSON }],
 ['save_answer', { lesson_id: LESSON, text: 'synthetic denied write', expected_version: 0 }],
 ['start_lesson', { lesson_id: LESSON }],
 ['inspect_evidence', { lesson_id: LESSON }],
 ['submit_decision', { lesson_id: LESSON, step_id: 'judgment', option_id: 'created_recovery_unverified', expected_version: 0, request_id: '00000000-0000-4000-8000-000000000001' }],
 ['resume_lesson', { lesson_id: LESSON }],
 ['get_progress', { lesson_id: LESSON }],
];
const { createInvitationBatch, redeemInvitation, revokeFreeGrant } = await import('../../witnessops-academy-server/src/pilot-invitations.mjs');
let failed = false;
function pass(name) { results.push({ name, result: 'PASS' }); console.log('PASS MCP pilot ' + name); }
async function connect(user) {
  const token = (await login(user)).access_token;
  const client = new Client({ name: 'academy-pilot-admission-test', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(MCP), { requestInit: { headers: { authorization: `Bearer ${token}` } } });
  await client.connect(transport); clients.push(client);
  // A tool call creates the server-selected identity even if admission is denied.
  const denial = await client.callTool({ name: 'list_lessons', arguments: {} });
  assert.equal(denial.isError, true); assert.equal(obj(denial).error, 'access_required');
  const identity = (await operator.query('SELECT id, issuer, subject FROM academy_identities WHERE issuer=$1 AND subject=$2', [ISS, payload(token).sub])).rows[0];
  assert.ok(identity); return { client, identity };
}
async function denied(session) {
 for (const [name, args] of cases) {
  const result = await session.client.callTool({ name, arguments: args });
  assert.equal(result.isError, true); assert.deepEqual(obj(result), { error: 'access_required', status: 403 });
 }
}
try {
 const a = await connect('a'), b = await connect('b');
 const before = (await operator.query('SELECT owner_id,lesson_id,content,version FROM academy_lesson_drafts WHERE owner_id=ANY($1::uuid[]) ORDER BY owner_id,lesson_id', [[a.identity.id, b.identity.id]])).rows;
 await denied(a); await denied(b);
 assert.deepEqual((await operator.query('SELECT owner_id,lesson_id,content,version FROM academy_lesson_drafts WHERE owner_id=ANY($1::uuid[]) ORDER BY owner_id,lesson_id', [[a.identity.id, b.identity.id]])).rows, before);
 pass('valid OAuth sign-in without a grant denies all nine tools and preserves saved work');
 const refs = { approvalReference: 'synthetic-owner-approved-free-mcp-test', administratorReference: 'synthetic-mcp-test-operator' };
 const batch = await createInvitationBatch(operator, { ...refs, recipients: [a.identity,b.identity].map(({issuer,subject}) => ({issuer,subject})) });
 invitations.push(...batch.invitations.map(item => item.invitationId));
 for (const [index, session] of [a,b].entries()) assert.equal((await redeemInvitation(runtime, { token: batch.invitations[index].token, identityId: session.identity.id })).accepted, true);
 for (const session of [a,b]) {
  assert.equal(obj(await session.client.callTool({ name:'list_lessons', arguments:{} })).lessons[0].id, LESSON);
  assert.equal(obj(await session.client.callTool({ name:'get_lesson', arguments:{ lesson_id: LESSON } })).lesson.title, 'Report or evidence?');
 }
 pass('approved grants unlock existing MCP sessions and current allowed curriculum');
 const contents = [];
 for (const [index, session] of [a,b].entries()) {
  const prior = obj(await session.client.callTool({ name:'get_my_answer', arguments:{ lesson_id: LESSON } }));
  const text = 'Synthetic pilot MCP learner ' + index + ' ' + crypto.randomUUID(); contents.push(text);
  assert.equal(obj(await session.client.callTool({ name:'save_answer', arguments:{ lesson_id: LESSON, text, expected_version:prior.version } })).saved, true);
 }
 assert.notEqual(contents[0], contents[1]);
 for (const [index, session] of [a,b].entries()) assert.equal(obj(await session.client.callTool({ name:'get_my_answer', arguments:{ lesson_id: LESSON } })).text, contents[index]);
 const forged = await b.client.callTool({ name:'get_my_answer', arguments:{ lesson_id: LESSON, owner_id:a.identity.id } }); assert.equal(forged.isError, true);
 assert.equal(obj(await a.client.callTool({ name:'get_my_answer', arguments:{ lesson_id: LESSON } })).text, contents[0]);
 pass('approved learners retain separate owner-scoped reads and writes; forged owner rejected');
 await revokeFreeGrant(operator, { identityId:b.identity.id, administratorReference:refs.administratorReference });
 await denied(b);
 assert.equal(obj(await a.client.callTool({ name:'get_my_answer', arguments:{ lesson_id: LESSON } })).text, contents[0]);
 const preserved = (await operator.query('SELECT content FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2', [b.identity.id,LESSON])).rows[0]; assert.equal(preserved.content, contents[1]);
 pass('revocation denies all nine calls on the same MCP session immediately and preserves both learners work');
 await operator.query('REVOKE EXECUTE ON FUNCTION public.academy_has_approved_free_grant(uuid) FROM academy_mcp');
 try {
  for (const [name,args] of cases) {
   const result = await a.client.callTool({ name, arguments:args }); assert.equal(result.isError,true);
   assert.deepEqual(obj(result), { error:'access_unavailable', status:503 });
  }
 } finally { await operator.query('GRANT EXECUTE ON FUNCTION public.academy_has_approved_free_grant(uuid) TO academy_mcp'); }
 assert.equal(obj(await a.client.callTool({ name:'get_my_answer', arguments:{ lesson_id:LESSON } })).text,contents[0]);
 pass('unavailable admission predicate fails all nine tools closed with 503 and recovers without losing work');
 // Exercise the actual MCP process/pool, including more requests than its
 // default five clients. Locks block identity lookup and admission separately.
 for (const relation of ['academy_identities', 'academy_pilot_grants']) {
  const snapshot = (await operator.query(
   'SELECT content,version FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2',
   [a.identity.id, LESSON],
  )).rows[0];
  const blocker = await operator.connect();
  const started = performance.now();
  try {
   await blocker.query('BEGIN');
   await blocker.query(`LOCK TABLE public.${relation} IN ACCESS EXCLUSIVE MODE`);
   const responses = await Promise.all(Array.from({ length: 6 }, (_, index) => {
    const [name, original] = cases[index % cases.length];
    const args = name === 'save_answer'
     ? { lesson_id: LESSON, text: 'Synthetic blocked write must never run', expected_version: snapshot.version }
     : original;
    return a.client.callTool({ name, arguments: args }, undefined, { timeout: 20000 });
   }));
   assert.ok(performance.now() - started < 20000, 'stalled checks must finish within the request budget');
   for (const response of responses) {
    assert.equal(response.isError, true);
    assert.deepEqual(obj(response), { error: 'access_unavailable', status: 503 });
   }
   const blocked = await operator.query(
    `SELECT count(*)::int AS count FROM pg_stat_activity
     WHERE datname=$1 AND usename=$2 AND wait_event_type='Lock'`,
    [DBN, MCP_DB_USER],
   );
   assert.equal(blocked.rows[0].count, 0, 'timed-out queries must not retain blocked connections');
  } finally {
   await blocker.query('ROLLBACK');
   blocker.release();
  }
  const recovered = await Promise.all(Array.from({ length: 6 }, () =>
   a.client.callTool({ name: 'get_my_answer', arguments: { lesson_id: LESSON } }),
  ));
  for (const response of recovered) {
   assert.notEqual(response.isError, true);
   assert.equal(obj(response).text, snapshot.content);
   assert.equal(obj(response).version, snapshot.version);
  }
  assert.deepEqual((await operator.query(
   'SELECT content,version FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2',
   [a.identity.id, LESSON],
  )).rows[0], snapshot, 'timed-out checks must not invoke a delayed save');
  pass(`stalled ${relation} checks return bounded 503, release capacity and retain saved work`);
 }
} catch (error) { failed = true; console.error(redactText(error.stack)); process.exitCode = 1; }
finally {
 for (const client of clients) await client.close().catch(() => {});
 if (invitations.length) {
  await operator.query('DELETE FROM academy_pilot_grants WHERE invitation_id=ANY($1::uuid[])', [invitations]);
  await operator.query('DELETE FROM academy_pilot_invitations WHERE id=ANY($1::uuid[])', [invitations]);
 }
 await runtime.end(); await operator.end();
 fs.writeFileSync(path.join(EV, 'pilot-mcp-admission-http-results.json'), JSON.stringify({ scope:'disposable real Keycloak/PostgreSQL/MCP HTTP', results, failed }, null, 2));
}
console.log(`RESULT MCP pilot ${results.length}/7 PASS`);
if (results.length !== 7) process.exitCode = 1;
