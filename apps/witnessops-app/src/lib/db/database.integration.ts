import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";
import { migrate } from "../../../scripts/migrate.mjs";
import { resolveIdentity, type Identity, type AppUser } from "./identity";
import { WorkspaceStore } from "./workspaces";
import { createFoundationService } from "../server";
import { canonicalSource } from "../source-digest";
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
