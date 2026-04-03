import {
  isStrongProviderOutcomeStatus,
  type IntakeResponseProviderOutcomeStatus,
} from "@/lib/provider-outcomes";

export const deliveryEvidenceSubcases = [
  "provider_accepted_message_id_present_no_durable_confirmation",
  "provider_accepted_message_id_missing",
  "provider_delivery_evidence_incomplete",
  "local_attempt_recorded_provider_outcome_unknown",
] as const;

export type DeliveryEvidenceSubcase = (typeof deliveryEvidenceSubcases)[number];

export const reconciliationReportSubcases = [
  ...deliveryEvidenceSubcases,
  "reconciled_after_provider_evidence_review",
  "closed_after_strong_provider_outcome",
  "closed_after_strong_mailbox_receipt",
] as const;

export type ReconciliationReportSubcase =
  (typeof reconciliationReportSubcases)[number];

interface ReconciliationEvidenceFingerprint {
  responseProvider: string | null;
  responseProviderMessageId: string | null;
  responseDeliveryAttemptId: string | null;
  responseMailbox: string | null;
  respondedAt: string | null;
  responseProviderOutcomeStatus?: IntakeResponseProviderOutcomeStatus | null;
  reconciliationRecordedAt?: string | null;
  mailboxReceiptStatus?: IntakeResponseProviderOutcomeStatus | null;
}

const subcaseLabels: Record<ReconciliationReportSubcase, string> = {
  provider_accepted_message_id_present_no_durable_confirmation:
    "provider accepted, message ID present, no durable confirmation",
  provider_accepted_message_id_missing: "provider accepted, message ID missing",
  provider_delivery_evidence_incomplete:
    "provider delivery evidence incomplete",
  local_attempt_recorded_provider_outcome_unknown:
    "local attempt recorded, provider outcome unknown",
  reconciled_after_provider_evidence_review:
    "reconciled after provider evidence review",
  closed_after_strong_provider_outcome:
    "ambiguity closed after strong downstream provider outcome",
  closed_after_strong_mailbox_receipt:
    "ambiguity closed after strong mailbox receipt evidence",
};

export function formatReconciliationSubcaseLabel(
  subcase: ReconciliationReportSubcase,
): string {
  return subcaseLabels[subcase];
}

export function classifyDeliveryEvidenceSubcase(
  fingerprint: ReconciliationEvidenceFingerprint,
): DeliveryEvidenceSubcase | null {
  const hasAnyEvidence = Boolean(
    fingerprint.responseProvider ||
    fingerprint.responseProviderMessageId ||
    fingerprint.responseDeliveryAttemptId ||
    fingerprint.responseMailbox ||
    fingerprint.respondedAt,
  );

  if (!hasAnyEvidence) {
    return null;
  }

  if (
    !fingerprint.responseProvider ||
    !fingerprint.responseDeliveryAttemptId ||
    !fingerprint.responseMailbox ||
    !fingerprint.respondedAt
  ) {
    return "provider_delivery_evidence_incomplete";
  }

  if (fingerprint.responseProvider === "file") {
    return "local_attempt_recorded_provider_outcome_unknown";
  }

  if (fingerprint.responseProviderMessageId) {
    return "provider_accepted_message_id_present_no_durable_confirmation";
  }

  return "provider_accepted_message_id_missing";
}

export function deriveReconciliationReportSubcase(
  fingerprint: ReconciliationEvidenceFingerprint,
): ReconciliationReportSubcase | null {
  const evidenceSubcase = classifyDeliveryEvidenceSubcase(fingerprint);
  if (!evidenceSubcase) {
    return null;
  }

  if (fingerprint.reconciliationRecordedAt) {
    return "reconciled_after_provider_evidence_review";
  }

  if (
    isStrongProviderOutcomeStatus(
      fingerprint.responseProviderOutcomeStatus ?? null,
    )
  ) {
    return "closed_after_strong_provider_outcome";
  }

  if (isStrongProviderOutcomeStatus(fingerprint.mailboxReceiptStatus ?? null)) {
    return "closed_after_strong_mailbox_receipt";
  }

  return evidenceSubcase;
}
