/**
 * WEB-002 contract tests for the local-only delivery retry ledger.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  appendDeliveryRetryRequest,
  getLatestDeliveryRetryRequest,
  readDeliveryRetryRequests,
  readDeliveryRetryRequestsForRun,
} from "./delivery-retry-ledger";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "wo-retry-"));
  process.env.WITNESSOPS_INTAKE_EVENT_DIR = dir;
  try {
    return await fn(dir);
  } finally {
    delete process.env.WITNESSOPS_INTAKE_EVENT_DIR;
    await rm(dir, { recursive: true, force: true });
  }
}

test("delivery-retry-ledger: empty when file does not exist", async () => {
  await withTempDir(async () => {
    const all = await readDeliveryRetryRequests();
    assert.deepEqual(all, []);
    const latest = await getLatestDeliveryRetryRequest("run_x");
    assert.equal(latest, null);
  });
});

test("delivery-retry-ledger: append + read round-trip", async () => {
  await withTempDir(async () => {
    const written = await appendDeliveryRetryRequest({
      run_id: "run_demo123",
      requested_by: "operator@example.com",
      reason: "delivery bounced",
    });
    assert.match(written.event_id, /^evt_/);
    assert.ok(written.requested_at);

    const all = await readDeliveryRetryRequests();
    assert.equal(all.length, 1);
    assert.equal(all[0]?.run_id, "run_demo123");
    assert.equal(all[0]?.reason, "delivery bounced");
  });
});

test("delivery-retry-ledger: scoped read returns only matching run", async () => {
  await withTempDir(async () => {
    await appendDeliveryRetryRequest({
      run_id: "run_a",
      requested_by: "op@example.com",
      reason: "first",
    });
    await appendDeliveryRetryRequest({
      run_id: "run_b",
      requested_by: "op@example.com",
      reason: "other",
    });
    await appendDeliveryRetryRequest({
      run_id: "run_a",
      requested_by: "op@example.com",
      reason: "second",
    });

    const aRows = await readDeliveryRetryRequestsForRun("run_a");
    assert.equal(aRows.length, 2);
    assert.deepEqual(
      aRows.map((r) => r.reason),
      ["first", "second"],
    );

    const latest = await getLatestDeliveryRetryRequest("run_a");
    assert.equal(latest?.reason, "second");
  });
});
