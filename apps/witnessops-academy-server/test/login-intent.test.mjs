import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLoginIdentity } from '../src/login-intent.mjs';

const CLAIMS = {
  iss: 'https://idp.example.invalid/realms/academy',
  sub: 'synthetic-existing-academy-subject',
};
const IDENTITY_ID = '11111111-2222-4333-8444-555555555555';

function database(selectRows) {
  const calls = [];
  return {
    calls,
    async query(sql, values) {
      calls.push({ sql, values });
      return { rows: sql.startsWith('SELECT ') ? selectRows : [] };
    },
  };
}

test('Teams-link callback resolves an existing Academy identity without creating one', async () => {
  const db = database([{ id: IDENTITY_ID }]);
  assert.equal(await resolveLoginIdentity(db, CLAIMS, { returnTo: 'teams-link' }), IDENTITY_ID);
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].sql, /^SELECT id FROM academy_identities/);
  assert.deepEqual(db.calls[0].values, [CLAIMS.iss, CLAIMS.sub]);
});

test('Teams-link callback rejects a principal with no existing Academy identity', async () => {
  const db = database([]);
  assert.equal(await resolveLoginIdentity(db, CLAIMS, { returnTo: 'teams-link' }), null);
  assert.equal(db.calls.length, 1);
  assert.doesNotMatch(db.calls[0].sql, /INSERT/);
});

test('ordinary Academy login retains insert-if-absent identity creation', async () => {
  const db = database([{ id: IDENTITY_ID }]);
  assert.equal(await resolveLoginIdentity(db, CLAIMS, {}), IDENTITY_ID);
  assert.equal(db.calls.length, 2);
  assert.match(db.calls[0].sql, /^INSERT INTO academy_identities/);
  assert.match(db.calls[1].sql, /^SELECT id FROM academy_identities/);
});
