/**
 * HTTP client for the WitnessOps control plane.
 *
 * Reads CONTROL_PLANE_URL and CONTROL_PLANE_API_KEY from environment.
 * If CONTROL_PLANE_URL is not set, notifyScopeApproved returns null gracefully
 * so that the caller can degrade without crashing.
 */

export interface ScopeApprovalHandoffRequest {
  issuanceId: string;
  domain: string;
  contactEmail: string;
  scopeApproval: {
    timestamp: string;
    approvedBy: string;
    approverName: string | null;
    approvalNote: string | null;
    scope: string | null;
  };
}

export interface ScopeApprovedAck {
  issuanceId: string;
  accepted: true;
  runId: string;
  persistedState: string;
  timestamp: string;
}

function readConfig(): { url: string; apiKey: string } | null {
  const url = process.env.CONTROL_PLANE_URL?.trim();
  const apiKey = process.env.CONTROL_PLANE_API_KEY?.trim();
  if (!url || !apiKey) return null;
  return { url, apiKey };
}

/**
 * Notify control plane of a scope-approved handoff.
 *
 * Returns the acknowledgment, or null if control plane is not configured.
 * Throws on network errors or non-2xx responses so callers can record failure
 * and retain scope_approved state without advancing past it.
 */
export async function notifyScopeApproved(
  req: ScopeApprovalHandoffRequest,
): Promise<ScopeApprovedAck | null> {
  const config = readConfig();
  if (!config) return null;

  const url = `${config.url}/v1/intake/scope-approved`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "(unreadable)");
    throw new Error(`Control plane returned ${response.status}: ${detail}`);
  }

  const body = (await response.json()) as {
    issuanceId: string;
    accepted: boolean;
    runId: string;
    persistedState: string;
    timestamp: string;
    error: string | null;
  };

  if (!body.accepted) {
    throw new Error(
      `Control plane rejected handoff for ${req.issuanceId}: ${body.error ?? "no reason given"}`,
    );
  }

  return {
    issuanceId: body.issuanceId,
    accepted: true,
    runId: body.runId,
    persistedState: body.persistedState,
    timestamp: body.timestamp,
  };
}

// ---------------------------------------------------------------------------
// Read surfaces (WEB-001)
//
// These functions read post-approval lifecycle truth from control-plane.
// They are read-only. Web must not write to delivered/acknowledged/completed
// state — those remain control-plane authority (CP-001/CP-002).
// ---------------------------------------------------------------------------

export type ControlPlaneRunState =
  | "requested"
  | "authorized"
  | "scope_locked"
  | "token_issued"
  | "collecting"
  | "deriving"
  | "decision_recorded"
  | "coverage_recorded"
  | "bundled"
  | "delivered"
  | "acknowledged"
  | "completed"
  | "revoked"
  | "failed";

export interface ControlPlaneLifecycle {
  run_id: string;
  state: ControlPlaneRunState;
  bundle_present: boolean;
  delivery_present: boolean;
  acknowledgment_present: boolean;
  completion_present: boolean;
}

export interface ControlPlaneDeliveryRecord {
  schema: "delivery_record";
  run_id: string;
  bundle_id: string;
  artifact_hash: string;
  recipient: string;
  channel: string;
  delivered_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  acknowledgment_method?: string;
}

export interface ControlPlaneCompletionRecord {
  schema: "engagement_completion";
  run_id: string;
  completed_at: string;
  completed_by: string;
  completion_basis: string;
}

export interface ControlPlaneCompletionView {
  run_id: string;
  state: ControlPlaneRunState;
  delivered: boolean;
  acknowledged: boolean;
  completed: boolean;
  completion_status: "not_yet_complete" | "completed";
  delivery: ControlPlaneDeliveryRecord | null;
  completion: ControlPlaneCompletionRecord | null;
}

async function controlPlaneGet<T>(
  path: string,
): Promise<T | "not_configured" | "not_found"> {
  const config = readConfig();
  if (!config) return "not_configured";

  const response = await fetch(`${config.url}${path}`, {
    method: "GET",
    headers: { "X-API-Key": config.apiKey },
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 404) return "not_found";
  if (!response.ok) {
    const detail = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `Control plane GET ${path} returned ${response.status}: ${detail}`,
    );
  }
  return (await response.json()) as T;
}

export async function getRunLifecycle(
  runId: string,
): Promise<ControlPlaneLifecycle | "not_configured" | "not_found"> {
  return controlPlaneGet<ControlPlaneLifecycle>(`/v1/runs/${runId}/lifecycle`);
}

export async function getCompletionView(
  runId: string,
): Promise<ControlPlaneCompletionView | "not_configured" | "not_found"> {
  return controlPlaneGet<ControlPlaneCompletionView>(
    `/v1/runs/${runId}/completion`,
  );
}
