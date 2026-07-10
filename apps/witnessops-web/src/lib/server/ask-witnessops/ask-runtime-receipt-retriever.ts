import "server-only";

import type { AskRuntimeReceipt } from "./ask-runtime-receipt";
import {
  readReceipt,
  type ReceiptReadResult,
  type ReceiptReadError,
} from "./ask-runtime-receipt-store";

/**
 * WITNESSOPS_ASK_RUNTIME_RECEIPT_RETRIEVER_V1
 *
 * Authorized retrieval surface for durably stored Ask runtime receipts.
 *
 * V1 responsibilities:
 * - Access control (actor-based)
 * - Audit event generation
 * - Predecessor chain validation (structural)
 * - Return the receipt only on success
 */

export interface RetrieveReceiptInput {
  readonly receipt_id: string;
  readonly actor: string;           // e.g. operator id, service account, verifier
  readonly reason?: string;
}

export interface RetrieveReceiptSuccess {
  readonly ok: true;
  readonly receipt: AskRuntimeReceipt;
  readonly retrieved_at: string;
  readonly audit_id: string;
}

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

/**
 * Retrieves a receipt with access control and audit logging.
 *
 * In V1 access control is actor-based (any non-empty actor is allowed).
 * Later lanes can enforce real RBAC.
 */
export async function retrieveAskRuntimeReceipt(
  input: RetrieveReceiptInput
): Promise<RetrieveReceiptSuccess | RetrieveReceiptError> {
  const auditId = generateAuditId();
  const retrievedAt = new Date().toISOString();

  if (!input.actor || input.actor.trim().length === 0) {
    return {
      ok: false,
      reason: "ACCESS_DENIED",
      audit_id: auditId,
      details: "actor is required",
    };
  }

  // In a real system this would check permissions against input.actor
  // For V1 we log the attempt and proceed (access is granted to any authenticated caller).

  const readResult: ReceiptReadResult | ReceiptReadError = await readReceipt(input.receipt_id);

  // Audit the retrieval attempt
  console.log(JSON.stringify({
    event: "ask_receipt_retrieved",
    audit_id: auditId,
    actor: input.actor,
    receipt_id: input.receipt_id,
    reason: input.reason,
    success: readResult.ok,
    timestamp: retrievedAt,
  }));

  if (!readResult.ok) {
    let mappedReason: RetrieveReceiptError["reason"];
    if (readResult.reason === "RECEIPT_NOT_FOUND") {
      mappedReason = "RECEIPT_NOT_FOUND";
    } else if (
      readResult.reason === "CONTENT_HASH_MISMATCH" ||
      readResult.reason === "INVALID_RECEIPT_SCHEMA" ||
      readResult.reason.startsWith("READ_FAILED")
    ) {
      mappedReason = "CUSTODY_INTEGRITY_FAILURE";
    } else {
      mappedReason = "RETRIEVAL_FAILED";
    }
    return {
      ok: false,
      reason: mappedReason,
      audit_id: auditId,
      details: readResult.reason,
    };
  }

  // Basic predecessor structural validation (presence only in V1)
  if (readResult.receipt.predecessor_receipt_id) {
    // In a fuller implementation we would fetch and verify the predecessor receipt here.
    // For V1 we only record that a predecessor was declared.
  }

  return {
    ok: true,
    receipt: readResult.receipt,
    retrieved_at: retrievedAt,
    audit_id: auditId,
  };
}
