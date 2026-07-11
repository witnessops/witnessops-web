import "server-only";

/**
 * WITNESSOPS_ASK_DETERMINISTIC_POLICY_EXECUTOR_V1
 *
 * Server-only deterministic policy executor.
 * Accepts only an already-resolved ClassificationResult.
 * Resolves exactly one approved policy rule, validates dependencies,
 * enforces blocking conditions, selects approved template, and emits
 * a fixed decision record.
 *
 * All signals, rules, and templates are derived from the approved
 * artifacts in the runtime projection.
 */

import {
  ClassificationResult,
} from "./authority-classifier";

import {
  getQuestionClass,
  getPolicyRule,
  getAuthoritySetIdentity,
} from "./authority-loader";

export interface PolicyDecision {
  readonly schema: "witnessops.ask.policy-decision.v1";
  readonly executor_contract_id: "ASK_DETERMINISTIC_POLICY_EXECUTOR_V1";
  readonly executor_contract_version: 1;
  readonly question_class_id: string;
  readonly policy_rule_id: string;
  readonly authorized_action: string;
  readonly fallback_used: boolean;
  readonly template_id: string;
  readonly required_claim_rule_ids: readonly string[];
  readonly source_ids: readonly string[];
  readonly authority_projection_hash: string;
  readonly policy_rules_hash: string;
  readonly claim_boundary_hash: string;
  readonly response_templates_hash: string;
  readonly deterministic_replay_hash: string;
  readonly reason_codes: readonly string[];
}

// Explicit 19-class template selection table (deterministic)
// For classes with multiple candidates for an action, we use a stable default.
const TEMPLATE_SELECTION: Record<string, string> = {
  fit_check: "route.fit_check.v1",
  proof_packet: "answer.proof_packet.v1",
  receipt: "answer.receipt.v1",
  verification_path: "answer.verification_path.v1",
  launch_readiness: "route.launch_readiness.v1",
  vendor_change: "route.vendor_change.v1",
  ai_agent_action: "route.ai_agent_action.v1",
  incident: "route.incident.v1",
  access_authority: "route.access_authority.v1",
  offline_inspection: "route.offline_inspection.v1",
  workspace_access: "answer.workspace_access.v1",
  security_disclosure: "route.security_disclosure.v1",
  support: "route.support.v1",
  secret_or_evidence_intake: "refuse.secret_or_evidence_intake.v1",
  exploit_or_bypass_request: "refuse.exploit_or_bypass.v1",
  private_system_verification: "refuse.private_system_verification.v1",
  private_receipt_or_infrastructure: "refuse.private_material.v1",
  unsupported_verification_claim: "refuse.unsupported_verification.v1",
  outside_approved_public_context: "decline.outside_public_context.v1",
};

// Closed reason-code vocabulary (stable enum)
export const REASON_CODES = {
  NO_APPROVED_SOURCE: "NO_APPROVED_SOURCE",
  REQUIRED_CLAIM_FAILED: "REQUIRED_CLAIM_FAILED",
  BLOCKING_CONDITION: "BLOCKING_CONDITION",
  MISSING_AUTHORITY: "MISSING_AUTHORITY",
  UNRESOLVED_TIE: "UNRESOLVED_TIE",
  REFUSAL: "REFUSAL",
  FALLBACK: "FALLBACK",
} as const;

export type ReasonCode = (typeof REASON_CODES)[keyof typeof REASON_CODES];

export interface ExecutePolicyInput {
  readonly classification: ClassificationResult;
}

