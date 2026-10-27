import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { migrate } from '../../../scripts/migrate.mjs';
import { resolveIdentity as resolveUnenrolledIdentity, type AppUser, type Identity } from './identity';
import { WorkspaceStore } from './workspaces';
import { MembersStore } from './members';
import { ShareStore } from './shares';
import { ShareAccessStore } from './share-access';
import { SharePasswordStore } from './share-passwords';
import { ApiError } from '../errors';
import { ensureRuntimeRole, runtimePool, RUNTIME_ROLE } from './runtime-role';
import type { ExternalSnapshotV1 } from '../model';

const env = parseEnv(readFileSync(new URL('../../../.env.test.local', import.meta.url), 'utf8'));
const connectionString = env.TEST_DATABASE_URL;
if (!connectionString) throw new Error('TEST_DATABASE_URL is required');
const target = new URL(connectionString);
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !/^\/[a-z0-9_]+_test$/.test(target.pathname)) {
  throw new Error('Refusing a non-local or non-test database');
}
const schema = `tenant_test_${randomUUID().replaceAll('-', '')}`;
const cataloguePeerSchema = `${schema}_peer`;
const admin = new Pool({ connectionString, max: 1 });
const source = JSON.parse(readFileSync(new URL('../../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json', import.meta.url), 'utf8')) as ExternalSnapshotV1;
const origin = 'https://app.example.com';
const hex = (char: string) => char.repeat(64);

let tenant: Pool;
let store: WorkspaceStore;
let a: AppUser;
let b: AppUser;
let wa: string;
let wb: string;

const identity = (subject: string): Identity => ({
  provider: 'workos',
  issuer: 'https://api.workos.com/user_management/client_fixture',
  subject,
  email: `${subject}@example.test`,
  displayName: subject,
});

async function resolveIdentity(providerIdentity: Identity) {
  const user = await resolveUnenrolledIdentity(tenant, providerIdentity);
  await tenant.query("UPDATE users SET early_access_state='active' WHERE id=$1", [user.id]);
  return user;
}

const hostedAssets = new Map<string, string>();
async function completedRun(user: AppUser, workspace: string) {
  let asset = hostedAssets.get(workspace);
  if (!asset) {
    asset = (await store.addAsset(user, workspace, source.target, 'hostname')).id;
    hostedAssets.set(workspace, asset);
  }
  const run = await store.beginRun(user, workspace, asset);
  await store.completeRun(user, workspace, run, source);
  return { asset, run };
}

async function publishedShare(user: AppUser, workspace: string, run: string) {
  const shares = new ShareStore(tenant);
  const preview = await shares.preview(user, workspace, run, 'Tenant specimen');
  await shares.publish(user, workspace, { ...preview, audience: 'anyone_with_link' });
  return { shares, preview };
}

function count(result: { rowCount: number | null }) {
  return result.rowCount ?? 0;
}

before(async () => {
  assert.equal((await admin.query('SELECT current_database() AS db')).rows[0].db, target.pathname.slice(1));
  // Parallel suites may own constraints with the same names in another schema.
  await admin.query(`CREATE SCHEMA ${cataloguePeerSchema}`);
  await admin.query(`CREATE TABLE ${cataloguePeerSchema}.parent (id int PRIMARY KEY)`);
  await admin.query(`CREATE TABLE ${cataloguePeerSchema}.child (
    parent_id int CONSTRAINT report_shares_workspace_run_fkey REFERENCES ${cataloguePeerSchema}.parent(id)
  )`);
  await admin.query(`CREATE SCHEMA ${schema}`);
  const owner = new Pool({ connectionString, options: `-c search_path=${schema},public`, max: 1 });
  try {
    await migrate(owner);
    await ensureRuntimeRole(admin, schema);
  } finally {
    await owner.end();
  }
  tenant = runtimePool(connectionString, schema);
  store = new WorkspaceStore(tenant);
  a = await resolveIdentity(identity('tenant_owner_a'));
  b = await resolveIdentity(identity('tenant_owner_b'));
  wa = await store.create(a, 'Tenant A', randomUUID());
  wb = await store.create(b, 'Tenant B', randomUUID());
});

after(async () => {
  await tenant?.end();
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await admin.query(`DROP SCHEMA IF EXISTS ${cataloguePeerSchema} CASCADE`);
  await admin.end();
});

