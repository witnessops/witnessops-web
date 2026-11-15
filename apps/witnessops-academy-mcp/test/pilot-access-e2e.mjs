// Opt-in real PostgreSQL admission/least-privilege checks. Synthetic fixtures only.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import pg from 'pg';
import { assertPilotAccessReady, hasPilotAdmission, withPilotAdmission } from '../src/pilot-access.mjs';
import { createInvitationBatch, redeemInvitation, revokeFreeGrant } from '../../witnessops-academy-server/src/pilot-invitations.mjs';
import { cleanupPilotInvitationFixtures, PILOT_FIXTURE_ISSUER } from '../../witnessops-academy-server/test/pilot-fixture-cleanup.mjs';

if (process.env.ACADEMY_E2E !== '1' || process.env.ACADEMY_INVITATIONS_DISPOSABLE !== '1') {
  throw new Error('Explicit disposable invitation profile required');
}
const host = process.env.ACADEMY_DB_HOST;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('Disposable PostgreSQL must be loopback');
const common = {
  host, port: Number(process.env.ACADEMY_DB_PORT), database: process.env.ACADEMY_DB_NAME,
  connectionTimeoutMillis: 5000, query_timeout: 5000, max: 2,
};
if (!common.database || !Number.isSafeInteger(common.port)) throw new Error('Incomplete disposable PostgreSQL metadata');
const secret = name => {
  const filename = process.env[name];
  if (!filename) throw new Error('Synthetic secret-file reference missing: ' + name);
  return readFileSync(filename, 'utf8').trim();
};
const operator = new pg.Pool({ ...common,
  user: process.env.ACADEMY_TEST_PGADMIN_USER || 'postgres', password: secret('ACADEMY_TEST_PGADMIN_PASSWORD_FILE') });
const mcp = new pg.Pool({ ...common,
  user: process.env.ACADEMY_MCP_DB_USER || 'academy_mcp', password: secret('ACADEMY_MCP_DB_PASSWORD_FILE') });
const app = new pg.Pool({ ...common,
  user: process.env.ACADEMY_DB_USER || 'academy_app', password: secret('ACADEMY_DB_PASSWORD_FILE') });
const tag = 'synthetic-invitation-' + randomUUID();
const refs = { approvalReference: tag + '-owner-approved-free', administratorReference: tag + '-operator' };
const identities = [];

