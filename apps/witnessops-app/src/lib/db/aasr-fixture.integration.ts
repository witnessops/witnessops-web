import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { createAasrTestDatabase, aasrTestSession, AASR_TEST_USERS, type AasrTestActor } from '../../../../../tests/app-foundation/aasr-db';
import { createAasrFixtureService } from '../aasr-fixture/server';
import { AASR_FIXTURE_PATH, AASR_FIXTURE_WORKSPACE_ID } from '../aasr-fixture/contract';
import { parseStagingAssignment } from '../aasr-fixture/assignment';
import { applyAssignment, inspectAssignment, rollbackAssignment, verifyStagingDatabaseRoles } from '../aasr-fixture/assignment-operator';
import { transaction } from './pool';
import { revokeSession } from './sessions';
const origin = 'http://127.0.0.1:3022';
let db: Awaited<ReturnType<typeof createAasrTestDatabase>>;
before(async () => { db = await createAasrTestDatabase(); });
after(async () => { await db?.close(); });
function session(actor: AasrTestActor) {
  return createAasrFixtureService({ pool: db.pool, origin, enabled: () => true, identity: async () => aasrTestSession(actor) });
}
function request(command?: string, revision = 0, headers: Record<string, string> = {}) {
  return new Request(origin + AASR_FIXTURE_PATH, {
    method: command ? 'POST' : 'GET',
    headers: { host: '127.0.0.1:3022', origin, 'content-type': 'application/json', 'x-witnessops-workspace': AASR_FIXTURE_WORKSPACE_ID, ...headers },
    ...(command ? { body: JSON.stringify({ command, expectedRevision: revision }) } : {}),
  });
}

async function withStagingRuntimeRole(check: (client: PoolClient, role: string, schema: string, verify: () => Promise<void>) => Promise<void>) {
  const suffix = randomUUID().replaceAll('-', '');
  const role = `aasr_role_${suffix}`, schema = `aasr_schema_${suffix}`;
  const client = await db.control.connect();
  try {
    await client.query('BEGIN');
    const actual = (await client.query<{ database: string; username: string; schema: string }>(
      'SELECT current_database() AS database,current_user AS username,current_schema() AS schema')).rows[0];
    await client.query(`CREATE ROLE ${role} LOGIN`);
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
    await client.query(`ALTER ROLE ${role} SET search_path TO ${schema}`);
    assert.notEqual(actual.schema, schema, 'the runtime schema must differ from the migration connection schema');
    const verify = () => verifyStagingDatabaseRoles(client, role, actual.database, actual.username);
    await verify(); // No ownership, CREATE or administrative privilege in the baseline.
    await check(client, role, schema, verify);
  } finally { await client.query('ROLLBACK'); client.release(); }
}