test('runtime role is not the table owner and the migration pre-check finds no cross-workspace rows', async () => {
  const who = (await tenant.query('SELECT current_user AS current, session_user AS session')).rows[0];
  assert.equal(who.current, RUNTIME_ROLE);
  assert.notEqual(who.session, RUNTIME_ROLE);
  const attrs = (await tenant.query('SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname=current_user')).rows[0];
  assert.equal(attrs.rolsuper, false);
  assert.equal(attrs.rolcreatedb, false);
  assert.equal(attrs.rolcreaterole, false);
  assert.equal(attrs.rolbypassrls, false);
  assert.equal(attrs.rolcanlogin, false);
  const owner = (await tenant.query("SELECT tableowner FROM pg_tables WHERE schemaname=$1 AND tablename='report_shares'", [schema])).rows[0];
  assert.notEqual(owner.tableowner, RUNTIME_ROLE);
  await assert.rejects(tenant.query('CREATE TABLE runtime_role_denied(id int)'), /permission denied/i);

  const migration = readFileSync(new URL('../../../db/migrations/0024_composite_tenant_keys.sql', import.meta.url), 'utf8');
  const block = migration.match(/\/\*([\s\S]*?)\*\//);
  assert.ok(block);
  for (const query of block[1].split(';').map(part => part.trim()).filter(Boolean)) {
    assert.equal((await tenant.query(query)).rows.length, 0, query);
  }
});

test('composite foreign keys reject a cross-workspace parent and keep the previous ON DELETE action', async () => {
  const definitions = (await tenant.query("SELECT conname, confdeltype::text AS on_delete, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace = $2::regnamespace AND conname = ANY($1::name[]) ORDER BY conname", [[
    'server_check_executions_workspace_asset_fkey',
    'server_check_executions_workspace_run_fkey',
    'report_shares_workspace_run_fkey',
    'report_share_deliveries_workspace_share_fkey',
    'report_shares_workspace_id_id_key',
  ], schema])).rows;
  assert.ok(definitions.some(row => row.conname === 'report_shares_workspace_id_id_key'));
  assert.deepEqual(definitions.filter(row => row.on_delete.trim()).map(row => [row.conname, row.on_delete]), [
    ['report_share_deliveries_workspace_share_fkey', 'c'],
    ['report_shares_workspace_run_fkey', 'a'],
    ['server_check_executions_workspace_asset_fkey', 'a'],
    ['server_check_executions_workspace_run_fkey', 'a'],
  ]);
  const kept = (await tenant.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE contype='f' AND conrelid = ANY(ARRAY['server_check_executions'::regclass,'report_shares'::regclass,'report_share_deliveries'::regclass])")).rows.map(row => row.definition as string);
  assert.ok(kept.some(definition => definition.includes('FOREIGN KEY (asset_id)') && !definition.includes('ON DELETE')));
  assert.ok(kept.some(definition => definition.includes('FOREIGN KEY (share_id)') && definition.includes('ON DELETE CASCADE')));

  const runA = (await completedRun(a, wa)).run;
  const runB = (await completedRun(b, wb)).run;
  const assetA = (await tenant.query('SELECT id FROM assets WHERE workspace_id=$1 LIMIT 1', [wa])).rows[0].id as string;
  const assetB = (await tenant.query('SELECT id FROM assets WHERE workspace_id=$1 LIMIT 1', [wb])).rows[0].id as string;
  const digest = hex('a');
  await assert.rejects(tenant.query(
    'INSERT INTO server_check_executions(id,workspace_id,asset_id,user_id,request_id,request,authority,collector_hash) VALUES($1,$2,$3,$4,$5,\'{}\',\'{}\',$6)',
    [randomUUID(), wa, assetB, a.id, randomUUID(), digest],
  ), /server_check_executions_workspace_asset_fkey/);
  const execution = randomUUID();
  await tenant.query(
    'INSERT INTO server_check_executions(id,workspace_id,asset_id,user_id,request_id,request,authority,collector_hash) VALUES($1,$2,$3,$4,$5,\'{}\',\'{}\',$6)',
    [execution, wa, assetA, a.id, randomUUID(), digest],
  );
  await assert.rejects(tenant.query('DELETE FROM assets WHERE id=$1 AND workspace_id=$2', [assetA, wa]), /foreign key/i);

  await assert.rejects(tenant.query(
    `INSERT INTO server_check_executions(id,workspace_id,asset_id,user_id,request_id,request,authority,collector_hash,state,capture_bytes,capture_digest,capture_reserved_bytes,capture_reserved_digest,run_id)
     VALUES($1,$2,$3,$4,$5,'{}','{}',$6,'run_created',$7,$8,1,$8,$9)`,
    [randomUUID(), wa, assetA, a.id, randomUUID(), digest, Buffer.from('x'), hex('b'), runB],
  ), /server_check_executions_workspace_run_fkey/);

  await assert.rejects(tenant.query(
    'INSERT INTO report_shares(id,workspace_id,run_id,created_by,membership_generation,token_hash,snapshot,digest) VALUES($1,$2,$3,$4,1,$5,\'{}\',$6)',
    [randomUUID(), wa, runB, a.id, hex('c'), hex('d')],
  ), /report_shares_workspace_run_fkey/);
  const share = randomUUID();
  await tenant.query(
    'INSERT INTO report_shares(id,workspace_id,run_id,created_by,membership_generation,token_hash,snapshot,digest) VALUES($1,$2,$3,$4,1,$5,\'{}\',$6)',
    [share, wa, runA, a.id, hex('e'), hex('f')],
  );
  await assert.rejects(tenant.query(
    'INSERT INTO report_share_deliveries(id,share_id,workspace_id,actor_id,membership_generation,recipient,access_version,message_digest) VALUES($1,$2,$3,$4,1,$5,1,$6)',
    [randomUUID(), share, wb, b.id, 'recipient@example.test', hex('1')],
  ), /report_share_deliveries_workspace_share_fkey/);
  const delivery = randomUUID();
  await tenant.query(
    'INSERT INTO report_share_deliveries(id,share_id,workspace_id,actor_id,membership_generation,recipient,access_version,message_digest) VALUES($1,$2,$3,$4,1,$5,1,$6)',
    [delivery, share, wa, a.id, 'recipient@example.test', hex('2')],
  );
  assert.equal(count(await tenant.query('DELETE FROM report_shares WHERE id=$1 AND workspace_id=$2', [share, wa])), 1);
  assert.equal((await tenant.query('SELECT count(*) FROM report_share_deliveries WHERE id=$1', [delivery])).rows[0].count, '0');
});

test('invitation by-id updates stay inside the caller workspace', async () => {
  const membersA = new MembersStore(tenant);
  const membersB = new MembersStore(tenant);
  const email = (name: string) => `${name}@example.test`;
  const firstB = await membersB.invite(b, wb, { email: email('tenant_invite_b'), role: 'viewer', requestId: randomUUID() });
  await assert.rejects(
    membersA.invite(a, wa, { email: email('tenant_invite_a'), role: 'viewer', requestId: randomUUID(), replaces: firstB }),
    (error: unknown) => error instanceof ApiError && error.status === 409,
  );
  assert.equal((await tenant.query('SELECT state FROM workspace_invitations WHERE id=$1', [firstB])).rows[0].state, 'pending');
  assert.equal(count(await tenant.query("UPDATE workspace_invitations SET state='superseded',closed_at=now() WHERE id=$1 AND workspace_id=$2", [firstB, wa])), 0);
  const replaced = await membersB.invite(b, wb, { email: email('tenant_invite_b'), role: 'viewer', requestId: randomUUID(), replaces: firstB });
  assert.notEqual(replaced, firstB);
  assert.equal((await tenant.query('SELECT state FROM workspace_invitations WHERE id=$1', [firstB])).rows[0].state, 'superseded');

  const pendingA = await membersA.invite(a, wa, { email: email('tenant_deliver_a'), role: 'viewer', requestId: randomUUID() });
  const pendingB = await membersB.invite(b, wb, { email: email('tenant_deliver_b'), role: 'contributor', requestId: randomUUID() });
  let sent = false;
  await membersA.deliver(a, wa, pendingB, origin, async () => { sent = true; return { provider: 'file', providerMessageId: 'nope', providerAcceptedAt: new Date().toISOString() }; });
  assert.equal(sent, false);
  assert.equal((await tenant.query('SELECT delivery_state FROM workspace_invitations WHERE id=$1', [pendingB])).rows[0].delivery_state, 'not_sent');
  await membersA.deliver(a, wa, pendingA, origin, async () => ({ provider: 'file', providerMessageId: 'local', providerAcceptedAt: new Date().toISOString() }));
  assert.equal((await tenant.query('SELECT delivery_state FROM workspace_invitations WHERE id=$1', [pendingA])).rows[0].delivery_state, 'accepted');
  assert.equal(count(await tenant.query("UPDATE workspace_invitations SET delivery_state='accepted' WHERE id=$1 AND workspace_id=$2", [pendingB, wa])), 0);

  const unknownA = await membersA.invite(a, wa, { email: 'tenant_unknown_a@example.test', role: 'viewer', requestId: randomUUID() });
  const unknownB = await membersB.invite(b, wb, { email: 'tenant_unknown_b@example.test', role: 'viewer', requestId: randomUUID() });
  await membersA.deliver(a, wa, unknownA, origin, async () => { throw new Error('provider timeout'); });
  assert.equal((await tenant.query('SELECT delivery_state FROM workspace_invitations WHERE id=$1', [unknownA])).rows[0].delivery_state, 'unknown');
  assert.equal(count(await tenant.query("UPDATE workspace_invitations SET delivery_state='unknown' WHERE id=$1 AND workspace_id=$2", [unknownB, wa])), 0);
  assert.equal((await tenant.query('SELECT delivery_state FROM workspace_invitations WHERE id=$1', [unknownB])).rows[0].delivery_state, 'not_sent');

  const recipient = await resolveIdentity(identity('tenant_join_a'));
  const joinable = await membersA.invite(a, wa, { email: email('tenant_join_a'), role: 'viewer', requestId: randomUUID() });
  await assert.rejects(membersA.accept(b, email('tenant_invite_b'), joinable, 1, 'viewer'));
  assert.equal((await tenant.query('SELECT state FROM workspace_invitations WHERE id=$1', [joinable])).rows[0].state, 'pending');
  assert.equal(count(await tenant.query("UPDATE workspace_invitations SET state='accepted',accepted_user=$2,accepted_generation=$3,accepted_at=now() WHERE id=$1 AND workspace_id=$4", [joinable, b.id, 1, wb])), 0);
  const accepted = await membersA.accept(recipient, email('tenant_join_a'), joinable, 1, 'viewer');
  assert.equal(accepted.state, 'accepted');
  assert.equal((await tenant.query('SELECT state,workspace_id FROM workspace_invitations WHERE id=$1', [joinable])).rows[0].workspace_id, wa);
});

test('share by-id writes stay inside the caller workspace', async () => {
  const { run: runA } = await completedRun(a, wa);
  const { run: runB } = await completedRun(b, wb);
  const shares = new ShareStore(tenant);
  const previewA = await shares.preview(a, wa, runA, 'Workspace A report', 'tenant-report-a');
  assert.match(previewA.name, /^tenant-report-a$/);
  const previewB = await shares.preview(b, wb, runB, 'Workspace B report', 'tenant-report-b');
  assert.equal(count(await tenant.query(
    'INSERT INTO report_share_names(name,share_id) SELECT $1,s.id FROM report_shares s WHERE s.id=$2 AND s.workspace_id=$3 ON CONFLICT DO NOTHING RETURNING name',
    ['tenant-foreign-name', previewB.id, wa],
  )), 0);
  assert.equal((await tenant.query('SELECT count(*) FROM report_share_names WHERE name=$1', ['tenant-foreign-name'])).rows[0].count, '0');

  await assert.rejects(shares.publish(a, wa, { ...previewB, audience: 'anyone_with_link' }), (error: unknown) => error instanceof ApiError && error.status === 404);
  assert.equal(count(await tenant.query("UPDATE report_shares SET state='published',published_at=now() WHERE id=$1 AND workspace_id=$2", [previewB.id, wa])), 0);
  assert.equal((await tenant.query('SELECT state FROM report_shares WHERE id=$1', [previewB.id])).rows[0].state, 'preview');
  await shares.publish(a, wa, { ...previewA, audience: 'anyone_with_link' });
  assert.equal((await tenant.query('SELECT state FROM report_shares WHERE id=$1', [previewA.id])).rows[0].state, 'published');

  await shares.publish(b, wb, { ...previewB, audience: 'anyone_with_link' });
  await assert.rejects(shares.revoke(a, wa, previewB.id), (error: unknown) => error instanceof ApiError && error.status === 404);
  assert.equal(count(await tenant.query("UPDATE report_shares SET state='revoked',revoked_at=now() WHERE id=$1 AND workspace_id=$2", [previewB.id, wa])), 0);
  assert.equal((await tenant.query('SELECT state FROM report_shares WHERE id=$1', [previewB.id])).rows[0].state, 'published');
  assert.deepEqual(await shares.revoke(b, wb, previewB.id), { revoked: true });
});

test('share delivery lookups and updates do not read or write another workspace', async () => {
  const { run: runA } = await completedRun(a, wa);
  const { run: runB } = await completedRun(b, wb);
  const { preview: previewA } = await publishedShare(a, wa, runA);
  const { preview: previewB } = await publishedShare(b, wb, runB);
  const accessA = new ShareAccessStore(tenant);
  const accessB = new ShareAccessStore(tenant);
  const expires = new Date(Date.now() + 86_400_000).toISOString();
  await assert.rejects(accessA.change(a, wa, previewB.id, 1, expires, false), (error: unknown) => error instanceof ApiError && error.status === 404);
  assert.equal(count(await tenant.query(
    'UPDATE report_share_access SET token_hash=$2,expires_at=$3,version=version+1 WHERE share_id=$1 AND EXISTS (SELECT 1 FROM report_shares s WHERE s.id=report_share_access.share_id AND s.workspace_id=$4)',
    [previewB.id, hex('9'), expires, wa],
  )), 0);
  assert.equal((await tenant.query('SELECT version FROM report_share_access WHERE share_id=$1', [previewB.id])).rows[0].version, 1);
  assert.equal((await accessA.change(a, wa, previewA.id, 1, expires, false)).version, 2);

  const requestB = randomUUID();
  const draftB = await accessB.draft(b, wb, { id: previewB.id, token: previewB.token, email: 'b@example.test', requestId: requestB }, origin);
  await assert.rejects(
    accessA.draft(a, wa, { id: previewA.id, token: previewA.token, email: 'a@example.test', requestId: requestB }, origin),
    (error: unknown) => error instanceof ApiError && error.status === 409,
  );
  const storedB = (await tenant.query('SELECT workspace_id,recipient FROM report_share_deliveries WHERE id=$1', [requestB])).rows;
  assert.equal(storedB.length, 1);
  assert.equal(storedB[0].workspace_id, wb);
  assert.equal(storedB[0].recipient, 'b@example.test');
  const requestA = randomUUID();
  const draftA = await accessA.draft(a, wa, { id: previewA.id, token: previewA.token, email: 'a@example.test', requestId: requestA }, origin);
  assert.equal((await accessA.draft(a, wa, { id: previewA.id, token: previewA.token, email: 'a@example.test', requestId: requestA }, origin)).state, draftA.state);

  await assert.rejects(accessA.send(a, wa, { id: draftB.id, token: previewA.token, digest: draftB.digest, confirmed: true }, origin, async () => {
    throw new Error('must not send a foreign draft');
  }), (error: unknown) => error instanceof ApiError && error.status === 404);
  assert.equal(count(await tenant.query("UPDATE report_share_deliveries SET state='sending' WHERE id=$1 AND workspace_id=$2", [draftB.id, wa])), 0);
  assert.equal((await tenant.query('SELECT state FROM report_share_deliveries WHERE id=$1', [draftB.id])).rows[0].state, 'draft');
  await accessA.send(a, wa, { id: draftA.id, token: previewA.token, digest: draftA.digest, confirmed: true }, origin, async () => ({
    provider: 'resend', providerMessageId: 'synthetic', providerAcceptedAt: new Date().toISOString(),
  }));
  assert.equal((await tenant.query('SELECT state FROM report_share_deliveries WHERE id=$1', [draftA.id])).rows[0].state, 'accepted');
  assert.equal(count(await tenant.query('UPDATE report_share_deliveries SET state=$2,provider=$3,provider_message_id=$4,provider_accepted_at=$5 WHERE id=$1 AND workspace_id=$6', [draftB.id, 'accepted', 'resend', 'x', new Date().toISOString(), wa])), 0);

  const uncertain = await accessA.draft(a, wa, { id: previewA.id, token: previewA.token, email: 'a@example.test', requestId: randomUUID() }, origin);
  await accessA.send(a, wa, { id: uncertain.id, token: previewA.token, digest: uncertain.digest, confirmed: true }, origin, async () => { throw new Error('provider timeout'); });
  assert.equal((await tenant.query('SELECT state FROM report_share_deliveries WHERE id=$1', [uncertain.id])).rows[0].state, 'unknown');
  assert.equal(count(await tenant.query("UPDATE report_share_deliveries SET state='unknown' WHERE id=$1 AND workspace_id=$2", [draftB.id, wa])), 0);
  assert.equal((await tenant.query('SELECT state FROM report_share_deliveries WHERE id=$1', [draftB.id])).rows[0].state, 'draft');
});

test('share password by-id writes stay inside the share workspace', async () => {
  const { run: runA } = await completedRun(a, wa);
  const { run: runB } = await completedRun(b, wb);
  const shares = new ShareStore(tenant);
  const passwords = new SharePasswordStore(tenant);
  const previewA = await shares.preview(a, wa, runA);
  const previewB = await shares.preview(b, wb, runB);
  await assert.rejects(passwords.set(a, wa, previewB.id, 1, 'synthetic foreign password'), (error: unknown) => error instanceof ApiError && error.status === 404);
  assert.equal(count(await tenant.query(
    'UPDATE report_share_access SET password_hash=$2,version=version+1,password_attempts=0,password_window=now() WHERE share_id=$1 AND EXISTS (SELECT 1 FROM report_shares s WHERE s.id=report_share_access.share_id AND s.workspace_id=$3)',
    [previewB.id, 'scrypt-v1$' + 'ab'.repeat(16) + '$' + hex('c'), wa],
  )), 0);
  assert.equal(count(await tenant.query(
    'DELETE FROM report_share_unlocks WHERE share_id=$1 AND EXISTS (SELECT 1 FROM report_shares s WHERE s.id=report_share_unlocks.share_id AND s.workspace_id=$2)',
    [previewB.id, wa],
  )), 0);
  assert.equal((await passwords.set(a, wa, previewA.id, 1, 'synthetic local password')).version, 2);
  await shares.publish(a, wa, { ...previewA, audience: 'link_and_password' });
  await shares.publish(b, wb, { ...previewB, audience: 'anyone_with_link' });
  const unlockB = hex('d');
  assert.equal(count(await tenant.query(
    'INSERT INTO report_share_unlocks(token_hash,share_id,access_version,expires_at) SELECT $1,s.id,$3,$4 FROM report_shares s WHERE s.id=$2 AND s.workspace_id=$5',
    [unlockB, previewB.id, 1, new Date(Date.now() + 60_000), wb],
  )), 1);
  assert.equal(count(await tenant.query(
    'DELETE FROM report_share_unlocks WHERE share_id=$1 AND (expires_at<=now() OR access_version<>$2) AND EXISTS (SELECT 1 FROM report_shares s WHERE s.id=report_share_unlocks.share_id AND s.workspace_id=$3)',
    [previewB.id, 1, wa],
  )), 0);
  assert.equal((await tenant.query(
    'SELECT count(*) FROM report_share_unlocks WHERE share_id=$1 AND EXISTS (SELECT 1 FROM report_shares s WHERE s.id=report_share_unlocks.share_id AND s.workspace_id=$2)',
    [previewB.id, wa],
  )).rows[0].count, '0');
  assert.equal((await tenant.query(
    'SELECT count(*) FROM report_share_unlocks WHERE share_id=$1 AND EXISTS (SELECT 1 FROM report_shares s WHERE s.id=report_share_unlocks.share_id AND s.workspace_id=$2)',
    [previewB.id, wb],
  )).rows[0].count, '1');
  assert.equal(count(await tenant.query(
    'UPDATE report_share_access SET password_attempts=$2,password_window=CASE WHEN $2=1 THEN now() ELSE password_window END WHERE share_id=$1 AND EXISTS (SELECT 1 FROM report_shares s WHERE s.id=report_share_access.share_id AND s.workspace_id=$3)',
    [previewB.id, 4, wa],
  )), 0);
  assert.equal(count(await tenant.query(
    'INSERT INTO report_share_unlocks(token_hash,share_id,access_version,expires_at) SELECT $1,s.id,$3,$4 FROM report_shares s WHERE s.id=$2 AND s.workspace_id=$5',
    [hex('e'), previewB.id, 1, new Date(Date.now() + 60_000), wa],
  )), 0);

  await assert.rejects(passwords.unlock(previewA.token, 'wrong'), (error: unknown) => error instanceof ApiError && error.status === 401);
  assert.equal(Number((await tenant.query('SELECT password_attempts FROM report_share_access WHERE share_id=$1', [previewA.id])).rows[0].password_attempts), 1);
  const session = await passwords.unlock(previewA.token, 'synthetic local password');
  assert.equal((await new ShareStore(tenant).read(previewA.token, session.unlock)).digest, previewA.digest);
  assert.equal((await tenant.query('SELECT count(*) FROM report_share_unlocks u JOIN report_shares s ON s.id=u.share_id WHERE s.id=$1 AND s.workspace_id=$2', [previewA.id, wa])).rows[0].count, '1');
});

test('server-check by-id updates do not change another workspace execution', async () => {
  const assetA = (await store.addAsset(a, wa, 'tenant-a.example.test', 'linux_server')).id;
  const assetB = (await store.addAsset(b, wb, 'tenant-b.example.test', 'linux_server')).id;
  const insert = 'INSERT INTO server_check_executions(id,workspace_id,asset_id,user_id,request_id,request,authority,collector_hash) VALUES($1,$2,$3,$4,$5,\'{}\',\'{}\',$6)';
  const executionA = randomUUID();
  const executionB = randomUUID();
  await tenant.query(insert, [executionA, wa, assetA, a.id, randomUUID(), hex('a')]);
  await tenant.query(insert, [executionB, wb, assetB, b.id, randomUUID(), hex('a')]);
  const retiredAt = new Date();
  assert.equal(count(await tenant.query("UPDATE server_check_executions SET state='retired',retired_at=$2,retired_by_user_id=$3 WHERE id=$1 AND workspace_id=$4", [executionB, retiredAt, a.id, wa])), 0);
  assert.equal((await tenant.query('SELECT state FROM server_check_executions WHERE id=$1', [executionB])).rows[0].state, 'authorized');
  assert.equal((await tenant.query("UPDATE server_check_executions SET state='retired',retired_at=$2,retired_by_user_id=$3 WHERE id=$1 AND workspace_id=$4 RETURNING state", [executionA, retiredAt, a.id, wa])).rows[0].state, 'retired');

  const reserveA = randomUUID();
  const reserveB = randomUUID();
  await tenant.query(insert, [reserveA, wa, assetA, a.id, randomUUID(), hex('a')]);
  await tenant.query(insert, [reserveB, wb, assetB, b.id, randomUUID(), hex('a')]);
  assert.equal(count(await tenant.query('UPDATE server_check_executions SET capture_reserved_bytes=$2,capture_reserved_digest=$3 WHERE id=$1 AND workspace_id=$4', [reserveB, 1, hex('b'), wa])), 0);
  assert.equal(Number((await tenant.query('SELECT capture_reserved_bytes FROM server_check_executions WHERE id=$1', [reserveB])).rows[0].capture_reserved_bytes), 0);
  assert.equal(count(await tenant.query('UPDATE server_check_executions SET capture_reserved_bytes=$2,capture_reserved_digest=$3 WHERE id=$1 AND workspace_id=$4', [reserveA, 1, hex('b'), wa])), 1);

  assert.equal(count(await tenant.query("UPDATE server_check_executions SET state='uploaded',capture_bytes=$2,capture_digest=$3 WHERE id=$1 AND workspace_id=$4", [reserveB, Buffer.from('x'), hex('b'), wa])), 0);
  assert.equal((await tenant.query('SELECT state FROM server_check_executions WHERE id=$1', [reserveB])).rows[0].state, 'authorized');
  assert.equal((await tenant.query("UPDATE server_check_executions SET state='uploaded',capture_bytes=$2,capture_digest=$3 WHERE id=$1 AND workspace_id=$4 RETURNING state", [reserveA, Buffer.from('x'), hex('b'), wa])).rows[0].state, 'uploaded');

  const { run: runA } = await completedRun(a, wa);
  assert.equal(count(await tenant.query("UPDATE server_check_executions SET state='run_created',run_id=$2 WHERE id=$1 AND workspace_id=$3", [reserveB, runA, wa])), 0);
  assert.equal((await tenant.query('SELECT state,run_id FROM server_check_executions WHERE id=$1', [reserveA])).rows[0].state, 'uploaded');
  assert.equal((await tenant.query("UPDATE server_check_executions SET state='run_created',run_id=$2 WHERE id=$1 AND workspace_id=$3 RETURNING state", [reserveA, runA, wa])).rows[0].state, 'run_created');
});
