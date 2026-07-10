import "server-only";

import type { ClassificationResult } from "./authority-classifier";
import type { PolicyDecision } from "./authority-policy-executor";
import type { AssembledAnswer } from "./authority-answer-assembler";

/**
 * WITNESSOPS_ASK_RUNTIME_RECEIPT_CONTRACT_V1
 *
 * Canonical receipt for the deterministic Ask pipeline.
 * Records the full trace for independent reconstruction and verification.
 *
 * This contract sits after AssembledAnswer.
 * It does not influence classification, policy, template selection, presentation selection,
 * or answer construction.
 */

export interface AskRuntimeReceipt {
  readonly schema: "witnessops.ask.runtime-receipt.v1";
  readonly receipt_id: string;
  readonly created_at: string; // ISO 8601
  readonly input: {
    readonly normalized_question: string;
    readonly classification: ClassificationResult;
    readonly classification_replay_hash: string;
  };
  readonly decision: PolicyDecision;
  readonly assembly: AssembledAnswer;
  readonly bindings: {
    readonly authority_projection_sha256: string;
    readonly presentation_projection_sha256: string;
    readonly response_templates_sha256: string;
  };
  readonly deterministic_replay_hash: string;
  readonly predecessor_receipt_id?: string;
}

export interface CreateAskRuntimeReceiptInput {
  readonly normalizedQuestion: string;
  readonly classification: ClassificationResult;
  readonly policyDecision: PolicyDecision;
  readonly assembledAnswer: AssembledAnswer;
  readonly predecessorReceiptId?: string;
}

/**
 * Creates a canonical runtime receipt for a completed Ask pipeline execution.
 *
 * The receipt preserves all intermediate values required for full replay verification.
 */
export function createAskRuntimeReceipt(input: CreateAskRuntimeReceiptInput): AskRuntimeReceipt {
  const {
    normalizedQuestion,
    classification,
    policyDecision,
    assembledAnswer,
    predecessorReceiptId,
  } = input;

  // Compute a classification replay hash if not already present in the object.
  // For V1 we derive a stable one from the classification fields.
  const classificationReplayHash = computeClassificationReplayHash(classification);

  const bindings = {
    authority_projection_sha256: policyDecision.authority_projection_hash,
    presentation_projection_sha256: assembledAnswer.source_presentation_projection_sha256,
    response_templates_sha256: assembledAnswer.response_templates_hash,
  };

  const receiptWithoutHash: Omit<AskRuntimeReceipt, "deterministic_replay_hash"> = {
    schema: "witnessops.ask.runtime-receipt.v1",
    receipt_id: generateReceiptId(),
    created_at: new Date().toISOString(),
    input: {
      normalized_question: normalizedQuestion,
      classification,
      classification_replay_hash: classificationReplayHash,
    },
    decision: policyDecision,
    assembly: assembledAnswer,
    bindings,
    ...(predecessorReceiptId ? { predecessor_receipt_id: predecessorReceiptId } : {}),
  };

  const deterministicReplayHash = computeReceiptReplayHash(receiptWithoutHash);

  const receipt: AskRuntimeReceipt = {
    ...receiptWithoutHash,
    deterministic_replay_hash: deterministicReplayHash,
  };

  return receipt;
}

function generateReceiptId(): string {
  // Simple unique id for V1. In production this would be a proper UUID or hash-based id.
  return "ask-receipt:" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function computeClassificationReplayHash(classification: ClassificationResult): string {
  // Stable hash over the classification fields (V1 simple implementation, matching style of executor).
  const input = JSON.stringify({
    schema: classification.schema,
    question_class_id: classification.question_class_id,
    matched_rule_ids: classification.matched_rule_ids,
    precedence_rule_id: classification.precedence_rule_id,
    fallback_used: classification.fallback_used,
  });
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return "replay:" + Math.abs(hash).toString(16);
}

function computeReceiptReplayHash(receipt: Omit<AskRuntimeReceipt, "deterministic_replay_hash">): string {
  // Canonical stable representation for the top-level replay hash.
  // Includes all fields that affect reconstruction.
  const input = JSON.stringify({
    schema: receipt.schema,
    input: {
      normalized_question: receipt.input.normalized_question,
      classification: receipt.input.classification,
      classification_replay_hash: receipt.input.classification_replay_hash,
    },
    decision: receipt.decision,
    assembly: receipt.assembly,
    bindings: receipt.bindings,
    predecessor_receipt_id: receipt.predecessor_receipt_id,
  });
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return "replay:" + Math.abs(hash).toString(16);
}

/**
 * Verifies that a receipt is consistent with the provided pipeline stages.
 * This is a structural + hash replay check.
 * It does not re-execute the full classifier/policy (that would be done by an independent verifier using the stored values).
 */
export function verifyAskRuntimeReceipt(
  receipt: AskRuntimeReceipt,
  expectedNormalizedQuestion: string,
  expectedClassification: ClassificationResult,
  expectedDecision: PolicyDecision,
  expectedAssembly: AssembledAnswer
): boolean {
  if (receipt.schema !== "witnessops.ask.runtime-receipt.v1") return false;
  if (receipt.input.normalized_question !== expectedNormalizedQuestion) return false;
  if (receipt.input.classification.question_class_id !== expectedClassification.question_class_id) return false;
  if (receipt.decision.deterministic_replay_hash !== expectedDecision.deterministic_replay_hash) return false;
  if (receipt.assembly.deterministic_replay_hash !== expectedAssembly.deterministic_replay_hash) return false;
  if (receipt.assembly.status !== expectedAssembly.status) return false;

  // Recompute top level hash and compare
  const withoutHash: Omit<AskRuntimeReceipt, "deterministic_replay_hash"> = {
    schema: receipt.schema,
    receipt_id: receipt.receipt_id,
    created_at: receipt.created_at,
    input: receipt.input,
    decision: receipt.decision,
    assembly: receipt.assembly,
    bindings: receipt.bindings,
    ...(receipt.predecessor_receipt_id ? { predecessor_receipt_id: receipt.predecessor_receipt_id } : {}),
  };
  const recomputed = computeReceiptReplayHash(withoutHash);
  return recomputed === receipt.deterministic_replay_hash;
}
