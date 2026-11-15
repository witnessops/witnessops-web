import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { persistCiAccessPolicy } from './ci-access-policy.mjs';
import { cleanupPilotInvitationFixtures, PILOT_FIXTURE_ISSUER } from './pilot-fixture-cleanup.mjs';

const tag = 'synthetic-invitation-00000000-0000-4000-8000-000000000001';
const identity = { id: '00000000-0000-4000-8000-000000000002', issuer: PILOT_FIXTURE_ISSUER, subject: tag + '-a' };
const env = { ACADEMY_E2E: '1', ACADEMY_INVITATIONS_DISPOSABLE: '1', ACADEMY_DB_HOST: '127.0.0.1', ACADEMY_DB_NAME: 'academy' };

test('persisted profile changes only its one field and retains all other CI values', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'academy-ci-profile-test-'));
  const filename = path.join(root, 'ci.env');
  const original = 'ACADEMY_DB_NAME=academy\nACADEMY_ACCESS_POLICY=session-only\nACADEMY_DB_PASSWORD_FILE=/synthetic/private/path\n';
  try {
    await writeFile(filename, original, { mode: 0o600 });
    const config = { ...env, ACADEMY_CI_ENV: filename, ACADEMY_PUBLIC_ORIGIN: 'http://127.0.0.1:18300', ACADEMY_TEST_APP_URL: 'http://127.0.0.1:18300' };
    await persistCiAccessPolicy('approved-free-pilot', config);
    const changed = await readFile(filename, 'utf8');
    assert.equal(changed, original.replace('session-only', 'approved-free-pilot'));
    await persistCiAccessPolicy('session-only', config);
    assert.equal(await readFile(filename, 'utf8'), original);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('profile changes refuse non-disposable, remote, invalid, ambiguous or public files without mutation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'academy-ci-profile-test-'));
  const filename = path.join(root, 'ci.env');
  const original = 'ACADEMY_ACCESS_POLICY=session-only\n';
  try {
    await writeFile(filename, original, { mode: 0o600 });
    const config = { ...env, ACADEMY_CI_ENV: filename, ACADEMY_PUBLIC_ORIGIN: 'http://127.0.0.1:18300', ACADEMY_TEST_APP_URL: 'http://127.0.0.1:18300' };
    for (const bad of [{ ACADEMY_E2E: '0' }, { ACADEMY_INVITATIONS_DISPOSABLE: '0' }, { ACADEMY_DB_HOST: 'database.example.invalid' }, { ACADEMY_PUBLIC_ORIGIN: 'https://academy.example.invalid' }]) {
      await assert.rejects(persistCiAccessPolicy('approved-free-pilot', { ...config, ...bad }));
      assert.equal(await readFile(filename, 'utf8'), original);
    }
    await assert.rejects(persistCiAccessPolicy('free-for-everyone', config));
    await chmod(filename, 0o644);
    await assert.rejects(persistCiAccessPolicy('approved-free-pilot', config));
    await chmod(filename, 0o600);
    await writeFile(filename, original + original);
    await assert.rejects(persistCiAccessPolicy('approved-free-pilot', config));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('fixture cleanup refuses untracked/non-tagged identities or missing disposable scope before connecting', async () => {
  let connected = false;
  const pool = { connect: async () => { connected = true; } };
  await assert.rejects(cleanupPilotInvitationFixtures(pool, { tag, identities: [identity] }, { ...env, ACADEMY_E2E: '0' }));
  await assert.rejects(cleanupPilotInvitationFixtures(pool, { tag, identities: [{ ...identity, subject: 'unrelated-learner' }] }, env));
  await assert.rejects(cleanupPilotInvitationFixtures(pool, { tag, identities: [{ ...identity, issuer: 'https://real-idp.example.invalid' }] }, env));
  assert.equal(connected, false);
});

test('fixture mapping mismatch rolls back before any delete and releases the connection', async () => {
  const calls = [];
  let released = false;
  const client = { query: async (sql) => {
    calls.push(sql);
    if (sql.includes('current_database')) return { rows: [{ database: 'academy' }] };
    if (sql.startsWith('SELECT id, issuer')) return { rows: [{ ...identity, subject: 'other-fixture' }] };
    return { rows: [], rowCount: 0 };
  }, release: () => { released = true; } };
  await assert.rejects(cleanupPilotInvitationFixtures({ connect: async () => client }, { tag, identities: [identity] }, env));
  assert.equal(calls.some(sql => sql.includes('DELETE')), false);
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(released, true);
});

test('cleanup deletes only exact tracked identity/invite IDs and approval references in one transaction', async () => {
  const calls = [];
  const invitationId = '00000000-0000-4000-8000-000000000003';
  const client = { query: async (sql, params = []) => {
    calls.push({ sql, params });
    if (sql.includes('current_database')) return { rows: [{ database: 'academy' }] };
    if (sql.startsWith('SELECT id, issuer')) return { rows: [identity] };
    if (sql.includes('SELECT id FROM public.academy_pilot_invitations')) return { rows: [{ id: invitationId }] };
    if (sql.includes('count(*)')) return { rows: [{ count: 0 }] };
    return { rows: [], rowCount: sql.includes('DELETE') ? 1 : 0 };
  }, release() {} };
  const removed = await cleanupPilotInvitationFixtures({ connect: async () => client }, { tag, identities: [identity] }, env);
  assert.deepEqual(removed, { identities: 1, invitations: 1, grants: 1, drafts: 1 });
  const grants = calls.find(call => call.sql.includes('DELETE FROM public.academy_pilot_grants'));
  assert.deepEqual(grants.params, [[identity.id], [invitationId], tag + '-owner-approved-free', tag + '-operator']);
  const lastDelete = calls.find(call => call.sql.includes('DELETE FROM public.academy_identities'));
  assert.deepEqual(lastDelete.params, [identity.id, identity.issuer, identity.subject]);
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('cleanup failure is propagated after rollback rather than reporting success or deleting another fixture', async () => {
  const calls = [];
  const client = { query: async (sql) => {
    calls.push(sql);
    if (sql.includes('current_database')) return { rows: [{ database: 'academy' }] };
    if (sql.startsWith('SELECT id, issuer')) return { rows: [identity] };
    if (sql.includes('SELECT id FROM public.academy_pilot_invitations')) return { rows: [] };
    if (sql.includes('DELETE')) throw Object.assign(new Error('synthetic foreign fixture guard'), { code: '23503' });
    return { rows: [], rowCount: 0 };
  }, release() {} };
  await assert.rejects(cleanupPilotInvitationFixtures({ connect: async () => client }, { tag, identities: [identity] }, env), { code: '23503' });
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(calls.includes('COMMIT'), false);
});
