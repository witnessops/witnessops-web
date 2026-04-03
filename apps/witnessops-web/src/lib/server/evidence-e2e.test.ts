/**
 * End-to-end evidence consistency test.
 *
 * Seeds 9 mixed evidence scenarios into one queue view and verifies that
 * queue row state, reconciliation report, stale flags, blocked reasons,
 * timeline derivation, and filter groupings all tell the same story.
 *
 * Scenarios:
 *   1. responded only (no downstream evidence)
 *   2. responded + accepted (weak provider outcome)
 *   3. responded + delivered (strong provider outcome)
 *   4. responded + bounced (strong provider outcome)
 *   5. responded + mailbox receipt only (no provider outcome)
 *   6. responded + provider delivered + mailbox delivered (corroboration)
 *   7. manual reconciliation still pending (accepted, no strong evidence)
 *   8. reconciliation blocked by strong provider evidence
 *   9. reconciliation blocked by strong mailbox receipt
 */
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { appendIntakeEvent } from "./intake-event-ledger";
import {
  buildAdmissionQueueView,
  type AdmissionQueueRow,
} from "./admission-queue";
import { buildReconciliationReportFromView } from "./reconciliation-report";
import { resolveAmbiguity, isManualReconciliationBlocked } from "./evidence-resolution";
import {
  clearTokenStore,
  saveIntake,
  saveIssuance,
  type IntakeRecord,
  type IntakeResponseRecord,
  type IntakeResponseProviderOutcomeRecord,
  type IntakeMailboxReceiptRecord,
  type TokenIssuanceRecord,
} from "./token-store";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

const baseResponse: IntakeResponseRecord = {
  deliveryAttemptId: "rsp_base",
  subject: "Re: test",
  bodyDigest: "sha256:test",
  actor: "admin:test",
  actorAuthSource: "local_bypass",
  actorSessionHash: null,
  mailbox: "engage@witnessops.com",
  provider: "resend",
  providerMessageId: "re_base",
  deliveredAt: "2026-03-29T11:05:00Z",
};

function makeIntake(
  id: string,
  overrides: Partial<IntakeRecord>,
): IntakeRecord {
  return {
    intakeId: id,
    channel: "engage",
    email: `${id}@test.com`,
    state: "admitted",
    createdAt: "2026-03-29T10:00:00Z",
    updatedAt: "2026-03-29T11:05:00Z",
    latestIssuanceId: `iss_${id}`,
    threadId: `thr_${id}`,
    submission: { category: "test", severity: "general", message: "e2e test" },
    ...overrides,
  };
}

function makeIssuance(id: string): TokenIssuanceRecord {
  return {
    issuanceId: `iss_${id}`,
    intakeId: id,
    channel: "engage",
    email: `${id}@test.com`,
    tokenDigest: "sha256:test",
    createdAt: "2026-03-29T10:00:00Z",
    expiresAt: "2026-03-29T10:15:00Z",
    status: "verified",
    threadId: `thr_${id}`,
    delivery: {
      mailbox: "engage@witnessops.com",
      alias: null,
      templateVersion: "tier1-token-v2",
      provider: "resend",
      providerMessageId: null,
      deliveredAt: "2026-03-29T10:01:00Z",
    },
  };
}

function providerOutcome(
  id: string,
  status: "accepted" | "delivered" | "bounced" | "failed",
  provider = "resend",
): IntakeResponseProviderOutcomeRecord {
  return {
    status,
    observedAt: "2026-03-29T12:00:00Z",
    provider,
    providerEventId: `evt_${id}`,
    providerMessageId: `re_${id}`,
    deliveryAttemptId: `rsp_${id}`,
    source: "provider_webhook",
    rawEventType: `email.${status}`,
  };
}

function mailboxReceipt(
  id: string,
  status: "accepted" | "delivered" | "bounced" | "failed",
): IntakeMailboxReceiptRecord {
  return {
    status,
    observedAt: "2026-03-29T12:30:00Z",
    deliveryAttemptId: `rsp_${id}`,
    providerMessageId: `re_${id}`,
    receiptId: `rcpt_${id}`,
  };
}

