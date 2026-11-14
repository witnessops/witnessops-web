// End-to-end HTTP tests for the Academy lesson server (T1-T7) plus the F10 privilege probe.
// Not part of `pnpm academy:test` or `pnpm health`. Run only with ACADEMY_E2E=1 against a
// disposable Keycloak and PostgreSQL. Synthetic users only.
//
// Needs a running server, a realm prepared with KC_CREATE_TEST_USERS=1, migrated tables,
// pg_dump/psql/pg_restore on PATH (or ACADEMY_TEST_PG_BINDIR), and ACADEMY_TEST_RESTART_APP_CMD:
// a shell command that (re)starts the server and receives the database name as $1.
// Keycloak admin helper: ACADEMY_TEST_KC_ADMIN, or ../keycloak/kc_admin.py.
// Evidence (secrets redacted): ACADEMY_TEST_EVIDENCE_DIR (default ./test-evidence next to this file).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env, secret, int } from '../src/env.mjs';
import { LOGIN_MAX_PER_WINDOW } from '../src/login-guard.mjs';

if (process.env.ACADEMY_E2E !== '1') {
  console.log('academy lesson e2e skipped; set ACADEMY_E2E=1 to run against disposable Postgres and Keycloak');
  process.exit(0);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = env('ACADEMY_TEST_APP_URL', env('ACADEMY_PUBLIC_ORIGIN', 'http://127.0.0.1:18300')).replace(/\/$/, '');
const ORIGIN = APP;
const APP_HOST = new URL(APP).host;
const COOKIE = APP.startsWith('https://') ? '__Host-academy_sid' : 'academy_sid';
const API = `${APP}/academy/api/lessons/report-or-evidence/draft`;
const EV = env('ACADEMY_TEST_EVIDENCE_DIR', path.join(HERE, 'test-evidence'));
fs.mkdirSync(EV, { recursive: true });
const logf = fs.openSync(`${EV}/http-log.jsonl`, 'w');
const results = [];
const DBH = env('ACADEMY_DB_HOST', '127.0.0.1');
const DBP = int('ACADEMY_DB_PORT', 5432);
const DBN = env('ACADEMY_DB_NAME', 'academy');
const PGADMIN = env('ACADEMY_TEST_PGADMIN_USER', 'postgres');
const PGADMIN_PW = secret('ACADEMY_TEST_PGADMIN_PASSWORD');
const PGBIN = process.env.ACADEMY_TEST_PG_BINDIR ? `${process.env.ACADEMY_TEST_PG_BINDIR}/` : '';
const RESTART = env('ACADEMY_TEST_RESTART_APP_CMD');
const kcAdminScript = env('ACADEMY_TEST_KC_ADMIN', path.join(HERE, '../keycloak/kc_admin.py'));
const kcAdmin = (...a) => execFileSync('python3', [kcAdminScript, ...a], { encoding: 'utf8' }).trim();
const restartApp = (db = DBN) => execFileSync('bash', ['-c', `${RESTART} "$1"`, 'restart', db], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const UA = env('TEST_LEARNER_A_USERNAME', 'learner-a');
const UB = env('TEST_LEARNER_B_USERNAME', 'learner-b');
const PA = secret('TEST_LEARNER_A_PASSWORD');
const PB = secret('TEST_LEARNER_B_PASSWORD');
const SECRETS = [PA, PB, PGADMIN_PW];
const redact = (s) => {
  let out = String(s);
  for (const x of SECRETS) out = out.split(x).join('[REDACTED]');
  return out.replace(/("?(csrf|CSRF|token|code|state|session_state)"?\s*[=:]\s*"?)[A-Za-z0-9._~-]{12,}/g, '$1[REDACTED]');
};

function sqlIdent(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('bad database name');
  return `"${name}"`;
}

class Ctx {
  constructor(name) { this.name = name; this.jar = new Map(); }
  cookieHeader(u) {
    const h = new URL(u).host;
    const m = this.jar.get(h) || {};
    return Object.entries(m).map(([k, v]) => `${k}=${v}`).join('; ');
  }
  store(u, res) {
    const h = new URL(u).host;
    const m = this.jar.get(h) || {};
    for (const c of res.headers.getSetCookie()) {
      const [kv, ...attrs] = c.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i).trim();
      const v = kv.slice(i + 1).trim();
      if (/max-age=0/i.test(attrs.join(';')) || /expires=Thu, 01 Jan 1970/i.test(c)) delete m[k];
      else m[k] = v;
    }
    this.jar.set(h, m);
  }
  async req(method, u, { body, headers = {}, note } = {}) {
    const ch = this.cookieHeader(u);
    if (ch) headers.cookie = ch;
    let res;
    try {
      res = await fetch(u, { method, headers, body, redirect: 'manual' });
    } catch (e) {
      if (e.cause?.code !== 'UND_ERR_SOCKET') throw e;
      res = await fetch(u, { method, headers, body, redirect: 'manual' });
    }
    this.store(u, res);
    const text = await res.text();
    const pu = new URL(u);
    fs.writeSync(logf, `${JSON.stringify({
      t: new Date().toISOString(),
      ctx: this.name,
      method,
      url: pu.origin + pu.pathname,
      status: res.status,
      note,
      location: res.headers.get('location') ? redact(new URL(res.headers.get('location'), u).pathname) : undefined,
      body: res.headers.get('content-type')?.includes('json') ? redact(text).slice(0, 300) : undefined,
    })}\n`);
    return { status: res.status, text, headers: res.headers, json: () => JSON.parse(text) };
  }
  async login(user, pw) {
    let r = await this.req('GET', `${APP}/academy/auth/login`, { note: 'start login' });
    const kcAuth = r.headers.get('location');
    const au = new URL(kcAuth);
    if (au.searchParams.get('code_challenge_method') !== 'S256' || !au.searchParams.get('code_challenge')) throw new Error('PKCE missing');
    r = await this.req('GET', kcAuth, { note: 'keycloak login page' });
    const action = r.text.match(/id="kc-form-login"[^>]*action="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&');
    if (!action) throw new Error('login form not found');
    r = await this.req('POST', action, {
      body: new URLSearchParams({ username: user, password: pw, credentialId: '' }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      note: `submit credentials ${user}`,
    });
    const cb = r.headers.get('location');
    if (!cb?.startsWith(`${APP}/academy/auth/callback`)) throw new Error(`no callback (status ${r.status})`);
    r = await this.req('GET', cb, { note: 'oidc callback' });
    if (r.status !== 302) throw new Error(`callback ${r.status}`);
    r = await this.req('GET', `${APP}/academy/learn/report-or-evidence`, { note: 'lesson page' });
    const csp = r.headers.get('content-security-policy') || '';
    if (csp.includes("'unsafe-inline'")) throw new Error('lesson page still allows inline scripts or styles');
    this.csrf = r.text.match(/id="academy-csrf">"([^"]*)"/)?.[1];
    if (!this.csrf) throw new Error('not signed in');
    return this;
  }
  sid() { return (this.jar.get(APP_HOST) || {})[COOKIE]; }
  get(extra = '') { return this.req('GET', API + extra); }
  put(obj, { origin = ORIGIN, csrf = this.csrf, note } = {}) {
    const h = { 'content-type': 'application/json' };
    if (origin) h.origin = origin;
    if (csrf) h['x-csrf-token'] = csrf;
    return this.req('PUT', API, { body: JSON.stringify(obj), headers: h, note });
  }
  logout() {
    return this.req('POST', `${APP}/academy/auth/logout`, { headers: { origin: ORIGIN, 'x-csrf-token': this.csrf }, note: 'logout' });
  }
}

const rid = () => crypto.randomUUID();
function check(id, name, cond, evidence) {
  results.push({ id, name, result: cond ? 'PASS' : 'FAIL', evidence });
  console.log(`${cond ? 'PASS' : 'FAIL'} ${id} ${name} :: ${JSON.stringify(evidence)}`);
}
async function q(db, sql, args = []) {
  const c = new pg.Client({ host: DBH, port: DBP, database: db, user: PGADMIN, password: PGADMIN_PW });
  await c.connect();
  try { return (await c.query(sql, args)).rows; } finally { await c.end(); }
}
const kcSessionIds = (u) => JSON.parse(kcAdmin('sessions', u));
const kcSessions = (u) => kcSessionIds(u).length;
kcAdmin('logout-user', UA);
kcAdmin('logout-user', UB);

const A = [UA, PA];
const B = [UB, PB];
const draftA = JSON.stringify({
  claims: [
    { label: 'Evidenced', reason: 'Synthetic log line: run finished 02:07:51 UTC' },
    { label: 'Only claimed', reason: 'Report says 3; artifact lists 2 (synthetic)' },
    { label: 'Only claimed', reason: 'No restore record (synthetic)' },
  ],
  limit: 'Synthetic teaching example only.',
});

const a1 = await new Ctx('A-ctx1').login(...A);
let r = await a1.get();
const v0 = r.status === 404 ? 0 : r.json().version;
r = await a1.put({ content: draftA, expected_version: v0, save_request_id: rid() }, { note: 'A saves draft' });
const vA = r.json().version;
const oldSidA = a1.sid();
const oldCsrf = a1.csrf;
const a1Idp = (await q(DBN, 'select idp_session_id from academy_sessions where token_hash=$1', [crypto.createHash('sha256').update(oldSidA).digest('hex')]))[0].idp_session_id;
const kcBeforeLogout = kcSessionIds(UA);
const lo = await a1.logout();
const kcAfterIds = kcSessionIds(UA);
const kcAfterLogout = kcAfterIds.length;
const a2 = await new Ctx('A-ctx2-fresh').login(...A);
r = await a2.get();
check('T1', 'A saves, logs out, fresh cookie jar, logs in, identical content', r.status === 200 && r.json().content === draftA && r.json().version === vA,
  { save_version: vA, logout_status: lo.status, idp_logout_status: lo.json().idp_logout_status, reread_status: r.status, sha_saved: hash(draftA), sha_reread: hash(r.json().content) });
check('T1b', 'logout ended the Keycloak session (that sid present before, absent after; learner-a session count 0)', kcBeforeLogout.includes(a1Idp) && !kcAfterIds.includes(a1Idp) && kcAfterLogout === 0,
  { idp_sid_sha: hash(a1Idp || ''), present_before: kcBeforeLogout.includes(a1Idp), present_after: kcAfterIds.includes(a1Idp), keycloak_sessions_after_logout: kcAfterLogout });

restartApp();
r = await a2.get();
const a2After = r.status === 200 && r.json().content === draftA;
const a3 = await new Ctx('A-ctx3-after-restart').login(...A);
const r3 = await a3.get();
check('T2', 'app restart: draft persists; existing server-side session still valid', a2After && r3.status === 200 && r3.json().content === draftA, { existing_session_status: r.status, fresh_login_status: r3.status, sha: hash(r3.json().content) });

const ida = (await q(DBN, 'select i.id, d.id as draft_id from academy_identities i join academy_lesson_drafts d on d.owner_id=i.id where i.subject=$1', [kcAdmin('user-id', UA)]))[0];
const b1 = await new Ctx('B-ctx1').login(...B);
const t3 = {};
t3.b_get = (await b1.get()).status;
t3.b_get_owner_query = (await b1.get(`?owner_id=${ida.id}&owner=${ida.id}`)).status;
t3.b_get_owner_header = (await b1.req('GET', API, { headers: { 'x-owner-id': ida.id }, note: 'B forged owner header' })).status;
t3.b_get_by_draft_id = (await b1.req('GET', `${APP}/academy/api/drafts/${ida.draft_id}`, { note: 'B guesses A draft id' })).status;
t3.b_put_forged_owner = (await b1.put({ content: 'B overwrite attempt', expected_version: vA, save_request_id: rid(), owner_id: ida.id }, { note: 'B forged owner_id field' })).status;
t3.b_put_guessing_version = (await b1.put({ content: 'B overwrite attempt', expected_version: vA, save_request_id: rid() }, { note: 'B PUT with A version' })).status;
t3.unauth_get = (await new Ctx('anon').get()).status;
t3.unauth_put = (await new Ctx('anon').put({ content: 'x', expected_version: 0, save_request_id: rid() }, { csrf: null })).status;
t3.bogus_cookie_get = (await (() => {
  const c = new Ctx('bogus');
  c.jar.set(APP_HOST, { [COOKIE]: oldSidA.replace(/.$/, oldSidA.endsWith('A') ? 'B' : 'A') });
  return c.get();
})()).status;
const aRow = (await q(DBN, 'select content, version from academy_lesson_drafts where owner_id=$1', [ida.id]))[0];
const bRows = (await q(DBN, 'select count(*)::int n from academy_lesson_drafts d join academy_identities i on i.id=d.owner_id where i.subject=$1', [kcAdmin('user-id', UB)]))[0].n;
check('T3', 'B cannot read or update A (direct, forged owner fields, unauthenticated)',
  t3.b_get === 404 && t3.b_get_owner_query === 404 && t3.b_get_owner_header === 404 && t3.b_get_by_draft_id === 404 && t3.b_put_forged_owner === 400 && t3.b_put_guessing_version === 409 && t3.unauth_get === 401 && t3.unauth_put === 401 && t3.bogus_cookie_get === 401 && aRow.content === draftA && aRow.version === vA,
  { ...t3, a_row_unchanged: aRow.content === draftA && aRow.version === vA, b_rows: bRows });

const c = {};
c.no_origin = (await a3.put({ content: 'x', expected_version: vA, save_request_id: rid() }, { origin: null, note: 'no Origin' })).status;
c.evil_origin = (await a3.put({ content: 'x', expected_version: vA, save_request_id: rid() }, { origin: 'http://evil.example.invalid', note: 'cross Origin' })).status;
c.no_token = (await a3.put({ content: 'x', expected_version: vA, save_request_id: rid() }, { csrf: null, note: 'no CSRF token' })).status;
c.other_session_token = (await a3.put({ content: 'x', expected_version: vA, save_request_id: rid() }, { csrf: b1.csrf, note: 'B CSRF token on A session' })).status;
c.cross_site_fetch = (await a3.req('PUT', API, {
  body: JSON.stringify({ content: 'x', expected_version: vA, save_request_id: rid() }),
  headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-csrf-token': a3.csrf, 'sec-fetch-site': 'cross-site' },
  note: 'Sec-Fetch-Site cross-site',
})).status;
c.text_plain = (await a3.req('PUT', API, { body: '{}', headers: { 'content-type': 'text/plain', origin: ORIGIN, 'x-csrf-token': a3.csrf }, note: 'text/plain body' })).status;
c.logout_no_csrf = (await a3.req('POST', `${APP}/academy/auth/logout`, { headers: { origin: ORIGIN }, note: 'logout without CSRF' })).status;
check('T3c', 'CSRF/same-origin: unsafe requests without exact Origin + session CSRF token rejected',
  c.no_origin === 403 && c.evil_origin === 403 && c.no_token === 403 && c.other_session_token === 403 && c.cross_site_fetch === 403 && c.text_plain === 415 && c.logout_no_csrf === 403, c);

const old = new Ctx('A-old-cookie');
old.jar.set(APP_HOST, { [COOKIE]: oldSidA });
old.csrf = oldCsrf;
const t4a = (await old.get()).status;
const t4p = (await old.put({ content: 'replay', expected_version: vA, save_request_id: rid() })).status;
restartApp();
const t4b = (await old.get()).status;
const revRows = (await q(DBN, 'select reason from academy_session_revocations where identity_id=$1 order by id', [ida.id])).map((x) => x.reason);
check('T4', 'old session denied after logout, including after app restart', t4a === 401 && t4p === 401 && t4b === 401 && revRows.includes('logout'), { get_after_logout: t4a, put_after_logout: t4p, get_after_restart: t4b, revocation_reasons_for_A: revRows });

const a4 = await new Ctx('A-ctx4').login(...A);
const before = (await a4.get()).status;
const beforeA3 = (await a3.get()).status;
const kcBefore = kcSessions(UA);
kcAdmin('logout-user', UA);
const after = (await a4.get()).status;
const afterA3 = (await a3.get()).status;
const afterPut = (await a4.put({ content: 'x', expected_version: vA, save_request_id: rid() })).status;
const rev2 = (await q(DBN, "select count(*)::int n from academy_session_revocations where identity_id=$1 and reason='idp_session_inactive'", [ida.id]))[0].n;
const bStill = (await b1.get()).status;
check('T5', 'Keycloak admin logout of all sessions denies new requests from every A session; B unaffected',
  before === 200 && beforeA3 === 200 && after === 401 && afterA3 === 401 && afterPut === 401 && rev2 >= 2 && bStill === 404,
  { before_ctx4: before, before_ctx3: beforeA3, kc_sessions_before: kcBefore, after_ctx4: after, after_ctx3: afterA3, put_after: afterPut, idp_inactive_revocations: rev2, b_get_after: bStill });

const x = await new Ctx('A-ctx5').login(...A);
const y = await new Ctx('A-ctx6').login(...A);
const vx = (await x.get()).json().version;
const vy = (await y.get()).json().version;
const ridX = rid();
const cx = draftA.replace('Synthetic teaching', 'Edited in ctx5: synthetic teaching');
const px = await x.put({ content: cx, expected_version: vx, save_request_id: ridX }, { note: 'ctx5 save' });
const py = await y.put({ content: 'ctx6 stale edit', expected_version: vy, save_request_id: rid() }, { note: 'ctx6 stale save' });
const replay = await x.put({ content: cx, expected_version: vx, save_request_id: ridX }, { note: 'ctx5 network retry same request id' });
const stored = (await x.get()).json();
const cap1 = await x.put({ content: 'a'.repeat(32768), expected_version: stored.version, save_request_id: rid() }, { note: '32768 bytes' });
const cap2 = await x.put({ content: 'a'.repeat(32769), expected_version: cap1.json().version, save_request_id: rid() }, { note: '32769 bytes' });
const capMb = await x.put({ content: 'é'.repeat(16385), expected_version: cap1.json().version, save_request_id: rid() }, { note: '32770 bytes multibyte' });
const restore = await x.put({ content: cx, expected_version: cap1.json().version, save_request_id: rid() }, { note: 'restore A content' });
check('T6', 'two-context conflict returns 409 and does not overwrite; same save_request_id retry is idempotent',
  vx === vy && px.status === 200 && py.status === 409 && py.json().current_version === vx + 1 && replay.status === 200 && replay.json().replay === true && stored.content === cx && stored.version === vx + 1,
  { start_version: vx, ctx5_status: px.status, ctx6_status: py.status, ctx6_body: py.json(), retry_status: replay.status, retry_replay: replay.json().replay, stored_version: stored.version });
check('T6b', '32 KiB content cap (32768 bytes accepted, 32769 and multibyte 32770 rejected 413)', cap1.status === 200 && cap2.status === 413 && capMb.status === 413 && restore.status === 200, { at_cap: cap1.status, over_cap: cap2.status, over_cap_multibyte: capMb.status });
const finalA = restore.status === 200 ? cx : null;

const RESTORE_DB = `${DBN}_restore_check`;
sqlIdent(DBN);
sqlIdent(RESTORE_DB);
const dumpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'academy-t7-'));
const dump = path.join(dumpDir, 'academy.dump');
const pgEnv = { ...process.env, PGHOST: DBH, PGPORT: String(DBP), PGUSER: PGADMIN, PGPASSWORD: PGADMIN_PW };
const run = (bin, args) => execFileSync(`${PGBIN}${bin}`, args, { env: pgEnv, stdio: ['ignore', 'ignore', 'inherit'] });
run('pg_dump', ['-Fc', '-d', DBN, '-f', dump]);
run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', 'postgres',
  '-c', `DROP DATABASE IF EXISTS ${sqlIdent(RESTORE_DB)}`,
  '-c', `CREATE DATABASE ${sqlIdent(RESTORE_DB)} OWNER academy_migrator`,
  '-c', `REVOKE ALL ON DATABASE ${sqlIdent(RESTORE_DB)} FROM PUBLIC`,
  '-c', `GRANT CONNECT ON DATABASE ${sqlIdent(RESTORE_DB)} TO academy_app`]);
