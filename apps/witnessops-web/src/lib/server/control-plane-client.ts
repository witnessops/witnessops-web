/**
 * HTTP client for the WitnessOps control plane.
 *
 * Reads CONTROL_PLANE_URL and either CONTROL_PLANE_API_KEY or
 * CONTROL_PLANE_SERVICE_IDENTITY_* from environment.
 *
 * If CONTROL_PLANE_URL is not set, notifyScopeApproved returns null gracefully
 * so that the caller can degrade without crashing.
 */

import { createHmac, randomUUID } from "node:crypto";

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

export interface ControlPlaneActorContext {
  actor: string;
  actorAuthSource: string;
  actorSessionHash: string | null;
}

interface ServiceIdentityConfig {
  secret: string;
  subject: string;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function readServiceIdentityConfig(): ServiceIdentityConfig | null {
  const secret = process.env.CONTROL_PLANE_SERVICE_IDENTITY_SECRET?.trim();
  const subject = process.env.CONTROL_PLANE_SERVICE_IDENTITY_SUBJECT?.trim();

  if (!secret && !subject) return null;
  if (!secret || !subject) {
    throw new Error(
      "CONTROL_PLANE_SERVICE_IDENTITY_SECRET and CONTROL_PLANE_SERVICE_IDENTITY_SUBJECT must be configured together",
    );
  }

  return { secret, subject };
}

function buildServiceAssertion(config: ServiceIdentityConfig, role: string): string {
  const payloadB64 = b64url(
    JSON.stringify({
      sub: config.subject,
      aud: "bridge-api",
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      jti: randomUUID(),
    }),
  );
  const signature = createHmac("sha256", config.secret)
    .update(payloadB64)
    .digest();
  return `${payloadB64}.${b64url(signature)}`;
}

function buildAuthHeaders(
  role: "operator" | "reviewer" | "admin",
  actorContext?: ControlPlaneActorContext,
): Record<string, string> {
  const serviceIdentity = readServiceIdentityConfig();
  const headers: Record<string, string> = {};

  if (serviceIdentity) {
    headers["X-WitnessOps-Service-Assertion"] = buildServiceAssertion(
      serviceIdentity,
      role,
    );
  } else {
    const apiKey = process.env.CONTROL_PLANE_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "CONTROL_PLANE_API_KEY is required when service identity is not configured",
      );
    }
    headers["X-API-Key"] = apiKey;
  }

  if (actorContext) {
    headers["X-WitnessOps-Actor"] = actorContext.actor;
    headers["X-WitnessOps-Actor-Auth-Source"] = actorContext.actorAuthSource;
    if (actorContext.actorSessionHash) {
      headers["X-WitnessOps-Actor-Session-Hash"] = actorContext.actorSessionHash;
    }
  }

  return headers;
}

