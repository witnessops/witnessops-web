export const REVIEW_QUEUE_STAGES = ["new", "triage", "needs_customer_information", "fit_review", "fit_confirmed", "approved_for_proof_run", "scheduled", "converted_to_proof_run", "declined", "closed"] as const;

export interface ReviewQueueItem {
  id: string; requestText: string; customerName: string; customerEmail: string;
  state: string; nextAction: string; timing: string;
}

export function filterReviewQueue(items: ReviewQueueItem[], query: string, stage: string): ReviewQueueItem[] {
  const needle = query.trim().toLocaleLowerCase("en");
  return items.filter((item) =>
    (stage === "all" || (stage === "open" ? !["closed", "declined"].includes(item.state) : item.state === stage)) &&
    (!needle || [item.id, item.requestText, item.customerName, item.customerEmail, item.nextAction].some((value) => value.toLocaleLowerCase("en").includes(needle))),
  );
}
