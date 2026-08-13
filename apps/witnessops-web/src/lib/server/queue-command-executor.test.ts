import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import { applyQueueCommand } from "./queue-command-executor";
import {
  clearTokenStore,
  getIntakeById,
  saveIntake,
  type IntakeRecord,
} from "./token-store";

function makeIntake(): IntakeRecord {
  return {
    intakeId: "intk_queue_concurrency",
    channel: "engage",
    email: "security@witnessops.com",
    state: "admitted",
    createdAt: "2026-08-13T12:00:00Z",
    updatedAt: "2026-08-13T12:00:00Z",
    latestIssuanceId: null,
    threadId: "thr_queue_concurrency",
    submission: {},
  };
}

afterEach(async () => {
  await clearTokenStore();
});

test("queue commands serialize version checks with snapshot and ledger writes", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-command-"));
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
  await saveIntake(makeIntake());

  const command = (priority: "high" | "urgent", idempotencyKey: string) =>
    applyQueueCommand(
      {
        intakeId: "intk_queue_concurrency",
        actor: "founder@test",
        actorAuthSource: "local_bypass",
        actorSessionHash: null,
        isAdmin: true,
        expectedProjectionVersion: 0,
        expectedEventSequence: 0,
        idempotencyKey,
        source: "test",
      },
      { command: "queue.set_priority", priority },
    );

  const results = await Promise.all([
    command("high", "queue-concurrency-a"),
    command("urgent", "queue-concurrency-b"),
  ]);

  assert.equal(results.filter((result) => result.ok).length, 1);
  const rejected = results.find((result) => !result.ok);
  assert.deepEqual(rejected?.reasonCodes, ["PROJECTION_VERSION_MISMATCH"]);

  const stored = await getIntakeById("intk_queue_concurrency");
  assert.equal(stored?.queue?.projection.projectionVersion, 1);
  assert.equal(stored?.queue?.projection.eventSequence, 1);
});
