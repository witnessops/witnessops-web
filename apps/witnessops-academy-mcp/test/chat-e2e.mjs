// Real HTTP/MCP chat continuity against the existing disposable Keycloak and
// PostgreSQL fixture. Run sequentially after test/e2e.mjs, before pilot admission.
// Only TEST_MCP_LEARNER_A/B are used. All learner writes go through the servers;
// direct SQL observes rows/roles only. No stored worksheet or chat row is deleted.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { env, secret, int } from '../src/env.mjs';

const execFileAsync = promisify(execFile);

if (process.env.ACADEMY_E2E !== '1') {
  throw new Error('ACADEMY_E2E=1 is required; acceptance must not pass without the disposable run');
}
if (process.env.ACADEMY_CHAT_DISPOSABLE !== '1' || process.env.ACADEMY_ACCESS_POLICY !== 'session-only') {
  throw new Error('Explicit disposable session-only chat profile required');
}
if (!process.versions.node.startsWith('22.')) throw new Error('Node 22 is required for this acceptance');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = env('ACADEMY_TEST_APP_URL', env('ACADEMY_PUBLIC_ORIGIN')).replace(/\/$/, '');
const MCP = env('MCP_TEST_URL', env('MCP_RESOURCE_URL'));
const ISSUER = env('ACADEMY_OIDC_ISSUER').replace(/\/$/, '');
const REDIRECT = env('MCP_TEST_REDIRECT_URI', 'http://127.0.0.1:18599/callback');
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
for (const value of [APP, MCP, ISSUER, REDIRECT]) {
  const url = new URL(value);
  if (!LOOPBACK.has(url.hostname) || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Loopback-only disposable URLs without credentials or queries are required');
  }
}
if (new URL(APP).origin !== APP || new URL(MCP).pathname !== '/mcp') throw new Error('Unexpected disposable app or MCP route');
const DB_HOST = env('ACADEMY_DB_HOST');
if (!LOOPBACK.has(DB_HOST)) throw new Error('Disposable loopback PostgreSQL is required');
const DB_NAME = env('ACADEMY_DB_NAME');
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(DB_NAME)) throw new Error('Invalid disposable database name');
const DB_PORT = int('ACADEMY_DB_PORT', 5432);
const CI_ENV = fs.realpathSync(env('ACADEMY_CI_ENV'));
const APP_RESTART = fs.realpathSync(path.join(HERE, '../../witnessops-academy-server/test/restart-app.sh'));
const MCP_RESTART = fs.realpathSync(path.join(HERE, 'restart-mcp.sh'));
if (fs.realpathSync(env('ACADEMY_TEST_RESTART_APP_CMD')) !== APP_RESTART) throw new Error('Use the existing disposable app restart helper');

// The restart scripts source this file. Check the non-secret fixture bindings as
// well as process.env before any login, write or restart; never print its contents.
function checkPersistedFixture() {
  const lines = fs.readFileSync(CI_ENV, 'utf8').split(/\r?\n/);
  const expected = {
    ACADEMY_E2E: '1', ACADEMY_ACCESS_POLICY: 'session-only',
    ACADEMY_DB_HOST: DB_HOST, ACADEMY_DB_NAME: DB_NAME, ACADEMY_DB_PORT: String(DB_PORT),
    ACADEMY_PUBLIC_ORIGIN: APP, ACADEMY_TEST_APP_URL: APP,
    ACADEMY_OIDC_ISSUER: ISSUER, MCP_RESOURCE_URL: MCP, MCP_TEST_URL: MCP,
  };
  for (const [key, value] of Object.entries(expected)) {
    const matches = lines.filter(line => line.startsWith(`${key}=`));
    if (matches.length !== 1 || matches[0] !== `${key}=${value}`) {
      throw Object.assign(new Error('Persisted disposable fixture differs from the running test profile'), { safeCode: 'persisted_fixture_mismatch' });
    }
  }
}
checkPersistedFixture();

