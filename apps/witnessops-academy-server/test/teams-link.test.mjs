import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TeamsLinkInputError,
  confirmTeamsLinkIntent,
  createTeamsLinkIntent,
  hasTeamsIdentityLink,
  previewTeamsLinkIntent,
  resolveTeamsIdentityLink,
  revokeTeamsIdentityLink,
  teamsLinkTokenHash,
} from '../src/teams-link.mjs';

const TENANT = 'a0000000-0000-4000-8000-000000000001';
const OBJECT = 'b0000000-0000-4000-8000-000000000002';
const OTHER_OBJECT = 'b0000000-0000-4000-8000-000000000003';
const IDENTITY = 'c0000000-0000-4000-8000-000000000003';
const TOKEN = Buffer.alloc(32, 9).toString('base64url');
const CLAIMS = {
  tenantId: TENANT,
  objectId: OBJECT,
  subject: 'opaque-entra-subject-a',
  issuer: `https://login.microsoftonline.com/${TENANT}/v2.0`,
};

function fakeDb(rows = []) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: rows.shift() || [] };
    },
  };
}

test('only a canonical 32-byte one-time intent token is accepted', () => {
  assert.match(teamsLinkTokenHash(TOKEN), /^[0-9a-f]{64}$/);
  for (const token of ['', 'a'.repeat(42), 'a'.repeat(44), TOKEN + '=', '?token=' + TOKEN]) {
    assert.throws(() => teamsLinkTokenHash(token), TeamsLinkInputError);
  }
});

test('verified Entra claims stay exact, opaque, tenant-bound and profile-free', async () => {
  const badClaims = [
    { ...CLAIMS, issuer: `https://login.microsoftonline.com/${OTHER_OBJECT}/v2.0` },
    { ...CLAIMS, issuer: `https://login.microsoftonline.com/${TENANT}/v2.0/` },
    { ...CLAIMS, issuer: `https://login.microsoftonline.com:443/${TENANT}/v2.0` },
    { ...CLAIMS, issuer: `https://login.microsoftonline.com/${TENANT}/v2.0?next=x` },
    { ...CLAIMS, issuer: `https://example.invalid/${TENANT}/v2.0` },
    { ...CLAIMS, tenantId: TENANT.toUpperCase() },
    {
      ...CLAIMS,
      tenantId: '00000000-0000-0000-0000-000000000000',
      issuer: 'https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000/v2.0',
    },
    { ...CLAIMS, objectId: 'not-a-uuid' },
    { ...CLAIMS, objectId: '00000000-0000-0000-0000-000000000000' },
    { ...CLAIMS, subject: 'x'.repeat(257) },
    { ...CLAIMS, subject: 'subject\nforged-log' },
    { ...CLAIMS, email: 'karol@example.invalid' },
    { ...CLAIMS, name: 'Synthetic Person' },
    { ...CLAIMS, bearer: 'secret' },
  ];
  for (const claims of badClaims) {
    let called = false;
    await assert.rejects(createTeamsLinkIntent({ query: async () => { called = true; } }, claims), TeamsLinkInputError);
    assert.equal(called, false);
  }
  const boundaryDb = fakeDb([[{ expires_at: new Date('2030-01-01T00:05:00Z') }]]);
  assert.equal((await createTeamsLinkIntent(boundaryDb, { ...CLAIMS, subject: 'x'.repeat(256) })).ok, true);
});

test('intent creation stores only SHA256 and returns the random bearer once', async () => {
  const expiresAt = new Date('2030-01-01T00:05:00Z');
  const firstDb = fakeDb([[{ intent_id: IDENTITY, expires_at: expiresAt }]]);
  const secondDb = fakeDb([[{ intent_id: IDENTITY, expires_at: expiresAt }]]);
  const first = await createTeamsLinkIntent(firstDb, CLAIMS);
  const second = await createTeamsLinkIntent(secondDb, CLAIMS);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.notEqual(first.token, second.token);
  assert.equal(Buffer.from(first.token, 'base64url').length, 32);
  assert.equal(first.expiresAt, expiresAt);
  const call = firstDb.calls[0];
  assert.match(call.sql, /academy_create_teams_link_intent/);
  assert.deepEqual(call.params.slice(1), [CLAIMS.issuer, TENANT, OBJECT, CLAIMS.subject]);
  assert.equal(call.params[0], teamsLinkTokenHash(first.token));
  assert.equal(JSON.stringify(firstDb.calls).includes(first.token), false);
});

