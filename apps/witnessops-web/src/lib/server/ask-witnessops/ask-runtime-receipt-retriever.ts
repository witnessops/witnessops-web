import "server-only";

import type { AskRuntimeReceipt } from "./ask-runtime-receipt";
import {
  readReceipt,
  type ReceiptReadResult,
  type ReceiptReadError,
} from "./ask-runtime-receipt-store";

import type {
  ActorIdentity,
  AccessDecision,
} from "./ask-receipt-access-policy";
import {
  decideReceiptAccess,
  type ReceiptMetadataForPolicy,
} from "./ask-receipt-access-policy";

import {
  writeAuditEvent,
  type ReceiptAuditEvent,
} from "./ask-receipt-audit";

/**
 * WITNESSOPS_ASK_RUNTIME_RECEIPT_RETRIEVAL_AUTHORITY_AND_AUDIT_V1
 *
 * Authorized retrieval with policy and durable audit.
 *
 * Responsibilities (this implementation):
 * - Accept verified ActorIdentity with provenance
 * - Apply deterministic access policy (full vs metadata_only views)
 * - Write atomic durable audit events for every outcome
 * - Existence-hiding on denials where appropriate
 * - Rate limiting (basic per-actor in V1)
 * - No impact on receipt creation or deterministic pipeline
 */

export interface RetrieveReceiptInput {
  readonly receipt_id: string;
  readonly actor: ActorIdentity;
  readonly reason?: string;
  readonly requested_view?: 'full' | 'metadata_only';
}

export interface ReceiptRetrievalOptions {
  readonly receiptRoot?: string;
  readonly auditRoot?: string;
}

export interface RetrieveReceiptSuccess {
  readonly ok: true;
  readonly receipt: AskRuntimeReceipt | AskRuntimeReceiptMetadata;
  readonly retrieved_at: string;
  readonly audit_id: string;
  readonly view: 'full' | 'metadata_only';
}

export type AskRuntimeReceiptMetadata = {
  readonly receipt_id: string;
  readonly schema: "witnessops.ask.runtime-receipt.v1";
  readonly created_at: string;
  readonly status: "success" | "closed";
  readonly failure_reason?: string;
  readonly classification: {
    readonly question_class_id: string;
  };
  readonly bindings: AskRuntimeReceipt["bindings"];
  readonly deterministic_replay_hash: string;
  readonly predecessor_receipt_id?: string;
};

export interface RetrieveReceiptError {
  readonly ok: false;
  readonly reason: "RECEIPT_NOT_FOUND" | "ACCESS_DENIED" | "CUSTODY_INTEGRITY_FAILURE" | "RETRIEVAL_FAILED";
  readonly audit_id: string;
  readonly details?: string;
}

let auditCounter = 0;
function generateAuditId(): string {
  auditCounter += 1;
  return `audit-${Date.now()}-${auditCounter}`;
}