const { default: pg } = await import('pg');
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
const CLIENT_ID = env('MCP_TEST_CLIENT_ID', env('MCP_CLIENT_ID', 'academy-mcp-client'));
const USERS = [
  { username: env('TEST_MCP_LEARNER_A_USERNAME', 'mcp-learner-a'), password: secret('TEST_MCP_LEARNER_A_PASSWORD') },
  { username: env('TEST_MCP_LEARNER_B_USERNAME', 'mcp-learner-b'), password: secret('TEST_MCP_LEARNER_B_PASSWORD') },
];
if (USERS[0].username !== 'mcp-learner-a' || USERS[1].username !== 'mcp-learner-b') throw new Error('Use the two dedicated disposable MCP learners');
const LESSONS = ['report-or-evidence', 'same-scope'];
const EV = env('MCP_TEST_EVIDENCE_DIR', env('ACADEMY_TEST_EVIDENCE_DIR'));
fs.mkdirSync(EV, { recursive: true });
const results = [];
const trace = [];
const clients = [];
const browsers = [];
let stage = 'fixture';
let worksheetBefore;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const jsonHash = value => sha(JSON.stringify(value));
const expectedIds = Array.from({ length: 14 }, (_, index) => `C${index + 1}`);
function requireThat(condition, code) {
  if (!condition) throw Object.assign(new Error(code), { safeCode: code });
}
const same = (left, right, code) => requireThat(isDeepStrictEqual(left, right), code);
const record = (id, name, detail = {}) => {
  results.push({ id, name, result: 'PASS', detail });
  console.log(`PASS MCP-CHAT ${id} ${name}`);
};
const observe = entry => trace.push({ at: new Date().toISOString(), stage, ...entry });
const checkpoint = name => { stage = name; observe({ surface: 'harness', event: 'checkpoint' }); };
const ERROR_NAMES = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError', 'AbortError', 'TimeoutError', 'McpError', 'StreamableHTTPError', 'DatabaseError']);
const ERROR_CODES = new Set([
  'ABORT_ERR', 'EACCES', 'ENOENT', 'EADDRINUSE', 'EAI_AGAIN', 'ENOTFOUND',
  'ECONNABORTED', 'ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT',
  'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_ABORTED', 'UND_ERR_CLOSED', 'UND_ERR_DESTROYED',
  '08001', '08003', '08006', '57P01', '57P02', '57P03', -32602, -32603, -32000,
]);
const errorDiagnostic = error => ({
  error_name: ERROR_NAMES.has(error?.name) ? error.name : 'OtherError',
  error_code: ERROR_CODES.has(error?.code) ? error.code : null,
  cause_code: ERROR_CODES.has(error?.cause?.code) ? error.cause.code : null,
});
const projection = ({ resumed, replay, ...value }) => value;
const evidenceOf = value => value.messages.flatMap(message => message.evidence || []);
const api = lesson => `${APP}/academy/api/lessons/${lesson}/chat`;
const requestFor = (view, choiceId) => ({
  action: 'submit', request_id: crypto.randomUUID(), attempt_id: view.attempt_id,
  expected_version: view.version, stage: view.stage, choice_id: choiceId,
});

const dbConfig = { host: DB_HOST, port: DB_PORT, database: DB_NAME, connectionTimeoutMillis: 5000, query_timeout: 5000, statement_timeout: 5000 };
const admin = new pg.Client({ ...dbConfig, user: env('ACADEMY_TEST_PGADMIN_USER', 'postgres'), password: secret('ACADEMY_TEST_PGADMIN_PASSWORD') });
const appRoleName = env('ACADEMY_DB_USER', 'academy_app');
const mcpRoleName = env('ACADEMY_MCP_DB_USER', 'academy_mcp');
const appRole = new pg.Client({ ...dbConfig, user: appRoleName, password: secret('ACADEMY_DB_PASSWORD') });
const mcpRole = new pg.Client({ ...dbConfig, user: mcpRoleName, password: secret('ACADEMY_MCP_DB_PASSWORD') });
const draftRow = async (db, owner, lesson) => (await db.query(
  'SELECT content, version, last_save_request_id, updated_at FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2',
  [owner, `chat-${lesson}`],
)).rows;
const worksheets = async () => (await admin.query(
  'SELECT owner_id, lesson_id, content, version, last_save_request_id, created_at, updated_at FROM academy_lesson_drafts WHERE lesson_id = ANY($1::text[]) ORDER BY owner_id, lesson_id',
  [LESSONS],
)).rows;

