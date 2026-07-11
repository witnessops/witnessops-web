import "server-only";

/**
 * WITNESSOPS_ASK_RUNTIME_RECEIPT_ACCESS_POLICY_V1
 *
 * Deterministic access policy for Ask runtime receipt retrieval.
 * This policy has no authority over receipt creation or the deterministic
 * answer pipeline.
 */

export interface ActorIdentity {
  readonly id: string;
  readonly type: 'operator' | 'service_account' | 'auditor' | 'verifier';
  readonly provenance: {
    readonly method: 'request_header' | 'mutual_tls' | 'internal_token' | 'signed_jwt';
    readonly claims?: Record<string, unknown>;
    readonly verified_at: string;
  };
}

export type AccessDenialReason =
  | "ACTOR_UNAUTHORIZED"
  | "ACTOR_UNKNOWN"
  | "RECEIPT_SCOPE_DENIED"
  | "RATE_LIMITED"
  | "GOVERNANCE_DENIED"
  | "CUSTODY_INTEGRITY_FAILURE"
  | "RETRIEVAL_FAILED";

export type AccessDecision =
  | { allow: true; visible_view: 'full' | 'metadata_only' }
  | { allow: false; reason: AccessDenialReason; details?: string };

export interface ReceiptMetadataForPolicy {
  readonly question_class_id: string;
  readonly status: "success" | "closed";
  readonly created_at: string;
}

const FULL_ACCESS_TYPES = new Set<ActorIdentity['type']>(['operator']);

export function decideReceiptAccess(
  actor: ActorIdentity | null | undefined,
  _metadata: ReceiptMetadataForPolicy,
  requestedView: 'full' | 'metadata_only' = 'full'
): AccessDecision {
  if (!actor || typeof actor.id !== 'string' || actor.id.length === 0) {
    return { allow: false, reason: "ACTOR_UNKNOWN", details: "missing or invalid actor id" };
  }
  if (!actor.provenance || !actor.provenance.verified_at) {
    return { allow: false, reason: "ACTOR_UNAUTHORIZED", details: "missing provenance" };
  }
  const verifiedAt = Date.parse(actor.provenance.verified_at);
  if (isNaN(verifiedAt)) {
    return { allow: false, reason: "ACTOR_UNAUTHORIZED", details: "invalid provenance timestamp" };
  }

  const canRequestFull = FULL_ACCESS_TYPES.has(actor.type);

  if (requestedView === 'full' && !canRequestFull) {
    return { allow: true, visible_view: 'metadata_only' };
  }

  // For V1 all other valid actors get what they request (downgraded if needed)
  const view = canRequestFull ? requestedView : 'metadata_only';
  return { allow: true, visible_view: view };
}
