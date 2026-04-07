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