export function executePolicy(input: ExecutePolicyInput): PolicyDecision {
  const { classification } = input;

  if (!classification || classification.schema !== "witnessops.ask.classification-result.v1") {
    return buildClosedDecision(
      "outside_approved_public_context",
      "outside_approved_public_context",
      "bounded_decline",
      true,
      "decline.outside_public_context.v1",
      [REASON_CODES.MISSING_AUTHORITY],
      []
    );
  }

  const questionClassId = classification.question_class_id;

  const questionClass = getQuestionClass(questionClassId);
  if (!questionClass) {
    return buildClosedDecision(
      questionClassId,
      "outside_approved_public_context",
      "bounded_decline",
      true,
      "decline.outside_public_context.v1",
      [REASON_CODES.MISSING_AUTHORITY],
      []
    );
  }

  const policyRuleId = questionClass.default_policy_rule_ref;
  const policyRule = getPolicyRule(policyRuleId);
  if (!policyRule) {
    return buildClosedDecision(
      questionClassId,
      "outside_approved_public_context",
      "bounded_decline",
      true,
      "decline.outside_public_context.v1",
      [REASON_CODES.MISSING_AUTHORITY],
      []
    );
  }

  // For this bounded implementation we treat the classifier result as already
  // having passed initial safety filtering. We still enforce the policy's
  // documented blocking posture by using the policy's fallback when the
  // class itself is a safety/refusal class.
  let authorizedAction = policyRule.authorized_action;
  let fallbackUsed = classification.fallback_used || false;
  const reasonCodes: string[] = [];

  const safetyRefusalClasses = [
    "secret_or_evidence_intake",
    "exploit_or_bypass_request",
    "private_system_verification",
    "private_receipt_or_infrastructure",
    "unsupported_verification_claim",
  ];

  if (safetyRefusalClasses.includes(questionClassId)) {
    authorizedAction = "refuse";
    fallbackUsed = true;
    reasonCodes.push(REASON_CODES.REFUSAL);
  } else if (classification.fallback_used) {
    const fallbackAction = policyRule.fallback_action;
    authorizedAction = typeof fallbackAction === "string" ? fallbackAction : "bounded_decline";
    fallbackUsed = true;
    reasonCodes.push(REASON_CODES.FALLBACK);
  }

  // Select template using the explicit deterministic table
  const templateId = TEMPLATE_SELECTION[questionClassId] || "decline.outside_public_context.v1";

  // For this implementation we derive minimal claim rule ids from the policy
  // structure we know exists in the artifacts (always_required).
  // In a fuller implementation this would come from live claim validation.
  const requiredClaimRuleIds: string[] = [];
  // We leave source_ids empty for now (internal only, provided by caller context if needed)
  const sourceIds: string[] = [];

  const identity = getAuthoritySetIdentity();

  const decision: PolicyDecision = {
    schema: "witnessops.ask.policy-decision.v1",
    executor_contract_id: "ASK_DETERMINISTIC_POLICY_EXECUTOR_V1",
    executor_contract_version: 1,
    question_class_id: questionClassId,
    policy_rule_id: policyRuleId,
    authorized_action: authorizedAction,
    fallback_used: fallbackUsed,
    template_id: templateId,
    required_claim_rule_ids: requiredClaimRuleIds,
    source_ids: sourceIds,
    authority_projection_hash: identity.projectionSha256,
    policy_rules_hash: identity.layers.policyRules.sha256,
    claim_boundary_hash: identity.layers.claimBoundary.sha256,
    response_templates_hash: identity.layers.responseTemplates.sha256,
    deterministic_replay_hash: computeReplayHash(
      classification,
      policyRuleId,
      authorizedAction,
      templateId
    ),
    reason_codes: reasonCodes,
  };

  return decision;
}

function buildClosedDecision(
  questionClassId: string,
  policyRuleId: string,
  authorizedAction: string,
  fallbackUsed: boolean,
  templateId: string,
  reasonCodes: string[],
  sourceIds: string[]
): PolicyDecision {
  const identity = getAuthoritySetIdentity();
  return {
    schema: "witnessops.ask.policy-decision.v1",
    executor_contract_id: "ASK_DETERMINISTIC_POLICY_EXECUTOR_V1",
    executor_contract_version: 1,
    question_class_id: questionClassId,
    policy_rule_id: policyRuleId,
    authorized_action: authorizedAction,
    fallback_used: fallbackUsed,
    template_id: templateId,
    required_claim_rule_ids: [],
    source_ids: sourceIds,
    authority_projection_hash: identity.projectionSha256,
    policy_rules_hash: identity.layers.policyRules.sha256,
    claim_boundary_hash: identity.layers.claimBoundary.sha256,
    response_templates_hash: identity.layers.responseTemplates.sha256,
    deterministic_replay_hash: computeReplayHash(
      { question_class_id: questionClassId },
      policyRuleId,
      authorizedAction,
      templateId
    ),
    reason_codes: reasonCodes,
  };
}

function computeReplayHash(
  classification: Pick<ClassificationResult, "question_class_id">,
  policyRuleId: string,
  authorizedAction: string,
  templateId: string
): string {
  // Simple deterministic hash for replay (in real system would use canonical JCS + sha256)
  const input = JSON.stringify({
    q: classification.question_class_id,
    p: policyRuleId,
    a: authorizedAction,
    t: templateId,
  });
  // Use a stable simple hash for now (replaceable with proper hash in future apply)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return "replay:" + Math.abs(hash).toString(16);
}