function readConfig(): { url: string } | null {
  const url = process.env.CONTROL_PLANE_URL?.trim();
  if (!url) return null;
  return { url };
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
      ...buildAuthHeaders("operator"),
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
  | "accepted"
  | "rejected"
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
    headers: buildAuthHeaders("operator"),
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

export type AuthorizeRunResult =
  | { kind: "ok"; run: ControlPlaneLifecycle }
  | { kind: "conflict"; status: 400 | 409; message: string }
  | { kind: "not_configured" };

/**
 * Explicitly authorize a handed-off run to progress from requested to
 * authorized (WEB-021 / CP-005).
 */
export async function authorizeRun(
  runId: string,
  actorContext?: ControlPlaneActorContext,
): Promise<AuthorizeRunResult> {
  const config = readConfig();
  if (!config) return { kind: "not_configured" };

  const response = await fetch(`${config.url}/v1/runs/${runId}/authorize`, {
    method: "POST",
    headers: buildAuthHeaders("operator", actorContext),
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 400 || response.status === 409) {
    const detail = await response.text().catch(() => "(unreadable)");
    return { kind: "conflict", status: response.status, message: detail };
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `Control plane POST authorize returned ${response.status}: ${detail}`,
    );
  }

  const run = (await response.json()) as ControlPlaneLifecycle;
  return { kind: "ok", run };
}

export async function getCompletionView(
  runId: string,
): Promise<ControlPlaneCompletionView | "not_configured" | "not_found"> {
  return controlPlaneGet<ControlPlaneCompletionView>(
    `/v1/runs/${runId}/completion`,
  );
}

// ---------------------------------------------------------------------------
// Customer acceptance read (WEB-013)
//
// Read-only view of the customer's package disposition. Web must not write
// disposition — that is CP-003 control-plane authority.
// ---------------------------------------------------------------------------

export interface ControlPlaneCustomerAcceptanceRecord {
  schema: "customer_acceptance_record";
  run_id: string;
  disposition: "accepted" | "rejected";
  accepted_by: string;
  accepted_at: string;
  bundle_id: string;
  artifact_hash: string;
  comment: string | null;
}

export async function getCustomerAcceptance(
  runId: string,
): Promise<
  ControlPlaneCustomerAcceptanceRecord | "not_configured" | "not_found"
> {
  return controlPlaneGet<ControlPlaneCustomerAcceptanceRecord>(
    `/v1/runs/${runId}/customer-acceptance`,
  );
}

// ---------------------------------------------------------------------------
// Customer acceptance receipt artifact (WEB-015 / CP-004)
// ---------------------------------------------------------------------------

export interface ControlPlaneCustomerAcceptanceReceiptBody {
  schema: "customer_acceptance_receipt";
  schema_version: number;
  run_id: string;
  disposition: "accepted" | "rejected";
  accepted_by: string;
  accepted_at: string;
  bundle_id: string;
  artifact_hash: string;
  comment: string | null;
}

export interface ControlPlaneCustomerAcceptanceReceiptEnvelope {
  schema: "customer_acceptance_receipt";
  schema_version: number;
  receipt_hash: string;
  receipt: ControlPlaneCustomerAcceptanceReceiptBody;
}

export async function getCustomerAcceptanceReceipt(
  runId: string,
): Promise<
  | ControlPlaneCustomerAcceptanceReceiptEnvelope
  | "not_configured"
  | "not_found"
> {
  return controlPlaneGet<ControlPlaneCustomerAcceptanceReceiptEnvelope>(
    `/v1/runs/${runId}/customer-acceptance-receipt`,
  );
}

export interface CustomerAcceptanceSubmission {
  disposition: "accepted" | "rejected";
  accepted_by: string;
  comment: string | null;
}

export type CustomerAcceptanceSubmitResult =
  | { kind: "ok"; record: ControlPlaneCustomerAcceptanceRecord }
  | { kind: "conflict"; message: string }
  | { kind: "not_configured" };

/**
 * Submit a customer acceptance disposition (CP-003).
 *
 * The control-plane is the authority on first-write-wins + idempotent
 * replay. This wrapper returns:
 *  - { kind: "ok", record } on 200 (first write OR idempotent replay)
 *  - { kind: "conflict", message } on 409 (no delivery, wrong source
 *    state, or different field than existing record)
 *  - { kind: "not_configured" } when env is not wired
 *  - throws on network errors or other non-2xx status
 */
export async function submitCustomerAcceptance(
  runId: string,
  submission: CustomerAcceptanceSubmission,
): Promise<CustomerAcceptanceSubmitResult> {
  const config = readConfig();
  if (!config) return { kind: "not_configured" };

  const response = await fetch(
    `${config.url}/v1/runs/${runId}/customer-acceptance`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders("operator"),
      },
      body: JSON.stringify(submission),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (response.status === 409) {
    const detail = await response.text().catch(() => "(unreadable)");
    return { kind: "conflict", message: detail };
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `Control plane POST customer-acceptance returned ${response.status}: ${detail}`,
    );
  }
  const record = (await response.json()) as ControlPlaneCustomerAcceptanceRecord;
  return { kind: "ok", record };
}
