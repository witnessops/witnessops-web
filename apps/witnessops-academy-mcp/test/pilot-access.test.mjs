import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPilotAccessReady, hasPilotAdmission, requireAccessPolicy, withPilotAdmission } from '../src/pilot-access.mjs';
import { TOOLS } from '../src/tools.mjs';

const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const extra = { authInfo: { extra: { iss: 'https://issuer.example.invalid', sub: 'verified-subject' } } };

test('admission is the default and unknown policy values fail closed', () => {
  assert.equal(requireAccessPolicy(), 'approved-free-pilot');
  assert.equal(requireAccessPolicy('session-only'), 'session-only');
  for (const value of ['', null, false, 'free', 'APPROVED-FREE-PILOT']) {
    assert.throws(() => requireAccessPolicy(value), /Unknown Academy access policy/);
  }
});

test('startup requires the installed status predicate and its narrow EXECUTE permission', async () => {
  let calls = 0;
  const db = { query: async (sql) => {
    calls += 1;
    assert.match(sql, /academy_has_approved_free_grant\(NULL::uuid\)/);
    return { rows: [{ admitted: false }] };
  } };
  await assertPilotAccessReady(db, 'approved-free-pilot');
  await assertPilotAccessReady(db, 'session-only');
  assert.equal(calls, 1);
  await assert.rejects(assertPilotAccessReady({ query: async () => { throw new Error('missing function'); } }, 'approved-free-pilot'));
  await assert.rejects(assertPilotAccessReady({ query: async () => ({ rows: [] }) }, 'approved-free-pilot'));
});

test('all tool kinds deny uninvited learners before reading curriculum or touching drafts', async () => {
  for (const { name } of TOOLS) {
    let invoked = false;
    const guarded = withPilotAdmission({
      db: { query: async (_sql, values) => {
        assert.deepEqual(values, [owner]);
        return { rows: [{ admitted: false }] };
      } },
      policy: 'approved-free-pilot', ownerId: async (auth) => { assert.equal(auth, extra.authInfo); return owner; },
    }, async () => { invoked = true; });
    const result = await guarded({ lesson_id: 'report-or-evidence', owner_id: other, name }, extra);
    assert.deepEqual(result.structuredContent, { error: 'access_required', status: 403 });
    assert.equal(result.isError, true);
    assert.equal(invoked, false);
  }
});

test('each invocation rechecks a grant; revocation on an existing session stops the next call', async () => {
  let admitted = true;
  let reads = 0;
  const db = { query: async () => { reads += 1; return { rows: [{ admitted }] }; } };
  const calls = [];
  const guarded = withPilotAdmission({ db, policy: 'approved-free-pilot', ownerId: async () => owner }, async (args, auth, admittedOwner) => {
    calls.push({ args, auth, owner: admittedOwner });
    return { saved: true };
  });
  assert.deepEqual(await guarded({ lesson_id: 'report-or-evidence' }, extra), { saved: true });
  admitted = false;
  assert.equal((await guarded({ lesson_id: 'report-or-evidence' }, extra)).structuredContent.status, 403);
  assert.equal(reads, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].owner, owner);
  assert.equal(calls[0].auth, extra);
});

test('a status database outage or identity failure cannot invoke a tool or expose an error detail', async () => {
  for (const broken of ['identity', 'database']) {
    let invoked = false;
    const secretDetail = 'synthetic private connection detail';
    const guarded = withPilotAdmission({
      policy: 'approved-free-pilot',
      ownerId: async () => { if (broken === 'identity') throw new Error(secretDetail); return owner; },
      db: { query: async () => { throw new Error(secretDetail); } },
    }, async () => { invoked = true; });
    const result = await guarded({}, extra);
    assert.deepEqual(result.structuredContent, { error: 'access_unavailable', status: 503 });
    assert.equal(JSON.stringify(result).includes(secretDetail), false);
    assert.equal(invoked, false);
  }
});

test('only literal true admits; malformed or absent predicate results deny', async () => {
  for (const rows of [[], [{ admitted: null }], [{ admitted: 'true' }], [{ admitted: 1 }], [{ admitted: true }, { admitted: true }]]) {
    assert.equal(await hasPilotAdmission({ query: async () => ({ rows }) }, owner), false);
  }
});

test('explicit legacy session-only profile does not require pilot schema or change tool arguments', async () => {
  const guarded = withPilotAdmission({
    policy: 'session-only',
    db: { query: async () => assert.fail('legacy fixture queried pilot grants') },
    ownerId: async () => assert.fail('legacy curriculum fixture created an owner'),
  }, async (args, _extra, admittedOwner) => ({ args, admittedOwner }));
  assert.deepEqual(await guarded({ lesson_id: 'report-or-evidence' }, extra), {
    args: { lesson_id: 'report-or-evidence' }, admittedOwner: undefined,
  });
});
