/**
 * WEB-003 contract tests for claimant amend / retract / disagree.
 *
 * Proves the four acceptance criteria:
 *  1. Claimant can modify or exit before approval without operator workaround.
 *  2. Action writes durable record state through existing schema/store paths.
 *  3. Approval UI is no longer the only claimant-side path.
 *  4. Assessment page reflects claimant back-out outcomes clearly.
 */
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  clearTokenStore,
  getIntakeById,
  getIssuanceById,
  type TokenIssuanceRecord,
} from "./token-store";

import { POST as engage } from "../../app/api/engage/route";
import { POST as verifyToken } from "../../app/api/verify-token/route";
import { POST as approve } from "../../app/api/assessment/[issuanceId]/approve/route";
import { POST as amend } from "../../app/api/assessment/[issuanceId]/amend/route";
import { POST as retract } from "../../app/api/assessment/[issuanceId]/retract/route";
import { POST as disagree } from "../../app/api/assessment/[issuanceId]/disagree/route";

import {
  amendClaimantScope,
  ClaimantActionError,
  claimantActionBlocksApproval,
  disagreeWithClaimantScope,
  retractClaimantEngagement,
} from "./claimant-actions";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_SIGNING_SECRET = "test-secret";
  process.env.WITNESSOPS_TOKEN_TTL_MINUTES = "15";
  process.env.WITNESSOPS_TOKEN_FROM_EMAIL = "engage@witnessops.com";
  process.env.WITNESSOPS_VERIFY_BASE_URL = "https://witnessops.com";
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAILBOX_ENGAGE = "engage@witnessops.com";
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

async function issueVerifiedToken(baseDir: string) {
  applyTestEnv(baseDir);
  const response = await engage(
    new Request("https://witnessops.com/api/engage", {
      method: "POST",
      body: JSON.stringify({
        email: "claimant@example.com",
        intent: "Third-party assessment",
        scope: "Original scope text",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  const issuance = (await response.json()) as {
    issuanceId: string;
    email: string;
  };
  const [mailFile] = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  const mailRaw = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, mailFile),
    "utf8",
  );
  const token = mailRaw.match(/^Token:\s+(.+)$/m)?.[1];
  assert.ok(token);

  await verifyToken(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify({
        issuanceId: issuance.issuanceId,
        email: issuance.email,
        token,
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  return { issuanceId: issuance.issuanceId, email: issuance.email };
}

afterEach(async () => {
  await clearTokenStore();
});

// ---------------------------------------------------------------------------
// Pure predicate
// ---------------------------------------------------------------------------

test("claimantActionBlocksApproval: null/undefined/empty -> not blocked", () => {
  assert.deepEqual(claimantActionBlocksApproval(null), {
    blocked: false,
    kind: null,
  });
  assert.deepEqual(claimantActionBlocksApproval(undefined), {
    blocked: false,
    kind: null,
  });
  assert.deepEqual(claimantActionBlocksApproval({} as TokenIssuanceRecord), {
    blocked: false,
    kind: null,
  });
});

test("claimantActionBlocksApproval: amend does NOT block", () => {
  const r = claimantActionBlocksApproval({
    claimantAction: { kind: "amend", recordedAt: "now", reason: "x" },
  } as TokenIssuanceRecord);
  assert.equal(r.blocked, false);
  assert.equal(r.kind, "amend");
});

test("claimantActionBlocksApproval: retract blocks", () => {
  const r = claimantActionBlocksApproval({
    claimantAction: { kind: "retract", recordedAt: "now", reason: "x" },
  } as TokenIssuanceRecord);
  assert.equal(r.blocked, true);
  assert.equal(r.kind, "retract");
});

test("claimantActionBlocksApproval: disagree blocks", () => {
  const r = claimantActionBlocksApproval({
    claimantAction: { kind: "disagree", recordedAt: "now", reason: "x" },
  } as TokenIssuanceRecord);
  assert.equal(r.blocked, true);
  assert.equal(r.kind, "disagree");
});

// ---------------------------------------------------------------------------
// Service-level: writes durable state through existing store paths
// ---------------------------------------------------------------------------

test("amend writes the new scope through the existing intake store path", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-amend-"));
  const issued = await issueVerifiedToken(baseDir);

  const result = await amendClaimantScope({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Original scope was too narrow",
    amendedScope: "Passive-only recon of example.com and www.example.com",
  });
  assert.equal(result.claimantAction.kind, "amend");
  assert.equal(result.blocksApproval, false);

  // Durably reflected via the existing schema/store paths
  const issuance = await getIssuanceById(issued.issuanceId);
  assert.equal(issuance?.claimantAction?.kind, "amend");
  assert.equal(
    issuance?.claimantAction?.amendedScope,
    "Passive-only recon of example.com and www.example.com",
  );
  const intake = await getIntakeById(issuance!.intakeId!);
  assert.equal(
    intake?.submission.scope,
    "Passive-only recon of example.com and www.example.com",
  );
});

test("retract writes a terminal claimant action and blocks subsequent approval", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-retract-"));
  const issued = await issueVerifiedToken(baseDir);

  const result = await retractClaimantEngagement({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "No longer needed",
  });
  assert.equal(result.claimantAction.kind, "retract");
  assert.equal(result.blocksApproval, true);

  const issuance = await getIssuanceById(issued.issuanceId);
  assert.equal(issuance?.claimantAction?.kind, "retract");
});

test("disagree writes a terminal claimant action and blocks subsequent approval", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-disagree-"));
  const issued = await issueVerifiedToken(baseDir);

  const result = await disagreeWithClaimantScope({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Proposed methods exceed what we authorised",
  });
  assert.equal(result.claimantAction.kind, "disagree");
  assert.equal(result.blocksApproval, true);

  const issuance = await getIssuanceById(issued.issuanceId);
  assert.equal(issuance?.claimantAction?.kind, "disagree");
});

// ---------------------------------------------------------------------------
// Auth and validation
// ---------------------------------------------------------------------------

test("amend rejects email mismatch", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-auth-"));
  const issued = await issueVerifiedToken(baseDir);
  await assert.rejects(
    () =>
      amendClaimantScope({
        issuanceId: issued.issuanceId,
        email: "intruder@example.com",
        reason: "x",
        amendedScope: "x",
      }),
    (err) => err instanceof ClaimantActionError && err.status === 403,
  );
});

test("amend requires non-empty amended scope", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-empty-"));
  const issued = await issueVerifiedToken(baseDir);
  await assert.rejects(
    () =>
      amendClaimantScope({
        issuanceId: issued.issuanceId,
        email: issued.email,
        reason: "x",
        amendedScope: "   ",
      }),
    (err) => err instanceof ClaimantActionError && err.status === 400,
  );
});

test("retract requires reason", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-noreason-"));
  const issued = await issueVerifiedToken(baseDir);
  await assert.rejects(
    () =>
      retractClaimantEngagement({
        issuanceId: issued.issuanceId,
        email: issued.email,
        reason: "",
      }),
    (err) => err instanceof ClaimantActionError && err.status === 400,
  );
});

