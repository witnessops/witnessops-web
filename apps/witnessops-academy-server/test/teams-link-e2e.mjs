// Opt-in real PostgreSQL only. Source the dedicated disposable Academy test
// profile; never point these checks at an operational database.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import pg from 'pg';
import {
  confirmTeamsLinkIntent,
  createTeamsLinkIntent,
  hasTeamsIdentityLink,
  previewTeamsLinkIntent,
  resolveTeamsIdentityLink,
  revokeTeamsIdentityLink,
  teamsLinkTokenHash,
} from '../src/teams-link.mjs';

if (process.env.ACADEMY_E2E !== '1' || process.env.ACADEMY_TEAMS_LINKS_DISPOSABLE !== '1') {
  throw new Error('Explicit disposable Teams-link profile required: ACADEMY_E2E=1 ACADEMY_TEAMS_LINKS_DISPOSABLE=1');
}
const host = process.env.ACADEMY_DB_HOST;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  throw new Error('Disposable PostgreSQL must be loopback');
}
function secret(name) {
  const filename = process.env[name];
  if (!filename) throw new Error('Required synthetic secret-file reference missing: ' + name);
  return readFileSync(filename, 'utf8').trim();
}
const common = {
  host,
  port: Number(process.env.ACADEMY_DB_PORT),
  database: process.env.ACADEMY_DB_NAME,
  connectionTimeoutMillis: 5000,
  max: 8,
};
if (!common.database || !Number.isSafeInteger(common.port)) {
  throw new Error('Incomplete disposable PostgreSQL metadata');
}
const runtime = new pg.Pool({
  ...common,
  user: process.env.ACADEMY_DB_USER,
  password: secret('ACADEMY_DB_PASSWORD_FILE'),
});
const operator = new pg.Pool({
  ...common,
  user: process.env.ACADEMY_TEST_PGADMIN_USER || 'postgres',
  password: secret('ACADEMY_TEST_PGADMIN_PASSWORD_FILE'),
});

async function waitForBlockedRevoke() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const waiting = (await operator.query(`
      SELECT count(*)::integer AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND wait_event_type = 'Lock' AND wait_event = 'advisory'
        AND query LIKE '%academy_revoke_teams_identity_link%'
    `)).rows[0].count;
    if (waiting >= 1) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('revoke did not wait behind intent creation advisory lock');
}

const tag = 'synthetic-teams-link-' + randomUUID();
const tenantId = randomUUID();
const objectId = randomUUID();
const secondObjectId = randomUUID();
const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
const claims = { tenantId, objectId, subject: tag + '-entra-subject', issuer };
const otherClaims = { ...claims, objectId: secondObjectId, subject: tag + '-other-entra-subject' };
const lessonId = 'teams-link-' + randomUUID();
const sessionTokenHash = createHash('sha256').update(tag + '-session').digest('hex');
const invitationTokenHash = createHash('sha256').update(tag + '-invitation').digest('hex');
const staleIntentHash = createHash('sha256').update(tag + '-stale-intent').digest('hex');
const identities = [];
let invitationId;