class Browser {
  constructor() { this.jar = new Map(); browsers.push(this); }
  async request(method, value, { body, headers = {} } = {}) {
    const url = new URL(value);
    requireThat([new URL(APP).origin, new URL(ISSUER).origin].includes(url.origin), 'unexpected_login_origin');
    const jar = this.jar.get(url.host) || {};
    const requestHeaders = { ...headers };
    if (Object.keys(jar).length) requestHeaders.cookie = Object.entries(jar).map(([key, item]) => `${key}=${item}`).join('; ');
    const response = await fetch(url, { method, headers: requestHeaders, body, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair, ...attributes] = cookie.split(';');
      const split = pair.indexOf('=');
      const key = pair.slice(0, split);
      if (attributes.some(attribute => /max-age=0/i.test(attribute))) delete jar[key];
      else jar[key] = pair.slice(split + 1);
    }
    this.jar.set(url.host, jar);
    observe({ surface: 'http', method, path: url.pathname, status: response.status });
    return { status: response.status, headers: response.headers, text: await response.text() };
  }
  cookie() { return this.jar.get(new URL(APP).host)?.[APP.startsWith('https:') ? '__Host-academy_sid' : 'academy_sid']; }
  async signIn(user) {
    const entry = await this.request('GET', `${APP}/academy/auth/login`);
    requireThat(entry.status === 302 && entry.headers.has('location'), 'website_login_redirect_missing');
    const authorization = new URL(entry.headers.get('location'));
    requireThat(authorization.origin === new URL(ISSUER).origin && authorization.pathname === `${new URL(ISSUER).pathname}/protocol/openid-connect/auth`, 'website_issuer_mismatch');
    requireThat(authorization.searchParams.get('code_challenge_method') === 'S256' && authorization.searchParams.has('code_challenge'), 'website_pkce_missing');
    const page = await this.request('GET', authorization);
    const posted = await credentialForm(this, page, user);
    requireThat(posted.headers.has('location'), 'website_callback_missing');
    const callback = new URL(posted.headers.get('location'));
    requireThat(callback.origin === APP && callback.pathname === '/academy/auth/callback', 'website_callback_mismatch');
    requireThat(callback.searchParams.get('state') === authorization.searchParams.get('state'), 'website_state_mismatch');
    const returned = await this.request('GET', callback);
    requireThat(returned.status === 302, 'website_callback_rejected');
    const lesson = await this.request('GET', `${APP}/academy/learn/report-or-evidence`);
    requireThat(lesson.status === 200, 'website_lesson_unavailable');
    const csrf = lesson.text.match(/id="academy-csrf">([^<]+)<\/script>/)?.[1];
    requireThat(Boolean(csrf), 'website_csrf_missing');
    this.csrf = JSON.parse(csrf);
    requireThat(typeof this.csrf === 'string' && Boolean(this.cookie()), 'website_session_missing');
    return this;
  }
  async chat(lesson, body) {
    const response = await this.request(body ? 'POST' : 'GET', api(lesson), body ? {
      body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', Origin: APP, 'X-CSRF-Token': this.csrf, 'Sec-Fetch-Site': 'same-origin' },
    } : {});
    return { status: response.status, data: JSON.parse(response.text) };
  }
  async logout() {
    if (!this.csrf || !this.cookie()) return;
    await this.request('POST', `${APP}/academy/auth/logout`, { headers: { Origin: APP, 'X-CSRF-Token': this.csrf } });
  }
}

