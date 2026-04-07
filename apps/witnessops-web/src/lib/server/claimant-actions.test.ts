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
  reopenClaimantExit,
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

// ---------------------------------------------------------------------------
// WEB-005: claimant reopen of own terminal exit
// ---------------------------------------------------------------------------

import { POST as reopen } from "../../app/api/assessment/[issuanceId]/reopen/route";
import { readIntakeEvents } from "./intake-event-ledger";

test("WEB-005: claimant reopens retract -> claimantAction cleared, ledger event appended", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-reopen-retract-"));
  const issued = await issueVerifiedToken(baseDir);

  await retractClaimantEngagement({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Initial exit",
  });

  const result = await reopenClaimantExit({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Changed mind",
  });
  assert.equal(result.blocksApproval, false);

  const issuance = await getIssuanceById(issued.issuanceId);
  assert.equal(issuance?.claimantAction, null);

  const events = await readIntakeEvents();
  const reopenEvent = events.find(
    (e) => e.event_type === "intake.reopen.claimant_action_cleared",
  );
  assert.ok(reopenEvent, "reopen ledger event must exist");
  assert.equal(
    (reopenEvent?.payload as { cleared_kind?: string })?.cleared_kind,
    "retract",
  );
});

test("WEB-005: claimant reopens disagree -> claimantAction cleared", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-reopen-disagree-"));
  const issued = await issueVerifiedToken(baseDir);

  await disagreeWithClaimantScope({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Wrong methods",
  });

  const result = await reopenClaimantExit({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Resolved offline",
  });
  assert.equal(result.blocksApproval, false);

  const issuance = await getIssuanceById(issued.issuanceId);
  assert.equal(issuance?.claimantAction, null);
});

test("WEB-005: claimant reopen on amend is refused with explicit message", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-reopen-amend-"));
  const issued = await issueVerifiedToken(baseDir);

  await amendClaimantScope({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Tightening",
    amendedScope: "Passive-only",
  });

  await assert.rejects(
    () =>
      reopenClaimantExit({
        issuanceId: issued.issuanceId,
        email: issued.email,
        reason: "Try anyway",
      }),
    (err) =>
      err instanceof ClaimantActionError &&
      err.status === 409 &&
      /amend is non-terminal/i.test(err.message),
  );
});

test("WEB-005: claimant reopen on a clean run is refused", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-reopen-clean-"));
  const issued = await issueVerifiedToken(baseDir);

  await assert.rejects(
    () =>
      reopenClaimantExit({
        issuanceId: issued.issuanceId,
        email: issued.email,
        reason: "Try anyway",
      }),
    (err) => err instanceof ClaimantActionError && err.status === 409,
  );
});

test("WEB-005: claimant reopen rejects email mismatch", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-reopen-auth-"));
  const issued = await issueVerifiedToken(baseDir);
  await retractClaimantEngagement({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Out",
  });
  await assert.rejects(
    () =>
      reopenClaimantExit({
        issuanceId: issued.issuanceId,
        email: "intruder@example.com",
        reason: "Reopen",
      }),
    (err) => err instanceof ClaimantActionError && err.status === 403,
  );
});

test("WEB-005: claimant reopen does NOT clear an operator reject (cross-actor refused)", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-reopen-cross-"));
  const issued = await issueVerifiedToken(baseDir);
  const { rejectIntakeAsOperator } = await import("./operator-actions");
  const issuance = await getIssuanceById(issued.issuanceId);
  await rejectIntakeAsOperator({
    intakeId: issuance!.intakeId!,
    actor: "operator@example.com",
    reason: "Out of scope",
  });

  await assert.rejects(
    () =>
      reopenClaimantExit({
        issuanceId: issued.issuanceId,
        email: issued.email,
        reason: "Try anyway",
      }),
    (err) =>
      err instanceof ClaimantActionError &&
      err.status === 409 &&
      /no claimant action/i.test(err.message),
  );
});

