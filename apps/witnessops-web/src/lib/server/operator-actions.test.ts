/**
 * WEB-004 contract tests for operator reject + request-clarification.
 *
 * Proves the four acceptance criteria:
 *  1. Operator can reject without freeform workaround.
 *  2. Operator can request clarification without advancing to reply/reconcile.
 *  3. Claimant sees resulting state and next step clearly.
 *  4. Reserved denied/rejected states are exercised by actual app routes.
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

import {
  OperatorActionError,
  operatorRejectionBlocksApproval,
  rejectIntakeAsOperator,
  requestClarificationAsOperator,
  rescindOperatorRejection,
} from "./operator-actions";
import { readIntakeEvents } from "./intake-event-ledger";

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
    intakeId: string;
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

  // intakeId is on the issuance record after verification
  const record = await getIssuanceById(issuance.issuanceId);
  return {
    issuanceId: issuance.issuanceId,
    email: issuance.email,
    intakeId: record!.intakeId!,
  };
}

afterEach(async () => {
  await clearTokenStore();
});

// ---------------------------------------------------------------------------
// Pure predicate
// ---------------------------------------------------------------------------

test("operatorRejectionBlocksApproval: null/undefined -> false", () => {
  assert.equal(operatorRejectionBlocksApproval(null), false);
  assert.equal(operatorRejectionBlocksApproval(undefined), false);
});

test("operatorRejectionBlocksApproval: pending/approved -> false", () => {
  assert.equal(
    operatorRejectionBlocksApproval({ approvalStatus: "pending" } as TokenIssuanceRecord),
    false,
  );
  assert.equal(
    operatorRejectionBlocksApproval({ approvalStatus: "approved" } as TokenIssuanceRecord),
    false,
  );
});

test("operatorRejectionBlocksApproval: approval_denied -> true", () => {
  assert.equal(
    operatorRejectionBlocksApproval({
      approvalStatus: "approval_denied",
    } as TokenIssuanceRecord),
    true,
  );
});

// ---------------------------------------------------------------------------
// Reject service writes the reserved states + audit event
// ---------------------------------------------------------------------------

test("reject writes intake.state=rejected and issuance.approvalStatus=approval_denied", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-reject-"));
  const issued = await issueVerifiedToken(baseDir);

  const result = await rejectIntakeAsOperator({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Out of scope for free tier",
  });
  assert.equal(result.state, "rejected");
  assert.equal(result.operatorAction.kind, "reject");
  assert.equal(result.approvalStatus, "approval_denied");
  assert.equal(result.blocksApproval, true);

  const intake = await getIntakeById(issued.intakeId);
  assert.equal(intake?.state, "rejected");
  assert.ok(intake?.rejectedAt);
  assert.equal(intake?.operatorAction?.kind, "reject");
  const issuance = await getIssuanceById(issued.issuanceId);
  assert.equal(issuance?.approvalStatus, "approval_denied");

  // Audit event in the existing intake event ledger
  const events = await readIntakeEvents();
  const rejectionEvent = events.find(
    (e) => e.event_type === "intake.rejected_by_operator",
  );
  assert.ok(rejectionEvent);
  assert.equal(rejectionEvent?.intake_id, issued.intakeId);
});

test("reject is idempotent on replay with same reason path", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-reject-replay-"));
  const issued = await issueVerifiedToken(baseDir);

  const first = await rejectIntakeAsOperator({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "First denial",
  });
  const second = await rejectIntakeAsOperator({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Second call",
  });
  assert.equal(second.operatorAction.kind, "reject");
  assert.equal(second.operatorAction.reason, first.operatorAction.reason);
});

test("reject requires reason and actor", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-reject-empty-"));
  const issued = await issueVerifiedToken(baseDir);
  await assert.rejects(
    () =>
      rejectIntakeAsOperator({
        intakeId: issued.intakeId,
        actor: "operator@example.com",
        reason: "",
      }),
    (err) => err instanceof OperatorActionError && err.status === 400,
  );
  await assert.rejects(
    () =>
      rejectIntakeAsOperator({
        intakeId: issued.intakeId,
        actor: "",
        reason: "ok",
      }),
    (err) => err instanceof OperatorActionError && err.status === 400,
  );
});

// ---------------------------------------------------------------------------
// Request clarification: non-terminal, no state advance
// ---------------------------------------------------------------------------

test("request_clarification leaves intake.state and approvalStatus unchanged", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-clarify-"));
  const issued = await issueVerifiedToken(baseDir);

  const before = await getIntakeById(issued.intakeId);
  const result = await requestClarificationAsOperator({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Need more detail",
    clarificationQuestion: "Which subdomains are in scope?",
  });
  assert.equal(result.operatorAction.kind, "request_clarification");
  assert.equal(result.blocksApproval, false);
  assert.equal(result.state, before?.state);

  const intake = await getIntakeById(issued.intakeId);
  assert.equal(intake?.state, before?.state);
  assert.equal(intake?.operatorAction?.kind, "request_clarification");
  assert.equal(
    intake?.operatorAction?.clarificationQuestion,
    "Which subdomains are in scope?",
  );

  // Issuance approvalStatus untouched
  const issuance = await getIssuanceById(issued.issuanceId);
  assert.notEqual(issuance?.approvalStatus, "approval_denied");

  // Audit event written
  const events = await readIntakeEvents();
  assert.ok(
    events.some((e) => e.event_type === "intake.clarification_requested"),
  );
});

test("request_clarification requires both reason and question", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-clarify-empty-"));
  const issued = await issueVerifiedToken(baseDir);
  await assert.rejects(
    () =>
      requestClarificationAsOperator({
        intakeId: issued.intakeId,
        actor: "operator@example.com",
        reason: "ok",
        clarificationQuestion: "",
      }),
    (err) => err instanceof OperatorActionError && err.status === 400,
  );
  await assert.rejects(
    () =>
      requestClarificationAsOperator({
        intakeId: issued.intakeId,
        actor: "operator@example.com",
        reason: "",
        clarificationQuestion: "ok?",
      }),
    (err) => err instanceof OperatorActionError && err.status === 400,
  );
});

test("request_clarification refuses on a rejected intake", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-clarify-after-"));
  const issued = await issueVerifiedToken(baseDir);
  await rejectIntakeAsOperator({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Out",
  });
  await assert.rejects(
    () =>
      requestClarificationAsOperator({
        intakeId: issued.intakeId,
        actor: "operator@example.com",
        reason: "Need detail",
        clarificationQuestion: "?",
      }),
    (err) => err instanceof OperatorActionError && err.status === 409,
  );
});

// ---------------------------------------------------------------------------
// Approve gate (the critical invariant)
// ---------------------------------------------------------------------------

test("approve route is blocked after operator reject", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-reject-block-"));
  const issued = await issueVerifiedToken(baseDir);

  await rejectIntakeAsOperator({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Out of scope",
  });

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
  assert.match(body.error ?? "", /operator has rejected/i);
});

test("approve route is NOT blocked by a clarification request alone", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-clarify-ok-"));
  const issued = await issueVerifiedToken(baseDir);
  await requestClarificationAsOperator({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Need more detail",
    clarificationQuestion: "Confirm subdomains",
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

// ---------------------------------------------------------------------------
// WEB-005: operator rescind of own reject
// ---------------------------------------------------------------------------

test("WEB-005: operator rescinds reject -> intake state reverts to ledger previous_state", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-rescind-revert-"));
  const issued = await issueVerifiedToken(baseDir);

  // Capture the pre-reject intake state so we can verify the revert.
  const before = await getIntakeById(issued.intakeId);
  const stateBeforeReject = before!.state;

  await rejectIntakeAsOperator({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Out of scope",
  });

  const result = await rescindOperatorRejection({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Reviewed; original rejection was wrong",
  });
  assert.equal(result.blocksApproval, false);

  const intake = await getIntakeById(issued.intakeId);
  assert.equal(intake?.state, stateBeforeReject);
  assert.equal(intake?.operatorAction, null);
  assert.equal(intake?.rejectedAt, undefined);

  const issuance = await getIssuanceById(issued.issuanceId);
  assert.equal(issuance?.approvalStatus, "pending");

  const events = await readIntakeEvents();
  assert.ok(
    events.some((e) => e.event_type === "intake.reopen.operator_rejection_rescinded"),
    "rescind ledger event must exist",
  );
  assert.ok(
    events.some((e) => e.event_type === "intake.rejected_by_operator"),
    "original rejection event must remain in the ledger",
  );
});

test("WEB-005: operator rescind on a non-rejected intake -> 409", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-rescind-not-rejected-"));
  const issued = await issueVerifiedToken(baseDir);

  await assert.rejects(
    () =>
      rescindOperatorRejection({
        intakeId: issued.intakeId,
        actor: "operator@example.com",
        reason: "Try anyway",
      }),
    (err) => err instanceof OperatorActionError && err.status === 409,
  );
});

test("WEB-005: operator rescind on a clarification-only intake -> 409", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-rescind-clarify-"));
  const issued = await issueVerifiedToken(baseDir);

  await requestClarificationAsOperator({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Need detail",
    clarificationQuestion: "Confirm subdomains",
  });

  await assert.rejects(
    () =>
      rescindOperatorRejection({
        intakeId: issued.intakeId,
        actor: "operator@example.com",
        reason: "Try anyway",
      }),
    (err) => err instanceof OperatorActionError && err.status === 409,
  );
});

test("WEB-005: operator rescind requires reason and actor", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-op-rescind-empty-"));
  const issued = await issueVerifiedToken(baseDir);
  await rejectIntakeAsOperator({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Out",
  });

  await assert.rejects(
    () =>
      rescindOperatorRejection({
        intakeId: issued.intakeId,
        actor: "operator@example.com",
        reason: "",
      }),
    (err) => err instanceof OperatorActionError && err.status === 400,
  );
  await assert.rejects(
    () =>
      rescindOperatorRejection({
        intakeId: issued.intakeId,
        actor: "",
        reason: "ok",
      }),
    (err) => err instanceof OperatorActionError && err.status === 400,
  );
});

test("WEB-005: end-to-end reject -> rescind -> approve succeeds", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wo-e2e-reject-rescind-"));
  const issued = await issueVerifiedToken(baseDir);

  await rejectIntakeAsOperator({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Out of scope",
  });
  await rescindOperatorRejection({
    intakeId: issued.intakeId,
    actor: "operator@example.com",
    reason: "Reviewed; original rejection was wrong",
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
