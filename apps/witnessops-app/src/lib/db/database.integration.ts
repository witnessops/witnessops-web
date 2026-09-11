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

test('Early Access: unknown users cannot self-enroll; invited activation is explicit and idempotent', async () => {
  const user = await resolveUnenrolledIdentity(pool, identity('cohort_new'));
  assert.equal(await earlyAccess(pool, user), null);
  const api = createFoundationService({ pool, origin, identity: async () => identity('cohort_new') });
  assert.equal((await api.handle(request('early-access', wa), 'early-access')).status, 200);
  for (const state of [null, 'invited', 'paused']) {
    await pool.query('UPDATE users SET early_access_state=$2 WHERE id=$1', [user.id, state]);
    for (const endpoint of ['workspace', 'assets', 'runs', 'events', 'feedback'] as const) {
      const denied = await api.handle(request(endpoint, wa), endpoint);
      assert.equal(denied.status, 403);
      assert.equal((await denied.json()).accessState, state);
    }
    const attempt = await api.handle(request('early-access', wa, { action: 'activate' }), 'early-access');
    assert.equal(attempt.status, state === 'invited' ? 200 : 403);
  }
  await pool.query("UPDATE users SET early_access_state='invited' WHERE id=$1", [user.id]);
  for (let i=0; i<2; i++) assert.equal((await api.handle(request('early-access', wa, { action: 'activate' }), 'early-access')).status, 200);
  assert.equal(await earlyAccess(pool, user), 'active');
  assert.equal((await pool.query("SELECT count(*) FROM product_events WHERE user_id=$1 AND name='early_access_activated'", [user.id])).rows[0].count, '1');
  // Active cohort state does not create membership or authorize a known workspace.
  assert.equal((await api.handle(request('workspace', wa), 'workspace')).status, 404);
  await assert.rejects(store.read(user, wa), /Workspace not found/);
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
  const foreign = createFoundationService({pool,origin,identity:async()=>identity('user_b')});
  assert.equal((await foreign.handle(request(`linux-checks?id=${run.id}`,wb),'linux-checks')).status,404);
  const anonymous = createFoundationService({pool,origin,identity:async()=>null});
  assert.equal((await anonymous.handle(request(`linux-checks?id=${run.id}`,workspace),'linux-checks')).status,401);
  await pool.query("UPDATE memberships SET status='revoked',revoked_at=now() WHERE user_id=$1 AND workspace_id=$2",[viewer.id,workspace]);
  await assert.rejects(linux.reopen(viewer,workspace,run.id), /not found/);
});
