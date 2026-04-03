/**
 * Auto-resolution policy for ambiguity closure.
 *
 * When strong evidence arrives (provider outcome or mailbox receipt),
 * this module determines whether to emit a durable policy closure fact.
 *
 * Rules:
 *   - strong provider outcome (delivered/bounced/failed) auto-closes
 *   - strong mailbox receipt auto-closes only when provider does not resolve
 *   - accepted stays pending
 *   - conflicting evidence does not auto-close
 *   - manual reconciliation remains only for residual ambiguity
 *
 * Policy closure is a durable ledger fact. It does not fabricate
 * INTAKE_RESPONDED, does not backfill older missing facts, and does not
 * replace manual reconciliation when already recorded.
 */

import { isStrongProviderOutcomeStatus } from "@/lib/provider-outcomes";

import { appendIntakeEvent, readIntakeEvents } from "./intake-event-ledger";
import { isStrongMailboxReceipt } from "./evidence-resolution";
import type { IntakeRecord } from "./token-store";

export const POLICY_VERSION = "auto_resolution_v1";

export type PolicyClosureSource = "provider_outcome" | "mailbox_receipt";

export interface PolicyClosureResult {
  emitted: boolean;
  closureSource: PolicyClosureSource | null;
  reason: string | null;
}

async function hasPriorPolicyClosure(intakeId: string): Promise<boolean> {
  const events = await readIntakeEvents();
  return events.some(
    (event) =>
      event.intake_id === intakeId &&
      event.event_type === "INTAKE_AMBIGUITY_CLOSED_BY_POLICY",
  );
}

function shouldAutoClose(intake: IntakeRecord): {
  close: boolean;
  source: PolicyClosureSource | null;
  reason: string | null;
} {
  if (!intake.firstResponse) {
    return { close: false, source: null, reason: null };
  }

  if (intake.state === "responded") {
    return { close: false, source: null, reason: null };
  }

  if (intake.reconciliation) {
    return {
      close: false,
      source: null,
      reason: "manual reconciliation already recorded",
    };
  }

  const providerStatus = intake.responseProviderOutcome?.status ?? null;
  const mailboxStatus = intake.responseMailboxReceipt?.status ?? null;

  // Conflicting strong evidence: do not auto-close
  if (
    isStrongProviderOutcomeStatus(providerStatus) &&
    isStrongMailboxReceipt(mailboxStatus) &&
    providerStatus !== mailboxStatus
  ) {
    return {
      close: false,
      source: null,
      reason: "conflicting evidence between provider and mailbox receipt",
    };
  }

  if (isStrongProviderOutcomeStatus(providerStatus)) {
    return {
      close: true,
      source: "provider_outcome",
      reason: `strong provider outcome: ${providerStatus}`,
    };
  }

  if (isStrongMailboxReceipt(mailboxStatus)) {
    return {
      close: true,
      source: "mailbox_receipt",
      reason: `strong mailbox receipt: ${mailboxStatus}`,
    };
  }

  return { close: false, source: null, reason: null };
}

/**
 * Evaluate whether auto-resolution policy should close ambiguity for an
 * intake after new evidence arrives. If so, emit a durable policy closure
 * event. Idempotent: will not emit if a prior closure event exists.
 */
export async function evaluatePolicyClosure(
  intake: IntakeRecord,
  triggerSource: string,
): Promise<PolicyClosureResult> {
  const decision = shouldAutoClose(intake);
  if (!decision.close || !decision.source) {
    return { emitted: false, closureSource: null, reason: decision.reason };
  }

  if (await hasPriorPolicyClosure(intake.intakeId)) {
    return {
      emitted: false,
      closureSource: decision.source,
      reason: "policy closure already recorded",
    };
  }

  const closedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  await appendIntakeEvent({
    event_type: "INTAKE_AMBIGUITY_CLOSED_BY_POLICY",
    occurred_at: closedAt,
    channel: intake.channel,
    intake_id: intake.intakeId,
    issuance_id: intake.latestIssuanceId,
    thread_id: intake.threadId,
    previous_state: intake.state,
    next_state: intake.state,
    source: triggerSource,
    payload: {
      policyVersion: POLICY_VERSION,
      closureSource: decision.source,
      reason: decision.reason,
      deliveryAttemptId: intake.firstResponse?.deliveryAttemptId ?? null,
      provider: intake.firstResponse?.provider ?? null,
      providerOutcomeStatus:
        intake.responseProviderOutcome?.status ?? null,
      mailboxReceiptStatus:
        intake.responseMailboxReceipt?.status ?? null,
    },
  });

  return {
    emitted: true,
    closureSource: decision.source,
    reason: decision.reason,
  };
}
