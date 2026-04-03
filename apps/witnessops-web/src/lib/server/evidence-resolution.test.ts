import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyMailboxReceiptStrength,
  isStrongMailboxReceipt,
  resolveAmbiguity,
  isManualReconciliationBlocked,
  type AmbiguityResolutionInput,
} from "./evidence-resolution";

// ---------------------------------------------------------------------------
// Mailbox receipt strength classification
// ---------------------------------------------------------------------------

test("classifyMailboxReceiptStrength returns strong for delivered, bounced, failed", () => {
  assert.equal(classifyMailboxReceiptStrength("delivered"), "strong");
  assert.equal(classifyMailboxReceiptStrength("bounced"), "strong");
  assert.equal(classifyMailboxReceiptStrength("failed"), "strong");
});

test("classifyMailboxReceiptStrength returns weak for accepted", () => {
  assert.equal(classifyMailboxReceiptStrength("accepted"), "weak");
});

test("classifyMailboxReceiptStrength returns insufficient for null or undefined", () => {
  assert.equal(classifyMailboxReceiptStrength(null), "insufficient");
  assert.equal(classifyMailboxReceiptStrength(undefined), "insufficient");
});

test("isStrongMailboxReceipt is true only for strong statuses", () => {
  assert.equal(isStrongMailboxReceipt("delivered"), true);
  assert.equal(isStrongMailboxReceipt("bounced"), true);
  assert.equal(isStrongMailboxReceipt("failed"), true);
  assert.equal(isStrongMailboxReceipt("accepted"), false);
  assert.equal(isStrongMailboxReceipt(null), false);
});

// ---------------------------------------------------------------------------
// Ambiguity resolution precedence
// ---------------------------------------------------------------------------

function baseInput(
  overrides?: Partial<AmbiguityResolutionInput>,
): AmbiguityResolutionInput {
  return {
    hasFirstResponse: true,
    derivedState: "admitted",
    hasManualReconciliation: false,
    providerOutcomeStatus: null,
    providerOutcomeObservedAt: null,
    mailboxReceiptStatus: null,
    mailboxReceiptObservedAt: null,
    reconciliationReconciledAt: null,
    hasEvidenceSubcase: true,
    ...overrides,
  };
}

test("no ambiguity when there is no first response", () => {
  const result = resolveAmbiguity(baseInput({ hasFirstResponse: false }));
  assert.equal(result.kind, null);
  assert.equal(result.pending, false);
  assert.equal(result.resolved, false);
});

test("no ambiguity when state is responded", () => {
  const result = resolveAmbiguity(baseInput({ derivedState: "responded" }));
  assert.equal(result.kind, null);
  assert.equal(result.pending, false);
  assert.equal(result.resolved, false);
});

test("pending when no resolution evidence exists", () => {
  const result = resolveAmbiguity(baseInput());
  assert.equal(result.kind, null);
  assert.equal(result.pending, true);
  assert.equal(result.resolved, false);
});

test("accepted provider outcome stays pending", () => {
  const result = resolveAmbiguity(
    baseInput({ providerOutcomeStatus: "accepted" }),
  );
  assert.equal(result.kind, null);
  assert.equal(result.pending, true);
  assert.equal(result.resolved, false);
});

test("strong provider outcome closes ambiguity", () => {
  const result = resolveAmbiguity(
    baseInput({
      providerOutcomeStatus: "delivered",
      providerOutcomeObservedAt: "2026-03-29T12:00:00Z",
    }),
  );
  assert.equal(result.kind, "provider_outcome");
  assert.equal(result.resolvedAt, "2026-03-29T12:00:00Z");
  assert.equal(result.resolved, true);
  assert.equal(result.pending, false);
});

