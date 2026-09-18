import { MembersStore } from './members';
import { CliAuthStore } from './cli-auth';
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";
import { migrate } from "../../../scripts/migrate.mjs";
import { resolveIdentity as resolveUnenrolledIdentity, type Identity, type AppUser } from "./identity";
import { WorkspaceStore } from "./workspaces";
import { createFoundationService } from "../server";
import { canonicalSource } from "../source-digest";
import { ActivityStore } from "./activity";
import { activateEarlyAccess, earlyAccess } from "./access";
import { EarlyAccessPlanStore } from './early-access-plans';
import { EARLY_ACCESS_PLAN_POLICY, planTermsAt } from '../plan-policy';
import { ApiError } from '../errors';
import { requireUnrevokedSession, revokeSession, sessionKey } from "./sessions";
import { compareRuns, CHECK_IDS, type Run, type ExternalSnapshotV1 } from "../model";

// Only the explicit isolated test URL; never fall back to DATABASE_URL.
const env = parseEnv(readFileSync(new URL("../../../.env.test.local", import.meta.url), "utf8"));
if (!env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required");
const target = new URL(env.TEST_DATABASE_URL);
if (!["127.0.0.1", "localhost"].includes(target.hostname) || !/^\/[a-z0-9_]+_test$/.test(target.pathname)) throw new Error("Refusing a non-local or non-test database");
const schema = `wops_test_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString: env.TEST_DATABASE_URL, max: 1 });
const connect = () => new Pool({ connectionString: env.TEST_DATABASE_URL, options: `-c search_path=${schema},public`, max: 4 });
let pool: Pool, store: WorkspaceStore, a: AppUser, b: AppUser, viewer: AppUser, wa: string, wb: string;
const identity = (subject: string): Identity => ({ provider: "workos", issuer: "https://api.workos.com/user_management/client_fixture", subject, email: `${subject}@example.test`, displayName: subject });
const source = JSON.parse(readFileSync(new URL("../../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json", import.meta.url), "utf8")) as ExternalSnapshotV1;
const origin = "http://127.0.0.1:3020";

test('Free workspaces: verified admission, atomic retries, ceiling, persistence and access fences', async () => {
  const previous = process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;
  process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT = '2';
  try {
    const unverified = await resolveUnenrolledIdentity(pool, { ...identity('free_unverified'), email: null });
    await assert.rejects(store.create(unverified, 'No', randomUUID()), (error: unknown) => error instanceof ApiError && error.status === 403 && error.accessState === 'verify_email');
    const invited = await resolveUnenrolledIdentity(pool, identity('free_invited'));
    await pool.query("UPDATE users SET early_access_state='invited' WHERE id=$1", [invited.id]);
    await assert.rejects(store.create(invited, 'Activate first', randomUUID()), (error: unknown) => error instanceof ApiError && error.accessState === 'invited');
    await activateEarlyAccess(pool, invited);
    const invitedWorkspace = await store.create(invited, 'Activated invitation', randomUUID());
    assert.equal((await store.read(invited, invitedWorkspace)).role, 'owner');
    assert.equal((await pool.query('SELECT free_workspace_access FROM users WHERE id=$1', [invited.id])).rows[0].free_workspace_access, false);
    assert.equal((await pool.query('SELECT count(*) FROM free_workspace_plans WHERE workspace_id=$1', [invitedWorkspace])).rows[0].count, '0');
    // Self-service configuration must not cap or convert existing invited admission.
    await store.create(invited, 'Invited second', randomUUID());
    await store.create(invited, 'Invited beyond free ceiling', randomUUID());
    delete process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;
    const afterDisable = await store.create(invited, 'Invited after disable', randomUUID());
    assert.equal((await store.read(invited, afterDisable)).role, 'owner');
    assert.equal(await earlyAccess(pool, invited), 'active');
    assert.equal((await pool.query('SELECT count(*) FROM free_workspace_plans WHERE workspace_id IN (SELECT id FROM workspaces WHERE created_by=$1)', [invited.id])).rows[0].count, '0');
    process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT = '2';
    const who = identity('free_owner'), owner = await resolveUnenrolledIdentity(pool, who);
    const key = randomUUID();
    const created = await Promise.all(Array.from({ length: 4 }, () => store.create(owner, 'Free first', key)));
    assert.equal(new Set(created).size, 1);
    const first = created[0];
    await assert.rejects(store.create(owner, 'Conflicting name', key), (error: unknown) => error instanceof ApiError && error.status === 409);
    const secondAttempts = await Promise.allSettled(Array.from({ length: 4 }, (_, i) => store.create(owner, `Free second ${i}`, randomUUID())));
    assert.equal(secondAttempts.filter(value => value.status === 'fulfilled').length, 1);
    for (const result of secondAttempts) if (result.status === 'rejected') assert.equal(result.reason.status, 409);
    assert.equal(await store.create(owner, 'Free first', key), first); // Retry still works at the ceiling.
    const saved = await store.list(owner);
    assert.equal(saved.length, 2);
    assert.ok(saved.every(item => item.role === 'owner'));
    assert.equal((await pool.query('SELECT count(*) FROM free_workspace_plans WHERE workspace_id=ANY($1::uuid[])', [saved.map(item => item.id)])).rows[0].count, '2');
    assert.equal((await pool.query('SELECT count(*) FROM early_access_plans WHERE workspace_id=ANY($1::uuid[])', [saved.map(item => item.id)])).rows[0].count, '0');
    assert.equal(await earlyAccess(pool, owner), null);
    await assert.rejects(new EarlyAccessPlanStore(pool).recordConsent(owner, first, planConsent()), /historical contribution/);
    await assert.rejects(pool.query('DELETE FROM free_workspace_plans WHERE workspace_id=$1', [first]), /immutable/);
    const fresh = connect();
    try { assert.deepEqual(await new WorkspaceStore(fresh).list(await resolveUnenrolledIdentity(fresh, who)), saved); }
    finally { await fresh.end(); }
    await assert.rejects(store.read(owner, wa), /not found/);
    const api = createFoundationService({ pool, origin, identity: async () => who });
    assert.equal((await api.handle(request('workspace', first, { name: 'Forged', requestId: randomUUID(), verifiedEmail: true }), 'workspace')).status, 400);
    const asset = await store.addAsset(owner, first, 'example.com', 'hostname');
    for (let i = 0; i < 32; i++) await store.beginRun(owner, first, asset.id);
    await assert.rejects(store.beginRun(owner, first, asset.id), (error: unknown) => error instanceof ApiError && error.status === 429);
    assert.equal((await pool.query('SELECT count(*) FROM hostname_check_usage WHERE workspace_id=$1', [first])).rows[0].count, '0');
    for (let i = 0; i < 3; i++) await store.addAsset(owner, first, `linux${i}.example.com`, 'linux_server');
    await assert.rejects(store.addAsset(owner, first, 'linux3.example.com', 'linux_server'), /3 registered Linux/);
    await pool.query("UPDATE users SET early_access_state='paused' WHERE id=$1", [owner.id]);
    await assert.rejects(store.read(owner, first), /paused/);
    await assert.rejects(store.create(owner, 'Free first', key), /paused/);
    await pool.query('UPDATE users SET early_access_state=NULL WHERE id=$1', [owner.id]);
    await pool.query('UPDATE users SET early_access_activated_at=now() WHERE id=$1', [owner.id]);
    await assert.rejects(store.read(owner, first), (error: unknown) => error instanceof ApiError && error.status === 403);
    await pool.query('UPDATE users SET early_access_activated_at=NULL WHERE id=$1', [owner.id]);
    await pool.query("UPDATE memberships SET status='revoked',revoked_at=now() WHERE user_id=$1 AND workspace_id=$2", [owner.id, first]);
    await assert.rejects(store.read(owner, first), /not found/);
    await assert.rejects(store.create(owner, 'Free first', key), /not found/);
    delete process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;
    assert.equal((await store.list(owner)).length, 1); // Closing admission doesn't revoke existing memberships.
    await assert.rejects(store.create(owner, 'No legacy fallback', randomUUID()), /unavailable/);
    await pool.query("UPDATE users SET status='disabled' WHERE id=$1", [owner.id]);
    await assert.rejects(store.list(owner), /not active/);
    await assert.rejects(resolveUnenrolledIdentity(pool, who), /not active/);
  } finally {
    if (previous === undefined) delete process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;
    else process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT = previous;
  }
});

for (const baseline of [10, 12, 14]) test(`Free migration preserves populated 00${baseline} accounts, source bytes, CLI bindings and accepted terms`, async () => {
  const upgradeSchema = `wops_free_upgrade_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${upgradeSchema}`);
  const upgrade = new Pool({ connectionString: env.TEST_DATABASE_URL, options: `-c search_path=${upgradeSchema},public`, max: 1 });
  try {
    await upgrade.query('CREATE TABLE app_migrations (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const dir = new URL('../../../db/migrations/', import.meta.url);
    for (const name of readdirSync(dir).filter(name => /^\d{4}_.*\.sql$/.test(name) && Number(name.slice(0, 4)) <= baseline).sort()) {
      const sql = readFileSync(new URL(name, dir), 'utf8');
      await upgrade.query(sql);
      await upgrade.query('INSERT INTO app_migrations(name,sha256) VALUES ($1,$2)', [name, createHash('sha256').update(sql).digest('hex')]);
    }
    const user = randomUUID(), workspace = randomUUID(), asset = randomUUID(), run = randomUUID();
    await upgrade.query("INSERT INTO users(id,early_access_state,early_access_activated_at) VALUES ($1,'active',now())", [user]);
    await upgrade.query("INSERT INTO identity_mappings(user_id,provider,issuer,subject) VALUES ($1,'workos','fixture','fixture')", [user]);
    await upgrade.query("INSERT INTO workspaces(id,name,slug,created_by,creation_key) VALUES ($1,'Preserved','preserved',$2,$3)", [workspace,user,randomUUID()]);
    await upgrade.query("INSERT INTO memberships(user_id,workspace_id,role) VALUES ($1,$2,'owner')", [user,workspace]);
    await upgrade.query("INSERT INTO assets(id,workspace_id,type,normalized_value) VALUES ($1,$2,'hostname',$3)", [asset,workspace,source.target]);
    await upgrade.query("INSERT INTO runs(id,workspace_id,asset_id,initiated_by,source_type,status,method_id,method_version,source_snapshot,source_digest,finished_at) VALUES ($1,$2,$3,$4,'external-snapshot-v1','completed','fixture','v1',$5,$6,now())", [run,workspace,asset,user,source,createHash('sha256').update(canonicalSource(source)).digest('hex')]);
    await upgrade.query("INSERT INTO cli_sessions(credential_hash,user_id,workspace_id,web_issuer,web_session_id,issued_at,expires_at) VALUES ($1,$2,$3,'fixture','fixture',now(),now()+interval '1 hour')", ['a'.repeat(64),user,workspace]);
    if (baseline >= 12) {
      await upgrade.query('BEGIN');
      await upgrade.query('INSERT INTO early_access_plans(workspace_id,revision) VALUES ($1,1)', [workspace]);
      await upgrade.query('INSERT INTO early_access_plan_consents(workspace_id,request_id,revision,accepted_by,terms_version,contribution_minor) VALUES ($1,$2,1,$3,$4,0)', [workspace,randomUUID(),user,EARLY_ACCESS_PLAN_POLICY.version]);
      await upgrade.query('COMMIT');
    }
    const tables = (await upgrade.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_type='BASE TABLE' AND table_name<>'app_migrations' ORDER BY table_name", [upgradeSchema])).rows.map(row => row.table_name);
    async function snapshot() {
      const values: Record<string, string[]> = {};
      for (const table of tables) {
        assert.match(table, /^[a-z_]+$/);
        values[table] = (await upgrade.query(`SELECT to_jsonb(t) - 'free_workspace_access' - 'generation' - 'membership_generation' AS record FROM ${table} t`)).rows.map(row => canonicalSource(row.record)).sort();
      }
      return values;
    }
    const original = await snapshot();
    await migrate(upgrade);
    assert.equal((await upgrade.query('SELECT generation FROM memberships WHERE user_id=$1', [user])).rows[0].generation, 1);
    assert.equal((await upgrade.query('SELECT membership_generation FROM cli_sessions WHERE user_id=$1', [user])).rows[0].membership_generation, 1);
    assert.deepEqual(await snapshot(), original);
    assert.equal((await upgrade.query('SELECT count(*) FROM free_workspace_plans')).rows[0].count, '0');
    assert.equal((await upgrade.query('SELECT free_workspace_access FROM users WHERE id=$1', [user])).rows[0].free_workspace_access, false);
    await migrate(upgrade);
    assert.deepEqual(await snapshot(), original);
  } finally { await upgrade.end(); await admin.query(`DROP SCHEMA ${upgradeSchema} CASCADE`); }
});

test('Free creation failure rolls back the workspace, owner and admission; old revoked admission stays denied', async () => {
  const previous = process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;
  process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT = '2';
  try {
    const owner = await resolveUnenrolledIdentity(pool, identity('free_rollback'));
    await pool.query(`CREATE FUNCTION fail_free_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'free plan fixture failure'; END $$`);
    await pool.query('CREATE TRIGGER fail_free_fixture BEFORE INSERT ON free_workspace_plans FOR EACH ROW EXECUTE FUNCTION fail_free_fixture()');
    const key = randomUUID();
    try { await assert.rejects(store.create(owner, 'Retry after failure', key), /fixture failure/); }
    finally { await pool.query('DROP TRIGGER fail_free_fixture ON free_workspace_plans'); }
    assert.equal((await pool.query('SELECT count(*) FROM workspaces WHERE created_by=$1', [owner.id])).rows[0].count, '0');
    assert.equal((await pool.query('SELECT count(*) FROM memberships WHERE user_id=$1', [owner.id])).rows[0].count, '0');
    assert.equal((await pool.query('SELECT free_workspace_access FROM users WHERE id=$1', [owner.id])).rows[0].free_workspace_access, false);
    await store.create(owner, 'Retry after failure', key);
    const revoked = await resolveUnenrolledIdentity(pool, identity('old_revoked'));
    await pool.query('UPDATE users SET early_access_activated_at=now() WHERE id=$1', [revoked.id]);
    await assert.rejects(store.create(revoked, 'No readmission', randomUUID()), (error: unknown) => error instanceof ApiError && error.status === 403);
  } finally {
    if (previous === undefined) delete process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;
    else process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT = previous;
  }
});
// Existing foundation fixtures explicitly belong to the test cohort. Real
// identity resolution remains unenrolled until an operator invites that user.
async function resolveIdentity(database: Pool, providerIdentity: Identity) {
  const user = await resolveUnenrolledIdentity(database, providerIdentity);
  await database.query("UPDATE users SET early_access_state='active' WHERE id=$1", [user.id]);
  return user;
}

function request(endpoint: string, workspace: string, body?: unknown) {
  return new Request(`${origin}/api/${endpoint}`, { method: body === undefined ? "GET" : "POST", headers: { host: "127.0.0.1:3020", origin, "content-type": "application/json", "x-witnessops-workspace": workspace }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
before(async () => {
  assert.equal((await admin.query("SELECT current_database() AS db")).rows[0].db, target.pathname.slice(1));
  await admin.query(`CREATE SCHEMA ${schema}`);
  pool = connect(); await migrate(pool); store = new WorkspaceStore(pool);
  a = await resolveIdentity(pool, identity("user_a")); b = await resolveIdentity(pool, identity("user_b")); viewer = await resolveIdentity(pool, identity("viewer"));
  wa = await store.create(a, "Workspace A", randomUUID()); wb = await store.create(b, "Workspace B", randomUUID());
  await pool.query("INSERT INTO memberships (user_id,workspace_id,role) VALUES ($1,$2,'viewer')", [viewer.id, wa]);
});
after(async () => { await pool?.end(); await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end(); });

const planConsent = (contributionMinor = 0, expectedRevision = 0, requestId = randomUUID()) => ({
  requestId, expectedRevision, termsVersion: EARLY_ACCESS_PLAN_POLICY.version, contributionMinor, accepted: true,
});
async function planFixture(name: string) {
  const user = await resolveIdentity(pool, identity(name));
  const workspace = await store.create(user, name, randomUUID());
  return { user, workspace, plans: new EarlyAccessPlanStore(pool) };
}

test('Plan: migration preserves cohort admission and creates no implicit plan or contribution', async () => {
  assert.deepEqual((await pool.query('SELECT terms FROM early_access_plan_terms WHERE version=$1', [EARLY_ACCESS_PLAN_POLICY.version])).rows[0].terms, EARLY_ACCESS_PLAN_POLICY);
  assert.equal((await pool.query('SELECT count(*) FROM early_access_plans')).rows[0].count, '0');
  assert.equal((await pool.query('SELECT count(*) FROM early_access_plan_consents')).rows[0].count, '0');
  assert.equal(await earlyAccess(pool, a), 'active');
  assert.equal(await new EarlyAccessPlanStore(pool).read(a, wa), null);
});

test('Plan: explicit €0 consent survives reconnect; amount changes and delayed retries never restart the trial', async () => {
  const { user, workspace, plans } = await planFixture('plan_lifecycle');
  const choice = planConsent();
  const first = await plans.recordConsent(user, workspace, choice);
  assert.equal(first.contributionMinor, 0); assert.equal(first.revision, 1); assert.equal(first.acceptedBy, user.id);
  assert.equal(Date.parse(first.trialEndsAt)-Date.parse(first.trialStartedAt), 168*60*60*1000);
  assert.equal(planTermsAt(first, new Date(first.trialEndsAt)).phase, 'continuing');
  const fresh = connect();
  try { assert.deepEqual(await new EarlyAccessPlanStore(fresh).read(user, workspace), first); }
  finally { await fresh.end(); }
  const changed = await plans.recordConsent(user, workspace, planConsent(4900, 1));
  assert.equal(changed.contributionMinor, 4900); assert.equal(changed.revision, 2);
  assert.equal(changed.trialStartedAt, first.trialStartedAt); assert.equal(changed.trialEndsAt, first.trialEndsAt);
  assert.deepEqual(await plans.recordConsent(user, workspace, choice), changed);
  const zeroAgain = await plans.recordConsent(user, workspace, planConsent(0, 2));
  assert.equal(zeroAgain.trialEndsAt, first.trialEndsAt); assert.equal(zeroAgain.contributionMinor, 0);
  assert.deepEqual((await pool.query('SELECT contribution_minor,consent_scope FROM early_access_plan_consents WHERE workspace_id=$1 ORDER BY revision', [workspace])).rows,
    [{ contribution_minor: 0, consent_scope: 'contribution_choice' }, { contribution_minor: 4900, consent_scope: 'contribution_choice' }, { contribution_minor: 0, consent_scope: 'contribution_choice' }]);
});

test('Plan: concurrent identical enrollment is idempotent; conflicting choices require a fresh revision', async () => {
  const { user, workspace, plans } = await planFixture('plan_concurrent');
  const choice = planConsent();
  const replies = await Promise.all(Array.from({ length: 4 }, () => plans.recordConsent(user, workspace, choice)));
  for (const reply of replies) assert.deepEqual(reply, replies[0]);
  const outcomes = await Promise.allSettled([plans.recordConsent(user, workspace, planConsent(4900, 1)), plans.recordConsent(user, workspace, planConsent(1000, 1))]);
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
  const rejected = outcomes.find(r => r.status === 'rejected');
  assert.ok(rejected?.status === 'rejected' && rejected.reason instanceof ApiError && rejected.reason.status === 409);
  const current = await plans.read(user, workspace); assert.equal(current?.revision, 2);
  assert.equal(current?.trialEndsAt, replies[0].trialEndsAt);
  assert.equal((await pool.query('SELECT count(*) FROM early_access_plan_consents WHERE workspace_id=$1', [workspace])).rows[0].count, '2');
  await assert.rejects(plans.recordConsent(user, workspace, { ...choice, contributionMinor: 4900 }), /already used/);
  await assert.rejects(plans.recordConsent(user, workspace, planConsent(0, 0)), /plan changed/);
});

test('Plan: foreign members, Viewers, revoked members and paused identities cannot read or write financial choices', async () => {
  const { user, workspace, plans } = await planFixture('plan_authorization');
  await pool.query("INSERT INTO memberships(user_id,workspace_id,role) VALUES ($1,$2,'viewer')", [viewer.id, workspace]);
  const choice = planConsent();
  const first = await plans.recordConsent(user, workspace, choice);
  for (const actor of [b, viewer]) {
    await assert.rejects(plans.read(actor, workspace));
    await assert.rejects(plans.recordConsent(actor, workspace, planConsent(4900, 1)));
    await assert.rejects(plans.recordConsent(actor, workspace, choice));
  }
  await pool.query("UPDATE users SET early_access_state='paused' WHERE id=$1", [user.id]);
  await assert.rejects(plans.read(user, workspace), /paused/);
  await assert.rejects(plans.recordConsent(user, workspace, choice), /paused/);
  await pool.query("UPDATE users SET early_access_state='active' WHERE id=$1", [user.id]);
  assert.deepEqual(await plans.read(user, workspace), first);
  await pool.query("UPDATE memberships SET status='revoked',revoked_at=now() WHERE user_id=$1 AND workspace_id=$2", [user.id, workspace]);
  await assert.rejects(plans.read(user, workspace), /not found/);
  await assert.rejects(plans.recordConsent(user, workspace, choice), /not found/);
  assert.equal((await pool.query('SELECT count(*) FROM early_access_plan_consents WHERE workspace_id=$1', [workspace])).rows[0].count, '1');
});

test('Plan: new terms and missing consent cannot silently change a contribution', async () => {
  const { user, workspace, plans } = await planFixture('plan_explicit');
  const first = await plans.recordConsent(user, workspace, planConsent(4900));
  for (const override of [{ accepted: false }, { accepted: undefined }, { termsVersion: 'future-price' }, { trialStartedAt: new Date().toISOString() }, { contributionMinor: undefined }]) {
    await assert.rejects(plans.recordConsent(user, workspace, { ...planConsent(0, 1), ...override }));
  }
  assert.deepEqual(await plans.read(user, workspace), first);
});

test('Plan: failed consent insertion rolls back enrollment and its trial dates', async () => {
  const { user, workspace, plans } = await planFixture('plan_rollback');
  await pool.query(`CREATE FUNCTION deny_plan_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.workspace_id='${workspace}' THEN RAISE EXCEPTION 'fixture consent failure'; END IF; RETURN NEW; END $$`);
  await pool.query('CREATE TRIGGER deny_plan_fixture BEFORE INSERT ON early_access_plan_consents FOR EACH ROW EXECUTE FUNCTION deny_plan_fixture()');
  try {
    await assert.rejects(plans.recordConsent(user, workspace, planConsent()), /fixture consent failure/);
    assert.equal(await plans.read(user, workspace), null);
    assert.equal((await pool.query('SELECT count(*) FROM early_access_plans WHERE workspace_id=$1', [workspace])).rows[0].count, '0');
  } finally { await pool.query('DROP TRIGGER deny_plan_fixture ON early_access_plan_consents'); await pool.query('DROP FUNCTION deny_plan_fixture()'); }
});

test('Plan: database guards preserve trial identity, consent history and the exact accepted terms', async () => {
  const { user, workspace, plans } = await planFixture('plan_immutable');
  const first = await plans.recordConsent(user, workspace, planConsent());
  for (const sql of [
    "UPDATE early_access_plans SET trial_started_at=trial_started_at+interval '1 hour',trial_ends_at=trial_ends_at+interval '1 hour',revision=revision+1 WHERE workspace_id=$1",
    'UPDATE early_access_plans SET revision=revision WHERE workspace_id=$1',
    'DELETE FROM early_access_plans WHERE workspace_id=$1',
    'UPDATE early_access_plan_consents SET contribution_minor=4900 WHERE workspace_id=$1',
    'DELETE FROM early_access_plan_consents WHERE workspace_id=$1',
  ]) await assert.rejects(pool.query(sql, [workspace]));
  await assert.rejects(pool.query('UPDATE early_access_plans SET revision=revision+1 WHERE workspace_id=$1', [workspace]), /current_plan_consent/);
  await assert.rejects(pool.query("UPDATE early_access_plan_terms SET terms=jsonb_set(terms,'{suggestedContributionMinor}','9900')"), /immutable/);
  await assert.rejects(pool.query('DELETE FROM early_access_plan_terms'), /immutable/);
  assert.deepEqual(await plans.read(user, workspace), first);
});

async function usageFixture(name: string, contributionMinor = 0) {
  const fixture = await planFixture(name);
  await fixture.plans.recordConsent(fixture.user, fixture.workspace, planConsent(contributionMinor));
  const asset = await store.addAsset(fixture.user, fixture.workspace, source.target, 'hostname');
  return { ...fixture, asset };
}
const quotaError = (error: unknown) => error instanceof ApiError && error.status === 429 && /25 hostname checks.*UTC calendar month.*resets on/.test(error.message);
// Historical accounting fixtures only; production never accepts admission dates
// from a request and never backfills usage for pre-consent runs.
async function historicalUsage(fixture: Awaited<ReturnType<typeof usageFixture>>, admittedAt: string, completed = true) {
  const id = randomUUID();
  await pool.query(`INSERT INTO runs(id,workspace_id,asset_id,initiated_by,source_type,status,method_id,method_version,created_at,started_at)
    VALUES ($1,$2,$3,$4,'external-snapshot-v1','running','bounded-hostname','external-demo-v0.1',$5,$5)`, [id, fixture.workspace, fixture.asset.id, fixture.user.id, admittedAt]);
  await pool.query('INSERT INTO hostname_check_usage(run_id,workspace_id,consent_revision,admitted_at) VALUES ($1,$2,1,$3)', [id, fixture.workspace, admittedAt]);
  if (completed) await store.completeRun(fixture.user, fixture.workspace, id, source);
  return id;
}

test('Usage: independent connections admit exactly 25 concurrent hostname/domain checks per workspace', async () => {
  const f = await usageFixture('usage_concurrent');
  const domain = await store.addAsset(f.user, f.workspace, 'example.com', 'domain');
  const fresh = connect(), other = new WorkspaceStore(fresh);
  try {
    const results = await Promise.allSettled(Array.from({ length: 28 }, (_, i) =>
      (i % 2 ? other : store).beginRun(f.user, i % 2 ? f.workspace.toUpperCase() : f.workspace, i % 2 ? domain.id : f.asset.id)));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 25);
    const denied = results.filter(r => r.status === 'rejected'); assert.equal(denied.length, 3);
    for (const result of denied) assert.ok(result.status === 'rejected' && quotaError(result.reason));
    assert.equal((await fresh.query('SELECT count(*) FROM hostname_check_usage WHERE workspace_id=$1', [f.workspace])).rows[0].count, '25');
    assert.equal((await fresh.query('SELECT count(*) FROM runs WHERE workspace_id=$1', [f.workspace])).rows[0].count, '25');
    assert.equal((await fresh.query(`SELECT bool_and(r.created_at=u.admitted_at AND r.started_at=u.admitted_at) AS aligned
      FROM hostname_check_usage u JOIN runs r ON r.id=u.run_id WHERE u.workspace_id=$1`, [f.workspace])).rows[0].aligned, true);
    await assert.rejects(other.beginRun(f.user, f.workspace, f.asset.id), quotaError);
    const independent = await usageFixture('usage_independent');
    assert.ok(await other.beginRun(independent.user, independent.workspace, independent.asset.id));
  } finally { await fresh.end(); }
});

test('Usage: failure releases one slot; saved snapshots and contribution changes do not reset usage', async () => {
  for (const amount of [0, 4900]) {
    const f = await usageFixture(`usage_lifecycle_${amount}`, amount);
    const runs = await Promise.all(Array.from({ length: 25 }, () => store.beginRun(f.user, f.workspace, f.asset.id)));
    await store.completeRun(f.user, f.workspace, runs[0], source);
    // A failed cleanup cannot erase completed evidence or refund a saved check.
    await store.failRun(f.workspace, runs[0], f.user);
    await assert.rejects(store.beginRun(f.user, f.workspace, f.asset.id), quotaError);
    await store.failRun(f.workspace, runs[1], f.user);
    await store.failRun(f.workspace, runs[1], f.user);
    const replacement = await store.beginRun(f.user, f.workspace, f.asset.id);
    await store.completeRun(f.user, f.workspace, replacement, source);
    await f.plans.recordConsent(f.user, f.workspace, planConsent(amount === 0 ? 4900 : 0, 1));
    await assert.rejects(store.beginRun(f.user, f.workspace, f.asset.id), quotaError);
    assert.equal((await pool.query('SELECT count(*) FROM hostname_check_usage WHERE workspace_id=$1', [f.workspace])).rows[0].count, '26');
    assert.equal((await store.run(f.user, f.workspace, runs[0])).sourceDigest, createHash('sha256').update(canonicalSource(source)).digest('hex'));
  }
});

test('Usage: UTC months remain independent across completion, session time zones and retained history over 32 runs', async () => {
  const f = await usageFixture('usage_months');
  const dates = (await pool.query(`SELECT
    (date_trunc('month',statement_timestamp() AT TIME ZONE 'UTC')-interval '1 millisecond') AT TIME ZONE 'UTC' AS prior,
    (date_trunc('month',statement_timestamp() AT TIME ZONE 'UTC')-interval '1 month 1 millisecond') AT TIME ZONE 'UTC' AS older`)).rows[0];
  for (let i = 0; i < 24; i++) await historicalUsage(f, dates.prior.toISOString());
  const crossing = await historicalUsage(f, dates.prior.toISOString(), false);
  for (let i = 0; i < 8; i++) await historicalUsage(f, dates.older.toISOString());
  await store.completeRun(f.user, f.workspace, crossing, source);
  // The lifetime count is already 33. A new month still admits the full allowance.
  const fresh = new Pool({ connectionString: env.TEST_DATABASE_URL, options: `-c search_path=${schema},public -c timezone=Pacific/Honolulu`, max: 1 });
  try {
    const restarted = new WorkspaceStore(fresh);
    for (let i = 0; i < 25; i++) await restarted.beginRun(f.user, f.workspace, f.asset.id);
    await assert.rejects(restarted.beginRun(f.user, f.workspace, f.asset.id), quotaError);
    const counts = (await fresh.query('SELECT period_start::text AS month,count(*) FROM hostname_check_usage WHERE workspace_id=$1 GROUP BY period_start ORDER BY period_start', [f.workspace])).rows;
    assert.deepEqual(counts.map(r => r.count), ['8', '25', '25']);
    assert.equal(counts[2].month, (await fresh.query("SELECT to_char(statement_timestamp() AT TIME ZONE 'UTC','YYYY-MM-01') AS month")).rows[0].month);
  } finally { await fresh.end(); }
  assert.equal((await pool.query('SELECT admitted_at FROM hostname_check_usage WHERE run_id=$1', [crossing])).rows[0].admitted_at.toISOString(), dates.prior.toISOString());
  await assert.rejects(pool.query('DELETE FROM runs WHERE id=$1', [crossing]), /immutable/);
});

test('Usage: no retrospective enrollment; the unenrolled cohort retains its existing 32-run capacity', async () => {
  const f = await planFixture('usage_legacy'), asset = await store.addAsset(f.user, f.workspace, source.target, 'hostname');
  for (let i = 0; i < 32; i++) await store.beginRun(f.user, f.workspace, asset.id);
  await assert.rejects(store.beginRun(f.user, f.workspace, asset.id), /Workspace run capacity/);
  assert.equal((await pool.query('SELECT count(*) FROM hostname_check_usage WHERE workspace_id=$1', [f.workspace])).rows[0].count, '0');
  await f.plans.recordConsent(f.user, f.workspace, planConsent());
  for (let i = 0; i < 25; i++) await store.beginRun(f.user, f.workspace, asset.id);
  await assert.rejects(store.beginRun(f.user, f.workspace, asset.id), quotaError);
  assert.equal((await pool.query('SELECT count(*) FROM hostname_check_usage WHERE workspace_id=$1', [f.workspace])).rows[0].count, '25');
});

test('Usage: admission records and pending runs commit or roll back together; history cannot be rewritten', async () => {
  const f = await usageFixture('usage_atomic');
  await pool.query(`CREATE FUNCTION deny_usage_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.workspace_id='${f.workspace}' THEN RAISE EXCEPTION 'fixture usage failure'; END IF; RETURN NEW; END $$`);
  await pool.query('CREATE TRIGGER deny_usage_fixture BEFORE INSERT ON hostname_check_usage FOR EACH ROW EXECUTE FUNCTION deny_usage_fixture()');
  try {
    await assert.rejects(store.beginRun(f.user, f.workspace, f.asset.id), /fixture usage failure/);
    assert.equal((await pool.query('SELECT count(*) FROM runs WHERE workspace_id=$1', [f.workspace])).rows[0].count, '0');
  } finally { await pool.query('DROP TRIGGER deny_usage_fixture ON hostname_check_usage'); await pool.query('DROP FUNCTION deny_usage_fixture()'); }
  const run = await store.beginRun(f.user, f.workspace, f.asset.id);
  for (const sql of [
    "UPDATE hostname_check_usage SET admitted_at=admitted_at+interval '1 month' WHERE run_id=$1",
    'UPDATE hostname_check_usage SET consent_revision=2 WHERE run_id=$1',
    'DELETE FROM hostname_check_usage WHERE run_id=$1',
  ]) await assert.rejects(pool.query(sql, [run]), /immutable/);
  await assert.rejects(pool.query('INSERT INTO hostname_check_usage(run_id,workspace_id,consent_revision,admitted_at) SELECT run_id,workspace_id,consent_revision,admitted_at FROM hostname_check_usage WHERE run_id=$1', [run]), /duplicate key/);
  await store.failRun(f.workspace, run, f.user);
  await assert.rejects(pool.query('DELETE FROM runs WHERE id=$1', [run]), /foreign key/);
  await assert.rejects(pool.query('INSERT INTO hostname_check_usage(run_id,workspace_id,consent_revision,admitted_at) VALUES ($1,$2,1,now())', [run, f.workspace]), /pending hostname run/);
});

test('Usage: current Owner, workspace, asset and cohort authorization precede accounting', async () => {
  const f = await usageFixture('usage_authorization');
  await pool.query("INSERT INTO memberships(user_id,workspace_id,role) VALUES ($1,$2,'viewer')", [viewer.id, f.workspace]);
  for (const actor of [b, viewer]) await assert.rejects(store.beginRun(actor, f.workspace, f.asset.id));
  await assert.rejects(store.beginRun(f.user, f.workspace, randomUUID()), /Asset not found/);
  await pool.query("UPDATE users SET early_access_state='paused' WHERE id=$1", [f.user.id]);
  await assert.rejects(store.beginRun(f.user, f.workspace, f.asset.id), /paused/);
  await pool.query("UPDATE users SET early_access_state='active' WHERE id=$1", [f.user.id]);
  const run = await store.beginRun(f.user, f.workspace, f.asset.id);
  await pool.query("UPDATE memberships SET status='revoked',revoked_at=now() WHERE workspace_id=$1 AND user_id=$2", [f.workspace, f.user.id]);
  await assert.rejects(store.completeRun(f.user, f.workspace, run, source), /Workspace not found/);
  await assert.rejects(store.beginRun(f.user, f.workspace, f.asset.id), /Workspace not found/);
  await store.failRun(f.workspace, run, f.user); // Cleanup still works after revocation.
  const rows = (await pool.query('SELECT r.status FROM hostname_check_usage u JOIN runs r ON r.id=u.run_id WHERE u.workspace_id=$1', [f.workspace])).rows;
  assert.deepEqual(rows, [{ status: 'failed' }]);
});

test('Usage: the real HTTP boundary rejects exhausted allowance before executing and releases failed collection', async () => {
  const f = await usageFixture('usage_http');
  for (let i = 0; i < 25; i++) await store.beginRun(f.user, f.workspace, f.asset.id);
  let executions = 0;
  const service = () => createFoundationService({ pool, origin, identity: async () => identity('usage_http'), run: async () => { executions++; throw new Error('fixture collector failure'); } });
  const exhausted = await service().handle(request('runs', f.workspace, { assetId: f.asset.id, authorized: true }), 'runs');
  assert.equal(exhausted.status, 429); assert.match((await exhausted.json()).error, /25 hostname checks/); assert.equal(executions, 0);
  const held = (await pool.query('SELECT run_id FROM hostname_check_usage WHERE workspace_id=$1 LIMIT 1', [f.workspace])).rows[0].run_id;
  await store.failRun(f.workspace, held, f.user);
  assert.equal((await service().handle(request('runs', f.workspace, { assetId: f.asset.id, authorized: true }), 'runs')).status, 422);
  assert.equal(executions, 1);
  assert.ok(await store.beginRun(f.user, f.workspace, f.asset.id));
  await assert.rejects(store.beginRun(f.user, f.workspace, f.asset.id), quotaError);
});

test('Usage: an unsupported accepted policy fails closed instead of falling back to legacy admission', async () => {
  const f = await planFixture('usage_unsupported'), asset = await store.addAsset(f.user, f.workspace, source.target, 'hostname');
  const version = 'unsupported-fixture-policy';
  await pool.query('INSERT INTO early_access_plan_terms(version,terms) VALUES ($1,$2)', [version, { version }]);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO early_access_plans(workspace_id,revision) VALUES ($1,1)', [f.workspace]);
    await client.query('INSERT INTO early_access_plan_consents(workspace_id,request_id,revision,accepted_by,terms_version,contribution_minor) VALUES ($1,$2,1,$3,$4,0)', [f.workspace, randomUUID(), f.user.id, version]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  await assert.rejects(store.beginRun(f.user, f.workspace, asset.id), (error: unknown) => error instanceof ApiError && error.status === 503);
  assert.equal((await pool.query('SELECT count(*) FROM runs WHERE workspace_id=$1', [f.workspace])).rows[0].count, '0');
});

test('Usage: rejected admission refunds throttle slots without refunding actual collection attempts', async () => {
  const limited = await usageFixture('usage_throttle_limited'), available = await usageFixture('usage_throttle_available');
  for (let i = 0; i < 25; i++) await store.beginRun(limited.user, limited.workspace, limited.asset.id);
  const assets = [limited.asset];
  for (let i = 0; i < 9; i++) assets.push(await store.addAsset(limited.user, limited.workspace, `limited-${i}.example.com`, 'hostname'));
  let actor = 'usage_throttle_limited', executions = 0;
  const api = createFoundationService({ pool, origin, now: () => 100_000, identity: async () => identity(actor), run: async target => {
    executions++;
    if (target !== source.target) throw new Error('fixture collector failure');
    return structuredClone(source);
  } });
  for (const asset of [...assets, limited.asset]) {
    const response = await api.handle(request('runs', limited.workspace, { assetId: asset.id, authorized: true }), 'runs');
    assert.equal(response.status, 429); assert.match((await response.json()).error, /25 hostname checks/);
  }
  assert.equal(executions, 0);
  actor = 'usage_throttle_available';
  const observe = (assetId: string) => api.handle(request('runs', available.workspace, { assetId, authorized: true }), 'runs');
  // Same worker and hostname, without advancing its clock: rejected attempts
  // must consume neither the shared ten-start budget nor the hostname cooldown.
  assert.equal((await observe(available.asset.id)).status, 201); assert.equal(executions, 1);
  const completedRetry = await observe(available.asset.id);
  assert.equal(completedRetry.status, 429); assert.match((await completedRetry.json()).error, /Collection is bounded/);
  const failing = await store.addAsset(available.user, available.workspace, 'failing.example.com', 'hostname');
  assert.equal((await observe(failing.id)).status, 422); assert.equal(executions, 2);
  const failedRetry = await observe(failing.id);
  assert.equal(failedRetry.status, 429); assert.match((await failedRetry.json()).error, /Collection is bounded/);
  assert.equal(executions, 2);
});

const linuxSourceLimitError = (error: unknown) => error instanceof ApiError && error.status === 409 && /3 registered Linux import sources/.test(error.message);
const linuxSourceCount = async (workspace: string) => Number((await pool.query("SELECT count(*) FROM assets WHERE workspace_id=$1 AND type='linux_server'", [workspace])).rows[0].count);
async function linuxSourceFixture(name: string, amount = 0) {
  const f = await planFixture(name);
  await f.plans.recordConsent(f.user, f.workspace, planConsent(amount));
  return f;
}
function signedLinuxFixture() {
  const zipName = 'proofpack-pr_lsa_20260710120000_198fd7aceb.zip';
  const file = new URL(`../../../../../tests/proofpack/production-fixtures/complete/${zipName}`, import.meta.url);
  return { zipName, zip: readFileSync(file), signature: readFileSync(new URL(file.href + '.sig.json')) };
}

test('Linux sources: independent pools admit exactly three registrations at every contribution amount', async () => {
  const fresh = connect(), other = new WorkspaceStore(fresh);
  try {
    for (const amount of [0, 4900]) {
      const f = await linuxSourceFixture(`linux_sources_concurrent_${amount}`, amount);
      await store.addAsset(f.user, f.workspace, 'example.com', 'hostname');
      await store.addAsset(f.user, f.workspace, 'example.org', 'domain');
      const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) =>
        (i % 2 ? other : store).addAsset(f.user, i % 2 ? f.workspace.toUpperCase() : f.workspace, `linux-${i}`, 'linux_server')));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 3);
      const denied = results.filter(r => r.status === 'rejected'); assert.equal(denied.length, 5);
      for (const result of denied) assert.ok(result.status === 'rejected' && linuxSourceLimitError(result.reason));
      assert.equal(await linuxSourceCount(f.workspace), 3);
      assert.equal((await other.read(f.user, f.workspace)).assets.length, 5);
      await f.plans.recordConsent(f.user, f.workspace, planConsent(amount ? 0 : 4900, 1));
      await assert.rejects(other.addAsset(f.user, f.workspace, 'fourth', 'linux_server'), linuxSourceLimitError);
      assert.equal((await pool.query('SELECT count(*) FROM hostname_check_usage WHERE workspace_id=$1', [f.workspace])).rows[0].count, '0');
    }
  } finally { await fresh.end(); }
});

test('Linux sources: existing registrations count at enrollment; over-cap legacy workspaces remain unchanged', async () => {
  const f = await planFixture('linux_sources_legacy');
  for (let i = 0; i < 3; i++) await store.addAsset(f.user, f.workspace, `legacy-${i}`, 'linux_server');
  await f.plans.recordConsent(f.user, f.workspace, planConsent());
  await assert.rejects(store.addAsset(f.user, f.workspace, 'fourth', 'linux_server'), linuxSourceLimitError);

  const legacy = await planFixture('linux_sources_over_cap');
  for (let i = 0; i < 4; i++) await store.addAsset(legacy.user, legacy.workspace, `legacy-${i}`, 'linux_server');
  const before = (await store.read(legacy.user, legacy.workspace)).assets;
  await assert.rejects(legacy.plans.recordConsent(legacy.user, legacy.workspace, planConsent()), linuxSourceLimitError);
  assert.equal(await legacy.plans.read(legacy.user, legacy.workspace), null);
  assert.equal((await pool.query('SELECT count(*) FROM early_access_plan_consents WHERE workspace_id=$1', [legacy.workspace])).rows[0].count, '0');
  assert.deepEqual((await store.read(legacy.user, legacy.workspace)).assets, before);
  await store.addAsset(legacy.user, legacy.workspace, 'still-legacy', 'linux_server');
  assert.equal(await linuxSourceCount(legacy.workspace), 5);
});

test('Linux sources: enrollment and a fourth registration serialize on the same canonical workspace lock', async () => {
  const f = await planFixture('linux_sources_enrollment_race');
  for (let i = 0; i < 3; i++) await store.addAsset(f.user, f.workspace, `linux-${i}`, 'linux_server');
  const fresh = connect();
  try {
    const results = await Promise.allSettled([
      new WorkspaceStore(fresh).addAsset(f.user, f.workspace.toUpperCase(), 'fourth', 'linux_server'),
      f.plans.recordConsent(f.user, f.workspace, planConsent()),
    ]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const rejected = results.find(r => r.status === 'rejected');
    assert.ok(rejected?.status === 'rejected' && linuxSourceLimitError(rejected.reason));
    const plan = await f.plans.read(f.user, f.workspace);
    assert.equal(await linuxSourceCount(f.workspace), plan ? 3 : 4);
  } finally { await fresh.end(); }
});

test('Linux sources: authorization, failed registrations and the HTTP limit preserve available slots', async () => {
  const name = 'linux_sources_authorization', f = await linuxSourceFixture(name);
  await pool.query("INSERT INTO memberships(user_id,workspace_id,role) VALUES ($1,$2,'viewer')", [viewer.id, f.workspace]);
  await store.addAsset(f.user, f.workspace, 'demo-host', 'linux_server');
  await assert.rejects(store.addAsset(f.user, f.workspace, 'DEMO-HOST', 'linux_server'), /already an asset/);
  await assert.rejects(store.addAsset(f.user, f.workspace, 'https://invalid.example', 'linux_server'));
  await assert.rejects(store.addAsset(viewer, f.workspace, 'viewer-host', 'linux_server'), /Owner/);
  await assert.rejects(store.addAsset(b, f.workspace, 'foreign-host', 'linux_server'), /not found/);
  await pool.query("UPDATE users SET early_access_state='paused' WHERE id=$1", [f.user.id]);
  await assert.rejects(store.addAsset(f.user, f.workspace, 'paused-host', 'linux_server'), /paused/);
  await pool.query("UPDATE users SET early_access_state='active' WHERE id=$1", [f.user.id]);
  assert.equal(await linuxSourceCount(f.workspace), 1);
  const service = createFoundationService({ pool, origin, identity: async () => identity(name), run: async () => { throw new Error('No collection during registration'); } });
  for (const hostname of ['second', 'third']) assert.equal((await service.handle(request('assets', f.workspace, { hostname, type: 'linux_server' }), 'assets')).status, 201);
  const blocked = await service.handle(request('assets', f.workspace, { hostname: 'fourth', type: 'linux_server' }), 'assets');
  assert.equal(blocked.status, 409); assert.match((await blocked.json()).error, /3 registered Linux import sources/);
  assert.equal(await linuxSourceCount(f.workspace), 3);
  await pool.query("UPDATE memberships SET status='revoked',revoked_at=now() WHERE user_id=$1 AND workspace_id=$2", [f.user.id, f.workspace]);
  await assert.rejects(store.addAsset(f.user, f.workspace, 'revoked-host', 'linux_server'), /not found/);
});

test('Linux sources: repeated verified imports reuse a slot beyond 32 runs and remain independent of monthly hostname usage', async () => {
  const { LinuxCheckStore } = await import('./linux-checks');
  const { zip, signature, zipName } = signedLinuxFixture(), linux = new LinuxCheckStore(pool);
  const f = await usageFixture('linux_sources_import_history');
  const asset = await store.addAsset(f.user, f.workspace, 'demo-host', 'linux_server');
  for (const name of ['second', 'third']) await store.addAsset(f.user, f.workspace, name, 'linux_server');
  const old = (await pool.query("SELECT (date_trunc('month',now() AT TIME ZONE 'UTC')-interval '1 month') AT TIME ZONE 'UTC' AS at")).rows[0].at.toISOString();
  const history: string[] = [];
  for (let i = 0; i < 33; i++) history.push(await historicalUsage(f, old));
  for (let i = 0; i < 25; i++) await store.beginRun(f.user, f.workspace, f.asset.id);
  await assert.rejects(store.beginRun(f.user, f.workspace, f.asset.id), quotaError);
  const first = await linux.import(f.user, f.workspace.toUpperCase(), asset.id, zip, signature, zipName);
  await f.plans.recordConsent(f.user, f.workspace, planConsent(4900, 1));
  const second = await linux.import(f.user, f.workspace, asset.id, zip, signature, zipName);
  assert.notEqual(first.id, second.id); assert.equal(first.sourceDigest, second.sourceDigest);
  const corrupt = Buffer.from(zip); corrupt[100] ^= 1;
  await assert.rejects(linux.import(f.user, f.workspace, asset.id, corrupt, signature, zipName), /verification/);
  assert.equal(await linuxSourceCount(f.workspace), 3);
  assert.equal((await linux.list(f.user, f.workspace)).length, 2);
  assert.equal((await pool.query('SELECT count(*) FROM hostname_check_usage WHERE workspace_id=$1', [f.workspace])).rows[0].count, '58');
  await assert.rejects(store.addAsset(f.user, f.workspace, 'fourth', 'linux_server'), linuxSourceLimitError);
  const fresh = connect();
  try {
    const reopened = await new LinuxCheckStore(fresh).reopen(f.user, f.workspace, first.id);
    assert.deepEqual(reopened.source.zip, zip); assert.deepEqual(reopened.source.signature, signature);
    assert.equal(canonicalSource((await new WorkspaceStore(fresh).run(f.user, f.workspace, history[0])).snapshot), canonicalSource(source));
  } finally { await fresh.end(); }
});

test('Linux sources: a previously enrolled over-cap workspace keeps saved evidence and contribution updates', async () => {
  const { LinuxCheckStore } = await import('./linux-checks');
  const { zip, signature, zipName } = signedLinuxFixture(), linux = new LinuxCheckStore(pool);
  const f = await linuxSourceFixture('linux_sources_prior_enrollment', 4900);
  const asset = await store.addAsset(f.user, f.workspace, 'demo-host', 'linux_server');
  const saved = await linux.import(f.user, f.workspace, asset.id, zip, signature, zipName);
  // Historical pre-enforcement fixture, not a production registration path.
  for (let i = 0; i < 3; i++) await pool.query("INSERT INTO assets(id,workspace_id,type,normalized_value) VALUES ($1,$2,'linux_server',$3)", [randomUUID(), f.workspace, `pre-limit-${i}`]);
  await assert.rejects(store.addAsset(f.user, f.workspace, 'fifth', 'linux_server'), linuxSourceLimitError);
  await assert.rejects(linux.import(f.user, f.workspace, asset.id, zip, signature, zipName), linuxSourceLimitError);
  const changed = await f.plans.recordConsent(f.user, f.workspace, planConsent(0, 1));
  assert.equal(changed.contributionMinor, 0); assert.equal(changed.revision, 2);
  assert.equal(await linuxSourceCount(f.workspace), 4);
  assert.equal((await linux.list(f.user, f.workspace)).length, 1);
  assert.deepEqual((await linux.reopen(f.user, f.workspace, saved.id)).source.zip, zip);
});

test('Linux sources: unenrolled imports keep their lifetime capacity; unsupported plans cannot fall back to it', async () => {
  const { LinuxCheckStore } = await import('./linux-checks');
  const { zip, signature, zipName } = signedLinuxFixture(), linux = new LinuxCheckStore(pool);
  const legacy = await planFixture('linux_sources_legacy_import');
  const asset = await store.addAsset(legacy.user, legacy.workspace, 'demo-host', 'linux_server');
  const hostname = await store.addAsset(legacy.user, legacy.workspace, source.target, 'hostname');
  for (let i = 0; i < 32; i++) await store.beginRun(legacy.user, legacy.workspace, hostname.id);
  await assert.rejects(linux.import(legacy.user, legacy.workspace, asset.id, zip, signature, zipName), /import capacity/);
  await legacy.plans.recordConsent(legacy.user, legacy.workspace, planConsent());
  assert.ok(await linux.import(legacy.user, legacy.workspace, asset.id, zip, signature, zipName));

  const f = await planFixture('linux_sources_unsupported');
  const existing = await store.addAsset(f.user, f.workspace, 'demo-host', 'linux_server');
  const saved = await linux.import(f.user, f.workspace, existing.id, zip, signature, zipName);
  const version = 'unsupported-linux-sources-policy';
  await pool.query('INSERT INTO early_access_plan_terms(version,terms) VALUES ($1,$2)', [version, { version }]);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO early_access_plans(workspace_id,revision) VALUES ($1,1)', [f.workspace]);
    await client.query('INSERT INTO early_access_plan_consents(workspace_id,request_id,revision,accepted_by,terms_version,contribution_minor) VALUES ($1,$2,1,$3,$4,0)', [f.workspace, randomUUID(), f.user.id, version]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  const unavailable = (error: unknown) => error instanceof ApiError && error.status === 503;
  await assert.rejects(store.addAsset(f.user, f.workspace, 'second', 'linux_server'), unavailable);
  await assert.rejects(linux.import(f.user, f.workspace, existing.id, zip, signature, zipName), unavailable);
  assert.equal(await linuxSourceCount(f.workspace), 1);
  assert.equal((await linux.list(f.user, f.workspace)).length, 1);
  assert.deepEqual((await linux.reopen(f.user, f.workspace, saved.id)).source.zip, zip);
});

test("session replay: 200 before logout, 401 after replay and fresh connection; other session stays valid", async () => {
  const providerIdentity = identity("user_sessionUser");
  const user = await resolveIdentity(pool, providerIdentity);
  const workspace = await store.create(user, "Session acceptance", randomUUID());
  const keyA = sessionKey(providerIdentity.issuer, "session_A", providerIdentity.subject);
  const keyB = sessionKey(providerIdentity.issuer, "session_B", providerIdentity.subject);
  // The provider fixture stands in for already-verified AuthKit claims. It does
  // not replace real browser/cookie acceptance or claim to test JWT verification.
  const boundary = (db: Pool, key: typeof keyA) => createFoundationService({ pool: db, origin, identity: async () => {
    await requireUnrevokedSession(db, key); return providerIdentity;
  } });
  assert.equal((await boundary(pool, keyA).handle(request("workspace", workspace), "workspace")).status, 200);
  await revokeSession(pool, keyA);
  await revokeSession(pool, keyA); // Retry is idempotent.
  assert.equal((await boundary(pool, keyA).handle(request("workspace", workspace), "workspace")).status, 401);
  assert.equal((await boundary(pool, keyB).handle(request("workspace", workspace), "workspace")).status, 200);
  const fresh = connect();
  try {
    assert.equal((await boundary(fresh, keyA).handle(request("workspace", workspace), "workspace")).status, 401);
    assert.equal((await fresh.query("SELECT count(*) FROM revoked_sessions WHERE issuer=$1 AND session_id=$2", [keyA.issuer, keyA.sessionId])).rows[0].count, "1");
  } finally { await fresh.end(); }
  // Membership/entitlement is deliberately irrelevant to logout.
  await pool.query("UPDATE memberships SET status='revoked', revoked_at=now() WHERE user_id=$1", [user.id]);
  await revokeSession(pool, keyB);
  await assert.rejects(requireUnrevokedSession(pool, keyB), /Sign in/);
  // Same session ID under another provider client does not collide.
  await requireUnrevokedSession(pool, { ...keyA, issuer: keyA.issuer + "_other" });
});

test("identity: same provider subject and changed email retain the internal user", async () => {
  const again = await resolveIdentity(pool, { ...identity("user_a"), email: "changed@example.test" });
  assert.equal(again.id, a.id); assert.notEqual(a.id, b.id);
  const snapshot = await pool.query("SELECT verified_email_snapshot FROM identity_mappings WHERE user_id=$1", [a.id]);
  assert.equal(snapshot.rows[0].verified_email_snapshot, "changed@example.test");
});
test("identity: concurrent first resolution creates one internal user; another issuer stays distinct", async () => {
  const ids = await Promise.all(Array.from({ length: 4 }, () => resolveIdentity(pool, identity("concurrent"))));
  assert.equal(new Set(ids.map(u => u.id)).size, 1);
  const other = await resolveIdentity(pool, { ...identity("user_a"), issuer: "https://api.workos.com/user_management/other_client" });
  assert.notEqual(other.id, a.id);
});
test("workspace: creation and Owner membership are atomic; retry uses the same creation key", async () => {
  const key = randomUUID();
  const id = await store.create(a, "Acme Ltd", key);
  assert.equal(await store.create(a, "Acme Ltd", key), id);
  await assert.rejects(store.create(a, "Different", key), /already used/);
  assert.equal((await store.read(a, id)).role, "owner");
  // Force the membership insert to fail inside the real transaction.
  await pool.query(`CREATE FUNCTION deny_owner_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id='${b.id}' THEN RAISE EXCEPTION 'fixture rollback'; END IF; RETURN NEW; END $$`);
  await pool.query("CREATE TRIGGER fixture_owner_fail BEFORE INSERT ON memberships FOR EACH ROW EXECUTE FUNCTION deny_owner_fixture()");
  try {
    await assert.rejects(store.create(b, "Rollback workspace", randomUUID()));
    assert.equal((await pool.query("SELECT count(*) FROM workspaces WHERE name='Rollback workspace'")).rows[0].count, "0");
  } finally { await pool.query("DROP TRIGGER fixture_owner_fail ON memberships"); await pool.query("DROP FUNCTION deny_owner_fixture()"); }
});
test("workspace: Owner and Viewer read only their memberships, with no membership mutation API", async () => {
  assert.equal((await store.read(a, wa)).role, "owner");
  assert.equal((await store.read(viewer, wa)).role, "viewer");
  await assert.rejects(store.read(a, wb), /Workspace not found/);
  assert.ok(!(await store.list(a)).some(w => w.id === wb));
  const api = createFoundationService({ pool, origin, identity: async () => identity("user_a") });
  const mutation = new Request(`${origin}/api/workspace`, { method: "PATCH", headers: { host: "127.0.0.1:3020", origin, "x-witnessops-workspace": wb }, body: JSON.stringify({ name: "changed" }) });
  assert.equal((await api.handle(mutation, "workspace")).status, 405);
  assert.equal((await store.read(b, wb)).name, "Workspace B");
});
test("assets: normalized values are workspace-scoped and survive a new pool lifecycle", async () => {
  const asset = await store.addAsset(a, wa, " WITNESSOPS.COM. ", "hostname");
  const other = await store.addAsset(b, wb, "witnessops.com", "domain");
  assert.notEqual(asset.id, other.id); assert.equal(asset.hostname, "witnessops.com");
  await assert.rejects(store.addAsset(a, wa, "witnessops.com", "hostname"), /already an asset/);
  const fresh = connect();
  try { assert.deepEqual(await new WorkspaceStore(fresh).asset(a, wa, asset.id), asset); }
  finally { await fresh.end(); }
  await assert.rejects(store.asset(a, wa, other.id), /Asset not found/);
  await assert.rejects(store.asset(a, wb, other.id), /Workspace not found/);
  await assert.rejects(store.addAsset(viewer, wa, "viewer.example.com", "hostname"), /Owner/);
});
test("assets: existing hostname admission rejects private, IP, URL and execution options", async () => {
  for (const host of ["127.0.0.1", "localhost", "https://example.com", "foo.internal", "example.com:443", "example.com/path"]) await assert.rejects(store.addAsset(a, wa, host, "hostname"));
  await assert.rejects(store.addAsset(a, wa, "example.com", "public-ip"));
});
test("runs: exact snapshot, canonical digest and two immutable records survive a new pool", async () => {
  const asset = (await store.read(a, wa)).assets[0];
  const firstId = await store.beginRun(a, wa, asset.id);
  const first = await store.completeRun(a, wa, firstId, source);
  assert.deepEqual(first.snapshot, source);
  assert.deepEqual(first.snapshot.checks.map(c => c.check_id), CHECK_IDS);
  assert.equal(first.sourceDigest, createHash("sha256").update(canonicalSource(source), "utf8").digest("hex"));
  const modified = structuredClone(source); modified.checks.find(c => c.check_id === "web.hsts.v1")!.observation = { header: "max-age=300", maxAge: 300 };
  const second = await store.completeRun(a, wa, await store.beginRun(a, wa, asset.id), modified);
  assert.notEqual(first.id, second.id); assert.equal(compareRuns(second, first).environment.length, 1);
  const fresh = connect();
  try {
    const restarted = new WorkspaceStore(fresh), ws = await restarted.read(a, wa);
    assert.deepEqual(await restarted.run(a, wa, first.id), first);
    assert.deepEqual(ws.runs.map(r => r.id), [first.id, second.id]);
  } finally { await fresh.end(); }
  await assert.rejects(store.completeRun(a, wa, first.id, modified));
  await assert.rejects(pool.query("UPDATE runs SET source_digest=$2 WHERE id=$1", [first.id, "0".repeat(64)]), /immutable/);
  await assert.rejects(pool.query("DELETE FROM runs WHERE id=$1", [first.id]), /immutable/);
});
test("runs: database refuses completed records without source/digest/timestamp", async () => {
  const asset = (await store.read(a, wa)).assets[0];
  const id = await store.beginRun(a, wa, asset.id);
  await assert.rejects(pool.query("UPDATE runs SET status='completed' WHERE id=$1", [id]));
  await store.failRun(wa, id, a);
});
test("runs: foreign asset cannot be attached even by a raw cross-workspace insert", async () => {
  const assetB = (await store.read(b, wb)).assets[0];
  await assert.rejects(store.beginRun(a, wa, assetB.id), /Asset not found/);
  await assert.rejects(pool.query("INSERT INTO runs (id,workspace_id,asset_id,initiated_by,source_type,status,method_id,method_version) VALUES ($1,$2,$3,$4,'external-snapshot-v1','running','fixture','1')", [randomUUID(), wa, assetB.id, a.id]));
});
test("API A/B: known foreign workspace/asset/run/report identifiers are denied through runtime authorization", async () => {
  const assetB = (await store.read(b, wb)).assets[0];
  const runB = await store.completeRun(b, wb, await store.beginRun(b, wb, assetB.id), source);
  let calls = 0;
  const api = createFoundationService({ pool, origin, identity: async () => identity("user_a"), run: async () => { calls++; return source; } });
  for (const [endpoint, ws] of [["workspace", wb], [`assets?id=${assetB.id}`, wa], [`assets?id=${assetB.id}`, wb], [`runs?id=${runB.id}`, wa], [`runs?id=${runB.id}`, wb]] as const) {
    const response = await api.handle(request(endpoint, ws), endpoint.split("?")[0] as "workspace" | "assets" | "runs");
    assert.equal(response.status, 404); assert.doesNotMatch(await response.text(), /sourceDigest|checks|witnessops.com/);
  }
  // Reports/history read these same workspace-scoped immutable runs.
  const history = await api.handle(request("workspace", wa), "workspace");
  assert.ok(!(await history.json()).workspace.runs.some((run: Run) => run.id === runB.id));
  for (const ws of [wa, wb]) assert.equal((await api.handle(request("runs", ws, { assetId: assetB.id, authorized: true }), "runs")).status, 404);
  assert.equal(calls, 0);
});
test("API Viewer: reads allowed, create asset and execution denied before runner", async () => {
  let calls = 0;
  const api = createFoundationService({ pool, origin, identity: async () => identity("viewer"), run: async () => { calls++; return source; } });
  assert.equal((await api.handle(request("workspace", wa), "workspace")).status, 200);
  assert.equal((await api.handle(request("assets", wa, { hostname: "viewer.example.com", type: "hostname" }), "assets")).status, 403);
  assert.equal((await api.handle(request("runs", wa, { assetId: (await store.read(a, wa)).assets[0].id, authorized: true }), "runs")).status, 403);
  assert.equal(calls, 0);
});
test("API preserves explicit run authorization and rejects duplicate/oversized/injected fields", async () => {
  let calls = 0;
  const api = createFoundationService({ pool, origin, identity: async () => identity("user_a"), run: async () => { calls++; return source; } });
  const asset = (await store.read(a, wa)).assets[0];
  for (const input of [{ assetId: asset.id, authorized: false }, { assetId: asset.id, authorized: "true" }, { assetId: asset.id, authorized: true, ports: [22] }, { assetId: "x".repeat(1100), authorized: true }, null, []]) assert.equal((await api.handle(request("runs", wa, input), "runs")).status, 400);
  const duplicate = new Request(`${origin}/api/runs`, { method: "POST", headers: { host: "127.0.0.1:3020", origin, "content-type": "application/json", "x-witnessops-workspace": wa }, body: `{"assetId":"${asset.id}","authorized":false,"authorized":true}` });
  assert.equal((await api.handle(duplicate, "runs")).status, 400); assert.equal(calls, 0);
});
test("API successful real-contract execution retains source; per-host cooldown preserves rerun semantics", async () => {
  let calls = 0, clock = 1_000_000;
  const api = createFoundationService({ pool, origin, identity: async () => identity("user_a"), now: () => clock, run: async () => { calls++; return structuredClone(source); } });
  const asset = (await store.read(a, wa)).assets[0];
  assert.equal((await api.handle(request("runs", wa, { assetId: asset.id, authorized: true }), "runs")).status, 201);
  assert.equal((await api.handle(request("runs", wa, { assetId: asset.id, authorized: true }), "runs")).status, 429);
  clock += 60_000;
  assert.equal((await api.handle(request("runs", wa, { assetId: asset.id, authorized: true }), "runs")).status, 201);
  assert.equal(calls, 2);
});
test("API failed/malformed/wrong-target execution stores failure without manufactured source", async () => {
  for (const execute of [async () => { throw new Error("private resolver detail"); }, async () => ({ ...source, target: "other.com" }), async () => ({ ...source, checks: [] })]) {
    const api = createFoundationService({ pool, origin, identity: async () => identity("user_a"), run: execute });
    const asset = (await store.read(a, wa)).assets[0];
    const response = await api.handle(request("runs", wa, { assetId: asset.id, authorized: true }), "runs");
    assert.equal(response.status, 422); assert.doesNotMatch(await response.text(), /private resolver detail/);
  }
  const failed = await pool.query("SELECT source_snapshot,source_digest FROM runs WHERE workspace_id=$1 AND status='failed'", [wa]);
  assert.ok(failed.rows.length >= 3); assert.ok(failed.rows.every(row => row.source_snapshot === null && row.source_digest === null));
});
test("revocation: subsequent reads/writes and in-flight completion fail closed", async () => {
  const revoked = await resolveIdentity(pool, identity("revoked"));
  await pool.query("INSERT INTO memberships (user_id,workspace_id,role) VALUES ($1,$2,'owner')", [revoked.id, wa]);
  let finish!: (snapshot: ExternalSnapshotV1) => void, started!: () => void;
  const begun = new Promise<void>(resolve => { started = resolve; });
  const api = createFoundationService({ pool, origin, identity: async () => identity("revoked"), run: () => new Promise(resolve => { finish = resolve; started(); }) });
  const asset = (await store.read(a, wa)).assets[0];
  const pending = api.handle(request("runs", wa, { assetId: asset.id, authorized: true }), "runs");
  await begun;
  await pool.query("UPDATE memberships SET status='revoked',revoked_at=now() WHERE user_id=$1 AND workspace_id=$2", [revoked.id, wa]);
  finish(source);
  assert.equal((await pending).status, 404);
  assert.equal((await api.handle(request("workspace", wa), "workspace")).status, 404);
  assert.equal((await api.handle(request(`assets?id=${asset.id}`, wa), "assets")).status, 404);
  assert.equal((await api.handle(request("assets", wa, { hostname: "new.example.com", type: "hostname" }), "assets")).status, 404);
});
test("disabled user cannot regain access by resolving its provider session", async () => {
  const disabled = await resolveIdentity(pool, identity("disabled"));
  await pool.query("UPDATE users SET status='disabled' WHERE id=$1", [disabled.id]);
  await assert.rejects(resolveIdentity(pool, identity("disabled")), /not active/);
});

test("API global admission preserves ten starts per minute across distinct assets", async () => {
  const user = await resolveIdentity(pool, identity("rate_owner")), ws = await store.create(user, "Rate fixture", randomUUID());
  let calls = 0;
  const api = createFoundationService({ pool, origin, identity: async () => identity("rate_owner"), now: () => 1_000_000, run: async hostname => { calls++; const copy = structuredClone(source); copy.target = hostname; copy.checks.forEach(check => { check.target = hostname; }); return copy; } });
  for (let index = 0; index < 11; index++) {
    const asset = await store.addAsset(user, ws, `host${index}.example.com`, "hostname");
    assert.equal((await api.handle(request("runs", ws, { assetId: asset.id, authorized: true }), "runs")).status, index < 10 ? 201 : 429);
  }
  assert.equal(calls, 10);
});
test("API concurrency admission remains two and recovers after completion", async () => {
  const user = await resolveIdentity(pool, identity("concurrent_runs")), ws = await store.create(user, "Concurrency fixture", randomUUID());
  const assets = await Promise.all(["one.example.com", "two.example.com", "three.example.com"].map(host => store.addAsset(user, ws, host, "hostname")));
  const pending = new Map<string, (snapshot: ExternalSnapshotV1) => void>();
  let admitted!: () => void;
  const twoStarted = new Promise<void>(resolve => { admitted = resolve; });
  const api = createFoundationService({ pool, origin, identity: async () => identity("concurrent_runs"), run: hostname => new Promise(resolve => { pending.set(hostname, resolve); if (pending.size === 2) admitted(); }) });
  const first = api.handle(request("runs", ws, { assetId: assets[0].id, authorized: true }), "runs");
  const second = api.handle(request("runs", ws, { assetId: assets[1].id, authorized: true }), "runs");
  await twoStarted;
  assert.equal((await api.handle(request("runs", ws, { assetId: assets[2].id, authorized: true }), "runs")).status, 429);
  for (const [host, finish] of pending) { const copy = structuredClone(source); copy.target = host; copy.checks.forEach(check => { check.target = host; }); finish(copy); }
  assert.equal((await first).status, 201); assert.equal((await second).status, 201);
});

test('Early Access: new users cannot self-enroll; invited activation remains separate and paused users stay blocked', async () => {
  const user = await resolveUnenrolledIdentity(pool, identity('cohort_new'));
  assert.equal(await earlyAccess(pool, user), null);
  const api = createFoundationService({ pool, origin, identity: async () => identity('cohort_new') });
  assert.equal((await api.handle(request('early-access', wa), 'early-access')).status, 200);
  for (const state of ['invited', 'paused'] as const) {
    await pool.query('UPDATE users SET early_access_state=$2 WHERE id=$1', [user.id, state]);
    for (const endpoint of ['workspace', 'assets', 'runs', 'events', 'feedback'] as const) {
      const denied = await api.handle(request(endpoint, wa), endpoint);
      assert.equal(denied.status, 403);
      assert.equal((await denied.json()).accessState, state);
    }
    const attempt = await api.handle(request('early-access', wa, { action: 'activate' }), 'early-access');
    assert.equal(attempt.status, state === 'invited' ? 200 : 403);
  }
  await pool.query('UPDATE users SET early_access_state=NULL,early_access_activated_at=NULL WHERE id=$1', [user.id]);
  assert.equal((await api.handle(request('early-access', wa, { action: 'activate' }), 'early-access')).status, 403);
  assert.equal((await api.handle(request('early-access', wa, { action: 'enroll' }), 'early-access')).status, 400);
  assert.equal(await earlyAccess(pool, user), null);
  assert.equal((await pool.query("SELECT count(*) FROM product_events WHERE user_id=$1 AND name='early_access_activated'", [user.id])).rows[0].count, '1');

  // Active cohort state does not create membership or authorize a known workspace.
  assert.equal((await api.handle(request('workspace', wa), 'workspace')).status, 403);
  await assert.rejects(store.read(user, wa), (error: unknown) => error instanceof ApiError && error.status === 403 && error.accessState === null);
  assert.equal((await api.handle(request('early-access', wa, { action: 'activate', state: 'active' }), 'early-access')).status, 400);
});
test('Early Access migration: existing members require an explicit preservation choice; other accounts remain unenrolled', async () => {
  const upgradeSchema = `wops_upgrade_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${upgradeSchema}`);
  const upgrade = new Pool({ connectionString: env.TEST_DATABASE_URL, options: `-c search_path=${upgradeSchema},public`, max: 1 });
  try {
    await upgrade.query('CREATE TABLE app_migrations (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const dir = new URL('../../../db/migrations/', import.meta.url);
    for (const name of readdirSync(dir).filter(name => /^000[1-4]_.*\.sql$/.test(name)).sort()) {
      const sql = readFileSync(new URL(name, dir), 'utf8');
      await upgrade.query(sql);
      await upgrade.query('INSERT INTO app_migrations (name,sha256) VALUES ($1,$2)', [name, createHash('sha256').update(sql, 'utf8').digest('hex')]);
    }
    const owner = randomUUID(), other = randomUUID(), workspace = randomUUID();
    await upgrade.query('INSERT INTO users (id) VALUES ($1),($2)', [owner, other]);
    await upgrade.query("INSERT INTO workspaces (id,name,slug,created_by,creation_key) VALUES ($1,'Existing workspace','existing',$2,$3)", [workspace, owner, randomUUID()]);
    await upgrade.query("INSERT INTO memberships (user_id,workspace_id,role) VALUES ($1,$3,'owner'),($2,$3,'viewer')", [owner, other, workspace]);
    await assert.rejects(migrate(upgrade), /Name the existing member/);
    await assert.rejects(migrate(upgrade, { preserveMember: randomUUID() }), /existing active workspace member/);
    assert.equal((await upgrade.query('SELECT count(*) FROM information_schema.columns WHERE table_schema=$1 AND column_name=$2', [upgradeSchema, 'early_access_state'])).rows[0].count, '0');
    await migrate(upgrade, { preserveMember: owner });
    assert.equal((await upgrade.query('SELECT early_access_state FROM users WHERE id=$1', [owner])).rows[0].early_access_state, 'active');
    assert.equal((await upgrade.query('SELECT early_access_state FROM users WHERE id=$1', [other])).rows[0].early_access_state, null);
    assert.equal((await upgrade.query('SELECT count(*) FROM memberships')).rows[0].count, '2');
    // Re-running an applied migration neither needs a choice nor changes it.
    await migrate(upgrade);
    assert.equal((await upgrade.query('SELECT count(*) FROM users WHERE early_access_state IS NOT NULL')).rows[0].count, '1');
  } finally { await upgrade.end(); await admin.query(`DROP SCHEMA ${upgradeSchema} CASCADE`); }
});
test('Early Access: pause denies direct data access and an in-flight completion without rewriting old runs', async () => {
  const user = await resolveIdentity(pool, identity('cohort_paused'));
  const workspace = await store.create(user, 'Paused fixture', randomUUID());
  const asset = await store.addAsset(user, workspace, 'witnessops.com', 'hostname');
  const first = await store.completeRun(user, workspace, await store.beginRun(user, workspace, asset.id), source);
  const running = await store.beginRun(user, workspace, asset.id);
  await pool.query("UPDATE users SET early_access_state='paused' WHERE id=$1", [user.id]);
  for (const read of [() => store.list(user), () => store.read(user, workspace), () => store.asset(user, workspace, asset.id), () => store.run(user, workspace, first.id), () => store.create(user, 'Denied', randomUUID()), () => store.addAsset(user, workspace, 'other.example.com', 'hostname'), () => store.beginRun(user, workspace, asset.id), () => store.completeRun(user, workspace, running, source)]) await assert.rejects(read, /paused/);
  assert.equal((await pool.query('SELECT source_digest FROM runs WHERE id=$1', [first.id])).rows[0].source_digest, first.sourceDigest);
  await pool.query("UPDATE users SET early_access_state='invited' WHERE id=$1", [user.id]);
  await activateEarlyAccess(pool, user);
  assert.equal((await store.run(user, workspace, first.id)).sourceDigest, first.sourceDigest);
  await store.failRun(workspace, running, user);
});
test('Feedback: one durable answer/dismissal per context, correct run eligibility and no source mutation', async () => {
  const user = await resolveIdentity(pool, identity('feedback_owner'));
  const workspace = await store.create(user, 'Feedback fixture', randomUUID());
  const asset = await store.addAsset(user, workspace, 'witnessops.com', 'hostname');
  const first = await store.completeRun(user, workspace, await store.beginRun(user, workspace, asset.id), source);
  const second = await store.completeRun(user, workspace, await store.beginRun(user, workspace, asset.id), source);
  const activity = new ActivityStore(pool);
  const input = { surface: 'first_run', runId: first.id, response: 'yes', comment: 'Clear explanation.' };
  await activity.feedback(user, workspace, input);
  await activity.feedback(user, workspace, { ...input, response: 'not_really', comment: 'Retry cannot replace first answer' });
  assert.equal((await pool.query('SELECT comment FROM product_feedback WHERE user_id=$1', [user.id])).rows[0].comment, input.comment);
  await assert.rejects(activity.feedback(user, workspace, { ...input, surface: 'comparison' }), /context/);
  await assert.rejects(activity.feedback(user, workspace, { ...input, runId: second.id }), /context/);
  await activity.feedback(user, workspace, { surface: 'comparison', runId: second.id, response: 'dismissed', comment: null });
  const fresh = connect();
  try { assert.equal((await new ActivityStore(fresh).decisions(user, workspace)).length, 2); }
  finally { await fresh.end(); }
  assert.deepEqual((await store.run(user, workspace, first.id)), first);
  assert.deepEqual((await store.run(user, workspace, second.id)), second);
});
test('Feedback A/B: known foreign workspace/run and user injection denied; Viewer may give own feedback', async () => {
  const asset = await store.addAsset(b, wb, 'feedback.example.com', 'hostname');
  const localSource = structuredClone(source); localSource.target = asset.hostname; localSource.checks.forEach(c => { c.target = asset.hostname; });
  const run = await store.completeRun(b, wb, await store.beginRun(b, wb, asset.id), localSource);
  const api = createFoundationService({ pool, origin, identity: async () => identity('user_a') });
  const input = { surface: 'first_run', runId: run.id, response: 'yes', comment: null };
  assert.equal((await api.handle(request('feedback', wb), 'feedback')).status, 404);
  for (const workspace of [wa, wb]) assert.equal((await api.handle(request('feedback', workspace, input), 'feedback')).status, 404);
  assert.equal((await api.handle(request('feedback', wa, { ...input, userId: b.id }), 'feedback')).status, 400);
  const ownWorkspace = await store.create(a, 'Viewer feedback fixture', randomUUID());
  await pool.query("INSERT INTO memberships (user_id,workspace_id,role) VALUES ($1,$2,'viewer')", [viewer.id, ownWorkspace]);
  const ownAsset = await store.addAsset(a, ownWorkspace, 'viewer-feedback.example.com', 'hostname');
  const ownSource = structuredClone(source); ownSource.target = ownAsset.hostname; ownSource.checks.forEach(c => { c.target = ownAsset.hostname; });
  const ownRun = await store.completeRun(a, ownWorkspace, await store.beginRun(a, ownWorkspace, ownAsset.id), ownSource);
  const viewerApi = createFoundationService({ pool, origin, identity: async () => identity('viewer') });
  assert.equal((await viewerApi.handle(request('feedback', ownWorkspace, { ...input, runId: ownRun.id }), 'feedback')).status, 201);
  assert.deepEqual(await new ActivityStore(pool).decisions(a, ownWorkspace), []);
  assert.equal((await new ActivityStore(pool).decisions(viewer, ownWorkspace)).length, 1);
  for (const comment of ['x'.repeat(501), { source }]) assert.equal((await viewerApi.handle(request('feedback', ownWorkspace, { ...input, runId: ownRun.id, comment }), 'feedback')).status, 400);
  for (const invalid of [{ surface: ['first_run'] }, { response: ['yes'] }]) assert.equal((await viewerApi.handle(request('feedback', ownWorkspace, { ...input, runId: ownRun.id, ...invalid }), 'feedback')).status, 400);
  await pool.query("UPDATE memberships SET status='revoked',revoked_at=now() WHERE user_id=$1 AND workspace_id=$2", [viewer.id, ownWorkspace]);
  assert.equal((await viewerApi.handle(request('feedback', ownWorkspace), 'feedback')).status, 404);
  assert.equal((await viewerApi.handle(request('feedback', ownWorkspace, { ...input, runId: ownRun.id }), 'feedback')).status, 404);
  assert.equal((await viewerApi.handle(request('events', ownWorkspace, { name: 'report_opened', runId: ownRun.id, checkId: null }), 'events')).status, 404);
});
test('Events: rerun/comparison/failure records and per-user bounds use the real runtime path', async () => {
  const user = await resolveIdentity(pool, identity('events_lifecycle'));
  const ws = await store.create(user, 'Lifecycle fixture', randomUUID());
  const asset = await store.addAsset(user, ws, source.target, 'hostname');
  const api = () => createFoundationService({ pool, origin, identity: async () => identity('events_lifecycle'), run: async () => structuredClone(source) });
  const first = await (await api().handle(request('runs', ws, { assetId: asset.id, authorized: true }), 'runs')).json();
  const secondResponse = await api().handle(request('runs', ws, { assetId: asset.id, authorized: true }), 'runs');
  assert.equal(secondResponse.status, 201); const second = await secondResponse.json();
  assert.equal((await api().handle(request('events', ws, { name: 'comparison_viewed', runId: second.id, checkId: null }), 'events')).status, 200);
  const failed = createFoundationService({ pool, origin, identity: async () => identity('events_lifecycle'), run: async () => { throw new Error('Fixture collection failure'); } });
  assert.equal((await failed.handle(request('runs', ws, { assetId: asset.id, authorized: true }), 'runs')).status, 422);
  const names = (await pool.query('SELECT name FROM product_events WHERE user_id=$1', [user.id])).rows.map(row => row.name);
  assert.equal(names.filter(name => name === 'observation_started').length, 3);
  assert.equal(names.filter(name => name === 'observation_completed').length, 2);
  assert.equal(names.filter(name => name === 'observation_failed').length, 1);
  assert.equal(names.filter(name => name === 'rerun_started').length, 2);
  assert.equal(names.filter(name => name === 'comparison_viewed').length, 1);
  assert.deepEqual((await store.run(user, ws, first.id)).snapshot, source);
  const failures = (await pool.query("SELECT source_snapshot,source_digest FROM runs WHERE workspace_id=$1 AND status='failed'", [ws])).rows;
  assert.deepEqual(failures, [{ source_snapshot: null, source_digest: null }]);
  // Fill this isolated user's hourly allowance without collecting anything.
  for (let i=names.length; i<250; i++) await pool.query("INSERT INTO product_events (id,user_id,workspace_id,asset_id,name,dedupe_key) VALUES ($1,$2,$3,$4,'asset_added',$5)", [randomUUID(), user.id, ws, asset.id, `rate-fixture-${i}`]);
  assert.equal((await api().handle(request('events', ws, { name: 'report_opened', runId: second.id, checkId: null }), 'events')).status, 429);
  assert.equal((await api().handle(request('events', ws, { name: 'comparison_viewed', runId: second.id, checkId: null }), 'events')).status, 200);
  assert.equal((await api().handle(request('assets', ws, { hostname: 'rate.example.com', type: 'hostname' }), 'assets')).status, 201);
  assert.equal((await pool.query('SELECT count(*) FROM product_events WHERE user_id=$1', [user.id])).rows[0].count, '250');
});
test('Events: fixed metadata, deduplication, A/B denial, comparison eligibility and failure isolation', async () => {
  const user = await resolveIdentity(pool, identity('events_owner'));
  const ws = await store.create(user, 'Events fixture', randomUUID());
  const api = createFoundationService({ pool, origin, identity: async () => identity('events_owner'), run: async () => structuredClone(source) });
  const assetResponse = await api.handle(request('assets', ws, { hostname: source.target, type: 'hostname' }), 'assets');
  assert.equal(assetResponse.status, 201); const asset = await assetResponse.json();
  const response = await api.handle(request('runs', ws, { assetId: asset.id, authorized: true }), 'runs');
  assert.equal(response.status, 201); const run = await response.json();
  const payload = { name: 'evidence_opened', runId: run.id, checkId: CHECK_IDS[0] };
  for (let i=0; i<3; i++) assert.equal((await api.handle(request('events', ws, payload), 'events')).status, 200);
  assert.equal((await api.handle(request('events', wb, payload), 'events')).status, 404);
  const foreign = createFoundationService({ pool, origin, identity: async () => identity('user_b') });
  assert.equal((await foreign.handle(request('events', wb, payload), 'events')).status, 404);
  assert.equal((await api.handle(request('events', ws, { ...payload, source }), 'events')).status, 400);
  assert.equal((await api.handle(request('events', ws, { ...payload, name: 'observation_completed' }), 'events')).status, 400);
  assert.equal((await api.handle(request('events', ws, { ...payload, checkId: 'unknown' }), 'events')).status, 404);
  await api.handle(request('events', ws, { name: 'comparison_viewed', runId: run.id, checkId: null }), 'events');
  const rows = (await pool.query('SELECT * FROM product_events WHERE workspace_id=$1', [ws])).rows;
  assert.deepEqual(rows.map(r => r.name).sort(), ['asset_added','evidence_opened','observation_completed','observation_started']);
  assert.doesNotMatch(JSON.stringify(rows), /witnessops\.com|source_snapshot|source_digest|interpretation|hostname|email/);
  // A real table failure cannot roll back an otherwise successful asset/run.
  await pool.query("CREATE FUNCTION fail_events_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture event failure'; END $$");
  await pool.query('CREATE TRIGGER fail_events_fixture BEFORE INSERT ON product_events FOR EACH ROW EXECUTE FUNCTION fail_events_fixture()');
  try {
    const added = await api.handle(request('assets', ws, { hostname: 'events.example.com', type: 'hostname' }), 'assets');
    assert.equal(added.status, 201);
    const retryApi = createFoundationService({ pool, origin, identity: async () => identity('events_owner'), run: async () => structuredClone(source) });
    assert.equal((await retryApi.handle(request('runs', ws, { assetId: asset.id, authorized: true }), 'runs')).status, 201);
    const history = await store.read(user, ws);
    assert.equal(history.runs.length, 2); assert.deepEqual(history.runs[0].snapshot, source);
  } finally { await pool.query('DROP TRIGGER fail_events_fixture ON product_events'); await pool.query('DROP FUNCTION fail_events_fixture()'); }
});

test('Linux: synthetic signed import, byte custody, reopen, report, restart and tenant fences', async () => {
  const { LinuxCheckStore, sha256 } = await import('./linux-checks');
  const { pinnedRegistryInput } = await import('../../../../witnessops-web/src/lib/proofpack/pinned-registry');
  const { verifyProofpack } = await import('../../../../witnessops-web/src/lib/proofpack/verify.mjs');
  const { isBuyerReport } = await import('../../../../witnessops-web/src/lib/proofpack/report-model');
  const fixture = new URL('../../../../../tests/proofpack/production-fixtures/complete/proofpack-pr_lsa_20260710120000_198fd7aceb.zip', import.meta.url);
  const zipName = 'proofpack-pr_lsa_20260710120000_198fd7aceb.zip';
  const zip = readFileSync(fixture), signature = readFileSync(new URL(fixture.href + '.sig.json'));
  const linux = new LinuxCheckStore(pool);
  const owner = await resolveIdentity(pool, identity('linux_owner'));
  const workspace = await store.create(owner, 'Synthetic Linux import', randomUUID());
  await pool.query("INSERT INTO memberships (user_id,workspace_id,role) VALUES ($1,$2,'viewer')", [viewer.id,workspace]);
  const asset = await store.addAsset(owner, workspace, 'demo-host', 'linux_server');
  const before = await pool.query('SELECT id,source_digest,source_snapshot FROM runs ORDER BY id');
  const service = createFoundationService({ pool, origin, identity: async () => identity('linux_owner'), run: async () => { throw new Error('Collector must not be called'); } });
  function upload(bytes = zip, sig = signature, extra = false) {
    const form = new FormData(); form.set('assetId',asset.id); form.set('zip',new Blob([bytes]),zipName); form.set('signature',new Blob([sig]),zipName+'.sig.json');
    if (extra) form.set('trust_registry',new Blob(['{}']),'attacker.json');
    return new Request(`${origin}/api/linux-checks`, { method:'POST',headers:{host:'127.0.0.1:3020',origin,'x-witnessops-workspace':workspace},body:form });
  }
  assert.equal((await verifyProofpack({proofpack:{name:zipName,bytes:zip},signature:{name:zipName+'.sig.json',bytes:signature},trust_registry:pinnedRegistryInput()})).status,'valid');
  await assert.rejects(linux.import(viewer,workspace,asset.id,zip,signature,zipName), /Owner/);
  await assert.rejects(linux.import(b,workspace,asset.id,zip,signature,zipName), /not found/);
  assert.equal((await service.handle(upload(zip, signature, true),'linux-checks')).status,400);
  const untrusted = new URL('../../../../../tests/proofpack/fixtures/complete/proofpack-pr_lsa_20260710120000_198fd7aceb.zip', import.meta.url);
  assert.equal((await service.handle(upload(readFileSync(untrusted),readFileSync(new URL(untrusted.href+'.sig.json'))),'linux-checks')).status,422);
  const corrupt = Buffer.from(zip); corrupt[100] ^= 1;
  assert.equal((await service.handle(upload(corrupt),'linux-checks')).status,422);
  assert.equal((await service.handle(upload(zip,Buffer.from('{}')),'linux-checks')).status,422);
  assert.equal((await pool.query('SELECT count(*) FROM runs WHERE workspace_id=$1',[workspace])).rows[0].count,'0');
  const wrongTrust = await verifyProofpack({proofpack:{name:zipName,bytes:zip},signature:{name:zipName+'.sig.json',bytes:signature},trust_registry:{name:'wrong.json',bytes:Buffer.from('{}')}});
  assert.equal(wrongTrust.status,'invalid');
  const imported = await service.handle(upload(),'linux-checks');
  assert.equal(imported.status,201, await imported.clone().text());
  const run = await imported.json();
  // Hold the real comparison at its boundary to reproduce the process slot collision.
  const originalComparison = LinuxCheckStore.prototype.comparison;
  let entered!: () => void, release!: () => void, verifications = 0;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const held = new Promise<void>(resolve => { release = resolve; });
  LinuxCheckStore.prototype.comparison = async function(...args) {
    verifications++; entered(); await held;
    return originalComparison.apply(this,args);
  };
  try {
    const first = service.handle(request(`linux-checks?id=${run.id}`,workspace),'linux-checks');
    await started;
    const busy = await service.handle(request(`linux-checks?id=${run.id}`,workspace),'linux-checks');
    assert.equal(busy.status,429);
    assert.deepEqual(await busy.json(),{error:'Another package is being checked. Try again shortly.',code:'verification_busy',retryable:true});
    assert.equal(busy.headers.get('Retry-After'),'1');
    assert.equal((await service.handle(request(`linux-checks?id=${randomUUID()}`,workspace),'linux-checks')).status,429);
    release(); assert.equal((await first).status,200);
    assert.equal(verifications,1);
    assert.equal((await service.handle(request(`linux-checks?id=${run.id}`,workspace),'linux-checks')).status,200);
    assert.equal(verifications,2); // A later reopen is fresh, not a cached result.
  } finally { release(); LinuxCheckStore.prototype.comparison = originalComparison; }
  assert.equal(run.sourceDigest,sha256(zip)); assert.equal(run.observedHostname,'demo-host'); assert.equal(run.synthetic,true);
  assert.equal((await service.handle(request('runs',workspace,{assetId:asset.id,authorized:true}),'runs')).status,400);
  await assert.rejects(store.beginRun(owner,workspace,asset.id), /not found/);
  const reopened = await linux.reopen(owner,workspace,run.id);
  assert.deepEqual(reopened.source.zip,zip); assert.deepEqual(reopened.source.signature,signature);
  assert.deepEqual(reopened.source.registry,Buffer.from(pinnedRegistryInput().bytes));
  assert.equal(isBuyerReport(reopened.model),true); assert.equal(reopened.model.identity.sourceDigest,sha256(zip));
  assert.equal(reopened.model.identity.productVersion,'1.2.2');
  assert.equal((await linux.reopen(viewer,workspace,run.id)).run.id,run.id);
  await assert.rejects(linux.reopen(b,wb,run.id), /not found/);
  await assert.rejects(linux.reopen(b,workspace,run.id), /not found/);
  await assert.rejects(pool.query("UPDATE runs SET source_digest=$2 WHERE id=$1",[run.id,'0'.repeat(64)]), /immutable/);
  await assert.rejects(pool.query('UPDATE linux_check_sources SET zip_bytes=$2 WHERE run_id=$1',[run.id,corrupt]), /immutable/);
  await assert.rejects(pool.query('DELETE FROM linux_check_sources WHERE run_id=$1',[run.id]), /immutable/);
  const fresh = connect();
  try {
    const again = await new LinuxCheckStore(fresh).reopen(owner,workspace,run.id);
    assert.deepEqual(again.source.zip,zip); assert.deepEqual(again.model,reopened.model);
  } finally { await fresh.end(); }
  const after = await pool.query('SELECT id,source_digest,source_snapshot FROM runs WHERE workspace_id<>$1 ORDER BY id',[workspace]);
  assert.deepEqual(after.rows,before.rows);
  const state = await service.handle(request('workspace',workspace),'workspace');
  const body = await state.json(); assert.equal(body.workspace.runs.length,0); assert.equal(body.workspace.linuxRuns.length,1);
  for (const artifact of ['zip','signature']) {
    const req = new Request(`${origin}/api/linux-checks?id=${run.id}`,{headers:{host:'127.0.0.1:3020','x-witnessops-workspace':workspace,'x-witnessops-artifact':artifact}});
    const response = await service.handle(req,'linux-checks'); assert.equal(response.status,200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), artifact==='zip'?zip:signature);
  }
  const derived = (await pool.query('SELECT derived_snapshot FROM linux_check_sources WHERE run_id=$1',[run.id])).rows[0].derived_snapshot;
  assert.equal(derived.schema,'witnessops.linux_server_snapshot.v1');
  assert.deepEqual(derived,reopened.snapshot);
  assert.equal(reopened.projectionMatches,true);
  await assert.rejects(pool.query("UPDATE linux_check_sources SET derived_snapshot='{}'::jsonb WHERE run_id=$1",[run.id]),/immutable/);
  const second = await linux.import(owner,workspace,asset.id,zip,signature,zipName);
  const comparison = await linux.comparison(owner,workspace,second.id);
  assert.equal(comparison.comparison.baselineId,run.id);
  assert.deepEqual(comparison.comparison.environment,[]);
  assert.deepEqual((await linux.reopen(owner,workspace,run.id)).source.zip,zip);
  const adversePath = new URL('../../../../../tests/proofpack/production-fixtures/adverse/'+zipName,import.meta.url);
  const third = await linux.import(owner,workspace,asset.id,readFileSync(adversePath),readFileSync(new URL(adversePath.href+'.sig.json')),zipName);
  const changes = await linux.comparison(owner,workspace,third.id);
  assert.equal(changes.comparison.baselineId,second.id);
  assert.ok(changes.comparison.environment.some(line=>line.startsWith('Listener added:')));
  await assert.rejects(linux.comparison(b,wb,third.id),/not found/);
  const reconnect = connect();
  try { assert.deepEqual((await new LinuxCheckStore(reconnect).comparison(owner,workspace,third.id)).comparison,changes.comparison); }
  finally { await reconnect.end(); }
  // Existing P1 rows have no projection. A mismatched cache must never replace
  // fresh verification, and a different asset must never supply a baseline.
  const otherAsset = await store.addAsset(owner,workspace,'other-host','linux_server');
  async function persistedSource(cache: unknown, targetAsset = asset.id) {
    const id=randomUUID();
    await pool.query(`INSERT INTO runs (id,workspace_id,asset_id,initiated_by,source_type,status,method_id,method_version,created_at)
      SELECT $1,workspace_id,$2,initiated_by,source_type,'running',method_id,method_version,$4 FROM runs WHERE id=$3`,[id,targetAsset,run.id,new Date().toISOString()]);
    await pool.query(`INSERT INTO linux_check_sources (run_id,workspace_id,zip_name,zip_bytes,signature_bytes,registry_bytes,signature_digest,registry_digest,metadata,verification,derived_snapshot)
      SELECT $1,workspace_id,zip_name,zip_bytes,signature_bytes,registry_bytes,signature_digest,registry_digest,metadata,verification,$2::jsonb FROM linux_check_sources WHERE run_id=$3`,[id,cache===null?null:JSON.stringify(cache),run.id]);
    await pool.query("UPDATE runs SET status='completed',source_digest=$2,finished_at=created_at WHERE id=$1",[id,run.sourceDigest]);
    return id;
  }
  const legacyId=await persistedSource(null);
  const legacy=await linux.reopen(owner,workspace,legacyId);
  assert.equal(legacy.projectionMatches,null);assert.deepEqual(legacy.snapshot,reopened.snapshot);
  const staleId=await persistedSource({...derived,values:{...derived.values,kernel:'incorrect cached value'}});
  const stale=await linux.reopen(owner,workspace,staleId);
  assert.equal(stale.projectionMatches,false);assert.deepEqual(stale.snapshot,reopened.snapshot);assert.deepEqual(stale.source.zip,zip);
  const differentAssetId=await persistedSource(derived,otherAsset.id);
  assert.equal((await linux.comparison(owner,workspace,differentAssetId)).comparison.baselineId,null);
  const foreignAsset=await store.addAsset(b,wb,'demo-host','linux_server');
  await linux.import(b,wb,foreignAsset.id,zip,signature,zipName);
  const fourth=await linux.import(owner,workspace,asset.id,zip,signature,zipName);
  assert.equal((await linux.comparison(owner,workspace,fourth.id)).comparison.baselineId,staleId);
  const foreign = createFoundationService({pool,origin,identity:async()=>identity('user_b')});
  assert.equal((await foreign.handle(request(`linux-checks?id=${run.id}`,wb),'linux-checks')).status,404);
  const anonymous = createFoundationService({pool,origin,identity:async()=>null});
  assert.equal((await anonymous.handle(request(`linux-checks?id=${run.id}`,workspace),'linux-checks')).status,401);
  await pool.query("UPDATE memberships SET status='revoked',revoked_at=now() WHERE user_id=$1 AND workspace_id=$2",[viewer.id,workspace]);
  await assert.rejects(linux.reopen(viewer,workspace,run.id), /not found/);
});


test('Invited creation during free admission retains explicit historical consent eligibility', async () => {
  const previous = process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;
  process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT = '2';
  try {
    const invited = await resolveIdentity(pool, identity('invited_consent_preserved'));
    const workspace = await store.create(invited, 'Invited consent workspace', randomUUID());
    await new EarlyAccessPlanStore(pool).recordConsent(invited, workspace, planConsent());
    assert.equal((await pool.query('SELECT count(*) FROM early_access_plans WHERE workspace_id=$1', [workspace])).rows[0].count, '1');
  } finally {
    if (previous === undefined) delete process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;
    else process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT = previous;
  }
});

test('Membership: recipient binding, admission separation, role work, revocation and rejoin', async () => {
 const prior=process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT='3';
 try {
  const owner=await resolveUnenrolledIdentity(pool,identity('team_owner'));
  const team=await store.create(owner,'Team A',randomUUID()), other=await store.create(owner,'Team B',randomUUID());
  const recipientIdentity=identity('team_recipient'), recipient=await resolveUnenrolledIdentity(pool,recipientIdentity);
  const members=new MembersStore(pool), key=randomUUID();
  const input={email:recipientIdentity.email,role:'viewer',requestId:key};
  const ids=await Promise.all([members.invite(owner,team,input),members.invite(owner,team,input)]);assert.equal(ids[0],ids[1]);
  const id=ids[0];
  let sends=0;await Promise.all([members.deliver(owner,team,id,origin,async()=>{sends++;throw new Error('timeout');}),members.deliver(owner,team,id,origin,async()=>{sends++;throw new Error('timeout');})]);assert.equal(sends,1);
  assert.equal((await members.list(owner,team)).invitations[0].deliveryState,'unknown');
  await assert.rejects(members.preview(recipient,'wrong@example.test',id),/unavailable/);
  await assert.rejects(members.preview(recipient,null,id),/verified/);
  const preview=await members.preview(recipient,recipientIdentity.email,id);assert.equal(preview.role,'viewer');
  assert.equal((await pool.query('SELECT count(*) FROM memberships WHERE user_id=$1',[recipient.id])).rows[0].count,'0');
  delete process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;
  await assert.rejects(members.accept(recipient,recipientIdentity.email,id,2,'viewer'),/changed/);
  await members.accept(recipient,recipientIdentity.email,id,1,'viewer');
  await members.accept(recipient,recipientIdentity.email,id,1,'viewer');
  assert.equal((await store.list(recipient)).length,1);
  assert.equal((await store.read(recipient,team)).role,'viewer');
  await assert.rejects(store.read(recipient,other),/not found/);
  await assert.rejects(store.create(recipient,'Not a creator',randomUUID()),/unavailable/);
  const flags=(await pool.query('SELECT early_access_state,free_workspace_access FROM users WHERE id=$1',[recipient.id])).rows[0];assert.deepEqual(flags,{early_access_state:null,free_workspace_access:false});
  await assert.rejects(store.addAsset(recipient,team,'example.net','hostname'),/Owner/);
  await assert.rejects(members.invite(recipient,team,{...input,requestId:randomUUID()}),/Owner/);
  assert.deepEqual((await members.list(recipient,team)).invitations,[]);
  await members.change(owner,team,recipient.id,'contributor',1);
  const asset=await store.addAsset(recipient,team,source.target,'hostname');
  const run=await store.beginRun(recipient,team,asset.id);
  await assert.rejects(new EarlyAccessPlanStore(pool).recordConsent(recipient,team,planConsent()),/Owner/);
  const cli=new CliAuthStore(pool);
  const cliIdentity={...recipientIdentity,subject:'user_teamcli'};
  await pool.query('INSERT INTO identity_mappings(user_id,provider,issuer,subject,verified_email_snapshot) VALUES($1,$2,$3,$4,$5)',[recipient.id,cliIdentity.provider,cliIdentity.issuer,cliIdentity.subject,cliIdentity.email]);
  const bound={identity:cliIdentity,session:sessionKey(cliIdentity.issuer,'session_team',cliIdentity.subject)};
  const device=await cli.create();await cli.bind(bound,{code:device.userCode,workspaceId:team,displayedUserId:recipient.id,action:'authorize',scope:'cli:session server_check:create'});
  const token=await cli.poll(device.device);assert.equal(token.state,'active');if(token.state!=='active')throw new Error('Expected credential');
  await cli.withServerWork(token.credential,async()=>undefined);
  const waiting=await cli.create();await cli.bind(bound,{code:waiting.userCode,workspaceId:team,displayedUserId:recipient.id,action:'authorize'});
  await members.change(owner,team,recipient.id,null,2);
  await assert.rejects(store.read(recipient,team));await assert.rejects(cli.status(token.credential));await assert.rejects(cli.poll(waiting.device));
  await assert.rejects(members.accept(recipient,recipientIdentity.email,id,1,'viewer'));
  const again=await members.invite(owner,team,{email:recipientIdentity.email,role:'contributor',requestId:randomUUID()});await members.accept(recipient,recipientIdentity.email,again,1,'contributor');
  await assert.rejects(cli.status(token.credential),/revoked/);await assert.rejects(cli.poll(waiting.device),/revoked/);
  await assert.rejects(store.completeRun(recipient,team,run,source),/does not match/);
  await store.failRun(team,run,recipient);
  await assert.rejects(members.accept(recipient,recipientIdentity.email,id,1,'viewer'));
  assert.equal((await store.read(owner,other)).role,'owner');
 } finally {if(prior===undefined)delete process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;else process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT=prior;}
});

test('Membership: concurrent Owner changes, invitation lifecycle and historical seat fence', async () => {
 const owner=await resolveIdentity(pool,identity('owner_concurrent')), second=await resolveIdentity(pool,identity('owner_second'));
 const workspace=await store.create(owner,'Concurrent owners',randomUUID()), members=new MembersStore(pool);
 const invite=await members.invite(owner,workspace,{email:identity('owner_second').email,role:'owner',requestId:randomUUID()});
 await members.accept(second,identity('owner_second').email,invite,1,'owner');
 const outcomes=await Promise.allSettled([members.change(owner,workspace,second.id,null,1),members.change(second,workspace,owner.id,'viewer',1)]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 assert.equal((await pool.query("SELECT count(*) FROM memberships WHERE workspace_id=$1 AND role='owner' AND status='active'",[workspace])).rows[0].count,'1');
 const remaining=(await pool.query("SELECT user_id,generation FROM memberships WHERE workspace_id=$1 AND role='owner' AND status='active'",[workspace])).rows[0];
 const actor=remaining.user_id===owner.id?owner:second;
 await assert.rejects(members.change(actor,workspace,actor.id,null,remaining.generation),/at least one/);
 const target=await resolveUnenrolledIdentity(pool,identity('invite_lifecycle'));
 const first=await members.invite(actor,workspace,{email:identity('invite_lifecycle').email,role:'viewer',requestId:randomUUID()});
 const resent=await members.invite(actor,workspace,{email:identity('invite_lifecycle').email,role:'viewer',requestId:randomUUID(),replaces:first});
 await assert.rejects(members.accept(target,identity('invite_lifecycle').email,first,1,'viewer'));
 await members.cancel(actor,workspace,resent);await assert.rejects(members.accept(target,identity('invite_lifecycle').email,resent,2,'viewer'));
 const expired=await members.invite(actor,workspace,{email:identity('invite_lifecycle').email,role:'viewer',requestId:randomUUID()});await pool.query("UPDATE workspace_invitations SET expires_at=now()-interval '1 second' WHERE id=$1",[expired]);await assert.rejects(members.preview(target,identity('invite_lifecycle').email,expired));
 const historical=await store.create(owner,'Historical single seat',randomUUID());await new EarlyAccessPlanStore(pool).recordConsent(owner,historical,planConsent());
 await assert.rejects(members.invite(owner,historical,{email:identity('invite_lifecycle').email,role:'viewer',requestId:randomUUID()}),/1-place/);
});

test('Membership HTTP: origin, verified recipient, explicit acceptance, file delivery and paused/session fences', async () => {
  const { createMembershipService } = await import('../member-server');
  const { mkdtemp, readdir, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { sendMail } = await import('../../../../witnessops-web/src/lib/server/send-verification-email');
  const directory = await mkdtemp(join(tmpdir(), 'wops-membership-mail-'));
  const previous = { provider: process.env.WITNESSOPS_MAIL_PROVIDER, output: process.env.WITNESSOPS_MAIL_OUTPUT_DIR, limit: process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT };
  process.env.WITNESSOPS_MAIL_PROVIDER='file';process.env.WITNESSOPS_MAIL_OUTPUT_DIR=directory;process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT='2';
  try {
    const ownerIdentity=identity('user_memberowner'), recipientIdentity=identity('user_memberrecipient');
    const owner=await resolveUnenrolledIdentity(pool,ownerIdentity), recipient=await resolveUnenrolledIdentity(pool,recipientIdentity);
    const workspace=await store.create(owner,'HTTP membership',randomUUID());
    let current: {identity:Identity;session:ReturnType<typeof sessionKey>} | null = { identity:ownerIdentity, session:sessionKey(ownerIdentity.issuer,'session_memberowner',ownerIdentity.subject) };
    const handle=createMembershipService({pool,origin,identity:async()=>current,send:sendMail});
    const request=(path:string,input?:unknown,extra:Record<string,string>={})=>new Request(origin+path,{method:input?'POST':'GET',headers:{host:new URL(origin).host,origin,'content-type':'application/json','x-witnessops-workspace':workspace,...extra},...(input?{body:JSON.stringify(input)}:{})});
    const payload={action:'invite',email:recipientIdentity.email,role:'viewer',requestId:randomUUID(),replaces:null};
    assert.equal((await handle(request('/api/members',payload,{origin:'https://evil.example'}))).status,403);
    assert.equal((await handle(request('/api/members',{...payload,userId:owner.id}))).status,400);
    const response=await handle(request('/api/members',payload));assert.equal(response.status,200);
    const state=await response.json(), invite=state.invitations[0];assert.equal(invite.deliveryState,'accepted');assert.equal(invite.provider,'file');
    assert.equal((await handle(request('/api/members',payload))).status,200);
    const files=await readdir(directory);assert.equal(files.length,1);
    const eml=await readFile(join(directory,files[0]),'utf8');assert.ok(eml.includes(`${origin}/invitations/${invite.id}`));assert.ok(eml.includes(`To: ${recipientIdentity.email}`));assert.ok(eml.includes('From: WitnessOps <invitations@send.witnessops.com>'));assert.ok(eml.includes('Reply-To: engage@mail.witnessops.com'));
    delete process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;
    current={identity:recipientIdentity,session:sessionKey(recipientIdentity.issuer,'session_memberrecipient',recipientIdentity.subject)};
    assert.equal((await handle(request(`/api/invitations?id=${invite.id}`),true)).status,200);
    assert.equal((await pool.query('SELECT count(*) FROM memberships WHERE user_id=$1',[recipient.id])).rows[0].count,'0');
    const accept={id:invite.id,role:'viewer',revision:invite.revision};
    current={...current,identity:{...recipientIdentity,email:null}};assert.equal((await handle(request('/api/invitations',accept),true)).status,403);
    current={...current,identity:recipientIdentity};
    for(const update of ["status='disabled'", "status='active',early_access_state='paused'", "early_access_state=NULL,early_access_activated_at=now()"]) {
      await pool.query(`UPDATE users SET ${update} WHERE id=$1`,[recipient.id]);
      assert.equal((await handle(request('/api/invitations',accept),true)).status,403);
    }
    await pool.query("UPDATE users SET status='active',early_access_state=NULL,early_access_activated_at=NULL WHERE id=$1",[recipient.id]);
    assert.equal((await handle(request('/api/invitations',{...accept,role:'owner'}),true)).status,409);
    assert.equal((await handle(request('/api/invitations',accept),true)).status,200);
    assert.equal((await handle(request('/api/members'))).status,200);
    assert.equal((await handle(request('/api/members',payload))).status,403);
    await revokeSession(pool,current.session);
    assert.equal((await handle(request('/api/invitations',accept),true)).status,401);
    current=null;assert.equal((await handle(request('/api/members'))).status,401);
  } finally {
    for(const [key,value] of Object.entries({WITNESSOPS_MAIL_PROVIDER:previous.provider,WITNESSOPS_MAIL_OUTPUT_DIR:previous.output,WITNESSOPS_FREE_WORKSPACE_LIMIT:previous.limit})) {if(value===undefined)delete process.env[key];else process.env[key]=value;}
    await rm(directory,{recursive:true,force:true});
  }
});

test('Membership: concurrent capacity admission and cancel/accept races serialize', async () => {
 const previous=process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT='2';
 try {
  const owner=await resolveUnenrolledIdentity(pool,identity('cap_owner')),members=new MembersStore(pool);
  const workspace=await store.create(owner,'Capacity race',randomUUID());
  for(let i=0;i<7;i++)await members.invite(owner,workspace,{email:`pending${i}@example.test`,role:'viewer',requestId:randomUUID()});
  const results=await Promise.allSettled([7,8,9].map(i=>members.invite(owner,workspace,{email:`pending${i}@example.test`,role:'viewer',requestId:randomUUID()})));
  assert.equal(results.filter(result=>result.status==='fulfilled').length,2);
  assert.equal((await pool.query("SELECT count(*) FROM workspace_invitations WHERE workspace_id=$1 AND state='pending'",[workspace])).rows[0].count,'9');
  const recipient=await resolveUnenrolledIdentity(pool,identity('cancel_recipient'));
  const other=await store.create(owner,'Cancellation race',randomUUID());
  const id=await members.invite(owner,other,{email:identity('cancel_recipient').email,role:'viewer',requestId:randomUUID()});
  const race=await Promise.allSettled([members.cancel(owner,other,id),members.accept(recipient,identity('cancel_recipient').email,id,1,'viewer')]);
  assert.equal(race.filter(result=>result.status==='fulfilled').length,1);
  const row=(await pool.query('SELECT state FROM workspace_invitations WHERE id=$1',[id])).rows[0];
  const count=(await pool.query("SELECT count(*) FROM memberships WHERE user_id=$1 AND workspace_id=$2 AND status='active'",[recipient.id,other])).rows[0].count;
  assert.equal(count,row.state==='accepted'?'1':'0');
 } finally {if(previous===undefined)delete process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT;else process.env.WITNESSOPS_FREE_WORKSPACE_LIMIT=previous;}
});

test('Share: exact preview, roles, isolation, idempotency, immutable snapshot and revocation',async()=>{
 const { ShareStore }=await import('./shares');const share=new ShareStore(pool);
 const workspace=await store.create(a,'Share fixture',randomUUID()),other=await store.create(b,'Other share fixture',randomUUID());
 const asset=await store.addAsset(a,workspace,'witnessops.com','hostname'),id=await store.beginRun(a,workspace,asset.id);await store.completeRun(a,workspace,id,source);
 await pool.query("INSERT INTO memberships(user_id,workspace_id,role) VALUES($1,$2,'viewer')",[viewer.id,workspace]);
 await assert.rejects(share.preview(viewer,workspace,id));await assert.rejects(share.preview(a,other,id));await assert.rejects(share.preview(b,workspace,id));
 const preview=await share.preview(a,workspace,id,'Release review');assert.equal(preview.snapshot.sharedTitle,'Release review');assert.equal(preview.canPublish,true);assert.equal(preview.token.length,43);
 await assert.rejects(share.read(preview.token));assert.equal((await share.list(a,workspace,id)).length,0);
 const raw=JSON.stringify(preview.snapshot);for(const value of [workspace,id,asset.id,a.id])assert.ok(!raw.includes(value));assert.equal(preview.snapshot.sourceArtifacts.length,0);
 const input={id:preview.id,token:preview.token,digest:preview.digest,audience:'anyone_with_link'};
 await assert.rejects(share.publish(a,workspace,{...input,audience:false}));await assert.rejects(share.publish(a,workspace,{...input,digest:'0'.repeat(64)}));await assert.rejects(share.publish(viewer,workspace,input));await assert.rejects(share.publish(b,other,input));
 await Promise.all([share.publish(a,workspace,input),share.publish(a,workspace,input)]);assert.equal((await share.list(a,workspace,id)).length,1);
 const stored=(await pool.query('SELECT token_hash,snapshot FROM report_shares WHERE id=$1',[preview.id])).rows[0];
 assert.equal(stored.token_hash,createHash('sha256').update(preview.token).digest('hex'));assert.ok(!JSON.stringify(stored).includes(preview.token));
 const received=await share.read(preview.token);assert.deepEqual(received.snapshot,preview.snapshot);assert.ok(received.publishedAt);
 const renamed=await share.preview(a,workspace,id,'Next release');assert.notEqual(renamed.digest,preview.digest);assert.equal((await share.read(preview.token)).snapshot.sharedTitle,'Release review');
 await assert.rejects(share.preview(a,workspace,id,'x'.repeat(121)));
 await assert.rejects(share.read('b'.repeat(43)));await assert.rejects(share.revoke(b,other,preview.id));
 await pool.query("UPDATE workspaces SET status='archived' WHERE id=$1",[workspace]);await assert.rejects(share.read(preview.token));await pool.query("UPDATE workspaces SET status='active' WHERE id=$1",[workspace]);
 const later=await store.beginRun(a,workspace,asset.id);await store.completeRun(a,workspace,later,source);assert.deepEqual(await share.read(preview.token),received);
 await assert.rejects(pool.query("UPDATE report_shares SET snapshot='{}' WHERE id=$1",[preview.id]));await assert.rejects(pool.query("UPDATE report_shares SET expires_at=now()+interval '9 days' WHERE id=$1",[preview.id]));
 await assert.rejects(share.revoke(viewer,workspace,preview.id));await share.revoke(a,workspace,preview.id);await share.revoke(a,workspace,preview.id);await assert.rejects(share.read(preview.token));await assert.rejects(share.publish(a,workspace,input));
 await pool.query("UPDATE memberships SET role='contributor' WHERE user_id=$1 AND workspace_id=$2",[viewer.id,workspace]);
 const contributor=await share.preview(viewer,workspace,id);assert.equal(contributor.canPublish,false);await assert.rejects(share.publish(viewer,workspace,{id:contributor.id,token:contributor.token,digest:contributor.digest,audience:'anyone_with_link'}));
 const stale=await share.preview(a,workspace,id);
 await pool.query("UPDATE memberships SET role='contributor' WHERE user_id=$1 AND workspace_id=$2",[a.id,workspace]);
 await pool.query("UPDATE memberships SET role='owner' WHERE user_id=$1 AND workspace_id=$2",[a.id,workspace]);
 await assert.rejects(share.publish(a,workspace,{id:stale.id,token:stale.token,digest:stale.digest,audience:'anyone_with_link'}));
 // Insert an already-expired immutable fixture rather than disabling the immutability trigger.
 const token='E'.repeat(43);await pool.query("INSERT INTO report_shares(id,workspace_id,run_id,created_by,membership_generation,token_hash,snapshot,digest,state,published_at,expires_at) VALUES($1,$2,$3,$4,1,$5,$6,$7,'published',now()-interval '8 days',now()-interval '1 day')",[randomUUID(),workspace,id,a.id,createHash('sha256').update(token).digest('hex'),preview.snapshot,preview.digest]);await assert.rejects(share.read(token));
});

test('Share: Linux recipient projection retains synthetic labels and unknowns; public HTTP requires a live token only',async()=>{
 const { ShareStore }=await import('./shares');const { LinuxCheckStore }=await import('./linux-checks');const { createShareService }=await import('../share-server');
 const workspace=await store.create(a,'Linux share fixture',randomUUID());const asset=await store.addAsset(a,workspace,'demo-host','linux_server');
 const file=new URL('../../../../../tests/proofpack/production-fixtures/complete/proofpack-pr_lsa_20260710120000_198fd7aceb.zip',import.meta.url);
 const imported=await new LinuxCheckStore(pool).import(a,workspace,asset.id,readFileSync(file),readFileSync(new URL(file.href+'.sig.json')),'proofpack-pr_lsa_20260710120000_198fd7aceb.zip');
 const shares=new ShareStore(pool),preview=await shares.preview(a,workspace,imported.id);assert.equal(preview.snapshot.identity.synthetic,true);assert.ok(preview.snapshot.unknowns.length>0);assert.equal(preview.snapshot.sourceArtifacts.length,0);
 await shares.publish(a,workspace,{id:preview.id,token:preview.token,digest:preview.digest,audience:'anyone_with_link'});
 const api=createShareService({pool,origin,identity:async()=>null});
 const req=(path:string,data:unknown)=>new Request(origin+path,{method:'POST',headers:{host:new URL(origin).host,origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
 assert.equal((await api(req('/api/shares',{action:'preview',runId:imported.id}))).status,401);
 const response=await api(req('/api/shared-report',{token:preview.token}),true);assert.equal(response.status,200);assert.ok(response.headers.get('cache-control')?.includes('no-store'));assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.deepEqual((await response.json()).snapshot,preview.snapshot);
 assert.equal((await api(req('/api/shared-report',{token:preview.token,workspaceId:workspace}),true)).status,400);
 const foreign=req('/api/shared-report',{token:preview.token});foreign.headers.set('origin','https://foreign.invalid');assert.equal((await api(foreign,true)).status,403);
 assert.equal((await api(new Request(origin+'/api/shared-report?token='+preview.token,{headers:{host:new URL(origin).host}}),true)).status,400);
 await shares.revoke(a,workspace,preview.id);assert.equal((await api(req('/api/shared-report',{token:preview.token}),true)).status,404);
});

test('Share: abandoned previews are cleaned and total retained rows bound storage independently of rate',async()=>{
 const {ShareStore}=await import('./shares');const shares=new ShareStore(pool);
 const workspace=await store.create(a,'Share retention fixture',randomUUID()),asset=await store.addAsset(a,workspace,'witnessops.com','hostname'),id=await store.beginRun(a,workspace,asset.id);await store.completeRun(a,workspace,id,source);
 const old=randomUUID();await pool.query("INSERT INTO report_shares(id,workspace_id,run_id,created_by,membership_generation,token_hash,snapshot,digest,created_at) VALUES($1,$2,$3,$4,1,$5,'{}',$5,now()-interval '2 hours')",[old,workspace,id,a.id,'a'.repeat(64)]);
 await shares.preview(a,workspace,id);assert.equal((await pool.query('SELECT 1 FROM report_shares WHERE id=$1',[old])).rowCount,0);
 await pool.query("INSERT INTO report_shares(id,workspace_id,run_id,created_by,membership_generation,token_hash,snapshot,digest,state,published_at,created_at) SELECT gen_random_uuid(),$1,$2,$3,1,lpad(i::text,64,'0'),'{}',repeat('b',64),'published',now()-interval '2 hours',now()-interval '2 hours' FROM generate_series(1,127) AS i",[workspace,id,a.id]);
 await assert.rejects(shares.preview(a,workspace,id),/storage limit/);
 assert.equal((await shares.list(a,workspace,id)).length,127);
 await shares.revoke(a,workspace,(await shares.list(a,workspace,id))[0].id);
});

test('Billing: workspace seats, paid invoice reconciliation, retry/duplicate/out-of-order safety, cancellation and complimentary access',async()=>{
 const {BillingStore}=await import('./billing');const {MembersStore}=await import('./members');const {workspaceEntitlement}=await import('./billing-entitlements');
 const {transaction}=await import('./pool');const {createBillingService}=await import('../billing-server');
 const old=process.env.WITNESSOPS_BILLING_SANDBOX;process.env.WITNESSOPS_BILLING_SANDBOX='1';
 try{
 const config={secret:'sk_test_fixture',webhookSecret:'whsec_fixture',portalConfiguration:'bpc_fixture',plans:[{key:'team_month',name:'Team test',priceId:'price_fixture',currency:'eur',amount:100,interval:'month' as const,seats:3}]};
 const price={id:'price_fixture',livemode:false,active:true,type:'recurring',currency:'eur',unit_amount:100,billing_scheme:'per_unit',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}};
 const workspace=await store.create(a,'Billing test',randomUUID()),other=await store.create(b,'Other billing test',randomUUID());
 const members=new MembersStore(pool);const recipient=await resolveUnenrolledIdentity(pool,identity('billing_recipient'));
 let subs:Record<string,any>[]=[],checkoutStatus='open',checkoutPrice='price_fixture',calls=0,checkoutCalls=0; // eslint-disable-line @typescript-eslint/no-explicit-any
 const keys:string[]=[];let checkoutResponse:Record<string,unknown>|null=null;
 const stripe={request:async(path:string,fields?:Record<string,string>,key?:string)=>{
  calls++;
  if(path==='prices/price_fixture')return price;
  if(path==='customers'){keys.push(key!);return {id:'cus_fixture',livemode:false};}
  if(path.startsWith('subscriptions?'))return {data:subs,has_more:false};
  if(path==='checkout/sessions'){keys.push(key!);if(checkoutResponse)return checkoutResponse;checkoutCalls++;assert.equal(fields?.customer,'cus_fixture');assert.equal(fields?.['line_items[0][quantity]'],'1');assert.equal(fields?.['line_items[0][price]'],'price_fixture');assert.ok(!fields?.success_url.includes('?'));checkoutResponse={id:'cs_test_fixture',livemode:false,customer:'cus_fixture',url:'https://checkout.stripe.com/c/pay/cs_test_fixture',status:'open'};throw new Error('Simulated lost provider response');}
  if(path==='checkout/sessions/cs_test_fixture?expand[]=line_items')return {mode:'subscription',client_reference_id:workspace,line_items:{has_more:false,data:[{quantity:1,price:{id:checkoutPrice}}]},id:'cs_test_fixture',livemode:false,customer:'cus_fixture',url:'https://checkout.stripe.com/c/pay/cs_test_fixture',status:checkoutStatus};
  if(path==='billing_portal/configurations/bpc_fixture')return {livemode:false,active:true,features:{subscription_update:{enabled:false}}};
  if(path==='billing_portal/sessions'){assert.equal(fields?.customer,'cus_fixture');return {url:'https://billing.stripe.com/p/session/fixture'};}
  throw new Error('Unexpected provider request '+path);
 }};
 const billing=new BillingStore(pool,stripe,config,origin),entitlement=()=>transaction(pool,client=>workspaceEntitlement(client,workspace));
 assert.equal((await entitlement()).seats,1);
 await assert.rejects(members.invite(a,workspace,{email:'billing_recipient@example.test',role:'viewer',requestId:randomUUID()}),/1-place/);
 await assert.rejects(billing.checkout(b,workspace,'team_month'));await assert.rejects(billing.checkout(a,workspace,'price_fixture'));assert.equal(calls,0);
 await assert.rejects(billing.checkout(a,workspace,'team_month'),/lost provider response/);
 const durable=(await pool.query('SELECT checkout_key FROM workspace_billing WHERE workspace_id=$1',[workspace])).rows[0].checkout_key;assert.ok(durable);
 const checkouts=await Promise.allSettled([billing.checkout(a,workspace,'team_month'),billing.checkout(a,workspace,'team_month')]);assert.ok(checkouts.some(r=>r.status==='fulfilled'));for(const r of checkouts)if(r.status==='rejected')assert.match(r.reason.message,/in progress/);assert.ok((await billing.checkout(a,workspace,'team_month')).url);assert.equal(checkoutCalls,1);assert.equal(new Set(keys).size,2);assert.equal((await entitlement()).seats,1);
 checkoutPrice='price_other';await assert.rejects(billing.checkout(a,workspace,'team_month'),/no longer matches/);checkoutPrice='price_fixture';
 checkoutStatus='expired';assert.equal((await billing.checkout(a,workspace,'team_month')).retry,true);checkoutStatus='open';
 const until=Math.floor(Date.now()/1000)+86400;
 subs=[{id:'sub_fixture',livemode:false,customer:'cus_fixture',status:'active',metadata:{workspace_id:workspace},cancel_at_period_end:false,items:{data:[{id:'si_fixture',quantity:1,current_period_end:until,price}]},latest_invoice:{id:'in_fixture',status:'paid',amount_remaining:0,customer:'cus_fixture',parent:{subscription_details:{subscription:'sub_fixture'}},lines:{data:[{parent:{subscription_item_details:{subscription_item:'si_fixture'}},pricing:{price_details:{price:'price_fixture'}},period:{end:until}}]}}}];
 const event=(id:string,type='invoice.paid')=>({id,type,livemode:false,data:{object:{customer:'cus_fixture',status:'active'}}});
 for(const status of ['incomplete','trialing','unpaid','paused','past_due']){subs[0].status=status;await billing.event(event('evt_'+status));assert.equal((await entitlement()).seats,1);}
 subs[0].status='active';subs[0].items.data[0].quantity=3;await billing.event(event('evt_quantity'));assert.equal((await entitlement()).seats,1);subs[0].items.data[0].quantity=1;
 await billing.event(event('evt_first'));assert.equal((await entitlement()).seats,3);
 const before=calls;await billing.event(event('evt_first'));assert.equal(calls,before);
 // A complimentary grant must never shrink a valid paid allowance.
 await pool.query("INSERT INTO workspace_complimentary_access(workspace_id,seats,expires_at,reason,issued_by) VALUES($1,2,now()+interval '1 day','Test grant','fixture')",[workspace]);
 assert.equal((await entitlement()).seats,3);assert.equal((await entitlement()).source,'subscription');
 await pool.query('UPDATE workspace_complimentary_access SET seats=4 WHERE workspace_id=$1',[workspace]);assert.equal((await entitlement()).seats,4);
 await pool.query('DELETE FROM workspace_complimentary_access WHERE workspace_id=$1',[workspace]);
 // Hold Stripe pending. Reads and writes still obtain membership locks and pool clients.
 let release!:()=>void,entered!:()=>void;
 const held=new Promise<void>(r=>{release=r;}),started=new Promise<void>(r=>{entered=r;});
 const delayed=new BillingStore(pool,{request:async(path,fields,key)=>{if(path.startsWith('subscriptions?')){entered();await held;}return stripe.request(path,fields,key);}},config,origin);
 const refresh=delayed.refresh(a,workspace);await started;
 try{
  await Promise.race([Promise.all([store.read(a,workspace),store.read(b,other),store.addAsset(a,workspace,'example.com','hostname')]),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Stripe blocked workspace access')),2000);timer.unref();})]);
  await assert.rejects(billing.refresh(a,workspace),/in progress/);
  // Expire and replace the lease: an old response must not overwrite newer state.
  await pool.query("UPDATE workspace_billing SET operation_until=now()-interval '1 second' WHERE workspace_id=$1",[workspace]);
  await billing.refresh(a,workspace);
 }finally{release();}
 await assert.rejects(refresh,/expired/);

 assert.equal((await transaction(pool,client=>workspaceEntitlement(client,other))).seats,1);
 const invite=await members.invite(a,workspace,{email:'billing_recipient@example.test',role:'viewer',requestId:randomUUID()});await members.accept(recipient,'billing_recipient@example.test',invite,1,'viewer');
 const pending=await members.invite(a,workspace,{email:'later@example.test',role:'viewer',requestId:randomUUID()});
 await assert.rejects(billing.checkout(a,workspace,'team_month'),/already has a subscription/);
 assert.ok((await billing.portal(a,workspace)).url.startsWith('https://billing.stripe.com/'));await assert.rejects(billing.portal(b,workspace));
 subs[0].status='past_due';subs[0].latest_invoice.status='open';await billing.event(event('evt_failure','invoice.payment_failed'));assert.equal((await entitlement()).seats,1);
 // Older event payload says active; the current provider state still says past_due.
 await billing.event(event('evt_old','customer.subscription.updated'));assert.equal((await entitlement()).seats,1);
 assert.equal((await store.read(recipient,workspace)).role,'viewer');
 const late=await resolveUnenrolledIdentity(pool,identity('later'));await assert.rejects(members.accept(late,'later@example.test',pending,1,'viewer'),/1-place/);
 subs[0].status='active';subs[0].latest_invoice.status='paid';await billing.event(event('evt_recovered'));assert.equal((await entitlement()).seats,3);
 subs[0].cancel_at_period_end=true;await billing.event(event('evt_cancel_scheduled','customer.subscription.updated'));assert.equal((await entitlement()).seats,3);assert.equal((await billing.status(a,workspace)).cancelAtPeriodEnd,true);
 subs[0].status='canceled';await billing.event(event('evt_cancelled','customer.subscription.deleted'));assert.equal((await entitlement()).seats,1);assert.equal((await store.read(recipient,workspace)).role,'viewer');
 await pool.query("INSERT INTO workspace_complimentary_access(workspace_id,seats,expires_at,reason,issued_by) VALUES($1,4,now()+interval '1 day','Test-only explicit grant','fixture-operator')",[workspace]);assert.equal((await entitlement()).source,'complimentary');assert.equal((await entitlement()).seats,4);await assert.rejects(billing.checkout(a,workspace,'team_month'),/Complimentary/);
 await pool.query("UPDATE workspace_complimentary_access SET expires_at=now()-interval '1 second' WHERE workspace_id=$1",[workspace]);assert.equal((await entitlement()).seats,1);
 const api=createBillingService({pool,origin,config,stripe,identity:async()=>null});
 const request=(payload:unknown)=>new Request(origin+'/api/billing',{method:'POST',headers:{host:new URL(origin).host,origin,'Content-Type':'application/json','X-WitnessOps-Workspace':workspace},body:JSON.stringify(payload)});
 assert.equal((await api(request({action:'checkout',plan:'team_month'}))).status,401);
 const raw=JSON.stringify(event('evt_http'));const stamp=Math.floor(Date.now()/1000);const {createHmac}=await import('node:crypto');const signature=`t=${stamp},v1=${createHmac('sha256',config.webhookSecret).update(stamp+'.'+raw).digest('hex')}`;
 const webhook=(signatureValue:string)=>new Request(origin+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':signatureValue},body:raw});
 assert.equal((await api(webhook('forged'),true)).status,400);const webhookOnly=createBillingService({pool,config,stripe,identity:async()=>{throw new Error('No browser identity for webhooks');}});assert.equal((await webhookOnly(webhook(signature),true)).status,200);
 assert.equal((await pool.query('SELECT count(*) FROM billing_events WHERE event_id=$1',['evt_http'])).rows[0].count,'1');
 }finally{if(old===undefined)delete process.env.WITNESSOPS_BILLING_SANDBOX;else process.env.WITNESSOPS_BILLING_SANDBOX=old;}
});

test('Share access: rotation and expiry preserve revision, deny old tokens and enforce owner/version boundaries',async()=>{
 const {ShareStore}=await import('./shares');const {ShareAccessStore}=await import('./share-access');const shares=new ShareStore(pool),access=new ShareAccessStore(pool);
 const workspace=await store.create(a,'Access lifecycle',randomUUID()),other=await store.create(b,'Access other',randomUUID());
 const asset=await store.addAsset(a,workspace,'witnessops.com','hostname'),run=await store.beginRun(a,workspace,asset.id);await store.completeRun(a,workspace,run,source);
 const preview=await shares.preview(a,workspace,run,'Fixed name');await shares.publish(a,workspace,{...preview,audience:'anyone_with_link'});
 const original=await shares.read(preview.token),expires=new Date(Date.now()+86400000).toISOString();
 await pool.query("INSERT INTO memberships(user_id,workspace_id,role) VALUES($1,$2,'contributor')",[viewer.id,workspace]);
 await assert.rejects(access.change(viewer,workspace,preview.id,1,expires,true));await assert.rejects(access.change(a,other,preview.id,1,expires,true));
 await assert.rejects(access.change(a,workspace,preview.id,1,new Date(Date.now()+31*86400000).toISOString(),false));
 const attempts=await Promise.allSettled([access.change(a,workspace,preview.id,1,expires,true),access.change(a,workspace,preview.id,1,expires,true)]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 const changed=attempts.find(r=>r.status==='fulfilled')!;assert.equal(changed.status,'fulfilled');if(changed.status!=='fulfilled')throw new Error();
 const token=changed.value.token!;await assert.rejects(shares.read(preview.token));
 assert.deepEqual((await shares.read(token)).snapshot,original.snapshot);assert.equal((await shares.read(token)).digest,original.digest);
 await assert.rejects(shares.publish(a,workspace,{...preview,audience:'anyone_with_link'}));
 await access.change(a,workspace,preview.id,2,new Date(Date.now()+2*86400000).toISOString(),false);
 assert.ok(await shares.read(token));assert.equal((await shares.list(a,workspace,run))[0].version,3);
 const retained=(await pool.query('SELECT s.*,a.token_hash AS current_hash FROM report_shares s JOIN report_share_access a ON a.share_id=s.id WHERE s.id=$1',[preview.id])).rows[0];
 assert.ok(!JSON.stringify(retained).includes(token));assert.equal(retained.token_hash,createHash('sha256').update(preview.token).digest('hex'));
 await assert.rejects(pool.query("UPDATE report_shares SET digest=repeat('e',64) WHERE id=$1",[preview.id]));
 await shares.revoke(a,workspace,preview.id);await assert.rejects(access.change(a,workspace,preview.id,3,expires,true));await assert.rejects(shares.read(token));
});

test('Share email: reviewed server message, idempotent send, unknown result and access-change denial',async()=>{
 const {ShareStore}=await import('./shares');const {ShareAccessStore}=await import('./share-access');const shares=new ShareStore(pool),access=new ShareAccessStore(pool);
 const workspace=await store.create(a,'Email lifecycle',randomUUID()),other=await store.create(b,'Email other',randomUUID());
 const asset=await store.addAsset(a,workspace,'witnessops.com','hostname'),run=await store.beginRun(a,workspace,asset.id);await store.completeRun(a,workspace,run,source);
 const preview=await shares.preview(a,workspace,run,'Release report');await shares.publish(a,workspace,{...preview,audience:'anyone_with_link'});
 const input={id:preview.id,token:preview.token,email:'recipient@example.com',requestId:randomUUID()},origin='https://app.example.com';
 await pool.query("INSERT INTO memberships(user_id,workspace_id,role) VALUES($1,$2,'viewer')",[viewer.id,workspace]);
 await assert.rejects(access.draft(viewer,workspace,input,origin));await assert.rejects(access.draft(a,other,input,origin));
 await assert.rejects(access.draft(a,workspace,{...input,email:'victim@example.com\r\nBcc: other@example.com'},origin));
 const draft=await access.draft(a,workspace,input,origin);assert.equal(draft.state,'draft');assert.equal(draft.message.to,input.email);assert.equal(draft.message.from,'WitnessOps Reports <reports@send.witnessops.com>');assert.ok(draft.message.text.includes(`${origin}/s#${preview.token}`));assert.ok(draft.message.text.includes('Release report'));assert.equal(draft.message.html,undefined);
 assert.deepEqual(await access.draft(a,workspace,input,origin),draft);
 assert.ok(!JSON.stringify((await pool.query('SELECT * FROM report_share_deliveries WHERE id=$1',[draft.id])).rows).includes(preview.token));
 let sends=0;const send=async()=>{sends++;return {provider:'resend',providerMessageId:'test-only',providerAcceptedAt:new Date().toISOString()};};
 const confirm={id:draft.id,token:preview.token,digest:draft.digest,confirmed:true};
 await assert.rejects(access.send(a,workspace,{...confirm,confirmed:false},origin,send));await assert.rejects(access.send(a,workspace,{...confirm,digest:'bad'},origin,send));assert.equal(sends,0);
 await Promise.all([access.send(a,workspace,confirm,origin,send),access.send(a,workspace,confirm,origin,send)]);assert.equal(sends,1);assert.equal((await access.deliveries(a,workspace,preview.id))[0].state,'accepted');
 const uncertain=await access.draft(a,workspace,{...input,requestId:randomUUID()},origin);
 const uncertainInput={...confirm,id:uncertain.id,digest:uncertain.digest};
 await access.send(a,workspace,uncertainInput,origin,async()=>{sends++;throw new Error('provider timeout');});await access.send(a,workspace,uncertainInput,origin,send);assert.equal(sends,2);assert.equal((await access.deliveries(a,workspace,preview.id))[0].state,'unknown');
 const local=await access.draft(a,workspace,{...input,requestId:randomUUID()},origin);await access.send(a,workspace,{...confirm,id:local.id,digest:local.digest},origin,async()=>({provider:'file',providerMessageId:null,providerAcceptedAt:new Date().toISOString()}));assert.equal((await access.deliveries(a,workspace,preview.id))[0].state,'file_saved');
 const stale=await access.draft(a,workspace,{...input,requestId:randomUUID()},origin);
 await access.change(a,workspace,preview.id,1,new Date(Date.now()+86400000).toISOString(),false);
 await assert.rejects(access.send(a,workspace,{...confirm,id:stale.id,digest:stale.digest},origin,send));assert.equal(sends,2);
 await assert.rejects(access.deliveries(viewer,workspace,preview.id));
 const demoted=await access.draft(a,workspace,{...input,requestId:randomUUID()},origin);
 await pool.query("UPDATE memberships SET role='contributor' WHERE user_id=$1 AND workspace_id=$2",[a.id,workspace]);
 await assert.rejects(access.send(a,workspace,{...confirm,id:demoted.id,digest:demoted.digest},origin,send));
 await pool.query("UPDATE memberships SET role='owner' WHERE user_id=$1 AND workspace_id=$2",[a.id,workspace]);
 await assert.rejects(access.send(a,workspace,{...confirm,id:demoted.id,digest:demoted.digest},origin,send));
 assert.equal(sends,2);
 await shares.revoke(a,workspace,preview.id);await assert.rejects(access.draft(a,workspace,{...input,requestId:randomUUID()},origin));
});

