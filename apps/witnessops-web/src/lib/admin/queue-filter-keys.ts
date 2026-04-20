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
  queueMyWork: "queue_my_work",
  queueUnassigned: "queue_unassigned",
  queuePendingReview: "queue_pending_review",
  queueClarification: "queue_clarification",
  queueScopeDrafting: "queue_scope_drafting",
  queueScopeApproved: "queue_scope_approved",
  queueResponded: "queue_responded",
  ready: "ready",
  divergent: "divergent",
  customerAccepted: "customer_accepted",
  customerRejected: "customer_rejected",
} as const;

export type QueueFilterKey = (typeof QUEUE_FILTER_KEYS)[keyof typeof QUEUE_FILTER_KEYS];
