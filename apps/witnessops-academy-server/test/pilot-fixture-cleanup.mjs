// Deletes this test's tagged disposable fixtures only. Never imported by production code.
import assert from 'node:assert/strict';

export const PILOT_FIXTURE_ISSUER = 'https://synthetic-idp.example.invalid/realms/pilot-invitation-tests';
export const PILOT_FIXTURE_OTHER_ISSUER = 'https://other-synthetic-idp.example.invalid/realms/pilot';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TAG = /^synthetic-invitation-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function cleanupPilotInvitationFixtures(pool, { tag, identities }, env = process.env) {
  assert.equal(env.ACADEMY_E2E, '1', 'disposable e2e profile required');
  assert.equal(env.ACADEMY_INVITATIONS_DISPOSABLE, '1', 'disposable invitation profile required');
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(env.ACADEMY_DB_HOST), 'loopback database required');
  assert.match(env.ACADEMY_DB_NAME || '', /^[A-Za-z_][A-Za-z0-9_]*$/, 'explicit disposable database required');
  assert.match(tag, TAG, 'unique synthetic fixture tag required');
  assert.ok(Array.isArray(identities) && identities.length <= 7, 'bounded tracked fixture identities required');
  const ids = [];
  const expected = new Map();
  for (const item of identities) {
    assert.match(item.id, UUID, 'exact tracked UUID required');
    const base = item.issuer === PILOT_FIXTURE_ISSUER
      && ['a', 'b', 'c', 'd', 'e', 'f'].some(name => item.subject === tag + '-' + name);
    const alternate = item.issuer === PILOT_FIXTURE_OTHER_ISSUER && item.subject === tag + '-a';
    assert.ok(base || alternate, 'identity is outside this synthetic fixture tag/issuer');
    assert.equal(expected.has(item.id), false, 'duplicate fixture UUID');
    ids.push(item.id);
    expected.set(item.id, item);
  }
  if (ids.length === 0) return { identities: 0, invitations: 0, grants: 0, drafts: 0 };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const database = (await client.query('SELECT pg_catalog.current_database() AS database')).rows[0].database;
    assert.equal(database, env.ACADEMY_DB_NAME, 'connected database does not match disposable metadata');
    await client.query('SELECT pg_catalog.pg_advisory_xact_lock(17465201, 4)');
    const actual = (await client.query(
      'SELECT id, issuer, subject FROM public.academy_identities WHERE id=ANY($1::uuid[]) FOR UPDATE', [ids],
    )).rows;
    for (const item of actual) assert.deepEqual(item, expected.get(item.id), 'fixture identity mapping changed; refuse cleanup');
    const approval = tag + '-owner-approved-free';
    const admin = tag + '-operator';
    const subjects = ['a', 'b', 'c', 'd', 'e', 'f'].map(name => tag + '-' + name);
    const ownInvites = (await client.query(`
      SELECT id FROM public.academy_pilot_invitations
      WHERE approval_reference=$1 AND administrator_reference=$2
        AND recipient_issuer=$3 AND recipient_subject=ANY($4::text[]) FOR UPDATE
    `, [approval, admin, PILOT_FIXTURE_ISSUER, subjects])).rows.map(row => row.id);
    const grants = await client.query(`
      DELETE FROM public.academy_pilot_grants
      WHERE identity_id=ANY($1::uuid[]) AND invitation_id=ANY($2::uuid[])
        AND approval_reference=$3 AND administrator_reference=$4
    `, [ids, ownInvites, approval, admin]);
    const invitations = await client.query(`
      DELETE FROM public.academy_pilot_invitations
      WHERE id=ANY($1::uuid[]) AND approval_reference=$2 AND administrator_reference=$3
    `, [ownInvites, approval, admin]);
    const a = identities.find(item => item.issuer === PILOT_FIXTURE_ISSUER && item.subject === tag + '-a');
    const drafts = a ? await client.query(`
      DELETE FROM public.academy_lesson_drafts
      WHERE owner_id=$1 AND lesson_id='invitation-preservation-fixture'
        AND content='synthetic pre-existing work' AND version=1
    `, [a.id]) : { rowCount: 0 };
    let removed = 0;
    for (const item of actual) {
      removed += (await client.query(
        'DELETE FROM public.academy_identities WHERE id=$1 AND issuer=$2 AND subject=$3',
        [item.id, item.issuer, item.subject],
      )).rowCount;
    }
    const remaining = (await client.query(
      'SELECT count(*)::integer AS count FROM public.academy_identities WHERE id=ANY($1::uuid[])', [ids],
    )).rows[0].count;
    assert.equal(remaining, 0, 'tracked synthetic identities remain after cleanup');
    await client.query('COMMIT');
    return { identities: removed, invitations: invitations.rowCount, grants: grants.rowCount, drafts: drafts.rowCount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