test('Share delivery HTTP: configuration gate, exact fields and file adapter acceptance',async()=>{
 const {createShareService}=await import('../share-server');const {ShareStore}=await import('./shares');
 const {mkdtemp,readdir,readFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {sendMail}=await import('../../../../witnessops-web/src/lib/server/send-verification-email');
 const directory=await mkdtemp(join(tmpdir(),'wops-share-mail-'));
 const previous={provider:process.env.WITNESSOPS_MAIL_PROVIDER,output:process.env.WITNESSOPS_MAIL_OUTPUT_DIR};
 process.env.WITNESSOPS_MAIL_PROVIDER='file';process.env.WITNESSOPS_MAIL_OUTPUT_DIR=directory;
 try {
  const who=identity('user_sharemailhttp'),owner=await resolveIdentity(pool,who);
  const workspace=await store.create(owner,'HTTP report email',randomUUID()),asset=await store.addAsset(owner,workspace,'witnessops.com','hostname'),run=await store.beginRun(owner,workspace,asset.id);await store.completeRun(owner,workspace,run,source);
  const shares=new ShareStore(pool),preview=await shares.preview(owner,workspace,run);await shares.publish(owner,workspace,{...preview,audience:'anyone_with_link'});
  const identityFn=async()=>({identity:who,session:sessionKey(who.issuer,'session_sharemailhttp',who.subject)});
  const disabled=createShareService({pool,origin,identity:identityFn,mailEnabled:false}),enabled=createShareService({pool,origin,identity:identityFn,mailEnabled:true,send:sendMail});
  const req=(input:unknown)=>new Request(origin+'/api/shares',{method:'POST',headers:{host:new URL(origin).host,origin,'content-type':'application/json','x-witnessops-workspace':workspace},body:JSON.stringify(input)});
  const input={action:'email-preview',id:preview.id,token:preview.token,email:'recipient@example.com',requestId:randomUUID()};
  assert.equal((await disabled(req(input))).status,503);assert.equal((await enabled(req({...input,url:'https://evil.invalid',html:'custom'}))).status,400);
  const foreign=req(input);foreign.headers.set('origin','https://evil.invalid');assert.equal((await enabled(foreign)).status,403);
  const response=await enabled(req(input));assert.equal(response.status,200);const draft=await response.json();assert.equal((await readdir(directory)).length,0);
  const send={action:'email-send',id:draft.id,token:preview.token,digest:draft.digest,confirmed:true};
  assert.equal((await enabled(req(send))).status,200);assert.equal((await enabled(req(send))).status,200);
  const files=await readdir(directory);assert.equal(files.length,1);const eml=await readFile(join(directory,files[0]),'utf8');assert.ok(eml.includes('From: WitnessOps Reports <reports@send.witnessops.com>'));assert.ok(eml.includes(`${origin}/s#${preview.token}`));
 } finally {
  if(previous.provider===undefined)delete process.env.WITNESSOPS_MAIL_PROVIDER;else process.env.WITNESSOPS_MAIL_PROVIDER=previous.provider;
  if(previous.output===undefined)delete process.env.WITNESSOPS_MAIL_OUTPUT_DIR;else process.env.WITNESSOPS_MAIL_OUTPUT_DIR=previous.output;
  await rm(directory,{recursive:true,force:true});
 }
});

test('Share access migration preserves existing published links and immutable revisions',async()=>{
 const name='share_upgrade_'+randomUUID().replaceAll('-','');await admin.query(`CREATE SCHEMA ${name}`);
 const upgrade=new Pool({connectionString:env.TEST_DATABASE_URL,options:`-c search_path=${name},public`,max:1});
 try {
  await upgrade.query('CREATE TABLE app_migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
  const dir=new URL('../../../db/migrations/',import.meta.url);
  for(const file of readdirSync(dir).filter(n=>/^\d{4}_/.test(n)&&n<'0019').sort()){
   const sql=readFileSync(new URL(file,dir),'utf8');await upgrade.query(sql);await upgrade.query('INSERT INTO app_migrations(name,sha256) VALUES($1,$2)',[file,createHash('sha256').update(sql).digest('hex')]);
  }
  const [user,workspace,asset,run,share]=Array.from({length:5},randomUUID),token='U'.repeat(43),digest=createHash('sha256').update('{}').digest('hex');
  await upgrade.query('INSERT INTO users(id) VALUES($1)',[user]);
  await upgrade.query("INSERT INTO workspaces(id,name,slug,created_by,creation_key) VALUES($1,'Upgrade','upgrade',$2,$3)",[workspace,user,randomUUID()]);
  await upgrade.query("INSERT INTO assets(id,workspace_id,type,normalized_value) VALUES($1,$2,'hostname','example.com')",[asset,workspace]);
  await upgrade.query("INSERT INTO runs(id,workspace_id,asset_id,initiated_by,source_type,status,finished_at,method_id,method_version,source_snapshot,source_digest) VALUES($1,$2,$3,$4,'external-snapshot-v1','completed',now(),'bounded-hostname','external-demo-v0.1',$5,$6)",[run,workspace,asset,user,source,digest]);
  await upgrade.query("INSERT INTO report_shares(id,workspace_id,run_id,created_by,membership_generation,token_hash,snapshot,digest,state,published_at) VALUES($1,$2,$3,$4,1,$5,'{}',$6,'published',now())",[share,workspace,run,user,createHash('sha256').update(token).digest('hex'),digest]);
  const before=(await upgrade.query('SELECT * FROM report_shares WHERE id=$1',[share])).rows[0];await migrate(upgrade);
  assert.deepEqual((await upgrade.query('SELECT * FROM report_shares WHERE id=$1',[share])).rows[0],before);
  const record=(await upgrade.query('SELECT * FROM report_share_access WHERE share_id=$1',[share])).rows[0];assert.equal(record.token_hash,before.token_hash);assert.deepEqual(record.expires_at,before.expires_at);
  const {ShareStore}=await import('./shares');assert.equal((await new ShareStore(upgrade).read(token)).digest,digest);
  await assert.rejects(upgrade.query("UPDATE report_shares SET expires_at=now() WHERE id=$1",[share]),/immutable/);
  await migrate(upgrade);assert.equal((await upgrade.query('SELECT count(*) FROM report_share_access')).rows[0].count,'1');
 } finally {await upgrade.end();await admin.query(`DROP SCHEMA ${name} CASCADE`);}
});

test('Share email bounds concurrent preview/send capacity per workspace and actor',async()=>{
 const {ShareStore}=await import('./shares');const {ShareAccessStore}=await import('./share-access');const shares=new ShareStore(pool),access=new ShareAccessStore(pool);
 const owner=await resolveIdentity(pool,identity('user_reportmailbound')),workspace=await store.create(owner,'Bounded email',randomUUID());
 const asset=await store.addAsset(owner,workspace,'witnessops.com','hostname'),run=await store.beginRun(owner,workspace,asset.id);await store.completeRun(owner,workspace,run,source);
 const preview=await shares.preview(owner,workspace,run);await shares.publish(owner,workspace,{...preview,audience:'anyone_with_link'});
 const inputs=Array.from({length:11},()=>({id:preview.id,token:preview.token,email:'recipient@example.com',requestId:randomUUID()}));
 const outcomes=await Promise.allSettled(inputs.map(input=>access.draft(owner,workspace,input,origin)));
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,10);
 const index=outcomes.findIndex(r=>r.status==='fulfilled');assert.ok(await access.draft(owner,workspace,inputs[index],origin));
 assert.equal((await access.deliveries(owner,workspace,preview.id)).filter((r:{state:string})=>r.state==='draft').length,10);
});
