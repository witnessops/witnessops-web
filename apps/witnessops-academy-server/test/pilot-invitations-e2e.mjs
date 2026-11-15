// Opt-in real PostgreSQL only. Source TEST_ENV from the dedicated disposable harness.
// Never point these checks at an operational database.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import pg from 'pg';
import { cleanupPilotInvitationFixtures, PILOT_FIXTURE_ISSUER, PILOT_FIXTURE_OTHER_ISSUER } from './pilot-fixture-cleanup.mjs';
import {
  createInvitationBatch, hasApprovedFreeGrant, invitationTokenHash, previewInvitation,
  redeemInvitation, revokeFreeGrant, revokeInvitation,
} from '../src/pilot-invitations.mjs';

if (process.env.ACADEMY_E2E !== '1' || process.env.ACADEMY_INVITATIONS_DISPOSABLE !== '1') {
  throw new Error('Explicit disposable invitation profile required: ACADEMY_E2E=1 ACADEMY_INVITATIONS_DISPOSABLE=1');
}
const host = process.env.ACADEMY_DB_HOST;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('Disposable PostgreSQL must be loopback');
function secret(name) {
  const path = process.env[name];
  if (!path) throw new Error('Required synthetic secret-file reference missing: ' + name);
  return readFileSync(path, 'utf8').trim();
}
const common = {
  host, port: Number(process.env.ACADEMY_DB_PORT), database: process.env.ACADEMY_DB_NAME,
  connectionTimeoutMillis: 5000, max: 8,
};
if (!common.database || !Number.isSafeInteger(common.port)) throw new Error('Incomplete disposable PostgreSQL metadata');
const runtime = new pg.Pool({
  ...common, user: process.env.ACADEMY_DB_USER,
  password: secret('ACADEMY_DB_PASSWORD_FILE'),
});
const operator = new pg.Pool({
  ...common, user: process.env.ACADEMY_TEST_PGADMIN_USER || 'postgres',
  password: secret('ACADEMY_TEST_PGADMIN_PASSWORD_FILE'),
});
const issuer = PILOT_FIXTURE_ISSUER;
const tag = 'synthetic-invitation-' + randomUUID();
const approvalReference = tag + '-owner-approved-free';
const administratorReference = tag + '-operator';
const learners = [];
const createdIdentities = [];
const refs = { approvalReference, administratorReference };

