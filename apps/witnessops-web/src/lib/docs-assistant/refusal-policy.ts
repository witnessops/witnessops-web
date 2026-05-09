import type { DocsAssistantAnswer } from "./answer-contract";

export interface DocsAssistantRefusalDecision {
  blocked: boolean;
  reason: string | null;
  not_proven: string[];
  boundary_findings: string[];
}

const DEFAULT_NOT_PROVEN = [
  "source_freshness",
  "general_answer_correctness",
  "assistant_safe",
  "assistant_production_ready",
  "public_release_approved",
];

const REFUSAL_RULES: Array<{
  reason: string;
  pattern: RegExp;
  notProven: string[];
}> = [
  {
    reason: "compliance_certification_not_allowed",
    pattern: /\b(certif(?:y|ies|ication)|compliant|compliance|soc\s*2|iso\s*27001|hipaa)\b/i,
    notProven: ["compliance_correctness", "security_posture", "source_system_truth"],
  },
  {
    reason: "security_posture_verification_not_allowed",
    pattern: /\b(security posture|secure|safe|vulnerability-free|no vulnerabilities)\b/i,
    notProven: ["security_posture", "source_system_truth"],
  },
  {
    reason: "proof_bundle_verification_not_allowed",
    pattern: /\b(proof bundle|artifact)\b.*\b(verify|verification|verified|validate|validation)\b|\b(verify|verification|verified|validate|validation)\b.*\b(proof bundle|artifact)\b/i,
    notProven: ["proof_bundle_verification", "artifact_verification", "verifier_authority"],
  },
  {
    reason: "source_system_truth_not_allowed",
    pattern: /\b(source system truth|source-of-truth|prove the source system)\b/i,
    notProven: ["source_system_truth"],
  },
  {
    reason: "production_readiness_not_allowed",
    pattern: /\b(production-ready|production ready|ready for production)\b/i,
    notProven: ["assistant_production_ready"],
  },
  {
    reason: "public_release_approval_not_allowed",
    pattern: /\b(public release|release approved|approved for public)\b/i,
    notProven: ["public_release_approved"],
  },
  {
    reason: "customer_specific_claim_not_allowed",
    pattern: /\b(my company|our company|my organization|our organization|customer-specific)\b/i,
    notProven: ["customer_specific_claims_absent_from_approved_docs"],
  },
];

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function evaluateDocsAssistantRefusalPolicy(
  question: string,
): DocsAssistantRefusalDecision {
  const notProven: string[] = [];
  const boundaryFindings: string[] = [];

  for (const rule of REFUSAL_RULES) {
    if (rule.pattern.test(question)) {
      boundaryFindings.push(rule.reason);
      notProven.push(...rule.notProven);
    }
  }

  if (boundaryFindings.length === 0) {
    return {
      blocked: false,
      reason: null,
      not_proven: [],
      boundary_findings: [],
    };
  }

  return {
    blocked: true,
    reason: boundaryFindings[0],
    not_proven: unique([...notProven, ...DEFAULT_NOT_PROVEN]),
    boundary_findings: boundaryFindings,
  };
}

export function buildDocsAssistantRefusalAnswer(args: {
  question: string;
  decision: DocsAssistantRefusalDecision;
}): DocsAssistantAnswer {
  return {
    schema_version: "docs-assistant.answer.v1",
    answer_status: "cannot_claim",
    question: args.question,
    documented_facts: [],
    inference: [],
    citations: [],
    unsupported_reason:
      args.decision.reason ?? "The request is outside the approved docs assistant boundary.",
    human_review_required: true,
    not_proven: args.decision.not_proven.length
      ? args.decision.not_proven
      : DEFAULT_NOT_PROVEN,
    boundary_findings: args.decision.boundary_findings,
  };
}
