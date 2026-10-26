import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { LinuxCheckStore } from "../db/linux-checks";
import { ServerCheckStore } from "./store";
import type { Finalizer } from "./runtime";

const userId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const executionId = "33333333-3333-4333-8333-333333333333";
const assetId = "55555555-5555-4555-8555-555555555555";
const runId = "44444444-4444-4444-8444-444444444444";
const credential = "a".repeat(43);
const capture = Buffer.from("capture-bytes");

function harness(options: { crashFinalize?: boolean; failImport?: boolean; winnerOnSecondRead?: boolean } = {}) {
  let state = "uploaded";
  let inTransaction = false;
  let executionReads = 0;
  let imports = 0;
  let finalizeCalls = 0;
  const events: string[] = [];
  const execution = () => ({
    id: executionId, state, authority: { target: { allowed_hostnames: ["demo-host"] } }, collector_hash: "a".repeat(64),
    capture_digest: "b".repeat(64), capture_bytes: capture, run_id: state === "run_created" ? runId : null, failure: null,
    membership_generation: 1, asset_id: assetId, request_id: "66666666-6666-4666-8666-666666666666",
    workspace_id: workspaceId, user_id: userId,
  });
  const client = {
    async query(text: string) {
      const sql = text.replace(/\s+/g, " ").trim();
      if (sql === "BEGIN") { inTransaction = true; events.push("begin"); return { rows: [], rowCount: 0 }; }
      if (sql === "COMMIT") { inTransaction = false; events.push("commit"); return { rows: [], rowCount: 0 }; }
      if (sql === "ROLLBACK") { inTransaction = false; events.push("rollback"); return { rows: [], rowCount: 0 }; }
      if (sql.includes("FROM cli_sessions")) return { rows: [{ user_id: userId, workspace_id: workspaceId, web_issuer: "iss", web_session_id: "sid", revoked_at: null, expires_at: new Date(Date.now() + 60_000), scope: "cli:session server_check:create", membership_generation: 1 }], rowCount: 1 };
      if (sql.includes("FROM revoked_sessions")) return { rows: [], rowCount: 0 };
      if (sql.includes("early_access_state")) return { rows: [{ early_access_state: "active", early_access_activated_at: null, free_workspace_access: false }], rowCount: 1 };
      if (sql.includes("SELECT 1 FROM memberships")) return { rows: [{ present: 1 }], rowCount: 1 };
      if (sql.includes("FROM memberships m")) return { rows: [{ id: workspaceId, name: "Workspace", slug: "workspace", role: "owner", generation: 1 }], rowCount: 1 };
      if (sql.includes("advisory")) return { rows: [{ acquired: true }], rowCount: 1 };
      if (sql.includes("FROM linux_check_sources")) return { rows: [{ metadata: { outcome: "recorded" } }], rowCount: 1 };
      if (sql.includes("SET state='run_created'")) { state = "run_created"; events.push(inTransaction ? "link-in-tx" : "link-outside"); return { rows: [execution()], rowCount: 1 }; }
      if (sql.includes("FROM server_check_executions")) {
        executionReads += 1;
        if (options.winnerOnSecondRead && executionReads >= 2) state = "run_created";
        return { rows: [execution()], rowCount: 1 };
      }
      throw new Error(sql);
    },
    release() {},
  };
  const pool = { connect: async () => client } as unknown as Pool;
  let crashFinalize = options.crashFinalize ?? false;
  const finalizer: Finalizer = {
    preflight: async () => "a".repeat(64),
    reconcileCapture: async () => undefined,
    validate: async () => ({ authority: {}, hostname: "demo-host", collectorHash: "a".repeat(64) }),
    finalize: async () => {
      events.push(inTransaction ? "finalize-in-tx" : "finalize-outside");
      finalizeCalls += 1;
      if (crashFinalize) throw new Error("injected finalize crash");
      return { zipName: "proofpack-x.zip", zip: Buffer.from("zip"), signature: Buffer.from("sig") };
    },
  };
  const original = LinuxCheckStore.prototype.importWithin;
  let failImport = options.failImport ?? false;
  LinuxCheckStore.prototype.importWithin = async function () {
    events.push(inTransaction ? "import-in-tx" : "import-outside");
    imports += 1;
    if (failImport) { failImport = false; throw new Error("injected import crash"); }
    return { id: runId, assetId, createdAt: "2026-01-01T00:00:00.000Z", sourceDigest: "d".repeat(64), proofRunId: "p", verifierVersion: "v", profileId: "linux", outcome: "recorded", synthetic: false, observedHostname: "demo-host", observedAt: "2026-01-01T00:00:00.000Z", sourceAssetId: assetId, machineIdentity: null };
  };
  return {
    store: new ServerCheckStore(pool, finalizer),
    events,
    restore: () => { LinuxCheckStore.prototype.importWithin = original; },
    counts: () => ({ imports, finalizeCalls, state }),
    disarm() { crashFinalize = false; },
  };
}

test("server-check status finalizes outside the transaction and links the run inside one", async () => {
  const fixture = harness();
  try {
    const saved = await fixture.store.status(credential, executionId);
    assert.equal(saved.state, "run_created");
    assert.equal(Reflect.get(saved, "outcome"), "recorded");
    const finalizeAt = fixture.events.indexOf("finalize-outside");
    const firstCommit = fixture.events.indexOf("commit");
    assert.ok(firstCommit !== -1 && finalizeAt > firstCommit);
    assert.equal(fixture.events.includes("finalize-in-tx"), false);
    assert.equal(fixture.events.includes("import-outside"), false);
    assert.equal(fixture.events.includes("link-outside"), false);
    assert.equal(fixture.counts().imports, 1);
  } finally { fixture.restore(); }
});

test("a crash after finalize leaves the execution uploaded and a retry links one run", async () => {
  const fixture = harness({ crashFinalize: true });
  try {
    await assert.rejects(fixture.store.status(credential, executionId), /injected finalize crash/);
    assert.equal(fixture.counts().state, "uploaded");
    assert.equal(fixture.counts().imports, 0);
    assert.equal(fixture.events.includes("link-in-tx"), false);
    fixture.disarm();
    const saved = await fixture.store.status(credential, executionId);
    assert.equal(saved.state, "run_created");
    assert.equal(fixture.counts().imports, 1);
    assert.equal(fixture.counts().finalizeCalls, 2);
    assert.equal(fixture.events.filter(event => event === "link-in-tx").length, 1);
  } finally { fixture.restore(); }
});

test("a crash during import rolls back the link and a retry imports once", async () => {
  const fixture = harness({ failImport: true });
  try {
    await assert.rejects(fixture.store.status(credential, executionId), /injected import crash/);
    assert.equal(fixture.counts().state, "uploaded");
    assert.equal(fixture.events.includes("rollback"), true);
    const saved = await fixture.store.status(credential, executionId);
    assert.equal(saved.state, "run_created");
    assert.equal(fixture.counts().imports, 2);
    assert.equal(fixture.events.filter(event => event === "link-in-tx").length, 1);
  } finally { fixture.restore(); }
});

test("a concurrent winner is returned without a second import", async () => {
  const fixture = harness({ winnerOnSecondRead: true });
  try {
    const saved = await fixture.store.status(credential, executionId);
    assert.equal(saved.state, "run_created");
    assert.equal(Reflect.get(saved, "outcome"), "recorded");
    assert.equal(fixture.counts().imports, 0);
    assert.equal(fixture.events.includes("finalize-outside"), true);
  } finally { fixture.restore(); }
});