try {
  const applied = await operator.query(
    "SELECT 1 FROM public.academy_schema_migrations WHERE version='005_academy_teams_identity_links'",
  );
  assert.equal(applied.rowCount, 1, 'Teams identity-link migration must be applied by the disposable harness');

  for (const suffix of ['a', 'b']) {
    const row = (await operator.query(
      'INSERT INTO public.academy_identities(issuer, subject) VALUES ($1,$2) RETURNING id',
      ['https://idp.example.invalid/realms/academy', `${tag}-academy-${suffix}`],
    )).rows[0];
    identities.push(row.id);
  }
  const [academyA, academyB] = identities;
  invitationId = (await operator.query(`
    INSERT INTO public.academy_pilot_invitations(
      token_hash, recipient_issuer, recipient_subject, approval_reference,
      administrator_reference, expires_at, redeemed_at, redeemed_identity_id
    ) VALUES ($1,$2,$3,'synthetic Teams preservation approval',
      'synthetic Teams preservation administrator',statement_timestamp()+interval '1 day',
      statement_timestamp(),$4)
    RETURNING id
  `, [
    invitationTokenHash,
    'https://idp.example.invalid/realms/academy',
    `${tag}-academy-a`,
    academyA,
  ])).rows[0].id;
  await operator.query(`
    INSERT INTO public.academy_pilot_grants(
      identity_id, invitation_id, approval_reference, administrator_reference
    ) VALUES ($1,$2,'synthetic Teams preservation approval',
      'synthetic Teams preservation administrator')
  `, [academyA, invitationId]);
  await operator.query(`
    INSERT INTO public.academy_sessions(token_hash,identity_id,csrf_token,expires_at)
    VALUES ($1,$2,'synthetic-teams-preservation-csrf',statement_timestamp()+interval '1 hour')
  `, [sessionTokenHash, academyA]);
  await operator.query(`
    INSERT INTO public.academy_lesson_drafts(owner_id, lesson_id, content, last_save_request_id)
    VALUES ($1,$2,'synthetic work that Teams linking must preserve',$3)
  `, [academyA, lessonId, randomUUID()]);

  const [sessionBefore, grantBefore, draftBefore] = await Promise.all([
    operator.query('SELECT * FROM public.academy_sessions WHERE token_hash=$1', [sessionTokenHash]),
    operator.query('SELECT * FROM public.academy_pilot_grants WHERE invitation_id=$1', [invitationId]),
    operator.query(
      'SELECT * FROM public.academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2',
      [academyA, lessonId],
    ),
  ]);
  const protectedBefore = {
    session: sessionBefore.rows[0],
    grant: grantBefore.rows[0],
    draft: draftBefore.rows[0],
  };
  assert.ok(protectedBefore.session && protectedBefore.grant && protectedBefore.draft);

  let intent;
  await test('PG1 intent stores only a hash and immutable Entra identifiers for five minutes', async () => {
    intent = await createTeamsLinkIntent(runtime, claims);
    assert.equal(intent.ok, true);
    assert.equal((await previewTeamsLinkIntent(runtime, { token: intent.token })).ok, true);
    const stored = (await operator.query(`
      SELECT token_hash, entra_issuer, tenant_id::text, object_id::text, entra_subject,
             created_at, expires_at, consumed_at, consumed_reason, confirmed_identity_id
      FROM public.academy_teams_link_intents WHERE token_hash=$1
    `, [teamsLinkTokenHash(intent.token)])).rows[0];
    assert.equal(stored.token_hash, teamsLinkTokenHash(intent.token));
    assert.equal(JSON.stringify(stored).includes(intent.token), false);
    assert.equal(stored.entra_issuer, issuer);
    assert.equal(stored.tenant_id, tenantId);
    assert.equal(stored.object_id, objectId);
    assert.equal(stored.entra_subject, claims.subject);
    assert.equal(stored.consumed_at, null);
    assert.equal(stored.consumed_reason, null);
    assert.equal(stored.confirmed_identity_id, null);
    const lifetime = new Date(stored.expires_at).getTime() - new Date(stored.created_at).getTime();
    assert.ok(lifetime > 0 && lifetime <= 5 * 60 * 1000);
    assert.equal((await operator.query(
      "SELECT to_regclass('public.academy_teams_link_intents_expires_idx') IS NOT NULL AS present",
    )).rows[0].present, true);
  });

  let winner;
  let loser;
  await test('PG2 concurrent confirmations consume an intent once and create one link', async () => {
    const attempts = await Promise.all([
      confirmTeamsLinkIntent(runtime, { token: intent.token, identityId: academyA }),
      confirmTeamsLinkIntent(runtime, { token: intent.token, identityId: academyB }),
    ]);
    assert.equal(attempts.filter(result => result.ok).length, 1);
    winner = attempts[0].ok ? academyA : academyB;
    loser = winner === academyA ? academyB : academyA;
    assert.deepEqual(
      await confirmTeamsLinkIntent(runtime, { token: intent.token, identityId: winner }),
      { ok: false, error: 'teams_link_unavailable' },
    );
    assert.equal((await previewTeamsLinkIntent(runtime, { token: intent.token })).ok, false);
    assert.equal(await hasTeamsIdentityLink(runtime, { identityId: winner }), true);
    assert.equal(await hasTeamsIdentityLink(runtime, { identityId: loser }), false);
    const state = (await operator.query(`
      SELECT
        (SELECT count(*)::integer FROM public.academy_teams_link_intents WHERE token_hash=$1) AS intents,
        (SELECT count(*)::integer FROM public.academy_teams_identity_links WHERE tenant_id=$2 AND object_id=$3) AS links,
        (SELECT consumed_reason FROM public.academy_teams_link_intents WHERE token_hash=$1) AS consumed_reason,
        (SELECT confirmed_identity_id::text FROM public.academy_teams_link_intents WHERE token_hash=$1) AS confirmed_identity_id
    `, [teamsLinkTokenHash(intent.token), tenantId, objectId])).rows[0];
    assert.deepEqual(state, {
      intents: 1, links: 1, consumed_reason: 'confirmed', confirmed_identity_id: winner,
    });
  });

  await test('PG3 active Teams and Academy uniqueness deny conflicts and consume each attempted intent', async () => {
    const duplicateTeams = await createTeamsLinkIntent(runtime, claims);
    assert.equal((await confirmTeamsLinkIntent(runtime, {
      token: duplicateTeams.token, identityId: loser,
    })).ok, false);
    assert.equal((await previewTeamsLinkIntent(runtime, { token: duplicateTeams.token })).ok, false);

    const duplicateAcademy = await createTeamsLinkIntent(runtime, otherClaims);
    assert.equal((await confirmTeamsLinkIntent(runtime, {
      token: duplicateAcademy.token, identityId: winner,
    })).ok, false);
    assert.equal((await previewTeamsLinkIntent(runtime, { token: duplicateAcademy.token })).ok, false);

    const links = (await operator.query(`
      SELECT count(*)::integer AS count FROM public.academy_teams_identity_links
      WHERE revoked_at IS NULL AND (tenant_id=$1 OR academy_identity_id=$2)
    `, [tenantId, winner])).rows[0].count;
    assert.equal(links, 1);
    const reasons = (await operator.query(`
      SELECT consumed_reason FROM public.academy_teams_link_intents
      WHERE token_hash = ANY($1::text[]) ORDER BY token_hash
    `, [[teamsLinkTokenHash(duplicateTeams.token), teamsLinkTokenHash(duplicateAcademy.token)]])).rows;
    assert.deepEqual(reasons, [
      { consumed_reason: 'link_conflict' }, { consumed_reason: 'link_conflict' },
    ]);
  });

  await test('PG4 exact issuer, tenant, object and subject resolve one Academy identity', async () => {
    assert.deepEqual(await resolveTeamsIdentityLink(runtime, claims), { ok: true, identityId: winner });
    for (const mismatch of [
      { ...claims, objectId: randomUUID() },
      { ...claims, subject: claims.subject + '-other' },
      (() => {
        const wrongTenant = randomUUID();
        return { ...claims, tenantId: wrongTenant, issuer: `https://login.microsoftonline.com/${wrongTenant}/v2.0` };
      })(),
    ]) {
      assert.deepEqual(await resolveTeamsIdentityLink(runtime, mismatch), {
        ok: false, error: 'teams_link_unavailable',
      });
    }
  });

  await test('PG5 runtime has function-only access and MCP has no link capability', async () => {
    for (const sql of [
      'SELECT * FROM public.academy_teams_link_intents',
      'SELECT * FROM public.academy_teams_identity_links',
      "INSERT INTO public.academy_teams_link_intents(token_hash,entra_issuer,tenant_id,object_id,entra_subject,expires_at) VALUES ('" + '0'.repeat(64) + "','https://example.invalid',gen_random_uuid(),gen_random_uuid(),'x',clock_timestamp()+interval '1 minute')",
      "UPDATE public.academy_teams_identity_links SET revoked_at=clock_timestamp(),revocation_reason='academy_user_unlink'",
      'DELETE FROM public.academy_teams_link_intents',
      'SET ROLE academy_migrator',
    ]) {
      await assert.rejects(runtime.query(sql), error => error.code === '42501');
    }
    const acl = await operator.query(`
      SELECT p.proname, pg_get_userbyid(p.proowner) AS owner, p.prosecdef, p.proconfig,
             has_function_privilege('academy_app', p.oid, 'EXECUTE') AS app_execute,
             has_function_privilege('academy_mcp', p.oid, 'EXECUTE') AS mcp_execute,
             EXISTS (
               SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f',p.proowner))) privilege
               WHERE privilege.grantee=0 AND privilege.privilege_type='EXECUTE'
             ) AS public_execute
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN (
        'academy_create_teams_link_intent', 'academy_preview_teams_link_intent',
        'academy_confirm_teams_link_intent', 'academy_resolve_teams_identity_link',
        'academy_has_teams_identity_link', 'academy_revoke_teams_identity_link')
    `);
    assert.equal(acl.rowCount, 6);
    for (const row of acl.rows) {
      assert.equal(row.owner, 'academy_migrator');
      assert.equal(row.prosecdef, true);
      assert.equal(row.proconfig.includes('search_path=pg_catalog, public, pg_temp'), true);
      assert.equal(row.app_execute, true);
      assert.equal(row.mcp_execute, false);
      assert.equal(row.public_execute, false);
    }
  });

  await test('PG6 retention is bounded; create and unlink serialize without false confirmation', async () => {
    assert.deepEqual(await revokeTeamsIdentityLink(runtime, { identityId: loser }), {
      ok: false, error: 'teams_link_unavailable',
    });

    await operator.query(`
      UPDATE public.academy_teams_link_intents
      SET created_at=statement_timestamp()-interval '2 days',
          expires_at=statement_timestamp()-interval '2 days'+interval '5 minutes'
      WHERE token_hash=$1
    `, [teamsLinkTokenHash(intent.token)]);
    await operator.query(`
      INSERT INTO public.academy_teams_link_intents(
        token_hash,entra_issuer,tenant_id,object_id,entra_subject,created_at,expires_at
      ) VALUES (
        $1,$2,$3,$4,$5,statement_timestamp()-interval '2 days',
        statement_timestamp()-interval '2 days'+interval '5 minutes'
      )
    `, [staleIntentHash, otherClaims.issuer, otherClaims.tenantId, otherClaims.objectId, otherClaims.subject]);

    const creating = await runtime.connect();
    let transactionOpen = false;
    let revokePromise;
    let pending;
    try {
      await creating.query('BEGIN');
      transactionOpen = true;
      pending = await createTeamsLinkIntent(creating, claims);
      assert.equal(pending.ok, true);

      // Creation retains the shared transaction lock until COMMIT. Unlink must
      // wait, then take a fresh READ COMMITTED snapshot that includes this intent.
      revokePromise = revokeTeamsIdentityLink(runtime, { identityId: winner });
      await waitForBlockedRevoke();
      await creating.query('COMMIT');
      transactionOpen = false;
      assert.deepEqual(await revokePromise, { ok: true });
    } finally {
      if (transactionOpen) await creating.query('ROLLBACK').catch(() => {});
      if (revokePromise) await Promise.allSettled([revokePromise]);
      creating.release();
    }

    assert.deepEqual(await previewTeamsLinkIntent(runtime, { token: pending.token }), {
      ok: false, error: 'teams_link_unavailable',
    });
    assert.equal(await hasTeamsIdentityLink(runtime, { identityId: winner }), false);
    assert.deepEqual(await resolveTeamsIdentityLink(runtime, claims), {
      ok: false, error: 'teams_link_unavailable',
    });
    const retained = (await operator.query(`
      SELECT
        (SELECT count(*)::integer FROM public.academy_teams_link_intents WHERE token_hash=$1) AS referenced,
        (SELECT count(*)::integer FROM public.academy_teams_link_intents WHERE token_hash=$2) AS stale
    `, [teamsLinkTokenHash(intent.token), staleIntentHash])).rows[0];
    assert.deepEqual(retained, { referenced: 1, stale: 0 });
    const revokedRow = (await operator.query(`
      SELECT revocation_reason, revoked_at IS NOT NULL AS revoked
      FROM public.academy_teams_identity_links WHERE academy_identity_id=$1
    `, [winner])).rows[0];
    assert.deepEqual(revokedRow, { revocation_reason: 'academy_user_unlink', revoked: true });
    const invalidated = (await operator.query(`
      SELECT consumed_reason, confirmed_identity_id
      FROM public.academy_teams_link_intents WHERE token_hash=$1
    `, [teamsLinkTokenHash(pending.token)])).rows[0];
    assert.deepEqual(invalidated, {
      consumed_reason: 'academy_user_unlink', confirmed_identity_id: null,
    });
  });

  await test('PG7 link lifecycle preserves identities, sessions, grants and saved work', async () => {
    const [sessionAfter, grantAfter, draftAfter] = await Promise.all([
      operator.query('SELECT * FROM public.academy_sessions WHERE token_hash=$1', [sessionTokenHash]),
      operator.query('SELECT * FROM public.academy_pilot_grants WHERE invitation_id=$1', [invitationId]),
      operator.query(
        'SELECT * FROM public.academy_lesson_drafts WHERE owner_id=$1 AND lesson_id=$2',
        [academyA, lessonId],
      ),
    ]);
    const protectedAfter = {
      session: sessionAfter.rows[0],
      grant: grantAfter.rows[0],
      draft: draftAfter.rows[0],
    };
    assert.deepEqual(protectedAfter, protectedBefore);
    const work = (await operator.query(`
      SELECT content,version FROM public.academy_lesson_drafts
      WHERE owner_id=$1 AND lesson_id=$2
    `, [academyA, lessonId])).rows[0];
    assert.deepEqual(work, { content: 'synthetic work that Teams linking must preserve', version: 1 });
    const identityCount = (await operator.query(
      'SELECT count(*)::integer AS count FROM public.academy_identities WHERE id=ANY($1::uuid[])',
      [identities],
    )).rows[0].count;
    assert.equal(identityCount, identities.length);
  });
} finally {
  try {
    await operator.query('BEGIN');
    await operator.query(
      'DELETE FROM public.academy_teams_identity_links WHERE tenant_id=$1 OR academy_identity_id=ANY($2::uuid[])',
      [tenantId, identities],
    );
    await operator.query(
      'DELETE FROM public.academy_teams_link_intents WHERE tenant_id=$1 OR confirmed_identity_id=ANY($2::uuid[])',
      [tenantId, identities],
    );
    await operator.query('DELETE FROM public.academy_sessions WHERE token_hash=$1', [sessionTokenHash]);
    await operator.query('DELETE FROM public.academy_pilot_grants WHERE invitation_id=$1', [invitationId]);
    await operator.query('DELETE FROM public.academy_pilot_invitations WHERE id=$1', [invitationId]);
    await operator.query(
      'DELETE FROM public.academy_lesson_drafts WHERE owner_id=ANY($1::uuid[]) AND lesson_id=$2',
      [identities, lessonId],
    );
    await operator.query(
      'DELETE FROM public.academy_identities WHERE id=ANY($1::uuid[])',
      [identities],
    );
    await operator.query('COMMIT');
    console.log('CLEANUP Teams identity-link fixtures PASS');
  } catch (error) {
    await operator.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await Promise.all([runtime.end(), operator.end()]);
  }
}