try {
  const applied = await operator.query("SELECT 1 FROM public.academy_schema_migrations WHERE version='004_academy_pilot_invitations'");
  assert.equal(applied.rowCount, 1, 'invitation migration must already be applied by the explicit harness');
  for (const name of ['a', 'b', 'c', 'd', 'e', 'f']) {
    const subject = tag + '-' + name;
    const row = (await operator.query(
      'INSERT INTO public.academy_identities(issuer, subject) VALUES ($1, $2) RETURNING id',
      [issuer, subject],
    )).rows[0];
    const identity = { issuer, subject, id: row.id };
    learners.push(identity);
    createdIdentities.push(identity);
  }
  const [a, b, c, d, e, f] = learners;
  const wrongIssuerIdentity = (await operator.query(
    'INSERT INTO public.academy_identities(issuer, subject) VALUES ($1, $2) RETURNING id',
    [PILOT_FIXTURE_OTHER_ISSUER, a.subject],
  )).rows[0].id;
  createdIdentities.push({ id: wrongIssuerIdentity, issuer: PILOT_FIXTURE_OTHER_ISSUER, subject: a.subject });
  await operator.query(`
    INSERT INTO public.academy_lesson_drafts(owner_id, lesson_id, content, last_save_request_id)
    VALUES ($1, 'invitation-preservation-fixture', 'synthetic pre-existing work', $2)
  `, [a.id, randomUUID()]);

  let aInvite;
  let bExpired;
  await test('PG1 create/preview is identity-scoped and stores only a bearer hash', async () => {
    const result = await createInvitationBatch(operator, {
      ...refs, recipients: [a, b].map(({ issuer: i, subject }) => ({ issuer: i, subject })),
    });
    [aInvite, bExpired] = result.invitations;
    const stored = (await operator.query(
      'SELECT token_hash, recipient_issuer, recipient_subject FROM public.academy_pilot_invitations WHERE id=$1',
      [aInvite.invitationId],
    )).rows[0];
    assert.equal(stored.token_hash === invitationTokenHash(aInvite.token), true);
    assert.equal(stored.token_hash === aInvite.token, false);
    assert.equal((await previewInvitation(runtime, { token: aInvite.token, identityId: a.id })).eligible, true);
    assert.equal((await previewInvitation(runtime, { token: aInvite.token, identityId: b.id })).eligible, false);
  });

  await test('PG2 wrong recipient or forged internal owner cannot redeem or gain membership', async () => {
    assert.equal((await redeemInvitation(runtime, { token: aInvite.token, identityId: b.id })).accepted, false);
    assert.equal((await redeemInvitation(runtime, { token: aInvite.token, identityId: wrongIssuerIdentity })).accepted, false);
    assert.equal(await hasApprovedFreeGrant(runtime, { identityId: a.id }), false);
    assert.equal(await hasApprovedFreeGrant(runtime, { identityId: b.id }), false);
    await assert.rejects(redeemInvitation(runtime, { token: aInvite.token, identityId: a.id, owner_id: b.id }));
  });

  await test('PG3 two concurrent redemptions produce exactly one grant and consume the link once', async () => {
    const attempts = await Promise.all([
      redeemInvitation(runtime, { token: aInvite.token, identityId: a.id }),
      redeemInvitation(runtime, { token: aInvite.token, identityId: a.id }),
    ]);
    assert.equal(attempts.filter((result) => result.accepted).length, 1);
    assert.equal((await redeemInvitation(runtime, { token: aInvite.token, identityId: a.id })).accepted, false);
    assert.equal(await hasApprovedFreeGrant(runtime, { identityId: a.id }), true);
    assert.equal((await operator.query(
      'SELECT count(*)::integer AS count FROM public.academy_pilot_grants WHERE invitation_id=$1',
      [aInvite.invitationId],
    )).rows[0].count, 1);
  });

  await test('PG4 expired and owner-revoked invitations deny access without consuming a valid grant', async () => {
    // Explicit disposable fault injection keeps the seven-day schema invariant.
    await operator.query(`
      UPDATE public.academy_pilot_invitations
      SET created_at=clock_timestamp()-interval '2 days',
          expires_at=clock_timestamp()-interval '1 day' WHERE id=$1
    `, [bExpired.invitationId]);
    assert.equal((await redeemInvitation(runtime, { token: bExpired.token, identityId: b.id })).accepted, false);
    const replacement = (await createInvitationBatch(operator, {
      ...refs, recipients: [{ issuer: b.issuer, subject: b.subject }],
    })).invitations[0];
    assert.equal((await revokeInvitation(operator, {
      invitationId: replacement.invitationId, administratorReference: tag + '-revoke-invitation',
    })).ok, true);
    assert.equal((await redeemInvitation(runtime, { token: replacement.token, identityId: b.id })).accepted, false);
    assert.equal(await hasApprovedFreeGrant(runtime, { identityId: b.id }), false);
    assert.equal(await hasApprovedFreeGrant(runtime, { identityId: a.id }), true);
  });

  await test('PG5 runtime cannot create, update or revoke invitations/grants, read recipients or impersonate the migrator', async () => {
    for (const sql of [
      'SELECT recipient_subject FROM public.academy_pilot_invitations',
      "INSERT INTO public.academy_pilot_grants(identity_id, invitation_id, approval_reference, administrator_reference) VALUES (gen_random_uuid(), gen_random_uuid(), 'forged', 'forged')",
      'UPDATE public.academy_pilot_grants SET revoked_at=NULL',
      'DELETE FROM public.academy_pilot_invitations',
      'SET ROLE academy_migrator',
    ]) {
      await assert.rejects(runtime.query(sql), (error) => error.code === '42501');
    }
    const acl = await operator.query(`
      SELECT p.proname, pg_get_userbyid(p.proowner) AS owner,
             p.prosecdef, p.proconfig,
             has_function_privilege('academy_mcp', p.oid, 'EXECUTE') AS mcp_execute
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN (
        'academy_preview_pilot_invitation', 'academy_redeem_pilot_invitation')
    `);
    assert.equal(acl.rowCount, 2);
    for (const row of acl.rows) {
      assert.equal(row.owner, 'academy_migrator');
      assert.equal(row.prosecdef, true);
      assert.equal(row.mcp_execute, false);
      assert.equal(row.proconfig.includes('search_path=pg_catalog, public, pg_temp'), true);
    }
  });

  await test('PG6 revoking a grant denies access immediately, preserves saved work and cannot be replayed into revival', async () => {
    assert.equal((await revokeFreeGrant(operator, {
      identityId: a.id, administratorReference: tag + '-revoke-grant',
    })).ok, true);
    assert.equal(await hasApprovedFreeGrant(runtime, { identityId: a.id }), false);
    assert.equal((await redeemInvitation(runtime, { token: aInvite.token, identityId: a.id })).accepted, false);
    await assert.rejects(createInvitationBatch(operator, {
      ...refs, recipients: [{ issuer: a.issuer, subject: a.subject }],
    }), /recipient_already_recorded/);
    const work = (await operator.query(
      "SELECT content,version FROM public.academy_lesson_drafts WHERE owner_id=$1 AND lesson_id='invitation-preservation-fixture'",
      [a.id],
    )).rows[0];
    assert.equal(work.content, 'synthetic pre-existing work');
    assert.equal(work.version, 1);
  });

  await test('PG7 only four explicitly invited active free learners fit; SQL itself denies a fifth', async () => {
    const batch = await createInvitationBatch(operator, {
      ...refs, recipients: [b, c, d, e].map(({ issuer: i, subject }) => ({ issuer: i, subject })),
    });
    for (let index = 0; index < batch.invitations.length; index += 1) {
      const owner = [b, c, d, e][index];
      assert.equal((await redeemInvitation(runtime, {
        token: batch.invitations[index].token, identityId: owner.id,
      })).accepted, true);
    }
    await assert.rejects(createInvitationBatch(operator, {
      ...refs, recipients: [{ issuer: f.issuer, subject: f.subject }],
    }), /pilot_capacity/);
    // Bypass the JS capacity precheck as the fixture owner: the runtime SQL function still enforces it.
    const raw = randomBytes(32).toString('base64url');
    await operator.query(`
      INSERT INTO public.academy_pilot_invitations(
        token_hash, recipient_issuer, recipient_subject, approval_reference, administrator_reference, expires_at
      ) VALUES ($1,$2,$3,$4,$5,statement_timestamp()+interval '1 hour')
    `, [invitationTokenHash(raw), f.issuer, f.subject, approvalReference, administratorReference]);
    assert.equal((await redeemInvitation(runtime, { token: raw, identityId: f.id })).accepted, false);
    assert.equal(await hasApprovedFreeGrant(runtime, { identityId: f.id }), false);
  });
} finally {
  try {
    const removed = await cleanupPilotInvitationFixtures(operator, { tag, identities: createdIdentities });
    console.log('CLEANUP pilot invitation fixtures PASS ' + JSON.stringify(removed));
  } finally {
    await Promise.all([runtime.end(), operator.end()]);
  }
}
// Cleanup is transactional and scoped to this random tag plus exact tracked UUIDs.
// The enclosing harness owns its database and generated secret-file lifecycle.

