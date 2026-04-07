/**
 * Post-approval lifecycle aggregator (WEB-001).
 *
 * Builds a discriminated view of the downstream lifecycle for a single
 * issuance by combining LOCAL handoff metadata (from token-store) with
 * AUTHORITATIVE downstream truth (from control-plane). The two are
 * deliberately kept in separate fields on the returned view so that
 * renderers can show users which facts came from where.
 *
 * Web is read-only here. Nothing in this module mutates control-plane
 * state — delivered / acknowledged / completed remain control-plane
 * authority (CP-001 / CP-002).
 */

import {
  type ControlPlaneCompletionView,
  type ControlPlaneRunState,
  getCompletionView,
} from "./control-plane-client";
import type { TokenIssuanceRecord } from "./token-store";

/**
 * The user-facing lifecycle stages, in order. These are the only stages
 * the assessment and admin surfaces are required to distinguish under
 * WEB-001's acceptance criteria.
 */
export type PostApprovalStage =
  | "awaiting_approval"
  | "handoff_pending"
  | "handoff_accepted"
  | "delivery_pending"
  | "delivered"
  | "acknowledged"
  | "completed"
  | "failed";

export interface PostApprovalLocalHandoff {
  /** Whether the local issuance has been operator-approved. */
  approved: boolean;
  /** ISO timestamp of local approval, if recorded. */
  approvedAt: string | null;
  /**
   * Local cache of the control-plane run id returned by the handoff ack.
   * Display only — not the source of truth for downstream state.
   */
  controlPlaneRunId: string | null;
}

export interface PostApprovalAuthoritative {
  /** Source of these facts. */
  source: "control_plane";
  /** Raw upstream lifecycle state, untranslated. */
  controlPlaneState: ControlPlaneRunState;
  delivered: boolean;
  acknowledged: boolean;
  completed: boolean;
  delivery: ControlPlaneCompletionView["delivery"];
  completion: ControlPlaneCompletionView["completion"];
}

export type PostApprovalLifecycleView =
  | {
      stage: "awaiting_approval";
      local: PostApprovalLocalHandoff;
      authoritative: null;
      failureReason: null;
    }
  | {
      stage: "handoff_pending";
      local: PostApprovalLocalHandoff;
      authoritative: null;
      failureReason: null;
    }
  | {
      stage:
        | "handoff_accepted"
        | "delivery_pending"
        | "delivered"
        | "acknowledged"
        | "completed";
      local: PostApprovalLocalHandoff;
      authoritative: PostApprovalAuthoritative;
      failureReason: null;
    }
  | {
      stage: "failed";
      local: PostApprovalLocalHandoff;
      authoritative: PostApprovalAuthoritative | null;
      /** Human-readable reason; rendered verbatim. */
      failureReason: string;
    };

function buildLocal(record: TokenIssuanceRecord): PostApprovalLocalHandoff {
  return {
    approved: record.approvalStatus === "approved",
    approvedAt: record.approvalAt ?? null,
    controlPlaneRunId: record.controlPlaneRunId ?? null,
  };
}

/**
 * Translate raw control-plane state into a user-facing stage.
 *
 * Mapping (post-approval only):
 *  - requested / authorized / scope_locked / token_issued / collecting
 *    / deriving / decision_recorded / coverage_recorded
 *      → handoff_accepted (the run is on its way to bundled)
 *  - bundled → delivery_pending (bundle exists, no delivery record yet)
 *  - delivered → delivered
 *  - acknowledged → acknowledged
 *  - completed → completed
 *  - revoked / failed → failed
 */
export function stageFromControlPlane(
  view: ControlPlaneCompletionView,
): Exclude<PostApprovalStage, "awaiting_approval" | "handoff_pending"> {
  if (view.state === "revoked" || view.state === "failed") {
    return "failed";
  }
  if (view.completed) return "completed";
  if (view.acknowledged) return "acknowledged";
  if (view.delivered) return "delivered";
  if (view.state === "bundled") return "delivery_pending";
  return "handoff_accepted";
}

/**
 * Build the post-approval lifecycle view for a single issuance.
 *
 * Pure function over (record, fetcher) so it can be unit-tested without
 * a real control-plane.
 */
export async function buildPostApprovalLifecycle(
  record: TokenIssuanceRecord,
  fetcher: (
    runId: string,
  ) => Promise<ControlPlaneCompletionView | "not_configured" | "not_found"> = getCompletionView,
): Promise<PostApprovalLifecycleView> {
  const local = buildLocal(record);

  if (!local.approved) {
    return {
      stage: "awaiting_approval",
      local,
      authoritative: null,
      failureReason: null,
    };
  }

  if (!local.controlPlaneRunId) {
    return {
      stage: "handoff_pending",
      local,
      authoritative: null,
      failureReason: null,
    };
  }

  let upstream: ControlPlaneCompletionView | "not_configured" | "not_found";
  try {
    upstream = await fetcher(local.controlPlaneRunId);
  } catch (error) {
    return {
      stage: "failed",
      local,
      authoritative: null,
      failureReason:
        error instanceof Error
          ? `Control plane unreachable: ${error.message}`
          : "Control plane unreachable",
    };
  }

  if (upstream === "not_configured") {
    return {
      stage: "failed",
      local,
      authoritative: null,
      failureReason:
        "Control plane is not configured for this deployment. Local handoff was recorded but downstream lifecycle cannot be displayed.",
    };
  }

  if (upstream === "not_found") {
    return {
      stage: "failed",
      local,
      authoritative: null,
      failureReason: `Control plane has no run ${local.controlPlaneRunId}. The handoff may not have persisted.`,
    };
  }

  const authoritative: PostApprovalAuthoritative = {
    source: "control_plane",
    controlPlaneState: upstream.state,
    delivered: upstream.delivered,
    acknowledged: upstream.acknowledged,
    completed: upstream.completed,
    delivery: upstream.delivery,
    completion: upstream.completion,
  };

  const stage = stageFromControlPlane(upstream);
  if (stage === "failed") {
    return {
      stage: "failed",
      local,
      authoritative,
      failureReason: `Run is in terminal non-success state: ${upstream.state}`,
    };
  }

  return {
    stage,
    local,
    authoritative,
    failureReason: null,
  };
}
