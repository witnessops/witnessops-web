import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createAasrTestDatabase, aasrTestSession, AASR_TEST_USERS, type AasrTestActor } from '../../../../../tests/app-foundation/aasr-db';
import { createAasrFixtureService } from '../aasr-fixture/server';
import { AASR_FIXTURE_PATH, AASR_FIXTURE_WORKSPACE_ID } from '../aasr-fixture/contract';
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