test('preview and confirmation send only a hash plus the session-derived Academy identity', async () => {
  const expiresAt = new Date('2030-01-01T00:05:00Z');
  const db = fakeDb([
    [{ intent_id: IDENTITY, expires_at: expiresAt }],
    [{ link_id: IDENTITY }],
  ]);
  assert.deepEqual(await previewTeamsLinkIntent(db, { token: TOKEN }), { ok: true, expiresAt });
  assert.deepEqual(await confirmTeamsLinkIntent(db, { token: TOKEN, identityId: IDENTITY }), { ok: true });
  assert.deepEqual(db.calls[0].params, [teamsLinkTokenHash(TOKEN)]);
  assert.deepEqual(db.calls[1].params, [teamsLinkTokenHash(TOKEN), IDENTITY]);
  assert.equal(JSON.stringify(db.calls).includes(TOKEN), false);
  assert.match(db.calls[0].sql, /academy_preview_teams_link_intent/);
  assert.match(db.calls[1].sql, /academy_confirm_teams_link_intent/);
});

test('resolve requires all immutable Entra claims and returns only the Academy identity', async () => {
  const db = fakeDb([[{ link_id: OBJECT, identity_id: IDENTITY }]]);
  assert.deepEqual(await resolveTeamsIdentityLink(db, CLAIMS), { ok: true, identityId: IDENTITY });
  assert.deepEqual(db.calls[0].params, [CLAIMS.issuer, TENANT, OBJECT, CLAIMS.subject]);
  assert.match(db.calls[0].sql, /academy_resolve_teams_identity_link/);
  assert.equal(JSON.stringify(db.calls).includes('email'), false);
});

test('link status and revocation are scoped only to the authenticated Academy identity', async () => {
  const db = fakeDb([
    [{ linked: true }],
    [{ link_id: OBJECT }],
    [{ linked: false }],
  ]);
  assert.equal(await hasTeamsIdentityLink(db, { identityId: IDENTITY }), true);
  assert.deepEqual(await revokeTeamsIdentityLink(db, { identityId: IDENTITY }), { ok: true });
  assert.equal(await hasTeamsIdentityLink(db, { identityId: IDENTITY }), false);
  assert.deepEqual(db.calls.map(call => call.params), [[IDENTITY], [IDENTITY], [IDENTITY]]);
  assert.match(db.calls[0].sql, /academy_has_teams_identity_link/);
  assert.match(db.calls[1].sql, /academy_revoke_teams_identity_link/);
});

test('expired, replayed, conflicting, missing and revoked states share one denial', async () => {
  const expected = { ok: false, error: 'teams_link_unavailable' };
  assert.deepEqual(await previewTeamsLinkIntent(fakeDb([[]]), { token: TOKEN }), expected);
  assert.deepEqual(await confirmTeamsLinkIntent(fakeDb([[]]), { token: TOKEN, identityId: IDENTITY }), expected);
  assert.deepEqual(await resolveTeamsIdentityLink(fakeDb([[]]), CLAIMS), expected);
  assert.deepEqual(await revokeTeamsIdentityLink(fakeDb([[]]), { identityId: IDENTITY }), expected);
  assert.deepEqual(await createTeamsLinkIntent(fakeDb([[]]), CLAIMS), expected);
});

test('unexpected owner, scope, profile and bearer fields fail before database access', async () => {
  let called = false;
  const db = { query: async () => { called = true; return { rows: [] }; } };
  await assert.rejects(previewTeamsLinkIntent(db, { token: TOKEN, identityId: IDENTITY }), TeamsLinkInputError);
  await assert.rejects(confirmTeamsLinkIntent(db, { token: TOKEN, identityId: IDENTITY, owner_id: IDENTITY }), TeamsLinkInputError);
  await assert.rejects(resolveTeamsIdentityLink(db, { ...CLAIMS, scope: 'admin' }), TeamsLinkInputError);
  await assert.rejects(hasTeamsIdentityLink(db, { identityId: 'person@example.invalid' }), TeamsLinkInputError);
  await assert.rejects(revokeTeamsIdentityLink(db, { identityId: IDENTITY, reason: 'operator' }), TeamsLinkInputError);
  assert.equal(called, false);
});