try {
  for (const suffix of ['a', 'b']) {
    const subject = tag + '-' + suffix;
    const row = (await operator.query(
      'INSERT INTO public.academy_identities(issuer, subject) VALUES ($1,$2) RETURNING id',
      [PILOT_FIXTURE_ISSUER, subject],
    )).rows[0];
    identities.push({ id: row.id, issuer: PILOT_FIXTURE_ISSUER, subject });
  }
  const [admitted, uninvited] = identities;

  await test('MCP PG1 repeatable reconciliation retains only a boolean status predicate', async () => {
    const reconcile = readFileSync(new URL('../../witnessops-academy-server/db/reconcile-academy-mcp.sql', import.meta.url), 'utf8');
    await operator.query(reconcile);
    await operator.query(reconcile);
    await assertPilotAccessReady(mcp, 'approved-free-pilot');
    assert.equal(await hasPilotAdmission(mcp, admitted.id), false);
    for (const sql of [
      'SELECT * FROM public.academy_pilot_grants',
      'SELECT recipient_subject FROM public.academy_pilot_invitations',
      'UPDATE public.academy_pilot_grants SET revoked_at=NULL',
      'DELETE FROM public.academy_lesson_drafts',
      'SELECT token_hash FROM public.academy_sessions',
      'SET ROLE academy_migrator',
      "SELECT * FROM public.academy_preview_pilot_invitation('invalid',NULL::uuid)",
      "SELECT * FROM public.academy_redeem_pilot_invitation('invalid',NULL::uuid)",
    ]) await assert.rejects(mcp.query(sql), error => error.code === '42501');
    await assert.rejects(app.query('SELECT public.academy_has_approved_free_grant(NULL::uuid)'), error => error.code === '42501');
    const acl = (await operator.query(`
      SELECT pg_get_userbyid(p.proowner) AS owner, p.prosecdef, p.proconfig,
             has_function_privilege('academy_mcp', p.oid, 'EXECUTE') AS mcp_execute,
             EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='academy_has_approved_free_grant'
    `)).rows[0];
    assert.deepEqual({ owner: acl.owner, definer: acl.prosecdef, mcp: acl.mcp_execute, public: acl.public_execute },
      { owner: 'academy_migrator', definer: true, mcp: true, public: false });
    assert.equal(acl.proconfig.includes('search_path=pg_catalog, public, pg_temp'), true);
  });

  await test('MCP PG2 only the redeemed recipient receives status; the other owner remains denied', async () => {
    const invitation = (await createInvitationBatch(operator, {
      ...refs, recipients: [{ issuer: admitted.issuer, subject: admitted.subject }],
    })).invitations[0];
    assert.equal((await redeemInvitation(app, { token: invitation.token, identityId: admitted.id })).accepted, true);
    assert.equal(await hasPilotAdmission(mcp, admitted.id), true);
    assert.equal(await hasPilotAdmission(mcp, uninvited.id), false);
  });

  await test('MCP PG3 a fresh status check denies the next call after revocation while retaining every draft', async () => {
    for (const identity of identities) {
      for (const lesson of ['report-or-evidence', 'same-scope']) {
        await operator.query(`
          INSERT INTO public.academy_lesson_drafts(owner_id,lesson_id,content,last_save_request_id)
          VALUES ($1,$2,$3,$4)
        `, [identity.id, lesson, 'synthetic retained ' + identity.subject + ' ' + lesson, randomUUID()]);
      }
    }
    const before = (await operator.query(
      'SELECT owner_id,lesson_id,content,version FROM public.academy_lesson_drafts WHERE owner_id=ANY($1::uuid[]) ORDER BY owner_id,lesson_id',
      [identities.map(identity => identity.id)],
    )).rows;
    let called = 0;
    const guard = withPilotAdmission({ db: mcp, policy: 'approved-free-pilot', ownerId: async () => admitted.id },
      async () => { called += 1; return { allowed: true }; });
    assert.deepEqual(await guard({}, { authInfo: {} }), { allowed: true });
    assert.equal((await revokeFreeGrant(operator, { identityId: admitted.id, administratorReference: refs.administratorReference })).ok, true);
    assert.deepEqual((await guard({}, { authInfo: {} })).structuredContent, { error: 'access_required', status: 403 });
    assert.equal(called, 1);
    const after = (await operator.query(
      'SELECT owner_id,lesson_id,content,version FROM public.academy_lesson_drafts WHERE owner_id=ANY($1::uuid[]) ORDER BY owner_id,lesson_id',
      [identities.map(identity => identity.id)],
    )).rows;
    assert.deepEqual(after, before);
    assert.equal(after.length, 4);
  });
} finally {
  try {
    // Delete only this runner's exact untouched synthetic drafts. The shared
    // cleanup refuses identities carrying any unexpected foreign work.
    for (const identity of identities) {
      for (const lesson of ['report-or-evidence', 'same-scope']) {
        await operator.query(`
          DELETE FROM public.academy_lesson_drafts
          WHERE owner_id=$1 AND lesson_id=$2 AND content=$3 AND version=1
        `, [identity.id, lesson, 'synthetic retained ' + identity.subject + ' ' + lesson]);
      }
    }
    const removed = await cleanupPilotInvitationFixtures(operator, { tag, identities });
    console.log('CLEANUP MCP pilot fixtures PASS ' + JSON.stringify(removed));
  } finally {
    await Promise.all([operator.end(), mcp.end(), app.end()]);
  }
}