async function credentialForm(browser, page, user) {
  requireThat(page.status === 200, 'keycloak_login_page_unavailable');
  const action = page.text.match(/id="kc-form-login"[^>]*action="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
  requireThat(Boolean(action), 'keycloak_login_form_missing');
  const target = new URL(action);
  requireThat(target.origin === new URL(ISSUER).origin && target.pathname.startsWith(`${new URL(ISSUER).pathname}/login-actions/`), 'keycloak_form_origin_mismatch');
  return browser.request('POST', target, {
    body: new URLSearchParams({ username: user.username, password: user.password, credentialId: '' }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

async function mcpSignIn(user) {
  const browser = new Browser();
  const verifier = crypto.randomBytes(32).toString('base64url');
  const state = crypto.randomBytes(20).toString('base64url');
  const authorization = new URL(`${ISSUER}/protocol/openid-connect/auth`);
  for (const [key, value] of Object.entries({
    response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT,
    scope: 'openid academy-mcp', state, prompt: 'login', resource: MCP,
    code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
  })) authorization.searchParams.set(key, value);
  const posted = await credentialForm(browser, await browser.request('GET', authorization), user);
  requireThat(posted.headers.has('location'), 'mcp_callback_missing');
  const callback = new URL(posted.headers.get('location'));
  const redirect = new URL(REDIRECT);
  requireThat(callback.origin === redirect.origin && callback.pathname === redirect.pathname, 'mcp_callback_mismatch');
  requireThat(callback.searchParams.get('state') === state && callback.searchParams.get('iss') === ISSUER, 'mcp_state_or_issuer_mismatch');
  const exchanged = await browser.request('POST', `${ISSUER}/protocol/openid-connect/token`, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: CLIENT_ID, redirect_uri: REDIRECT,
      code: callback.searchParams.get('code'), code_verifier: verifier, resource: MCP }),
  });
  requireThat(exchanged.status === 200, 'mcp_token_exchange_rejected');
  const token = JSON.parse(exchanged.text).access_token;
  requireThat(typeof token === 'string', 'mcp_access_token_missing');
  // Decoding is used only to correlate the independently authenticated transports.
  // The real MCP resource server validates this bearer before servicing a tool.
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url'));
  requireThat(claims.iss === ISSUER && typeof claims.sub === 'string', 'mcp_identity_claims_missing');
  const client = new Client({ name: 'academy-chat-acceptance', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(MCP), { requestInit: { headers: { Authorization: `Bearer ${token}` } } });
  clients.push(client);
  await client.connect(transport);
  return { client, transport, claims, token };
}

async function call(session, name, args = {}) {
  const result = await session.client.callTool({ name, arguments: args }, undefined, { timeout: 15000 });
  observe({ surface: 'mcp', tool: name, is_error: result.isError === true });
  return result;
}
function value(result) {
  return result.structuredContent || JSON.parse(result.content.find(item => item.type === 'text').text);
}
async function accepted(session, name, args = {}) {
  const result = await call(session, name, args);
  requireThat(!result.isError, 'unexpected_mcp_tool_error');
  return value(result);
}
async function rejected(session, name, args, expectedError) {
  try {
    const result = await call(session, name, args);
    requireThat(result.isError === true, 'forged_or_stale_mcp_request_accepted');
    if (expectedError) requireThat(value(result).error === expectedError, 'unexpected_mcp_rejection');
  } catch (error) {
    // Schema rejection may be an MCP invalid-params error instead of a tool error.
    if (!expectedError && error.code === -32602) return;
    throw error;
  }
}
async function websiteIdentity(browser, claims) {
  const rows = (await admin.query(
    'SELECT i.id, i.issuer, i.subject FROM academy_sessions s JOIN academy_identities i ON i.id=s.identity_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now()',
    [sha(browser.cookie())],
  )).rows;
  requireThat(rows.length === 1 && rows[0].issuer === claims.iss && rows[0].subject === claims.sub, 'website_and_mcp_identity_differ');
  return rows[0].id;
}
async function restart(script, args = []) {
  checkPersistedFixture();
  // Keep socket close events flowing while the disposable services restart.
  try { await execFileAsync('bash', [script, ...args], { encoding: 'utf8', timeout: 60000 }); }
  catch (cause) { throw Object.assign(new Error('fixture_restart_failed', { cause }), { safeCode: 'fixture_restart_failed' }); }
}

try {
  await Promise.all([admin.connect(), appRole.connect(), mcpRole.connect()]);
  worksheetBefore = await worksheets();
  const web = [await new Browser().signIn(USERS[0]), await new Browser().signIn(USERS[1])];
  const sessions = [await mcpSignIn(USERS[0]), await mcpSignIn(USERS[1])];
  const owners = [await websiteIdentity(web[0], sessions[0].claims), await websiteIdentity(web[1], sessions[1].claims)];
  requireThat(owners[0] !== owners[1] && worksheetBefore.some(row => row.owner_id === owners[0] && row.lesson_id === LESSONS[0]), 'distinct_fixture_users_and_existing_worksheet_required');
  for (const [db, roleName] of [[appRole, appRoleName], [mcpRole, mcpRoleName]]) {
    const result = (await db.query('SELECT current_user AS role, rolsuper FROM pg_roles WHERE rolname=current_user')).rows;
    requireThat(result.length === 1 && result[0].role === roleName && result[0].rolsuper === false, 'runtime_role_is_not_restricted');
  }
  requireThat(appRoleName !== mcpRoleName, 'separate_runtime_roles_required');
  requireThat((await mcpRole.query("SELECT has_table_privilege(current_user, 'academy_sessions', 'SELECT') AS can_read_sessions")).rows[0].can_read_sessions === false, 'mcp_role_can_read_sessions');
  record('C1', 'Real website and bearer logins resolve the same two PostgreSQL owners under separate runtime roles', { owners_distinct: true, same_identity_across_transports: true, worksheet_rows_before: worksheetBefore.length });

  stage = 'read_only_before_start';
  for (const lesson of LESSONS) for (let index = 0; index < 2; index++) {
    requireThat((await draftRow(admin, owners[index], lesson)).length === 0, 'fixture_has_existing_chat_work_do_not_replace');
    const unloaded = await web[index].chat(lesson);
    requireThat(unloaded.status === 404 && unloaded.data.error === 'no_attempt', 'website_read_created_or_found_attempt');
    await rejected(sessions[index], 'resume_lesson', { lesson_id: lesson }, 'no_attempt');
    await rejected(sessions[index], 'inspect_evidence', { lesson_id: lesson }, 'no_attempt');
    requireThat((await draftRow(admin, owners[index], lesson)).length === 0, 'read_only_tool_created_attempt');
  }
  requireThat((await new Browser().chat(LESSONS[0])).status === 401, 'anonymous_chat_read_accepted');
  record('C2', 'Website and MCP reads do not assign a case; anonymous access is rejected');

  for (const [index, lesson] of LESSONS.entries()) {
    const base = 3 + index * 5;
    stage = `${lesson}_assignment`;
    const started = await web[0].chat(lesson, { action: 'start', request_id: crypto.randomUUID() });
    requireThat(started.status === 200 && started.data.version === 1 && started.data.stage === 'judgment' && started.data.resumed === false, 'website_start_failed');
    const initial = projection(started.data);
    same(await accepted(sessions[0], 'resume_lesson', { lesson_id: lesson }), initial, 'mcp_resume_differs_from_website_start');
    same(await accepted(sessions[0], 'inspect_evidence', { lesson_id: lesson }), initial, 'mcp_evidence_differs_from_website_start');
    const resumed = await accepted(sessions[0], 'start_lesson', { lesson_id: lesson, request_id: crypto.randomUUID() });
    requireThat(resumed.resumed === true, 'repeated_start_reassigned_case');
    same(projection(resumed), initial, 'repeated_start_changed_projection');
    const bStarted = await accepted(sessions[1], 'start_lesson', { lesson_id: lesson, request_id: crypto.randomUUID() });
    const bInitial = projection(bStarted);
    const bWeb = await web[1].chat(lesson);
    requireThat(bWeb.status === 200 && bInitial.attempt_id !== initial.attempt_id, 'second_owner_assignment_missing_or_shared');
    same(bWeb.data, bInitial, 'website_does_not_resume_mcp_assignment');
    requireThat(jsonHash(evidenceOf(bInitial)) !== jsonHash(evidenceOf(initial)), 'two_learners_share_identical_case_artifacts');
    const initialRows = await draftRow(admin, owners[0], lesson);
    requireThat(initialRows.length === 1 && initialRows[0].version === 1, 'assignment_not_saved_once');
    same(await draftRow(appRole, owners[0], lesson), initialRows, 'app_role_sees_different_row');
    same(await draftRow(mcpRole, owners[0], lesson), initialRows, 'mcp_role_sees_different_row');
    record(`C${base}`, `${lesson}: website start and MCP start share owner-scoped persistent assignments`, { evidence_sha256: jsonHash(evidenceOf(initial)), different_case_artifacts: true });

    stage = `${lesson}_mcp_to_website`;
    const first = requestFor(initial, 'nothing');
    const { action, ...toolFirst } = first;
    const advanced = await accepted(sessions[0], 'submit_decision', { lesson_id: lesson, ...toolFirst });
    requireThat(advanced.version === 2 && advanced.stage === 'verification', 'mcp_decision_did_not_advance');
    const browserAdvanced = await web[0].chat(lesson);
    requireThat(browserAdvanced.status === 200, 'website_resume_after_mcp_failed');
    same(browserAdvanced.data, advanced, 'website_did_not_observe_mcp_decision');
    const once = await draftRow(admin, owners[0], lesson);
    const privateRecord = JSON.parse(once[0].content);
    requireThat(once[0].version === 2 && once[0].last_save_request_id === first.request_id && privateRecord.attempt.decisions.length === 1 && privateRecord.requests.length === 1, 'mcp_decision_not_committed_once');
    record(`C${base + 1}`, `${lesson}: real MCP submission advances the website and PostgreSQL once`, { version: advanced.version });

    stage = `${lesson}_retry_and_conflict`;
    const retried = await accepted(sessions[0], 'submit_decision', { lesson_id: lesson, ...toolFirst });
    requireThat(retried.replay === true, 'exact_mcp_retry_not_recognized');
    same(projection(retried), advanced, 'exact_mcp_retry_changed_projection');
    const httpRetry = await web[0].chat(lesson, first);
    requireThat(httpRetry.status === 200 && httpRetry.data.replay === true, 'cross_surface_exact_retry_not_recognized');
    const stale = await web[0].chat(lesson, { ...first, request_id: crypto.randomUUID() });
    requireThat(stale.status === 409 && stale.data.error === 'version_conflict', 'stale_website_decision_was_not_conflict');
    const changed = { ...first, choice_id: initial.choices.find(item => item.id !== first.choice_id).id };
    const reused = await web[0].chat(lesson, changed);
    requireThat(reused.status === 409 && reused.data.error === 'request_conflict', 'changed_request_id_reuse_not_rejected');
    same(await draftRow(admin, owners[0], lesson), once, 'retry_or_conflict_changed_persisted_row');
    record(`C${base + 2}`, `${lesson}: exact retries are idempotent; stale or changed website requests preserve the row`, { version: once[0].version, row_sha256: jsonHash(once) });

    stage = `${lesson}_website_to_mcp`;
    const verification = requestFor(advanced, lesson === 'report-or-evidence' ? 'controlled_restore' : 'check_requested_scope');
    const checked = await web[0].chat(lesson, verification);
    requireThat(checked.status === 200 && checked.data.version === 3 && checked.data.stage === 'final', 'website_verification_did_not_advance');
    requireThat(checked.data.messages.at(-1).evidence?.length > 0, 'simulated_verification_evidence_missing');
    same(await accepted(sessions[0], 'resume_lesson', { lesson_id: lesson }), checked.data, 'mcp_did_not_observe_website_decision');
    same(await accepted(sessions[0], 'inspect_evidence', { lesson_id: lesson }), checked.data, 'mcp_did_not_observe_new_evidence');
    record(`C${base + 3}`, `${lesson}: website verification and its simulated evidence are resumed through real MCP`, { version: checked.data.version, evidence_sha256: jsonHash(evidenceOf(checked.data)) });

    stage = `${lesson}_ownership`;
    const aBefore = await draftRow(admin, owners[0], lesson);
    const bBefore = await draftRow(admin, owners[1], lesson);
    const bDecision = requestFor(bInitial, 'nothing');
    const { action: ignored, ...bToolDecision } = bDecision;
    for (const [field, forgedValue] of [['owner_id', owners[0]], ['subject', sessions[0].claims.sub]]) {
      await rejected(sessions[1], 'resume_lesson', { lesson_id: lesson, [field]: forgedValue });
      await rejected(sessions[1], 'submit_decision', { lesson_id: lesson, ...bToolDecision, [field]: forgedValue });
    }
    await rejected(sessions[1], 'submit_decision', { lesson_id: lesson, ...bToolDecision, attempt_id: initial.attempt_id }, 'attempt_conflict');
    const forgedBody = await web[1].chat(lesson, { ...bDecision, owner_id: owners[0] });
    requireThat(forgedBody.status === 400 && forgedBody.data.error === 'invalid_request', 'website_owner_field_accepted');
    const forgedAttempt = await web[1].chat(lesson, { ...bDecision, attempt_id: initial.attempt_id });
    requireThat(forgedAttempt.status === 409 && forgedAttempt.data.error === 'attempt_conflict', 'website_foreign_attempt_accepted');
    const forgedRead = await web[1].request('GET', `${api(lesson)}?owner_id=${owners[0]}`, { headers: { 'X-Owner-ID': owners[0] } });
    requireThat(forgedRead.status === 200, 'owner_query_read_unavailable');
    same(JSON.parse(forgedRead.text), bInitial, 'owner_query_or_header_changed_owner');
    same(await accepted(sessions[1], 'resume_lesson', { lesson_id: lesson }), bInitial, 'second_owner_case_changed');
    same(await draftRow(admin, owners[0], lesson), aBefore, 'foreign_request_changed_first_owner');
    same(await draftRow(admin, owners[1], lesson), bBefore, 'foreign_request_changed_second_owner');
    record(`C${base + 4}`, `${lesson}: forged owner fields and foreign attempts cannot read or overwrite another learner`);
  }

  stage = 'restart_and_fresh_logins';
  const beforeRestart = [];
  const savedRows = [];
  for (let index = 0; index < 2; index++) for (const lesson of LESSONS) {
    beforeRestart.push(await accepted(sessions[index], 'resume_lesson', { lesson_id: lesson }));
    savedRows.push(await draftRow(admin, owners[index], lesson));
  }
  const oldCookies = web.map(browser => browser.cookie());
  const oldTokens = sessions.map(session => session.token);
  checkpoint('restart_logout');
  for (const browser of web) await browser.logout();
  checkpoint('restart_close_clients');
  for (const session of sessions) await session.client.close();
  checkpoint('restart_app');
  await restart(APP_RESTART, [DB_NAME]);
  checkpoint('restart_mcp');
  await restart(MCP_RESTART);
  checkpoint('fresh_website_login_a');
  const freshWeb = [await new Browser().signIn(USERS[0])];
  checkpoint('fresh_website_login_b');
  freshWeb.push(await new Browser().signIn(USERS[1]));
  checkpoint('fresh_mcp_login_a');
  const freshMcp = [await mcpSignIn(USERS[0])];
  checkpoint('fresh_mcp_login_b');
  freshMcp.push(await mcpSignIn(USERS[1]));
  checkpoint('restart_readbacks');
  let offset = 0;
  for (let index = 0; index < 2; index++) {
    requireThat(freshWeb[index].cookie() !== oldCookies[index] && freshMcp[index].token !== oldTokens[index], 'fresh_authentication_reused_old_context');
    requireThat(await websiteIdentity(freshWeb[index], freshMcp[index].claims) === owners[index], 'fresh_login_changed_identity');
    for (const lesson of LESSONS) {
      const read = await freshWeb[index].chat(lesson);
      requireThat(read.status === 200, 'restart_lost_website_attempt');
      same(read.data, beforeRestart[offset], 'restart_changed_website_attempt');
      same(await accepted(freshMcp[index], 'resume_lesson', { lesson_id: lesson }), beforeRestart[offset], 'restart_changed_mcp_attempt');
      same(await draftRow(admin, owners[index], lesson), savedRows[offset], 'restart_changed_saved_row');
      offset++;
    }
    const progress = await accepted(freshMcp[index], 'get_progress');
    same(progress.lessons.map(item => [item.lesson_id, item.version]), LESSONS.map(lesson => [lesson, index === 0 ? 3 : 1]), 'progress_does_not_match_saved_attempts');
  }
  record('C13', 'Both services restart; fresh Keycloak logins retain both lessons for both owners', { owners: 2, lessons_per_owner: 2, rows_unchanged: true });

  stage = 'worksheet_preservation';
  for (const lesson of LESSONS) {
    await rejected(freshMcp[0], 'save_answer', { lesson_id: `chat-${lesson}`, text: 'Synthetic forbidden namespace overwrite', expected_version: 3 }, 'unknown_lesson');
    const hiddenRoute = await freshWeb[0].request('PUT', `${APP}/academy/api/lessons/chat-${lesson}/draft`, {
      headers: { 'Content-Type': 'application/json', Origin: APP, 'X-CSRF-Token': freshWeb[0].csrf },
      body: JSON.stringify({ content: 'Synthetic forbidden namespace overwrite', expected_version: 3, save_request_id: crypto.randomUUID() }),
    });
    requireThat(hiddenRoute.status === 404, 'legacy_route_exposed_chat_storage_key');
  }
  same(await worksheets(), worksheetBefore, 'existing_worksheet_rows_changed');
  for (let index = 0; index < 2; index++) for (const [lessonIndex, lesson] of LESSONS.entries()) {
    same(await draftRow(admin, owners[index], lesson), savedRows[index * LESSONS.length + lessonIndex], 'legacy_namespace_probe_changed_chat_row');
  }
  record('C14', 'Existing worksheet bytes and metadata are preserved; legacy writers cannot address chat records', { worksheet_rows_preserved: worksheetBefore.length, worksheet_snapshot_sha256: jsonHash(worksheetBefore) });
} catch (error) {
  // Never log assertions, raw responses, cookies, tokens, HTML, SQL parameters or
  // subprocess output. Fixed stages and allowlisted error types/codes identify
  // the boundary without copying messages or other untrusted error fields.
  const code = /^[a-z0-9_]{1,90}$/.test(error?.safeCode || '') ? error.safeCode : 'unexpected_harness_error';
  const diagnostic = errorDiagnostic(error);
  results.push({ id: 'HARNESS', name: stage, result: 'FAIL', detail: { code, ...diagnostic } });
  observe({ surface: 'harness', event: 'failure', code, ...diagnostic });
  console.log(`FAIL MCP-CHAT ${stage} ${code} ${JSON.stringify(diagnostic)}`);
  process.exitCode = 1;
} finally {
  for (const client of clients) await client.close().catch(() => {});
  for (const browser of browsers) await browser.logout().catch(() => {});
  if (worksheetBefore) {
    try { same(await worksheets(), worksheetBefore, 'cleanup_observed_worksheet_change'); }
    catch {
      results.push({ id: 'PRESERVATION', name: 'Worksheet preservation', result: 'FAIL' });
      process.exitCode = 1;
    }
  }
  await Promise.allSettled([admin.end(), appRole.end(), mcpRole.end()]);
  const revision = /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || '') ? process.env.GITHUB_SHA : null;
  fs.writeFileSync(path.join(EV, 'mcp-chat-results.json'), JSON.stringify({
    suite: 'academy_chat_cross_surface', run_at: new Date().toISOString(), source_revision: revision,
    profile: 'disposable-session-only',
    scope: 'Real loopback HTTP, Keycloak, MCP SDK transport and PostgreSQL roles; no installed ChatGPT client acceptance.',
    results,
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(EV, 'mcp-chat-trace.jsonl'), trace.map(entry => JSON.stringify(entry)).join('\n') + '\n');
}
const passed = results.filter(result => result.result === 'PASS').length;
console.log(`MCP CHAT RESULT: ${passed}/${expectedIds.length} PASS`);
if (passed !== expectedIds.length || results.map(result => result.id).join(',') !== expectedIds.join(',')) process.exitCode = 1;