run('pg_restore', ['--exit-on-error', '-d', RESTORE_DB, dump]);
fs.rmSync(dumpDir, { recursive: true, force: true });
const counts = (await q(RESTORE_DB, 'select (select count(*) from academy_lesson_drafts)::int drafts, (select count(*) from academy_identities)::int ids, (select count(*) from academy_schema_migrations)::int migrations'))[0];
restartApp(RESTORE_DB);
const health = await (await fetch(`${APP}/academy/healthz`).catch(() => fetch(`${APP}/academy/healthz`))).json();
const ra = await new Ctx('A-restore').login(...A);
const rag = await ra.get();
const marker = `restore-marker ${rid()}`;
const marked = rag.status === 200
  ? await ra.put({ content: marker, expected_version: rag.json().version, save_request_id: rid() }, { note: 'restore marker' })
  : { status: 0 };
const restoredRow = (await q(RESTORE_DB, 'select content from academy_lesson_drafts where owner_id=$1', [ida.id]))[0];
const primaryRow = (await q(DBN, 'select content from academy_lesson_drafts where owner_id=$1', [ida.id]))[0];
const rb = await new Ctx('B-restore').login(...B);
const rbg = (await rb.get()).status;
const rbq = (await rb.get(`?owner_id=${ida.id}`)).status;
const rbp = (await rb.put({ content: 'B on restore', expected_version: 1, save_request_id: rid(), owner_id: ida.id })).status;
const rold = (await old.get()).status;
restartApp(DBN);
check('T7', `pg_dump/pg_restore into isolated DB ${RESTORE_DB}: A record returned, B denied, logged-out session still denied`,
  health.ok === true && !Object.hasOwn(health, 'db') && rag.status === 200 && rag.json().content === finalA && marked.status === 200 && restoredRow?.content === marker && primaryRow?.content !== marker && rbg === 404 && rbq === 404 && rbp === 400 && rold === 401,
  { health_names_db: Object.hasOwn(health, 'db'), restored_counts: counts, a_status: rag.status, a_sha: hash(rag.json().content || ''), expected_sha: hash(finalA || ''), marker_on_restore: restoredRow?.content === marker, marker_on_primary: primaryRow?.content === marker, b_get: rbg, b_get_owner_query: rbq, b_put_forged: rbp, old_logged_out_cookie: rold });

