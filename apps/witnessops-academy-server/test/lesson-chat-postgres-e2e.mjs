// Optional, wholly disposable PostgreSQL test. It starts its own private Unix
// socket cluster, or an explicitly selected 127.0.0.1-only TCP fixture. It never
// connects to a supplied database or binds a public network interface.
// Requires Node 22, installed pg dependency, and explicitly selected PostgreSQL 17
// binaries. No existing database, identity provider, account or grant is modified.
import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import pg from 'pg';
import { LESSON_CHAT_ID, LESSON_CHAT_STORAGE_KEY } from '../src/lesson-chat-engine.mjs';
import { readLessonChat, submitLessonDecision } from '../src/lesson-chat-store.mjs';

if (process.env.ACADEMY_CHAT_POSTGRES !== '1') {
  console.log('Academy chat PostgreSQL acceptance skipped; requires ACADEMY_CHAT_POSTGRES=1 and ACADEMY_TEST_POSTGRES_BIN.');
  process.exit(0);
}
const BIN = process.env.ACADEMY_TEST_POSTGRES_BIN;
if (!BIN || !isAbsolute(BIN)) throw new Error('Select an absolute PostgreSQL binary directory');
if (process.getuid?.() === 0) throw new Error('Disposable PostgreSQL must run as an unprivileged user');
const run = promisify(execFile);
const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const parent = process.env.ACADEMY_CHAT_TEST_TEMP || tmpdir();
if (!isAbsolute(parent)) throw new Error('Test temporary parent must be absolute');
const transport = process.env.ACADEMY_CHAT_POSTGRES_TRANSPORT || 'unix';
if (!['unix', 'tcp'].includes(transport)) throw new Error('Test transport must be unix or tcp');
const directory = await mkdtemp(join(parent, 'pg-chat-'));
const data = join(directory, 'data');
const socket = join(directory, 's');
const port = randomInt(20000, 60000);
const clientHost = transport === 'tcp' ? '127.0.0.1' : socket;
const USER = 'academy_chat_operator';
const DATABASE = 'academy_chat_disposable';
const results = [];
let processHandle;
const pools = [];
let stage = 'initialization';
let failure;
let version;
const pass = name => { results.push(name); console.log(`PASS Academy chat PostgreSQL: ${name}`); };
const makePool = (user = USER, database = DATABASE) => {
  const pool = new pg.Pool({ host: clientHost, port, user, database, ssl: false, max: 4, connectionTimeoutMillis: 2000, statement_timeout: 5000 });
  pools.push(pool);
  return pool;
};
const request = (step_id = 'judgment', option_id = 'created_recovery_unverified', expected_version = 0) => ({
  lesson_id: LESSON_CHAT_ID, step_id, option_id, expected_version, request_id: randomUUID(),
});

// Ensure both roles read the same version before racing their real SQL writes.
function simultaneousReads(firstPool, secondPool) {
  let reads = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  return [firstPool, secondPool].map(pool => ({
    async query(sql, params) {
      const answer = await pool.query(sql, params);
      if (sql.startsWith('SELECT content, version, last_save_request_id') && reads < 2) {
        reads += 1;
        if (reads === 2) release();
        await gate;
      }
      return answer;
    },
  }));
}

