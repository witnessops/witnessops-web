import { QUEUE_FILTER_KEYS } from "@/lib/admin/queue-filter-keys";

export type AdminWizState =
  | "idle"
  | "listening"
  | "thinking"
  | "recommending"
  | "boundary";

export interface AdminWizBriefInput {
  total: number;
  ready: number;
  reconciliationPending: number;
  divergent: number;
}

export interface AdminWizBriefModel {
  state: AdminWizState;
  headline: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
}

function plural(value: number, singular: string, pluralForm = `${singular}s`) {
  return value === 1 ? singular : pluralForm;
}

export function buildAdminWizBrief(input: AdminWizBriefInput): AdminWizBriefModel {
  if (input.divergent > 0) {
    return {
      state: "boundary",
      headline: `${input.divergent} divergent ${plural(input.divergent, "item")} need operator review.`,
      detail: "Wiz will not infer a resolution from conflicting evidence. Review the divergence before advancing the work.",
      actionLabel: "Review divergence",
      actionHref: `/admin/queue?filter=${QUEUE_FILTER_KEYS.divergent}`,
    };
  }

  if (input.reconciliationPending > 0) {
    return {
      state: "thinking",
      headline: `${input.reconciliationPending} ${plural(input.reconciliationPending, "reconciliation")} pending.`,
      detail: "Unresolved evidence is waiting for an operator decision. Wiz recommends checking the pending queue next.",
      actionLabel: "Review pending",
      actionHref: `/admin/queue?filter=${QUEUE_FILTER_KEYS.pending}`,
    };
  }

  if (input.ready > 0) {
    return {
      state: "recommending",
      headline: `${input.ready} ${plural(input.ready, "request")} ready for your decision.`,
      detail: "The current admission summary shows work ready for review. Wiz recommends starting there.",
      actionLabel: "Review ready",
      actionHref: `/admin/queue?filter=${QUEUE_FILTER_KEYS.ready}`,
    };
  }

  if (input.total === 0) {
    return {
      state: "listening",
      headline: "The queue is clear. Wiz is ready to listen.",
      detail: "No intakes are present in the current admission summary. Nothing is being executed automatically.",
      actionLabel: "Open queue",
      actionHref: "/admin/queue",
    };
  }

  return {
    state: "idle",
    headline: "No immediate queue exception is visible.",
    detail: "The current admission summary does not show divergent, pending, or ready work requiring an immediate decision.",
    actionLabel: "Open queue",
    actionHref: "/admin/queue",
  };
}