async function denied(client, sql) {
  try {
    await client.query(sql);
    return false;
  } catch (e) {
    return e.code === '42501';
  }
}

const appUser = env('ACADEMY_DB_USER', 'academy_app');
const admin = new pg.Client({ host: DBH, port: DBP, database: DBN, user: PGADMIN, password: PGADMIN_PW });
await admin.connect();
const role = (await admin.query(
  'SELECT rolsuper, rolcreatedb, rolcreaterole, rolinherit, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = $1',
  [appUser],
)).rows[0];
const grants = (await admin.query(
  'SELECT table_name, privilege_type, is_grantable FROM information_schema.role_table_grants WHERE grantee = $1',
  [appUser],
)).rows;
const flags = (await admin.query(
  `SELECT has_database_privilege($1, current_database(), 'CREATE') AS db_create,
          has_database_privilege($1, current_database(), 'TEMP') AS db_temp,
          has_schema_privilege($1, 'public', 'CREATE') AS schema_create`,
  [appUser],
)).rows[0];
await admin.end();
const app = new pg.Client({
  host: DBH,
  port: DBP,
  database: DBN,
  user: appUser,
  password: secret('ACADEMY_DB_PASSWORD'),
});
await app.connect();
const attempts = {
  delete: await denied(app, 'DELETE FROM academy_lesson_drafts'),
  truncate: await denied(app, 'TRUNCATE academy_lesson_drafts'),
  drop: await denied(app, 'DROP TABLE academy_lesson_drafts'),
  create: await denied(app, 'CREATE TABLE academy_f10_probe (id integer)'),
  set_role: await denied(app, 'SET ROLE academy_migrator'),
};
await app.end();
const deleteGrants = grants.filter((g) => g.privilege_type === 'DELETE' || g.privilege_type === 'TRUNCATE' || g.is_grantable === 'YES');
const roleOk = Boolean(role)
  && role.rolsuper === false
  && role.rolcreatedb === false
  && role.rolcreaterole === false
  && role.rolinherit === false
  && role.rolreplication === false
  && role.rolbypassrls === false
  && flags.db_create === false
  && flags.db_temp === false
  && flags.schema_create === false;