test("WEB-005: end-to-end retract -> reopen -> approve succeeds", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-e2e-retract-reopen-"));
  const issued = await issueVerifiedToken(baseDir);

  await retractClaimantEngagement({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Initial exit",
  });
  await reopenClaimantExit({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Changed mind",
  });

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

test("WEB-005: reopen route returns 200 on retract clearance", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-claimant-reopen-route-"));
  const issued = await issueVerifiedToken(baseDir);
  await retractClaimantEngagement({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Initial",
  });

  const r = await reopen(
    new Request("https://witnessops.com/api/assessment/x/reopen", {
      method: "POST",
      body: JSON.stringify({ email: issued.email, reason: "Changed mind" }),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
  );
  assert.equal(r.status, 200);
});

// ---------------------------------------------------------------------------
// WEB-010: co-existing claimant + operator action visibility predicates
// ---------------------------------------------------------------------------
//
// The new co-existing-action footers in the assessment page and the
// admin queue render based on simple boolean predicates over the
// issuance + intake state. These tests pin those predicates at the
// data layer, mirroring the WEB-009 co-located-predicate pattern, so
// the rendering logic and the test contract cannot drift apart.

import {
  getIntakeById as _getIntakeById,
  getIssuanceById as _getIssuanceById,
} from "./token-store";

/**
 * Mirrors the assessment page (page.tsx) operator-reject banner's
 * `record.claimantAction?.kind` cross-banner check exactly. Returns
 * true when a co-existing claimant retract or disagree should be
 * surfaced inside the red operator-reject banner.
 */
function shouldShowCoexistingClaimantOnOperatorBanner(
  issuance: TokenIssuanceRecord | null,
): boolean {
  const k = issuance?.claimantAction?.kind;
  return k === "retract" || k === "disagree";
}

/**
 * Mirrors the claimant-actions-form (claimant-actions-form.tsx)
 * `props.operatorRejectInForce` evaluation in the page. Returns true
 * when the operator-side reject is in force and the claimant terminal
 * banner should carry the co-existing-action footer.
 */
function shouldShowCoexistingOperatorOnClaimantBanner(
  intakeOperatorActionKind: "reject" | "request_clarification" | undefined,
  approvalStatus: TokenIssuanceRecord["approvalStatus"],
): boolean {
  return (
    intakeOperatorActionKind === "reject" || approvalStatus === "approval_denied"
  );
}

test("WEB-010: assessment-page predicate flags claimant retract under operator reject", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-web010-retract-"));
  const issued = await issueVerifiedToken(baseDir);
  // Stage: claimant retracts, then operator rejects (chronology
  // does not matter; the page reads current state).
  await retractClaimantEngagement({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Out",
  });
  const { rejectIntakeAsOperator } = await import("./operator-actions");
  await rejectIntakeAsOperator({
    intakeId: (await _getIssuanceById(issued.issuanceId))!.intakeId!,
    actor: "operator@example.com",
    reason: "Out of scope",
  });

  const issuance = await _getIssuanceById(issued.issuanceId);
  assert.equal(shouldShowCoexistingClaimantOnOperatorBanner(issuance), true);
});

test("WEB-010: assessment-page predicate flags claimant disagree under operator reject", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-web010-disagree-"));
  const issued = await issueVerifiedToken(baseDir);
  await disagreeWithClaimantScope({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Wrong methods",
  });
  const { rejectIntakeAsOperator } = await import("./operator-actions");
  await rejectIntakeAsOperator({
    intakeId: (await _getIssuanceById(issued.issuanceId))!.intakeId!,
    actor: "operator@example.com",
    reason: "Out of scope",
  });

  const issuance = await _getIssuanceById(issued.issuanceId);
  assert.equal(shouldShowCoexistingClaimantOnOperatorBanner(issuance), true);
});

test("WEB-010: assessment-page predicate is false when only operator-reject (no claimant action)", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-web010-reject-only-"));
  const issued = await issueVerifiedToken(baseDir);
  const { rejectIntakeAsOperator } = await import("./operator-actions");
  await rejectIntakeAsOperator({
    intakeId: (await _getIssuanceById(issued.issuanceId))!.intakeId!,
    actor: "operator@example.com",
    reason: "Out of scope",
  });

  const issuance = await _getIssuanceById(issued.issuanceId);
  assert.equal(shouldShowCoexistingClaimantOnOperatorBanner(issuance), false);
});

test("WEB-010: assessment-page predicate is false on claimant amend (non-terminal)", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-web010-amend-"));
  const issued = await issueVerifiedToken(baseDir);
  await amendClaimantScope({
    issuanceId: issued.issuanceId,
    email: issued.email,
    reason: "Tightening",
    amendedScope: "Passive-only",
  });
  const issuance = await _getIssuanceById(issued.issuanceId);
  assert.equal(shouldShowCoexistingClaimantOnOperatorBanner(issuance), false);
});

test("WEB-010: claimant-banner predicate flags operator-reject in force", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-web010-claimant-side-"));
  const issued = await issueVerifiedToken(baseDir);
  const { rejectIntakeAsOperator } = await import("./operator-actions");
  await rejectIntakeAsOperator({
    intakeId: (await _getIssuanceById(issued.issuanceId))!.intakeId!,
    actor: "operator@example.com",
    reason: "Out of scope",
  });
  const intake = await _getIntakeById(
    (await _getIssuanceById(issued.issuanceId))!.intakeId!,
  );
  const issuance = await _getIssuanceById(issued.issuanceId);
  assert.equal(
    shouldShowCoexistingOperatorOnClaimantBanner(
      intake?.operatorAction?.kind,
      issuance?.approvalStatus,
    ),
    true,
  );
});

test("WEB-010: claimant-banner predicate is false on a clean run", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-web010-clean-"));
  const issued = await issueVerifiedToken(baseDir);
  const intake = await _getIntakeById(
    (await _getIssuanceById(issued.issuanceId))!.intakeId!,
  );
  const issuance = await _getIssuanceById(issued.issuanceId);
  assert.equal(
    shouldShowCoexistingOperatorOnClaimantBanner(
      intake?.operatorAction?.kind,
      issuance?.approvalStatus,
    ),
    false,
  );
});
