import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import { applyQueueCommand } from "./queue-command-executor";
import {
  clearTokenStore,
  saveIntake,
  type IntakeRecord,
} from "./token-store";

function makeIntake(assignedOperator: string): IntakeRecord {
  return {
    intakeId: "intk_queue_owned",
    channel: "engage",
    email: "buyer@example.com",
    state: "admitted",
    createdAt: "2026-08-13T08:00:00Z",
    updatedAt: "2026-08-13T08:00:00Z",
    latestIssuanceId: null,
    threadId: null,
    submission: {},
    queue: {
      projection: {
        queueWorkflowState: "pending_operator_review",
        assignedOperator,
        priority: "normal",
        currentScopeContractId: null,
        scopeContractStatus: null,
        currentClarificationRecordId: null,
        clarificationOutstanding: false,
        respondedAt: null,
        lastOperatorActionAt: null,
        projectionVersion: 0,
        eventSequence: 0,
        responseRecordId: null,
      },
      scopeContracts: [],
      clarifications: [],
      responses: [],
    },
  };
}

afterEach(async () => {
  await clearTokenStore();
});

test("delegated queue commands are limited to the assigned intake", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-authz-"));
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
  await saveIntake(makeIntake("owner@test"));

  const result = await applyQueueCommand(
    {
      intakeId: "intk_queue_owned",
      actor: "other@test",
      actorAuthSource: "oidc_session",
      actorSessionHash: "session-hash",
      role: "Delegated Operator",
      expectedProjectionVersion: 0,
      expectedEventSequence: 0,
      idempotencyKey: "queue-authz-denied",
      source: "test",
    },
    { command: "queue.set_priority", priority: "high" },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(result.reasonCodes, ["AUTHORIZATION_REQUIRED"]);
  }

  const ownerResult = await applyQueueCommand(
    {
      intakeId: "intk_queue_owned",
      actor: "owner@test",
      actorAuthSource: "oidc_session",
      actorSessionHash: "session-hash",
      role: "Delegated Operator",
      expectedProjectionVersion: 0,
      expectedEventSequence: 0,
      idempotencyKey: "queue-authz-owner",
      source: "test",
    },
    { command: "queue.set_priority", priority: "high" },
  );
  assert.equal(ownerResult.ok, true);

  const administratorBusinessResult = await applyQueueCommand(
    {
      intakeId: "intk_queue_owned",
      actor: "admin@test",
      actorAuthSource: "oidc_session",
      actorSessionHash: "session-hash",
      role: "Administrator",
      expectedProjectionVersion: 1,
      expectedEventSequence: 1,
      idempotencyKey: "queue-authz-admin-business",
      source: "test",
    },
    { command: "queue.set_priority", priority: "urgent" },
  );
  assert.equal(administratorBusinessResult.ok, false);
  if (!administratorBusinessResult.ok) {
    assert.deepEqual(administratorBusinessResult.reasonCodes, [
      "AUTHORIZATION_REQUIRED",
    ]);
  }

  const administratorAssignmentResult = await applyQueueCommand(
    {
      intakeId: "intk_queue_owned",
      actor: "admin@test",
      actorAuthSource: "oidc_session",
      actorSessionHash: "session-hash",
      role: "Administrator",
      expectedProjectionVersion: 1,
      expectedEventSequence: 1,
      idempotencyKey: "queue-authz-admin-assignment",
      source: "test",
    },
    { command: "queue.reassign", targetOperator: "other@test" },
  );
  assert.equal(administratorAssignmentResult.ok, true);
});

test("concurrent queue commands allow one projection-version winner", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-race-"));
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
  await saveIntake(makeIntake("owner@test"));

  const context = {
    intakeId: "intk_queue_owned",
    actor: "owner@test",
    actorAuthSource: "oidc_session" as const,
    actorSessionHash: "session-hash",
    role: "Delegated Operator" as const,
    expectedProjectionVersion: 0,
    expectedEventSequence: 0,
    source: "test",
  };
  const [first, second] = await Promise.all([
    applyQueueCommand(
      { ...context, idempotencyKey: "queue-race-first" },
      { command: "queue.set_priority", priority: "high" },
    ),
    applyQueueCommand(
      { ...context, idempotencyKey: "queue-race-second" },
      { command: "queue.set_priority", priority: "urgent" },
    ),
  ]);

  assert.equal([first, second].filter((result) => result.ok).length, 1);
  const loser = [first, second].find((result) => !result.ok);
  assert.ok(loser && !loser.ok);
  assert.deepEqual(loser.reasonCodes, ["PROJECTION_VERSION_MISMATCH"]);
});
