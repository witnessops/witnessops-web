import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";
import { NextRequest } from "next/server";

import { createAdminSessionCookie } from "@/lib/server/admin-session";
import { clearTokenStore, saveIntake, type IntakeRecord } from "@/lib/server/token-store";
import { POST } from "./route";

async function delegatedCookie(actorSubject: string): Promise<string> {
  process.env.WITNESSOPS_ADMIN_SECRET = "test-admin-secret";
  const now = Date.now();
  return createAdminSessionCookie({
    version: 3,
    identityProvider: "google",
    issuer: "https://accounts.google.com",
    subject: actorSubject,
    actor: `oidc:https://accounts.google.com#${actorSubject}`,
    actorAuthSource: "oidc_session",
    actorSessionHash: "abcd1234abcd5678",
    role: "Delegated Operator",
    iat: now,
    exp: now + 60_000,
  });
}

afterEach(async () => {
  delete process.env.WITNESSOPS_ADMIN_SECRET;
  await clearTokenStore();
});

test("delegated projection verification hides a foreign intake", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-projection-read-"));
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  const intake: IntakeRecord = {
    intakeId: "intk_foreign_projection",
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
        assignedOperator: "oidc:https://accounts.google.com#bob",
        priority: "normal",
        currentScopeContractId: null,
        scopeContractStatus: null,
        currentClarificationRecordId: null,
        clarificationOutstanding: false,
        respondedAt: null,
        lastOperatorActionAt: null,
        projectionVersion: 1,
        eventSequence: 0,
        responseRecordId: null,
      },
      scopeContracts: [],
      clarifications: [],
      responses: [],
    },
  };
  await saveIntake(intake);
  const cookie = await delegatedCookie("alice");

  const response = await POST(
    new NextRequest("https://witnessops.com/api/admin/queue/verify-projection", {
      method: "POST",
      headers: {
        cookie: `witnessops-admin-session=${cookie}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ intakeId: intake.intakeId }),
    }),
  );

  assert.equal(response.status, 404);
  const payload = (await response.json()) as { reasonCodes: string[] };
  assert.deepEqual(payload.reasonCodes, ["SNAPSHOT_MISSING"]);
});