function response(id: string, provider = "resend"): IntakeResponseRecord {
  return {
    ...baseResponse,
    deliveryAttemptId: `rsp_${id}`,
    providerMessageId: `re_${id}`,
    provider,
  };
}

async function seedLedgerHistory(id: string): Promise<void> {
  const events = [
    { type: "INTAKE_SUBMITTED", at: "2026-03-29T10:00:00Z", prev: null, next: "submitted" },
    { type: "INTAKE_VERIFICATION_SENT", at: "2026-03-29T10:01:00Z", prev: "submitted", next: "verification_sent" },
    { type: "INTAKE_VERIFIED", at: "2026-03-29T10:02:00Z", prev: "verification_sent", next: "verified" },
    { type: "INTAKE_ADMITTED", at: "2026-03-29T10:03:00Z", prev: "verified", next: "admitted" },
  ] as const;

  for (const evt of events) {
    await appendIntakeEvent({
      event_type: evt.type,
      occurred_at: evt.at,
      channel: "engage",
      intake_id: id,
      issuance_id: `iss_${id}`,
      thread_id: evt.type === "INTAKE_ADMITTED" ? `thr_${id}` : null,
      previous_state: evt.prev,
      next_state: evt.next,
      source: "test",
      payload: evt.type === "INTAKE_SUBMITTED" ? { email: `${id}@test.com` } : undefined,
    });
  }
}

async function addProviderOutcomeEvent(
  id: string,
  status: "accepted" | "delivered" | "bounced" | "failed",
): Promise<void> {
  await appendIntakeEvent({
    event_type: "INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED",
    occurred_at: "2026-03-29T12:00:00Z",
    channel: "engage",
    intake_id: id,
    issuance_id: `iss_${id}`,
    thread_id: `thr_${id}`,
    previous_state: "admitted",
    next_state: "admitted",
    source: "test",
    payload: {
      provider: "resend",
      providerEventId: `evt_${id}`,
      providerMessageId: `re_${id}`,
      deliveryAttemptId: `rsp_${id}`,
      outcome: status,
      source: "provider_webhook",
      rawEventType: `email.${status}`,
    },
  });
}

afterEach(async () => {
  await clearTokenStore();
});