const f10ok = roleOk && deleteGrants.length === 0 && Object.values(attempts).every(Boolean);
const f10 = {
  id: 'F10',
  result: f10ok ? 'PASS' : 'FAIL',
  evidence: {
    role_ok: roleOk,
    attempts,
    elevated_grants: deleteGrants,
    privileges: grants.map((g) => `${g.table_name}:${g.privilege_type}`),
  },
};
console.log(`${f10.result} F10 academy_app has no DELETE or DDL :: ${JSON.stringify(f10.evidence)}`);

await q(DBN, 'ALTER ROLE academy_app CREATEDB CREATEROLE');
run('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-v', 'db=academy', '-d', 'postgres', '-f', path.join(HERE, '../db/bootstrap.sql')]);
const resetRole = (await q(DBN, 'SELECT rolsuper, rolcreatedb, rolcreaterole, rolinherit, rolreplication, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = $1', [appUser]))[0];
const l6ok = Boolean(resetRole)
  && resetRole.rolcanlogin === true
  && resetRole.rolsuper === false
  && resetRole.rolcreatedb === false
  && resetRole.rolcreaterole === false
  && resetRole.rolinherit === false
  && resetRole.rolreplication === false
  && resetRole.rolbypassrls === false;
console.log(`${l6ok ? 'PASS' : 'FAIL'} L6 bootstrap resets drifted academy_app attributes`);

let loginAllowed = 0;
let loginLimited = 0;
for (let i = 0; i < LOGIN_MAX_PER_WINDOW + 15; i += 1) {
  const response = await fetch(`${APP}/academy/auth/login`, { redirect: 'manual' });
  await response.arrayBuffer();
  if (response.status === 429) loginLimited += 1;
  else loginAllowed += 1;
}
const m1ok = loginLimited > 0 && loginAllowed <= LOGIN_MAX_PER_WINDOW;
console.log(`${m1ok ? 'PASS' : 'FAIL'} M1 login burst is rate-limited :: ${JSON.stringify({ allowed: loginAllowed, limited: loginLimited, cap: LOGIN_MAX_PER_WINDOW })}`);

fs.writeFileSync(`${EV}/results.json`, JSON.stringify({ ran_at: new Date().toISOString(), results, f10, l6ok, m1ok }, null, 2));
fs.closeSync(logf);
console.log(`\n${results.filter((x) => x.result === 'PASS').length}/${results.length} PASS`);
if (results.length !== 10 || results.some((x) => x.result !== 'PASS') || !f10ok || !l6ok || !m1ok) process.exitCode = 1;
