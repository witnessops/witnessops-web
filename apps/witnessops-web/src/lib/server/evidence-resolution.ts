/**
 * Canonical evidence resolution precedence for ambiguity closure.
 *
 * This is the single source of truth for how ambiguity resolves across:
 *   - admission queue projection
 *   - reconciliation eligibility checks
 *   - reconciliation report generation
 *
 * Resolution hierarchy (highest precedence first):
 *   1. Manual reconciliation — operator judgment, if recorded
 *   2. Strong provider outcome — delivered / bounced / failed from provider webhook
 *   3. Strong mailbox receipt — delivered / bounced / failed from mailbox evidence
 *   4. Pending — no resolution; accepted-only or missing evidence
 *
 * Manual reconciliation is blocked when strong provider or mailbox evidence
 * already closes the case.
 */

import {
  isStrongProviderOutcomeStatus,
  type IntakeResponseProviderOutcomeStatus,
} from "@/lib/provider-outcomes";

// ---------------------------------------------------------------------------
// Mailbox receipt strength classification
// ---------------------------------------------------------------------------

export type MailboxReceiptStrength = "strong" | "weak" | "insufficient";

/**
 * Classify mailbox receipt strength.
 *
 * - `strong`: delivered, bounced, or failed — closes ambiguity.
 * - `weak`: accepted — only establishes initial acceptance, does not close.
 * - `insufficient`: null/missing — no usable mailbox evidence.
 */
export function classifyMailboxReceiptStrength(
  status: IntakeResponseProviderOutcomeStatus | null | undefined,
): MailboxReceiptStrength {
  if (!status) {
    return "insufficient";
  }

  return isStrongProviderOutcomeStatus(status) ? "strong" : "weak";
}

export function isStrongMailboxReceipt(
  status: IntakeResponseProviderOutcomeStatus | null | undefined,
): boolean {
  return classifyMailboxReceiptStrength(status) === "strong";
}

// ---------------------------------------------------------------------------
// Ambiguity resolution
// ---------------------------------------------------------------------------

export type AmbiguityResolutionKind =
  | "manual_reconciliation"
  | "provider_outcome"
  | "mailbox_receipt";

export interface AmbiguityResolutionInput {
  /** True when the intake has a first-response delivery record. */
  hasFirstResponse: boolean;
  /** Current derived admission state. */
  derivedState: string;
  /** True when a manual reconciliation record exists on the snapshot. */
  hasManualReconciliation: boolean;
  /** Authoritative provider outcome status from the ledger or snapshot. */
  providerOutcomeStatus: IntakeResponseProviderOutcomeStatus | null;
  /** Authoritative provider outcome observedAt timestamp. */
  providerOutcomeObservedAt: string | null;
  /** Mailbox receipt status from the snapshot. */
  mailboxReceiptStatus: IntakeResponseProviderOutcomeStatus | null;
  /** Mailbox receipt observedAt timestamp. */
  mailboxReceiptObservedAt: string | null;
  /** Manual reconciliation reconciledAt timestamp (when reconciliation exists). */
  reconciliationReconciledAt: string | null;
  /** Whether a delivery evidence subcase could be classified (i.e. evidence exists). */
  hasEvidenceSubcase: boolean;
}

export interface AmbiguityResolution {
  kind: AmbiguityResolutionKind | null;
  resolvedAt: string | null;
  pending: boolean;
  resolved: boolean;
}

/**
 * Resolve ambiguity for a single intake row.
 *
 * Returns null kind + pending=false if the intake doesn't have a
 * first-response or is already in "responded" state (no ambiguity).
 */
export function resolveAmbiguity(
  input: AmbiguityResolutionInput,
): AmbiguityResolution {
  const inAmbiguity =
    input.hasFirstResponse && input.derivedState !== "responded";

  if (!inAmbiguity) {
    return { kind: null, resolvedAt: null, pending: false, resolved: false };
  }

  // 1. Manual reconciliation — takes precedence when recorded
  if (input.hasManualReconciliation) {
    return {
      kind: "manual_reconciliation",
      resolvedAt: input.reconciliationReconciledAt,
      pending: false,
      resolved: true,
    };
  }

  // 2. Strong provider outcome
  if (
    input.hasEvidenceSubcase &&
    isStrongProviderOutcomeStatus(input.providerOutcomeStatus)
  ) {
    return {
      kind: "provider_outcome",
      resolvedAt: input.providerOutcomeObservedAt,
      pending: false,
      resolved: true,
    };
  }

  // 3. Strong mailbox receipt (only when provider outcome does not resolve)
  if (input.hasEvidenceSubcase && isStrongMailboxReceipt(input.mailboxReceiptStatus)) {
    return {
      kind: "mailbox_receipt",
      resolvedAt: input.mailboxReceiptObservedAt,
      pending: false,
      resolved: true,
    };
  }

  // 4. Pending — no resolution
  return { kind: null, resolvedAt: null, pending: true, resolved: false };
}

/**
 * Check whether manual reconciliation should be blocked because
 * strong evidence already closes the case.
 */
export function isManualReconciliationBlocked(input: {
  providerOutcomeStatus: IntakeResponseProviderOutcomeStatus | null;
  mailboxReceiptStatus: IntakeResponseProviderOutcomeStatus | null;
}): { blocked: boolean; reason: string | null } {
  if (isStrongProviderOutcomeStatus(input.providerOutcomeStatus)) {
    return {
      blocked: true,
      reason:
        "Strong downstream provider evidence already closes this ambiguity. Rebuild the queue instead of recording manual reconciliation.",
    };
  }

  if (isStrongMailboxReceipt(input.mailboxReceiptStatus)) {
    return {
      blocked: true,
      reason:
        "Strong mailbox receipt evidence already closes this ambiguity. Manual reconciliation is not needed.",
    };
  }

  return { blocked: false, reason: null };
}
