/**
 * Post-approval lifecycle aggregator (WEB-001 / WEB-017).
 *
 * Builds a discriminated view of the downstream lifecycle for a single
 * issuance by combining LOCAL handoff metadata (from token-store) with
 * AUTHORITATIVE downstream truth (from control-plane). The two are
 * deliberately kept in separate fields on the returned view so that
 * renderers can show users which facts came from where.
 *
 * Web is read-only here. Nothing in this module mutates control-plane
 * state — delivered / acknowledged / completed / accepted / rejected
 * remain control-plane authority (CP-001 / CP-002 / CP-003).
 */

import {
  type ControlPlaneCompletionView,
  type ControlPlaneCustomerAcceptanceRecord,
  type ControlPlaneRunState,
  getCompletionView,
  getCustomerAcceptance,
} from "./control-plane-client";
import {
  type DeliveryRetryRequestRecord,
  getLatestDeliveryRetryRequest,
} from "./delivery-retry-ledger";
import type { TokenIssuanceRecord } from "./token-store";

/**
 * The user-facing lifecycle stages, in order. These are the only stages
 * the assessment and admin surfaces are required to distinguish under
 * WEB-001's acceptance criteria. WEB-017 adds `accepted` and `rejected`
 * to reflect customer acceptance disposition from CP-003.
 */
export type PostApprovalStage =
  | "awaiting_approval"
  | "handoff_pending"
  | "handoff_accepted"
  | "delivery_pending"
  | "delivered"
  | "acknowledged"
  | "accepted"
  | "rejected"
  | "completed"
  | "retry_pending"
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
  /**
   * Customer acceptance disposition from CP-003 (WEB-017).
   * Null when no acceptance record exists or the fetch was skipped/failed.
   */
  customerAcceptanceDisposition: "accepted" | "rejected" | null;
  /** ISO timestamp of the customer acceptance event, if disposition is set. */
  customerAcceptanceAt: string | null;
}

/**
 * Local-only retry request snapshot (WEB-002).
 *
 * The presence of this field never implies delivery success. It only
 * records that an operator asked control-plane to be retried. Successful
 * recovery is observed independently from the next control-plane read.
 */
export interface PostApprovalRetryRequest {
  requestedAt: string;
  requestedBy: string;
  reason: string;
  /**
   * True when this request has been outpaced by a successful delivery
   * recorded by control-plane after the request was made. The view's
   * stage will reflect the upstream truth (delivered/acknowledged/...);
   * the request itself is surfaced as historical evidence of recovery.
   */
  recovered: boolean;
}

export type PostApprovalLifecycleView =
  | {
      stage: "awaiting_approval";
      local: PostApprovalLocalHandoff;
      authoritative: null;
      retryRequest: null;
      failureReason: null;
    }
  | {
      stage: "handoff_pending";
      local: PostApprovalLocalHandoff;
      authoritative: null;
      retryRequest: null;
      failureReason: null;
    }
  | {
      stage:
        | "handoff_accepted"
        | "delivery_pending"
        | "delivered"
        | "acknowledged"
        | "accepted"
        | "rejected"
        | "completed";
      local: PostApprovalLocalHandoff;
      authoritative: PostApprovalAuthoritative;
      retryRequest: PostApprovalRetryRequest | null;
      failureReason: null;
    }
  | {
      stage: "retry_pending";
      local: PostApprovalLocalHandoff;
      authoritative: PostApprovalAuthoritative | null;
      retryRequest: PostApprovalRetryRequest;
      failureReason: string | null;
    }
  | {
      stage: "failed";
      local: PostApprovalLocalHandoff;
      authoritative: PostApprovalAuthoritative | null;
      retryRequest: PostApprovalRetryRequest | null;
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
): Exclude<PostApprovalStage, "awaiting_approval" | "handoff_pending" | "retry_pending"> {
  if (view.state === "revoked" || view.state === "failed") {
    return "failed";
  }
  // Customer acceptance takes precedence over acknowledged — these are
  // terminal states from CP-003 that follow acknowledged.
  if (view.state === "accepted") return "accepted";
  if (view.state === "rejected") return "rejected";
  if (view.completed) return "completed";
  if (view.acknowledged) return "acknowledged";
  if (view.delivered) return "delivered";
  if (view.state === "bundled") return "delivery_pending";
  return "handoff_accepted";
}

export interface BuildLifecycleDeps {
  fetchUpstream?: (
    runId: string,
  ) => Promise<ControlPlaneCompletionView | "not_configured" | "not_found">;
  fetchLatestRetry?: (runId: string) => Promise<DeliveryRetryRequestRecord | null>;
  /**
   * Optional override for fetching customer acceptance (WEB-017).
   * Defaults to `getCustomerAcceptance`. Absence or failure is silent —
   * the fields land as null rather than propagating errors.
   */
  fetchAcceptance?: (
    runId: string,
  ) => Promise<
    ControlPlaneCustomerAcceptanceRecord | "not_configured" | "not_found"
  >;
}

