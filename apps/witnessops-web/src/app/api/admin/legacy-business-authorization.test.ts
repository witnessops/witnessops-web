import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import { NextRequest } from "next/server";

import { createAdminSessionCookie } from "@/lib/server/admin-session";
import {
  clearTokenStore,
  saveIntake,
  saveIssuance,
  type IntakeRecord,
  type TokenIssuanceRecord,
} from "@/lib/server/token-store";

import { POST as reconcile } from "./intake/reconcile/route";
import { POST as reject } from "./intake/reject/route";
import { POST as requestClarification } from "./intake/request-clarification/route";
import { POST as rescindRejection } from "./intake/rescind-rejection/route";
import { POST as respond } from "./intake/respond/route";
import { POST as authorize } from "./lifecycle/[runId]/authorize/route";
import { POST as retryRequest } from "./lifecycle/[runId]/retry-request/route";

const RUN_ID = "run_authz_boundary";
const INTAKE_ID = "intk_authz_boundary";
const ISSUANCE_ID = "iss_authz_boundary";

async function sessionCookie(role: "Founder" | "Delegated Operator" | "Administrator", subject: string) {
  const now = Date.now();
  return createAdminSessionCookie({
    version: 3,
    identityProvider: "google",
    issuer: "https://accounts.google.com",
    subject,
    actor: `oidc:https://accounts.google.com#${subject}`,
    actorAuthSource: "oidc_session",
    actorSessionHash: "abcd1234abcd5678",
    role,
    iat: now,
    exp: now + 60_000,
  });
}

async function seedCase(assignedOperator: string | null): Promise<void> {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-legacy-authz-"));
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");

  const intake: IntakeRecord = {
    intakeId: INTAKE_ID,
    channel: "support",
    email: "buyer@example.com",
    state: "admitted",
    createdAt: "2026-08-13T08:00:00Z",
    updatedAt: "2026-08-13T08:00:00Z",
    latestIssuanceId: ISSUANCE_ID,
    threadId: "thr_authz_boundary",
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
  const issuance: TokenIssuanceRecord = {
    issuanceId: ISSUANCE_ID,
    intakeId: INTAKE_ID,
    channel: "support",
    email: intake.email,
    tokenDigest: "sha256:test",
    createdAt: intake.createdAt,
    expiresAt: "2026-08-13T08:15:00Z",
    status: "verified",
    threadId: intake.threadId,
    controlPlaneRunId: RUN_ID,
    delivery: {
      mailbox: "support@witnessops.com",
      alias: null,
      templateVersion: "test-v1",
      provider: "file",
      providerMessageId: null,
      deliveredAt: intake.createdAt,
    },
  };
  await saveIntake(intake);
  await saveIssuance(issuance);
}

function post(pathname: string, cookie: string, body: unknown): NextRequest {
  return new NextRequest(`https://witnessops.com${pathname}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      cookie: `witnessops-admin-session=${cookie}`,
    },
  });
}

async function callLegacyRoutes(cookie: string): Promise<Response[]> {
  const context = { params: Promise.resolve({ runId: RUN_ID }) };
  return Promise.all([
    respond(post("/api/admin/intake/respond", cookie, {
      intakeId: INTAKE_ID,
      subject: "Re: request",
      body: "Bounded response.",
    })),
    reject(post("/api/admin/intake/reject", cookie, {
      intakeId: INTAKE_ID,
      reason: "Not eligible.",
    })),
    requestClarification(post("/api/admin/intake/request-clarification", cookie, {
      intakeId: INTAKE_ID,
      reason: "Scope unclear.",
      clarificationQuestion: "Which host is in scope?",
    })),
    rescindRejection(post("/api/admin/intake/rescind-rejection", cookie, {
      intakeId: INTAKE_ID,
      reason: "Reconsidered.",
    })),
    reconcile(post("/api/admin/intake/reconcile", cookie, {
      intakeId: INTAKE_ID,
      evidenceSubcase: "local_attempt_recorded_provider_outcome_unknown",
      note: "Evidence reviewed: durable attempt.\n\nWhy reconcile now: outcome unknown.\n\nJudgment: preserve ambiguity.",
    })),
    authorize(post(`/api/admin/lifecycle/${RUN_ID}/authorize`, cookie, {}), context),
    retryRequest(post(`/api/admin/lifecycle/${RUN_ID}/retry-request`, cookie, {
      reason: "Retry after review.",
    }), context),
  ]);
}

afterEach(async () => {
  delete process.env.WITNESSOPS_ADMIN_SECRET;
  delete process.env.WITNESSOPS_TOKEN_STORE_DIR;
  delete process.env.WITNESSOPS_TOKEN_AUDIT_DIR;
  await clearTokenStore();
});

test("legacy business routes reject Administrator sessions before mutation", async () => {
  await seedCase(null);
  const responses = await callLegacyRoutes(
    await sessionCookie("Administrator", "administrator"),
  );
  assert.deepEqual(responses.map((response) => response.status), Array(7).fill(403));
});

test("legacy business routes reject delegated operators outside their assignment", async () => {
  await seedCase("oidc:https://accounts.google.com#owner");
  const responses = await callLegacyRoutes(
    await sessionCookie("Delegated Operator", "other-operator"),
  );
  assert.deepEqual(responses.map((response) => response.status), Array(7).fill(403));
});

test("assigned delegated operator retains legitimate business access", async () => {
  const actor = "oidc:https://accounts.google.com#owner";
  await seedCase(actor);
  const cookie = await sessionCookie("Delegated Operator", "owner");
  const response = await requestClarification(
    post("/api/admin/intake/request-clarification", cookie, {
      intakeId: INTAKE_ID,
      reason: "Scope unclear.",
      clarificationQuestion: "Which host is in scope?",
    }),
  );
  assert.equal(response.status, 200);
});
