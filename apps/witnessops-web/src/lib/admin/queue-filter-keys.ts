/**
 * Canonical queue filter keys.
 *
 * Shared between overview stat-card links, queue filter pills,
 * and report highlight links so they never invent their own strings.
 */
export const QUEUE_FILTER_KEYS = {
  pending: "pending",
  staleAccepted: "stale_accepted",
  awaitingResponse: "awaiting_response",
  evidenceConflict: "evidence_conflict",
  resolvedProvider: "resolved_provider",
  resolvedMailbox: "resolved_mailbox",
  resolvedManual: "resolved_manual",
  ready: "ready",
  divergent: "divergent",
  customerAccepted: "customer_accepted",
  customerRejected: "customer_rejected",
} as const;

export type QueueFilterKey = (typeof QUEUE_FILTER_KEYS)[keyof typeof QUEUE_FILTER_KEYS];