/**
 * Build the post-approval lifecycle view for a single issuance.
 *
 * Pure function over (record, deps) so it can be unit-tested without
 * a real control-plane or filesystem.
 */
export async function buildPostApprovalLifecycle(
  record: TokenIssuanceRecord,
  deps: BuildLifecycleDeps = {},
): Promise<PostApprovalLifecycleView> {
  const fetchUpstream = deps.fetchUpstream ?? getCompletionView;
  const fetchLatestRetry = deps.fetchLatestRetry ?? getLatestDeliveryRetryRequest;
  const fetchAcceptance = deps.fetchAcceptance ?? getCustomerAcceptance;

  const local = buildLocal(record);

  if (!local.approved) {
    return {
      stage: "awaiting_approval",
      local,
      authoritative: null,
      retryRequest: null,
      failureReason: null,
    };
  }

  if (!local.controlPlaneRunId) {
    return {
      stage: "handoff_pending",
      local,
      authoritative: null,
      retryRequest: null,
      failureReason: null,
    };
  }

  // Read the local retry ledger, the upstream lifecycle, and the
  // customer acceptance record in parallel.
  const [upstreamSettled, retrySettled, acceptanceSettled] =
    await Promise.allSettled([
      fetchUpstream(local.controlPlaneRunId),
      fetchLatestRetry(local.controlPlaneRunId),
      fetchAcceptance(local.controlPlaneRunId),
    ]);

  const latestRetry =
    retrySettled.status === "fulfilled" ? retrySettled.value : null;

  // Acceptance is read gracefully — not_found, not_configured, or a
  // fetch failure all result in null. Never blocks the lifecycle view.
  const acceptanceRecord =
    acceptanceSettled.status === "fulfilled" &&
    acceptanceSettled.value !== "not_found" &&
    acceptanceSettled.value !== "not_configured"
      ? acceptanceSettled.value
      : null;

  const buildRetry = (recovered: boolean): PostApprovalRetryRequest | null =>
    latestRetry
      ? {
          requestedAt: latestRetry.requested_at,
          requestedBy: latestRetry.requested_by,
          reason: latestRetry.reason,
          recovered,
        }
      : null;

  if (upstreamSettled.status === "rejected") {
    const error = upstreamSettled.reason;
    const reason =
      error instanceof Error
        ? `Control plane unreachable: ${error.message}`
        : "Control plane unreachable";
    if (latestRetry) {
      return {
        stage: "retry_pending",
        local,
        authoritative: null,
        retryRequest: buildRetry(false)!,
        failureReason: reason,
      };
    }
    return {
      stage: "failed",
      local,
      authoritative: null,
      retryRequest: null,
      failureReason: reason,
    };
  }

  const upstream = upstreamSettled.value;

  if (upstream === "not_configured") {
    const reason =
      "Control plane is not configured for this deployment. Local handoff was recorded but downstream lifecycle cannot be displayed.";
    if (latestRetry) {
      return {
        stage: "retry_pending",
        local,
        authoritative: null,
        retryRequest: buildRetry(false)!,
        failureReason: reason,
      };
    }
    return {
      stage: "failed",
      local,
      authoritative: null,
      retryRequest: null,
      failureReason: reason,
    };
  }

  if (upstream === "not_found") {
    const reason = `Control plane has no run ${local.controlPlaneRunId}. The handoff may not have persisted.`;
    if (latestRetry) {
      return {
        stage: "retry_pending",
        local,
        authoritative: null,
        retryRequest: buildRetry(false)!,
        failureReason: reason,
      };
    }
    return {
      stage: "failed",
      local,
      authoritative: null,
      retryRequest: null,
      failureReason: reason,
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
    customerAcceptanceDisposition: acceptanceRecord?.disposition ?? null,
    customerAcceptanceAt: acceptanceRecord?.accepted_at ?? null,
  };

  const baseStage = stageFromControlPlane(upstream);

  // Recovery detection: a delivery whose delivered_at is later than the
  // latest retry request means upstream advanced after the request.
  const deliveredAt = upstream.delivery?.delivered_at ?? null;
  const recovered = Boolean(
    latestRetry &&
      deliveredAt &&
      Date.parse(deliveredAt) > Date.parse(latestRetry.requested_at),
  );

  if (baseStage === "failed") {
    if (latestRetry && !recovered) {
      return {
        stage: "retry_pending",
        local,
        authoritative,
        retryRequest: buildRetry(false)!,
        failureReason: `Run is in terminal non-success state: ${upstream.state}`,
      };
    }
    return {
      stage: "failed",
      local,
      authoritative,
      retryRequest: buildRetry(recovered),
      failureReason: `Run is in terminal non-success state: ${upstream.state}`,
    };
  }

  // Forward stages — surface a previously-requested retry as historical
  // recovery evidence when the run has progressed past delivery.
  return {
    stage: baseStage,
    local,
    authoritative,
    retryRequest: buildRetry(recovered),
    failureReason: null,
  };
}