test("provider outcome closes before mailbox receipt is considered", () => {
  const result = resolveAmbiguity(
    baseInput({
      providerOutcomeStatus: "delivered",
      providerOutcomeObservedAt: "2026-03-29T12:00:00Z",
      mailboxReceiptStatus: "delivered",
      mailboxReceiptObservedAt: "2026-03-29T12:01:00Z",
    }),
  );
  assert.equal(result.kind, "provider_outcome");
  assert.equal(result.resolvedAt, "2026-03-29T12:00:00Z");
});

test("mailbox receipt closes ambiguity only when provider outcome does not resolve", () => {
  const result = resolveAmbiguity(
    baseInput({
      providerOutcomeStatus: "accepted",
      mailboxReceiptStatus: "delivered",
      mailboxReceiptObservedAt: "2026-03-29T13:00:00Z",
    }),
  );
  assert.equal(result.kind, "mailbox_receipt");
  assert.equal(result.resolvedAt, "2026-03-29T13:00:00Z");
  assert.equal(result.resolved, true);
});

test("weak mailbox receipt does not close ambiguity", () => {
  const result = resolveAmbiguity(
    baseInput({ mailboxReceiptStatus: "accepted" }),
  );
  assert.equal(result.kind, null);
  assert.equal(result.pending, true);
});

test("manual reconciliation takes precedence over provider outcome", () => {
  const result = resolveAmbiguity(
    baseInput({
      hasManualReconciliation: true,
      reconciliationReconciledAt: "2026-03-29T15:00:00Z",
      providerOutcomeStatus: "delivered",
      providerOutcomeObservedAt: "2026-03-29T12:00:00Z",
    }),
  );
  assert.equal(result.kind, "manual_reconciliation");
  assert.equal(result.resolvedAt, "2026-03-29T15:00:00Z");
});

test("manual reconciliation takes precedence over mailbox receipt", () => {
  const result = resolveAmbiguity(
    baseInput({
      hasManualReconciliation: true,
      reconciliationReconciledAt: "2026-03-29T15:00:00Z",
      mailboxReceiptStatus: "delivered",
      mailboxReceiptObservedAt: "2026-03-29T13:00:00Z",
    }),
  );
  assert.equal(result.kind, "manual_reconciliation");
  assert.equal(result.resolvedAt, "2026-03-29T15:00:00Z");
});

// ---------------------------------------------------------------------------
// Manual reconciliation blocking
// ---------------------------------------------------------------------------

test("manual reconciliation is blocked when provider outcome is strong", () => {
  const block = isManualReconciliationBlocked({
    providerOutcomeStatus: "delivered",
    mailboxReceiptStatus: null,
  });
  assert.equal(block.blocked, true);
  assert.match(block.reason!, /provider evidence/i);
});

test("manual reconciliation is blocked when mailbox receipt is strong", () => {
  const block = isManualReconciliationBlocked({
    providerOutcomeStatus: null,
    mailboxReceiptStatus: "bounced",
  });
  assert.equal(block.blocked, true);
  assert.match(block.reason!, /mailbox receipt/i);
});

test("manual reconciliation is not blocked when evidence is weak", () => {
  const block = isManualReconciliationBlocked({
    providerOutcomeStatus: "accepted",
    mailboxReceiptStatus: "accepted",
  });
  assert.equal(block.blocked, false);
  assert.equal(block.reason, null);
});

test("manual reconciliation is not blocked when no evidence exists", () => {
  const block = isManualReconciliationBlocked({
    providerOutcomeStatus: null,
    mailboxReceiptStatus: null,
  });
  assert.equal(block.blocked, false);
});

test("bounced provider outcome blocks manual reconciliation", () => {
  const block = isManualReconciliationBlocked({
    providerOutcomeStatus: "bounced",
    mailboxReceiptStatus: null,
  });
  assert.equal(block.blocked, true);
});

test("failed provider outcome blocks manual reconciliation", () => {
  const block = isManualReconciliationBlocked({
    providerOutcomeStatus: "failed",
    mailboxReceiptStatus: null,
  });
  assert.equal(block.blocked, true);
});