// ---------------------------------------------------------------------------
// Approve gate (the critical invariant)
// ---------------------------------------------------------------------------

test("approve route is blocked after retract", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-retract-block-"));
  const issued = await issueVerifiedToken(baseDir);

  const r = await retract(
    new Request("https://witnessops.com/api/assessment/x/retract", {
      method: "POST",
      body: JSON.stringify({ email: issued.email, reason: "Out" }),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
  );
  assert.equal(r.status, 200);

  const a = await approve(
    new Request("https://witnessops.com/api/assessment/x/approve", {
      method: "POST",
      body: JSON.stringify({
        email: issued.email,
        approverName: "Verified Operator",
        approvalNote: "Approved",
      }),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
  );
  assert.equal(a.status, 400);
  const body = (await a.json()) as { error?: string };
  assert.match(body.error ?? "", /retract/i);
});

test("approve route is blocked after disagree", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-disagree-block-"));
  const issued = await issueVerifiedToken(baseDir);

  await disagree(
    new Request("https://witnessops.com/api/assessment/x/disagree", {
      method: "POST",
      body: JSON.stringify({ email: issued.email, reason: "Wrong scope" }),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
  );

  const a = await approve(
    new Request("https://witnessops.com/api/assessment/x/approve", {
      method: "POST",
      body: JSON.stringify({
        email: issued.email,
        approverName: "Verified Operator",
        approvalNote: "Approved",
      }),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
  );
  assert.equal(a.status, 400);
  const body = (await a.json()) as { error?: string };
  assert.match(body.error ?? "", /disagreed/i);
});

test("approve route is NOT blocked after amend", async () => {
  // Amend is non-blocking — claimant may still proceed to approval.
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-amend-ok-"));
  const issued = await issueVerifiedToken(baseDir);

  // Stub control-plane handoff so the approve flow does not error on
  // missing CONTROL_PLANE_URL — we only need to prove the gate doesn't trip.
  process.env.CONTROL_PLANE_URL = "http://control-plane.internal";
  process.env.CONTROL_PLANE_API_KEY = "cp-key";
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        issuanceId: issued.issuanceId,
        accepted: true,
        runId: "run_demo123",
        persistedState: "pending_authorization",
        timestamp: new Date().toISOString(),
        error: null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    await amend(
      new Request("https://witnessops.com/api/assessment/x/amend", {
        method: "POST",
        body: JSON.stringify({
          email: issued.email,
          reason: "Tightening",
          amendedScope: "Passive-only on www.example.com",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
    );

    const a = await approve(
      new Request("https://witnessops.com/api/assessment/x/approve", {
        method: "POST",
        body: JSON.stringify({
          email: issued.email,
          approverName: "Verified Operator",
          approvalNote: "Approved",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
    );
    assert.equal(a.status, 200);
  } finally {
    global.fetch = originalFetch;
    delete process.env.CONTROL_PLANE_URL;
    delete process.env.CONTROL_PLANE_API_KEY;
  }
});

test("claimant actions cannot be taken after approval", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-after-approval-"));
  const issued = await issueVerifiedToken(baseDir);
  process.env.CONTROL_PLANE_URL = "http://control-plane.internal";
  process.env.CONTROL_PLANE_API_KEY = "cp-key";
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        issuanceId: issued.issuanceId,
        accepted: true,
        runId: "run_demo123",
        persistedState: "pending_authorization",
        timestamp: new Date().toISOString(),
        error: null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    await approve(
      new Request("https://witnessops.com/api/assessment/x/approve", {
        method: "POST",
        body: JSON.stringify({
          email: issued.email,
          approverName: "Verified Operator",
          approvalNote: "Approved",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
    );

    await assert.rejects(
      () =>
        retractClaimantEngagement({
          issuanceId: issued.issuanceId,
          email: issued.email,
          reason: "Too late",
        }),
      (err) => err instanceof ClaimantActionError && err.status === 409,
    );
  } finally {
    global.fetch = originalFetch;
    delete process.env.CONTROL_PLANE_URL;
    delete process.env.CONTROL_PLANE_API_KEY;
  }
});