test("all 9 evidence scenarios produce consistent queue, report, resolution, and blocking", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-e2e-"));
  applyTestEnv(baseDir);

  // --- Scenario 1: responded only (state=responded, no downstream) ---
  await saveIntake(makeIntake("s1_responded_only", {
    state: "responded",
    respondedAt: "2026-03-29T11:05:00Z",
    firstResponse: response("s1_responded_only"),
  }));
  await saveIssuance(makeIssuance("s1_responded_only"));
  await seedLedgerHistory("s1_responded_only");
  await appendIntakeEvent({
    event_type: "INTAKE_RESPONDED",
    occurred_at: "2026-03-29T11:05:00Z",
    channel: "engage",
    intake_id: "s1_responded_only",
    issuance_id: "iss_s1_responded_only",
    thread_id: "thr_s1_responded_only",
    previous_state: "admitted",
    next_state: "responded",
    source: "test",
    payload: {
      provider: "resend",
      providerMessageId: "re_s1_responded_only",
      deliveryAttemptId: "rsp_s1_responded_only",
      mailbox: "engage@witnessops.com",
      actor: "admin:test",
      actorAuthSource: "local_bypass",
      subject: "Re: test",
      bodyDigest: "sha256:test",
    },
  });

  // --- Scenario 2: responded + accepted (weak, pending) ---
  await saveIntake(makeIntake("s2_accepted", {
    state: "admitted",
    respondedAt: "2026-03-29T11:05:00Z",
    firstResponse: response("s2_accepted"),
    responseProviderOutcome: providerOutcome("s2_accepted", "accepted"),
  }));
  await saveIssuance(makeIssuance("s2_accepted"));
  await seedLedgerHistory("s2_accepted");
  await addProviderOutcomeEvent("s2_accepted", "accepted");

  // --- Scenario 3: responded + delivered (strong provider, auto-resolved) ---
  await saveIntake(makeIntake("s3_delivered", {
    state: "admitted",
    respondedAt: "2026-03-29T11:05:00Z",
    firstResponse: response("s3_delivered"),
    responseProviderOutcome: providerOutcome("s3_delivered", "delivered"),
  }));
  await saveIssuance(makeIssuance("s3_delivered"));
  await seedLedgerHistory("s3_delivered");
  await addProviderOutcomeEvent("s3_delivered", "delivered");

  // --- Scenario 4: responded + bounced (strong provider, auto-resolved) ---
  await saveIntake(makeIntake("s4_bounced", {
    state: "admitted",
    respondedAt: "2026-03-29T11:05:00Z",
    firstResponse: response("s4_bounced"),
    responseProviderOutcome: providerOutcome("s4_bounced", "bounced"),
  }));
  await saveIssuance(makeIssuance("s4_bounced"));
  await seedLedgerHistory("s4_bounced");
  await addProviderOutcomeEvent("s4_bounced", "bounced");

  // --- Scenario 5: responded + mailbox receipt only (strong mailbox, auto-resolved) ---
  await saveIntake(makeIntake("s5_mailbox_only", {
    state: "admitted",
    respondedAt: "2026-03-29T11:05:00Z",
    firstResponse: response("s5_mailbox_only"),
    responseMailboxReceipt: mailboxReceipt("s5_mailbox_only", "delivered"),
  }));
  await saveIssuance(makeIssuance("s5_mailbox_only"));
  await seedLedgerHistory("s5_mailbox_only");

  // --- Scenario 6: responded + provider delivered + mailbox delivered (corroboration) ---
  await saveIntake(makeIntake("s6_corroboration", {
    state: "admitted",
    respondedAt: "2026-03-29T11:05:00Z",
    firstResponse: response("s6_corroboration"),
    responseProviderOutcome: providerOutcome("s6_corroboration", "delivered"),
    responseMailboxReceipt: mailboxReceipt("s6_corroboration", "delivered"),
  }));
  await saveIssuance(makeIssuance("s6_corroboration"));
  await seedLedgerHistory("s6_corroboration");
  await addProviderOutcomeEvent("s6_corroboration", "delivered");

  // --- Scenario 7: manual reconciliation pending (accepted, no strong evidence) ---
  await saveIntake(makeIntake("s7_reconcile_pending", {
    state: "admitted",
    respondedAt: "2026-03-29T11:05:00Z",
    firstResponse: response("s7_reconcile_pending"),
    responseProviderOutcome: providerOutcome("s7_reconcile_pending", "accepted"),
  }));
  await saveIssuance(makeIssuance("s7_reconcile_pending"));
  await seedLedgerHistory("s7_reconcile_pending");
  await addProviderOutcomeEvent("s7_reconcile_pending", "accepted");

  // --- Scenario 8: reconciliation blocked by strong provider evidence ---
  await saveIntake(makeIntake("s8_blocked_provider", {
    state: "admitted",
    respondedAt: "2026-03-29T11:05:00Z",
    firstResponse: response("s8_blocked_provider"),
    responseProviderOutcome: providerOutcome("s8_blocked_provider", "delivered"),
  }));
  await saveIssuance(makeIssuance("s8_blocked_provider"));
  await seedLedgerHistory("s8_blocked_provider");
  await addProviderOutcomeEvent("s8_blocked_provider", "delivered");

  // --- Scenario 9: reconciliation blocked by strong mailbox receipt ---
  await saveIntake(makeIntake("s9_blocked_mailbox", {
    state: "admitted",
    respondedAt: "2026-03-29T11:05:00Z",
    firstResponse: response("s9_blocked_mailbox"),
    responseMailboxReceipt: mailboxReceipt("s9_blocked_mailbox", "bounced"),
  }));
  await saveIssuance(makeIssuance("s9_blocked_mailbox"));
  await seedLedgerHistory("s9_blocked_mailbox");

  // =====================================================================
  // Build the unified view
  // =====================================================================
  const view = await buildAdmissionQueueView();
  const report = buildReconciliationReportFromView(view);

  function findRow(id: string): AdmissionQueueRow {
    const row = view.rows.find((r) => r.intakeId === id);
    assert.ok(row, `Row ${id} not found in view`);
    return row;
  }

  // =====================================================================
  // Scenario 1: responded only — no ambiguity
  // =====================================================================
  const s1 = findRow("s1_responded_only");
  assert.equal(s1.state, "responded");
  assert.equal(s1.reconciliationPending, false);
  assert.equal(s1.reconciliationResolved, false);
  assert.equal(s1.ambiguityResolutionKind, null);

  // Verify shared resolver agrees
  const s1r = resolveAmbiguity({
    hasFirstResponse: true,
    derivedState: "responded",
    hasManualReconciliation: false,
    providerOutcomeStatus: null,
    providerOutcomeObservedAt: null,
    mailboxReceiptStatus: null,
    mailboxReceiptObservedAt: null,
    reconciliationReconciledAt: null,
    hasEvidenceSubcase: false,
  });
  assert.equal(s1r.kind, null, "responded state has no ambiguity");
  assert.equal(s1r.pending, false);
  assert.equal(s1r.resolved, false);

  // =====================================================================
  // Scenario 2: responded + accepted — pending
  // =====================================================================
  const s2 = findRow("s2_accepted");
  assert.equal(s2.reconciliationPending, true, "accepted stays pending");
  assert.equal(s2.reconciliationResolved, false);
  assert.equal(s2.ambiguityResolutionKind, null);
  assert.equal(s2.responseProviderOutcomeStatus, "accepted");

  // Blocking: not blocked (only accepted)
  const s2block = isManualReconciliationBlocked({
    providerOutcomeStatus: s2.responseProviderOutcomeStatus,
    mailboxReceiptStatus: s2.mailboxReceiptStatus,
  });
  assert.equal(s2block.blocked, false, "accepted does not block reconciliation");

  // =====================================================================
  // Scenario 3: responded + delivered — auto-resolved by provider
  // =====================================================================
  const s3 = findRow("s3_delivered");
  assert.equal(s3.reconciliationPending, false);
  assert.equal(s3.reconciliationResolved, true);
  assert.equal(s3.ambiguityResolutionKind, "provider_outcome");
  assert.equal(s3.ambiguityResolvedAt, "2026-03-29T12:00:00Z");

  // Blocking: blocked
  const s3block = isManualReconciliationBlocked({
    providerOutcomeStatus: s3.responseProviderOutcomeStatus,
    mailboxReceiptStatus: s3.mailboxReceiptStatus,
  });
  assert.equal(s3block.blocked, true, "delivered blocks reconciliation");

  // =====================================================================
  // Scenario 4: responded + bounced — auto-resolved by provider
  // =====================================================================
  const s4 = findRow("s4_bounced");
  assert.equal(s4.reconciliationPending, false);
  assert.equal(s4.reconciliationResolved, true);
  assert.equal(s4.ambiguityResolutionKind, "provider_outcome");

  // =====================================================================
  // Scenario 5: responded + mailbox receipt only — auto-resolved by mailbox
  // =====================================================================
  const s5 = findRow("s5_mailbox_only");
  assert.equal(s5.reconciliationPending, false);
  assert.equal(s5.reconciliationResolved, true);
  assert.equal(s5.ambiguityResolutionKind, "mailbox_receipt");
  assert.equal(s5.mailboxReceiptStatus, "delivered");
  assert.equal(s5.responseProviderOutcomeStatus, null, "no provider outcome");

  // =====================================================================
  // Scenario 6: corroboration — provider takes precedence over mailbox
  // =====================================================================
  const s6 = findRow("s6_corroboration");
  assert.equal(s6.reconciliationResolved, true);
  assert.equal(
    s6.ambiguityResolutionKind,
    "provider_outcome",
    "provider takes precedence over mailbox",
  );
  assert.equal(s6.mailboxReceiptStatus, "delivered", "mailbox receipt still present");
  assert.equal(s6.responseProviderOutcomeStatus, "delivered");

  // =====================================================================
  // Scenario 7: reconciliation pending — accepted, reconcilable
  // =====================================================================
  const s7 = findRow("s7_reconcile_pending");
  assert.equal(s7.reconciliationPending, true);
  assert.equal(s7.reconciliationResolved, false);

  const s7block = isManualReconciliationBlocked({
    providerOutcomeStatus: s7.responseProviderOutcomeStatus,
    mailboxReceiptStatus: s7.mailboxReceiptStatus,
  });
  assert.equal(s7block.blocked, false, "accepted allows manual reconciliation");

  // =====================================================================
  // Scenario 8: reconciliation blocked by strong provider
  // =====================================================================
  const s8 = findRow("s8_blocked_provider");
  assert.equal(s8.reconciliationResolved, true);
  assert.equal(s8.ambiguityResolutionKind, "provider_outcome");

  const s8block = isManualReconciliationBlocked({
    providerOutcomeStatus: s8.responseProviderOutcomeStatus,
    mailboxReceiptStatus: s8.mailboxReceiptStatus,
  });
  assert.equal(s8block.blocked, true);
  assert.match(s8block.reason!, /provider evidence/i);

  // =====================================================================
  // Scenario 9: reconciliation blocked by strong mailbox receipt
  // =====================================================================
  const s9 = findRow("s9_blocked_mailbox");
  assert.equal(s9.reconciliationResolved, true);
  assert.equal(s9.ambiguityResolutionKind, "mailbox_receipt");

  const s9block = isManualReconciliationBlocked({
    providerOutcomeStatus: s9.responseProviderOutcomeStatus,
    mailboxReceiptStatus: s9.mailboxReceiptStatus,
  });
  assert.equal(s9block.blocked, true);
  assert.match(s9block.reason!, /mailbox receipt/i);

  // =====================================================================
  // Report consistency
  // =====================================================================

  // Pending: s2 (accepted) + s7 (accepted, reconcilable)
  // Resolved: s3 (delivered) + s4 (bounced) + s5 (mailbox) + s6 (corroboration)
  //         + s8 (blocked provider) + s9 (blocked mailbox)
  // Not in ambiguity: s1 (responded state)
  assert.equal(report.pendingTotal, 2, "2 pending: s2 + s7");
  assert.equal(report.resolvedTotal, 6, "6 resolved: s3 + s4 + s5 + s6 + s8 + s9");

  // byClosureSource consistency
  const closureByProvider = report.byClosureSource.find(
    (c) => c.source === "provider_outcome",
  );
  const closureByMailbox = report.byClosureSource.find(
    (c) => c.source === "mailbox_receipt",
  );
  const closureByManual = report.byClosureSource.find(
    (c) => c.source === "manual_reconciliation",
  );
  assert.equal(closureByProvider?.total, 4, "4 closed by provider: s3 + s4 + s6 + s8");
  assert.equal(closureByMailbox?.total, 2, "2 closed by mailbox: s5 + s9");
  assert.equal(closureByManual?.total, 0, "0 manually reconciled");

  // Verify resolved rows have consistent resolutionKind
  for (const row of report.resolvedRows) {
    assert.ok(
      row.resolutionKind !== null,
      `resolved row ${row.intakeId} must have a resolutionKind`,
    );
  }
  for (const row of report.pendingRows) {
    assert.equal(
      row.resolutionKind,
      null,
      `pending row ${row.intakeId} must have null resolutionKind`,
    );
  }

  // byProvider: all used "resend" as provider
  const resendProvider = report.byProvider.find((p) => p.provider === "resend");
  assert.ok(resendProvider, "resend provider should appear");
  assert.equal(
    resendProvider.total,
    report.pendingTotal + report.resolvedTotal,
    "all rows used resend provider",
  );
});
