export const intakeResponseProviderOutcomeStatuses = [
  "accepted",
  "delivered",
  "bounced",
  "failed",
] as const;

export type IntakeResponseProviderOutcomeStatus =
  (typeof intakeResponseProviderOutcomeStatuses)[number];

export const strongIntakeResponseProviderOutcomeStatuses = [
  "delivered",
  "bounced",
  "failed",
] as const;

export const intakeResponseProviderOutcomeSources = [
  "provider_webhook",
  "mailbox_receipt",
] as const;

export type IntakeResponseProviderOutcomeSource =
  (typeof intakeResponseProviderOutcomeSources)[number];

const outcomeLabels: Record<IntakeResponseProviderOutcomeStatus, string> = {
  accepted: "accepted downstream",
  delivered: "delivery confirmed downstream",
  bounced: "bounce recorded downstream",
  failed: "delivery failure recorded downstream",
};

export function formatProviderOutcomeStatusLabel(
  status: IntakeResponseProviderOutcomeStatus,
): string {
  return outcomeLabels[status];
}

export function parseProviderOutcomeStatus(
  value: string | null | undefined,
): IntakeResponseProviderOutcomeStatus | null {
  return value === "accepted" ||
    value === "delivered" ||
    value === "bounced" ||
    value === "failed"
    ? value
    : null;
}

export function parseProviderOutcomeSource(
  value: string | null | undefined,
): IntakeResponseProviderOutcomeSource | null {
  return value === "provider_webhook" || value === "mailbox_receipt"
    ? value
    : null;
}

export function isStrongProviderOutcomeStatus(
  status: IntakeResponseProviderOutcomeStatus | null | undefined,
): boolean {
  return status === "delivered" || status === "bounced" || status === "failed";
}