test('staging preflight accepts an unprivileged login with a different runtime search path', async () => {
  await withStagingRuntimeRole(async (_client, _role, _schema, verify) => { await verify(); });
});
test('staging preflight rejects CREATE outside the migration search path', async () => {
  await withStagingRuntimeRole(async (client, role, schema, verify) => {
    await client.query(`GRANT CREATE ON SCHEMA ${schema} TO ${role}`);
    await assert.rejects(verify(), /no ownership.*administrative\/create privileges/);
  });
});
test('staging preflight rejects schema ownership outside the migration search path', async () => {
  await withStagingRuntimeRole(async (client, role, schema, verify) => {
    await client.query(`ALTER SCHEMA ${schema} OWNER TO ${role}`);
    await assert.rejects(verify(), /no ownership.*administrative\/create privileges/);
  });
});
test('staging preflight rejects relation ownership outside the migration search path', async () => {
  await withStagingRuntimeRole(async (client, role, schema, verify) => {
    await client.query(`CREATE TABLE ${schema}.owned_relation (id integer)`);
    await client.query(`ALTER TABLE ${schema}.owned_relation OWNER TO ${role}`);
    assert.equal((await client.query('SELECT has_schema_privilege($1,$2,\'CREATE\') AS allowed', [role, schema])).rows[0].allowed, false);
    await assert.rejects(verify(), /no ownership.*administrative\/create privileges/);
  });
});
test('staging preflight rejects SET ROLE access to schema CREATE outside the migration search path', async () => {
  await withStagingRuntimeRole(async (client, role, schema, verify) => {
    const creator = `${role}_create`;
    await client.query(`CREATE ROLE ${creator} NOLOGIN`);
    await client.query(`ALTER ROLE ${role} NOINHERIT`);
    await client.query(`GRANT USAGE,CREATE ON SCHEMA ${schema} TO ${creator}`);
    await client.query(`GRANT ${creator} TO ${role}`);
    assert.equal((await client.query('SELECT has_schema_privilege($1,$2,\'CREATE\') AS allowed', [role, schema])).rows[0].allowed, false);
    await assert.rejects(verify(), /no ownership.*administrative\/create privileges/);
  });
});
test('staging preflight rejects replication-capable runtime logins', async () => {
  await withStagingRuntimeRole(async (client, role, _schema, verify) => {
    await client.query(`ALTER ROLE ${role} REPLICATION`);
    await assert.rejects(verify(), /no ownership.*administrative\/create privileges/);
  });
});
test('staging preflight rejects membership in a replication-capable role', async () => {
  await withStagingRuntimeRole(async (client, role, _schema, verify) => {
    const replicationRole = `${role}_repl`;
    await client.query(`CREATE ROLE ${replicationRole} NOLOGIN REPLICATION`);
    await client.query(`GRANT ${replicationRole} TO ${role}`);
    await assert.rejects(verify(), /no ownership.*administrative\/create privileges/);
  });
});
test('current native membership allows owner and assigned reviewer, refuses viewer, contributor and stranger', async () => {
  assert.equal((await session('owner')(request())).status, 200);
  const reviewer = await session('reviewer')(request());
  assert.equal(reviewer.status, 200);
  assert.equal((await reviewer.json()).actorRole, 'reviewer');
  for (const actor of ['viewer', 'contributor', 'stranger'] as const) {
    const response = await session(actor)(request('record_review', 0, { 'x-witnessops-role': 'reviewer' }));
    assert.ok([403, 404].includes(response.status), `${actor}: ${response.status}`);
  }
});
test('same identity cannot use another workspace selector', async () => {
  assert.equal((await session('owner')(request(undefined, 0, { 'x-witnessops-workspace': '11000000-0000-4000-8000-000000000002' }))).status, 404);
});
test('reviewer generation, role changes and membership revocation fail closed', async () => {
  const isolated = await createAasrTestDatabase();
  const call = createAasrFixtureService({ pool: isolated.pool, origin, enabled: () => true, identity: async () => aasrTestSession('reviewer') });
  try {
    await isolated.control.query("UPDATE memberships SET role='owner' WHERE user_id=$1", [AASR_TEST_USERS.reviewer]);
    assert.equal((await call(request())).status, 403);
    await isolated.control.query("UPDATE memberships SET role='contributor' WHERE user_id=$1", [AASR_TEST_USERS.reviewer]);
    // Returning to the same role does not restore an old reviewer assignment.
    assert.equal((await call(request())).status, 403);
    await isolated.control.query("UPDATE memberships SET status='revoked',revoked_at=now() WHERE user_id=$1", [AASR_TEST_USERS.reviewer]);
    assert.equal((await call(request())).status, 404);
  } finally { await isolated.close(); }
});
test('account pause and current session revocation refuse subsequent requests', async () => {
  const call = session('owner');
  assert.equal((await call(request())).status, 200);
  const { session: key } = aasrTestSession('owner');
  try {
    await db.control.query("UPDATE users SET early_access_state='paused' WHERE id=$1", [AASR_TEST_USERS.owner]);
    assert.equal((await call(request())).status, 403);
    await db.control.query("UPDATE users SET early_access_state='active' WHERE id=$1", [AASR_TEST_USERS.owner]);
    await db.control.query('INSERT INTO revoked_sessions(issuer,session_id,subject) VALUES ($1,$2,$3)', [key.issuer, key.sessionId, key.subject]);
    assert.equal((await call(request())).status, 401);
  } finally {
    await db.control.query("UPDATE users SET early_access_state='active' WHERE id=$1", [AASR_TEST_USERS.owner]);
    await db.control.query('DELETE FROM revoked_sessions WHERE issuer=$1 AND session_id=$2', [key.issuer, key.sessionId]);
  }
});
test('concurrent stale commands cannot advance twice; refusal retains audit', async () => {
  const call = session('owner');
  const responses = await Promise.all([call(request('accept_scope')), call(request('accept_scope'))]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  const state = await (await call(request())).json();
  assert.equal(state.revision, 1);
  const refusal = await call(request('record_review', 1));
  assert.equal(refusal.status, 403);
  const next = await (await call(request())).json();
  assert.equal(next.revision, 1);
  assert.ok(next.authorityDenials.length > 0);
});
test('native membership journey returns honest recipient projection and simulated delivery', async () => {
  let actor: AasrTestActor = 'owner';
  const call = createAasrFixtureService({ pool: db.pool, origin, enabled: () => true, identity: async () => aasrTestSession(actor) });
  const steps = [['owner', 'accept_scope'], ['owner', 'submit_evidence'], ['reviewer', 'admit_evidence'], ['reviewer', 'record_review'], ['owner', 'accept_report'], ['reviewer', 'prepare_delivery'], ['reviewer', 'simulate_delivery'], ['owner', 'close']] as const;
  let view: Record<string, unknown> = {};
  for (let revision = 0; revision < steps.length; revision++) {
    actor = steps[revision][0];
    const response = await call(request(steps[revision][1], revision));
    assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
    view = await response.json();
  }
  assert.equal(view.stage, 'closed');
  assert.equal(view.revision, 8);
  const serialized = JSON.stringify(view);
  assert.match(serialized, /PARTIAL_EVIDENCE/);
  assert.match(serialized, /UNKNOWN/);
  assert.doesNotMatch(serialized, /originalBytes/);
});

test('failed database commit discards the in-memory transition', async () => {
  let commits = 0;
  const failingPool = new Proxy(db.pool, {
    get(target, key) {
      if (key === 'connect') return async () => {
        const client = await target.connect();
        return new Proxy(client, {
          get(connection, property) {
            if (property === 'query') return async (...args: unknown[]) => {
              // Identity resolution commits first; fail the membership/command transaction.
              if (args[0] === 'COMMIT' && ++commits === 2) throw new Error('Synthetic COMMIT failure');
              return Reflect.apply(connection.query, connection, args);
            };
            const value = Reflect.get(connection, property);
            return typeof value === 'function' ? value.bind(connection) : value;
          },
        });
      };
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  const call = createAasrFixtureService({ pool: failingPool, origin, enabled: () => true, identity: async () => aasrTestSession('owner') });
  assert.equal((await call(request('accept_scope'))).status, 500);
  const state = await (await call(request())).json();
  assert.equal(state.revision, 0);
  assert.equal(state.stage, 'draft');
  assert.equal((await call(request('accept_scope'))).status, 200);
});

function stagingAssignment(reviewer: AasrTestActor = 'contributor') {
  const ownerSession = aasrTestSession('owner'), reviewerSession = aasrTestSession(reviewer);
  const binding = { origin: 'https://staging.example.test', workosClientId: 'client_aasr_fixture', databaseTargetSha256: 'a'.repeat(64) };
  return parseStagingAssignment(JSON.stringify({ schema: 'witnessops.aasr-staging-assignment.v1', reviewId: 'local-native-assignment-01',
    workspaceId: AASR_FIXTURE_WORKSPACE_ID, ...binding, issuer: ownerSession.identity.issuer,
    owner: { userId: AASR_TEST_USERS.owner, subject: ownerSession.identity.subject, generation: 1 },
    reviewer: { userId: AASR_TEST_USERS[reviewer], subject: reviewerSession.identity.subject, generation: 1 },
  }), binding);
}
test('staging uses only reviewed native actors; another Owner and the development reviewer gain no authority', async () => {
  const isolated = await createAasrTestDatabase();
  let actor: AasrTestActor = 'owner';
  const assignment = stagingAssignment();
  const call = createAasrFixtureService({ pool: isolated.pool, origin, enabled: () => true,
    identity: async () => aasrTestSession(actor), stagingAssignment: () => assignment });
  try {
    assert.equal((await call(request())).status, 200);
    actor = 'contributor';
    const reviewer = await call(request());
    assert.equal(reviewer.status, 200);
    assert.equal((await reviewer.json()).actorRole, 'reviewer');
    actor = 'reviewer';
    assert.equal((await call(request())).status, 403);
    await isolated.control.query("UPDATE memberships SET role='owner' WHERE user_id=$1", [AASR_TEST_USERS.viewer]);
    actor = 'viewer';
    assert.equal((await call(request())).status, 403);
    actor = 'owner';
    await isolated.control.query("UPDATE memberships SET role='contributor' WHERE user_id=$1", [AASR_TEST_USERS.owner]);
    await isolated.control.query("UPDATE memberships SET role='owner' WHERE user_id=$1", [AASR_TEST_USERS.owner]);
    assert.equal((await call(request())).status, 403);
  } finally { await isolated.close(); }
});
test('missing assignments, stale native issuer and assignment replacement deny fixture operations', async () => {
  const assignment = stagingAssignment();
  const pending = createAasrFixtureService({ pool: db.pool, origin, enabled: () => true, identity: async () => aasrTestSession('owner'), stagingAssignment: () => null });
  assert.equal((await pending(request())).status, 403);
  let current = assignment;
  const call = createAasrFixtureService({ pool: db.pool, origin, enabled: () => true, identity: async () => aasrTestSession('owner'), stagingAssignment: () => current });
  assert.equal((await call(request())).status, 200);
  current = { ...assignment, issuer: 'https://api.workos.com/user_management/client_other' };
  assert.equal((await call(request('accept_scope'))).status, 403);
  const mismatched = createAasrFixtureService({ pool: db.pool, origin, enabled: () => true, identity: async () => aasrTestSession('owner'), stagingAssignment: () => current });
  assert.equal((await mismatched(request())).status, 403);
});
test('reviewed operator dry run does not mutate; apply is idempotent and rollback revokes only its grants', async () => {
  const isolated = await createAasrTestDatabase();
  const assignment = stagingAssignment();
  try {
    await isolated.control.query('DELETE FROM memberships WHERE workspace_id=$1', [AASR_FIXTURE_WORKSPACE_ID]);
    await isolated.control.query('DELETE FROM workspaces WHERE id=$1', [AASR_FIXTURE_WORKSPACE_ID]);
    const client = await isolated.control.connect();
    let plan;
    try { await client.query('BEGIN'); plan = await inspectAssignment(client, assignment); await client.query('ROLLBACK'); }
    finally { client.release(); }
    assert.equal((await isolated.control.query('SELECT 1 FROM workspaces WHERE id=$1', [AASR_FIXTURE_WORKSPACE_ID])).rowCount, 0);
    assert.equal((await isolated.control.query('SELECT 1 FROM memberships WHERE workspace_id=$1', [AASR_FIXTURE_WORKSPACE_ID])).rowCount, 0);
    assert.equal((await transaction(isolated.control, client => applyAssignment(client, assignment, plan!))).alreadyApplied, false);
    assert.equal((await transaction(isolated.control, client => applyAssignment(client, assignment, plan!))).alreadyApplied, true);
    const call = createAasrFixtureService({ pool: isolated.pool, origin, enabled: () => true, identity: async () => aasrTestSession('owner'), stagingAssignment: () => assignment });
    assert.equal((await call(request())).status, 200);
    assert.equal((await transaction(isolated.control, client => rollbackAssignment(client, assignment, plan!))).alreadyRolledBack, false);
    assert.equal((await call(request())).status, 404);
    assert.equal((await transaction(isolated.control, client => rollbackAssignment(client, assignment, plan!))).alreadyRolledBack, true);
    const rows = (await isolated.control.query('SELECT status,generation FROM memberships WHERE workspace_id=$1', [AASR_FIXTURE_WORKSPACE_ID])).rows;
    assert.deepEqual(rows, [{ status: 'revoked', generation: 2 }, { status: 'revoked', generation: 2 }]);
    assert.equal((await isolated.control.query('SELECT status FROM workspaces WHERE id=$1', [AASR_FIXTURE_WORKSPACE_ID])).rows[0].status, 'archived');
  } finally { await isolated.close(); }
});
test('logout waits for the fixture authorization transaction; committed revocation denies the next write', async () => {
  const isolated = await createAasrTestDatabase();
  let reachCommit!: () => void, releaseCommit!: () => void;
  const reached = new Promise<void>(resolve => { reachCommit = resolve; });
  const released = new Promise<void>(resolve => { releaseCommit = resolve; });
  let commits = 0;
  const guardedPool = new Proxy(isolated.pool, { get(target, key) {
    if (key === 'connect') return async () => {
      const client = await target.connect();
      return new Proxy(client, { get(connection, property) {
        if (property === 'query') return async (...args: unknown[]) => {
          if (args[0] === 'COMMIT' && ++commits === 2) { reachCommit(); await released; }
          return Reflect.apply(connection.query, connection, args);
        };
        const value = Reflect.get(connection, property);
        return typeof value === 'function' ? value.bind(connection) : value;
      } });
    };
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
  const call = createAasrFixtureService({ pool: guardedPool, origin, enabled: () => true, identity: async () => aasrTestSession('owner'), stagingAssignment: () => stagingAssignment() });
  let revoke: Promise<void> | undefined;
  try {
    const write = call(request('accept_scope'));
    await reached;
    let revoked = false;
    revoke = revokeSession(isolated.pool, aasrTestSession('owner').session).then(() => { revoked = true; });
    let waiting = false;
    for (let i = 0; i < 100 && !waiting; i++) {
      waiting = Boolean((await isolated.control.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory' AND query LIKE 'WITH session_lock%' LIMIT 1")).rowCount);
      if (!waiting) await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(waiting, true, 'logout must wait on the fixture shared session lock');
    assert.equal(revoked, false);
    releaseCommit();
    assert.equal((await write).status, 200);
    await revoke;
    assert.equal((await call(request('submit_evidence', 1))).status, 401);
  } finally { releaseCommit(); await revoke; await isolated.close(); }
});
