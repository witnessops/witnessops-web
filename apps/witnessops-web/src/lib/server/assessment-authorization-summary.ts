import type { PostApprovalLifecycleView } from "./post-approval-lifecycle";

export interface AssessmentAuthorizationSummary {
  messageLead: string;
  detail: string;
}

export function getAssessmentAuthorizationSummary(
  view: PostApprovalLifecycleView | null,
): AssessmentAuthorizationSummary {
  switch (view?.stage) {
    case "authorization_pending":
      return {
        messageLead: "Passive-only recon awaiting start for",
        detail: "Control plane has accepted the handoff, but an operator must still authorize/start this run.",
      };
    case "authorized":
    case "delivery_pending":
    case "delivered":
    case "acknowledged":
    case "accepted":
    case "rejected":
    case "completed":
    case "retry_pending":
    case "failed":
      return {
        messageLead: "Passive-only recon authorized for",
        detail: "Execution has been authorized by control plane.",
      };
    case "handoff_pending":
    default:
      return {
        messageLead: "Passive-only recon pending handoff for",
        detail: "Scope approval is recorded, but control-plane handoff is not yet complete.",
      };
  }
}
