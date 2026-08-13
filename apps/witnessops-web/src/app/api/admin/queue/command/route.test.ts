import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import { NextRequest } from "next/server";

import { createAdminSessionCookie } from "@/lib/server/admin-session";
import {
  clearTokenStore,
  getIntakeById,
  saveIntake,
  type IntakeRecord,
} from "@/lib/server/token-store";

import { POST } from "./route";

const originalAdminSecret = process.env.WITNESSOPS_ADMIN_SECRET;

afterEach(async () => {
  if (originalAdminSecret === undefined) {
    delete process.env.WITNESSOPS_ADMIN_SECRET;
  } else {
    process.env.WITNESSOPS_ADMIN_SECRET = originalAdminSecret;
  }
  await clearTokenStore();
});

async function founderCookie(): Promise<string> {
  process.env.WITNESSOPS_ADMIN_SECRET = "test-admin-secret";
  const now = Date.now();
  return createAdminSessionCookie({
    version: 3,
    identityProvider: "google",
    issuer: "https://accounts.google.com",
    subject: "founder-subject",
    actor: "oidc:https://accounts.google.com#founder-subject",
    actorAuthSource: "oidc_session",
    actorSessionHash: "abcd1234abcd5678",
    role: "Founder",
    iat: now,
    exp: now + 60_000,
  });
}

function makeIntake(): IntakeRecord {
  return {
    intakeId: "intk_queue_route_validation",
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
        assignedOperator: null,
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

test("nested payload command cannot replace the validated outer command", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-route-"));
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
  await saveIntake(makeIntake());

  const cookie = await founderCookie();
  for (const nestedCommand of ["queue.unknown", "queue.claim"]) {
    const response = await POST(
      new NextRequest("https://witnessops.com/api/admin/queue/command", {
        method: "POST",
        body: JSON.stringify({
          command: "queue.set_priority",
          intakeId: "intk_queue_route_validation",
          expectedProjectionVersion: 0,
          expectedEventSequence: 0,
          idempotencyKey: `route-command-overwrite-${nestedCommand}`,
          payload: {
            command: nestedCommand,
            priority: "high",
          },
        }),
        headers: {
          "Content-Type": "application/json",
          cookie: `witnessops-admin-session=${cookie}`,
        },
      }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: "payload.command is not allowed.",
    });
  }

  const stored = await getIntakeById("intk_queue_route_validation");
  assert.equal(stored?.queue?.projection.priority, "normal");
  assert.equal(stored?.queue?.projection.projectionVersion, 0);
  assert.equal(stored?.queue?.projection.eventSequence, 0);
});

test("malformed command fields are rejected before state mutation", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-schema-"));
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
  await saveIntake(makeIntake());

  const cookie = await founderCookie();
  const response = await POST(
    new NextRequest("https://witnessops.com/api/admin/queue/command", {
      method: "POST",
      body: JSON.stringify({
        command: "queue.set_priority",
        intakeId: "intk_queue_route_validation",
        expectedProjectionVersion: 0,
        expectedEventSequence: 0,
        idempotencyKey: "route-invalid-priority",
        payload: { priority: "not-a-priority" },
      }),
      headers: {
        "Content-Type": "application/json",
        cookie: `witnessops-admin-session=${cookie}`,
      },
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Invalid queue command payload.",
  });
  assert.equal(
    (await getIntakeById("intk_queue_route_validation"))?.queue?.projection
      .priority,
    "normal",
  );
});