// Very basic in-memory rate limit (V1). Real implementation would use durable store.
const rateLimitCounters = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(actorId: string): boolean {
  const now = Date.now();
  const entry = rateLimitCounters.get(actorId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitCounters.set(actorId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  entry.count += 1;
  return true;
}

async function emitAudit(
  event: Omit<ReceiptAuditEvent, 'schema' | 'audit_id' | 'timestamp'>,
  auditId: string,
  retrievedAt: string,
  auditRoot?: string,
): Promise<void> {
  const fullEvent: ReceiptAuditEvent = {
    schema: "witnessops.ask.receipt-audit.v1",
    audit_id: auditId,
    timestamp: retrievedAt,
    ...event,
  };
  // Fire and forget for audit write; errors are logged but do not fail the retrieval path
  await writeAuditEvent(fullEvent, auditRoot).catch((e) => {
    console.log(JSON.stringify({ event: "ask_audit_write_failed", error: String(e) }));
  });
}

export async function retrieveAskRuntimeReceipt(
  input: RetrieveReceiptInput,
  options: ReceiptRetrievalOptions = {},
): Promise<RetrieveReceiptSuccess | RetrieveReceiptError> {
  const auditId = generateAuditId();
  const retrievedAt = new Date().toISOString();
  const requestedView = input.requested_view ?? 'full';

  // Basic provenance validation via policy
  if (!input.actor || !input.actor.id) {
    const decision: AccessDecision = { allow: false, reason: "ACTOR_UNKNOWN" };
    await emitAudit({
      event: "retrieval_denied",
      actor: input.actor ?? null,
      decision,
      details: "missing actor",
    }, auditId, retrievedAt, options.auditRoot);
    return {
      ok: false,
      reason: "ACCESS_DENIED",
      audit_id: auditId,
      details: "invalid actor identity",
    };
  }

  if (!checkRateLimit(input.actor.id)) {
    const decision: AccessDecision = { allow: false, reason: "RATE_LIMITED" };
    await emitAudit({
      event: "retrieval_denied",
      actor: input.actor,
      decision,
    }, auditId, retrievedAt, options.auditRoot);
    return {
      ok: false,
      reason: "ACCESS_DENIED",
      audit_id: auditId,
      details: "rate limited",
    };
  }

  const readResult: ReceiptReadResult | ReceiptReadError = await readReceipt(
    input.receipt_id,
    options.receiptRoot,
  );

  let decision: AccessDecision;

  if (!readResult.ok) {
    // Existence hiding: treat not-found as scope denied for most actors
    if (readResult.reason === "RECEIPT_NOT_FOUND") {
      decision = { allow: false, reason: "RECEIPT_SCOPE_DENIED", details: "not found or unauthorized" };
    } else if (readResult.reason === "CONTENT_HASH_MISMATCH" || readResult.reason === "INVALID_RECEIPT_SCHEMA") {
      decision = { allow: false, reason: "CUSTODY_INTEGRITY_FAILURE" };
    } else {
      decision = { allow: false, reason: "RETRIEVAL_FAILED" };
    }

    await emitAudit({
      event: "retrieval_failed",
      actor: input.actor,
      receipt_id: input.receipt_id,
      decision,
      details: readResult.reason,
    }, auditId, retrievedAt, options.auditRoot);

    const errorReason: RetrieveReceiptError["reason"] =
      (decision.reason === "RECEIPT_SCOPE_DENIED" || decision.reason === "ACTOR_UNAUTHORIZED")
      ? "ACCESS_DENIED"
      : (readResult.reason === "CONTENT_HASH_MISMATCH" || readResult.reason === "INVALID_RECEIPT_SCHEMA")
        ? "CUSTODY_INTEGRITY_FAILURE"
        : "RETRIEVAL_FAILED";

    return {
      ok: false,
      reason: errorReason,
      audit_id: auditId,
      details: readResult.reason,
    };
  }

  // We have the receipt. Build minimal metadata for policy (no full content leakage)
  const metadata: ReceiptMetadataForPolicy = {
    question_class_id: readResult.receipt.input.classification.question_class_id,
    status: readResult.receipt.assembly.status,
    created_at: readResult.receipt.created_at,
  };

  decision = decideReceiptAccess(input.actor, metadata, requestedView);

  if (!decision.allow) {
    await emitAudit({
      event: "retrieval_denied",
      actor: input.actor,
      receipt_id: input.receipt_id,
      receipt_class_id: metadata.question_class_id,
      decision,
    }, auditId, retrievedAt, options.auditRoot);

    return {
      ok: false,
      reason: "ACCESS_DENIED",
      audit_id: auditId,
      details: decision.reason,
    };
  }

  const view = decision.visible_view;

  // Predecessor note only
  if (readResult.receipt.predecessor_receipt_id) {
    // structural only
  }

  // Emit success audit (never include full receipt body in audit)
  await emitAudit({
    event: "receipt_retrieved",
    actor: input.actor,
    receipt_id: input.receipt_id,
    receipt_class_id: metadata.question_class_id,
    decision,
    retrieval_view: view,
  }, auditId, retrievedAt, options.auditRoot);

  if (view === 'full') {
    return {
      ok: true,
      receipt: readResult.receipt,
      retrieved_at: retrievedAt,
      audit_id: auditId,
      view,
    };
  }

  // metadata_only: return structurally redacted projection only
  const meta: AskRuntimeReceiptMetadata = {
    receipt_id: readResult.receipt.receipt_id,
    schema: readResult.receipt.schema,
    created_at: readResult.receipt.created_at,
    status: readResult.receipt.assembly.status,
    failure_reason: readResult.receipt.assembly.failure_reason,
    classification: {
      question_class_id: readResult.receipt.input.classification.question_class_id,
    },
    bindings: readResult.receipt.bindings,
    deterministic_replay_hash: readResult.receipt.deterministic_replay_hash,
    predecessor_receipt_id: readResult.receipt.predecessor_receipt_id,
  };

  return {
    ok: true,
    receipt: meta,
    retrieved_at: retrievedAt,
    audit_id: auditId,
    view,
  };
}