try {
  await mkdir(socket, { mode: 0o700 });
  if (Buffer.byteLength(join(socket, `.s.PGSQL.${port}`)) > 100) throw new Error('Choose a shorter temporary parent for the private PostgreSQL socket');
  stage = 'binary version';
  const detected = await run(join(BIN, 'postgres'), ['--version']);
  version = detected.stdout.trim();
  assert.match(version, /PostgreSQL\) 17\./);
  stage = 'initdb';
  await run(join(BIN, 'initdb'), ['-D', data, '--auth=trust', '--no-locale', '--encoding=UTF8', `--username=${USER}`, '--no-instructions']);
  const log = openSync(join(directory, 'postgres.log'), 'a', 0o600);
  try {
    processHandle = spawn(join(BIN, 'postgres'), ['-D', data, '-k', transport === 'tcp' ? '' : socket, '-p', String(port), '-c', `listen_addresses=${transport === 'tcp' ? '127.0.0.1' : ''}`, '-c', 'unix_socket_permissions=0700'], { stdio: ['ignore', log, log] });
  } finally { closeSync(log); }
  stage = 'private cluster startup';
  const readiness = makePool(USER, 'postgres');
  let ready = false;
  let readinessError;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { await readiness.query('SELECT 1'); ready = true; break; }
    catch (error) { readinessError = error.code || error.message; await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  if (!ready) {
    try {
      await run(join(BIN, 'psql'), ['-X', '-h', clientHost, '-p', String(port), '-U', USER, '-d', 'postgres', '-c', 'SELECT 1'], { timeout: 3000 });
      console.error('Native psql can reach the private cluster; the Node client connection failed.');
    } catch (error) { console.error(`Native psql readiness also failed: ${error.code || 'error'}`); }
    // Startup-only diagnostics contain no learner rows, credentials or queries.
    console.error((await readFile(join(directory, 'postgres.log'), 'utf8')).split('\n').slice(-10).join('\n'));
  }
  assert.equal(ready, true, `private cluster did not become ready: ${readinessError}`);
  stage = 'bootstrap and migrations';
  await run(join(BIN, 'psql'), ['-X', '-h', clientHost, '-p', String(port), '-U', USER, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-v', `db=${DATABASE}`, '-f', join(PACKAGE, 'db/bootstrap.sql')]);
  const admin = makePool();
  const migrationClient = await admin.connect();
  try {
    await migrationClient.query('SET ROLE academy_migrator');
    for (const filename of ['001_academy_identity_and_drafts.sql', '002_academy_mcp_grants.sql', '003_academy_session_token_protection.sql', '004_academy_pilot_invitations.sql']) {
      await migrationClient.query(await readFile(join(PACKAGE, 'migrations', filename), 'utf8'));
    }
  } finally { await migrationClient.query('RESET ROLE'); migrationClient.release(); }
  await admin.query(await readFile(join(PACKAGE, 'db/reconcile-academy-mcp.sql'), 'utf8'));
  const app = makePool('academy_app');
  const mcp = makePool('academy_mcp');
  stage = 'runtime roles';
  for (const [name, pool] of [['academy_app', app], ['academy_mcp', mcp]]) {
    const rights = (await pool.query(`SELECT current_user AS role,
      has_table_privilege(current_user, 'academy_lesson_drafts', 'SELECT') AS can_select,
      has_table_privilege(current_user, 'academy_lesson_drafts', 'INSERT') AS can_insert,
      has_table_privilege(current_user, 'academy_lesson_drafts', 'UPDATE') AS can_update,
      has_table_privilege(current_user, 'academy_lesson_drafts', 'DELETE') AS can_delete,
      has_schema_privilege(current_user, 'public', 'CREATE') AS can_create`)).rows[0];
    assert.equal(rights.role, name);
    assert.equal(rights.can_select, true);
    assert.equal(rights.can_insert, true);
    assert.equal(rights.can_update, true);
    assert.equal(rights.can_delete, false);
    assert.equal(rights.can_create, false);
  }
  assert.equal((await mcp.query("SELECT has_table_privilege(current_user, 'academy_sessions', 'SELECT') AS permitted")).rows[0].permitted, false);
  pass('existing bootstrap, migrations and reconciled app/MCP permissions');

  const owners = [];
  for (const subject of ['synthetic-a', 'synthetic-b', 'synthetic-replay']) {
    owners.push((await admin.query('INSERT INTO academy_identities(issuer, subject) VALUES ($1,$2) RETURNING id', ['https://identity.invalid/academy', subject])).rows[0].id);
  }
  const [A, B, C] = owners;
  const legacy = 'Synthetic worksheet retained byte-for-byte.';
  await app.query('INSERT INTO academy_lesson_drafts(owner_id,lesson_id,content,last_save_request_id) VALUES($1,$2,$3,$4)', [A, LESSON_CHAT_ID, legacy, randomUUID()]);
  assert.equal((await readLessonChat(app, A)).body.version, 0);
  assert.equal((await admin.query('SELECT count(*)::int AS count FROM academy_lesson_drafts WHERE lesson_id=$1', [LESSON_CHAT_STORAGE_KEY])).rows[0].count, 0);
  pass('initial read creates no row and preserves legacy worksheet');

  stage = 'concurrent insert';
  const insertRequest = request();
  let [left, right] = simultaneousReads(app, mcp);
  const inserts = await Promise.all([
    submitLessonDecision(left, A, insertRequest),
    submitLessonDecision(right, A, request('judgment', 'backup_failed')),
  ]);
  assert.deepEqual(inserts.map(result => result.status).sort(), [200, 409]);
  assert.equal((await readLessonChat(app, A)).body.version, 1);
  pass('concurrent first writes through separate roles commit once');

  stage = 'concurrent update';
  [left, right] = simultaneousReads(app, mcp);
  const updates = await Promise.all([
    submitLessonDecision(left, A, request('verification', 'controlled_restore', 1)),
    submitLessonDecision(right, A, request('verification', 'ask_agent', 1)),
  ]);
  assert.deepEqual(updates.map(result => result.status).sort(), [200, 409]);
  assert.equal((await readLessonChat(mcp, A)).body.version, 2);
  pass('concurrent updates preserve one winning decision and reject stale version');

  stage = 'replay';
  const same = request();
  [left, right] = simultaneousReads(app, mcp);
  const replays = await Promise.all([submitLessonDecision(left, C, same), submitLessonDecision(right, C, { ...same })]);
  assert.equal(replays[0].status, 200);
  assert.deepEqual(replays[0], replays[1]);
  assert.equal((await readLessonChat(mcp, C)).body.version, 1);
  assert.equal((await submitLessonDecision(app, C, { ...same, option_id: 'backup_failed' })).body.error, 'request_id_conflict');
  await submitLessonDecision(mcp, C, request('verification', 'ask_agent', 1));
  assert.equal((await submitLessonDecision(app, C, same)).body.error, 'version_conflict');
  assert.equal((await submitLessonDecision(app, C, { ...same, step_id: 'closure', option_id: 'accept_supported_require_restore', expected_version: 2 })).body.error, 'request_id_conflict');
  pass('same-body replay is idempotent; changed and older request bindings fail closed');

  stage = 'cross-interface completion and isolation';
  const complete = await submitLessonDecision(app, A, request('closure', 'accept_supported_require_restore', 2));
  assert.equal(complete.body.completed, true);
  assert.equal(complete.body.outcome.recovery, 'UNVERIFIED');
  assert.equal(complete.body.outcome.closure, 'BLOCKED');
  assert.deepEqual(await readLessonChat(mcp, A), complete);
  assert.equal((await readLessonChat(mcp, B)).body.version, 0);
  assert.equal((await submitLessonDecision(mcp, B, { ...request(), owner_id: A })).status, 400);
  assert.equal((await admin.query('SELECT content FROM academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2', [A, LESSON_CHAT_ID])).rows[0].content, legacy);
  pass('app/MCP resume one progress record, reject forged owner and retain another learner plus worksheet');

  stage = 'transaction rollback';
  const transaction = await app.connect();
  try {
    await transaction.query('BEGIN');
    assert.equal((await submitLessonDecision(transaction, B, request())).status, 200);
    await transaction.query('ROLLBACK');
  } finally { transaction.release(); }
  assert.equal((await readLessonChat(mcp, B)).body.version, 0);
  pass('rolled-back progress is absent from the other runtime role');
} catch (error) {
  failure = error;
  console.error(`FAIL Academy chat PostgreSQL at ${stage}: ${error.code || 'error'} ${error.message}`);
} finally {
  await Promise.allSettled(pools.map(pool => pool.end()));
  if (processHandle && processHandle.exitCode === null) {
    try { await run(join(BIN, 'pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop']); }
    catch (error) {
      processHandle.kill('SIGTERM');
      failure ||= error;
      console.error('FAIL Academy chat PostgreSQL: clean cluster shutdown was not confirmed');
    }
  }
  if (!processHandle || processHandle.exitCode !== null) {
    await rm(directory, { recursive: true, force: true });
    await assert.rejects(access(directory));
    pass('temporary cluster stopped and removed');
  } else failure ||= new Error('temporary cluster may still be active');
}
console.log(JSON.stringify({ postgres: version, transport, result: failure ? 'FAIL' : 'PASS', checks: results.length,
  boundary: 'Real PostgreSQL store and runtime-role checks; browser/Keycloak/ChatGPT authentication is outside this test.' }));
if (failure) process.exitCode = 1;
