import "server-only";

/**
 * WITNESSOPS_ASK_DETERMINISTIC_CLASSIFIER_V1
 *
 * Server-only deterministic classifier.
 * Implements the contract approved in the IMPLEMENTATION_PLAN and IMPLEMENTATION_REVIEW lanes.
 *
 * All signals are derived from the approved vocabulary in the REQUIRED_REVISIONS_REVIEW.
 * No probabilistic logic, no models, no retrieval.
 */

export interface ClassificationResult {
  readonly schema: "witnessops.ask.classification-result.v1";
  readonly question_class_id: string;
  readonly question_class_version: 1;
  readonly classifier_contract_id: "ASK_DETERMINISTIC_CLASSIFIER_V1";
  readonly classifier_contract_version: 1;
  readonly decision_basis: "deterministic_rule";
  readonly matched_rule_ids: readonly string[];
  readonly precedence_rule_id: string | null;
  readonly fallback_used: boolean;
}

const PRECEDENCE_ORDER: readonly string[] = [
  "secret_or_evidence_intake",
  "exploit_or_bypass_request",
  "private_system_verification",
  "private_receipt_or_infrastructure",
  "unsupported_verification_claim",
  "security_disclosure",
  "support",
  "workspace_access",
  "fit_check",
  "launch_readiness",
  "vendor_change",
  "ai_agent_action",
  "incident",
  "access_authority",
  "offline_inspection",
  "proof_packet",
  "receipt",
  "verification_path",
  "outside_approved_public_context",
];

// Approved signals per class (exact after normalization, from REVISIONS_REVIEW)
const CLASS_SIGNALS: Record<string, readonly string[]> = {
  secret_or_evidence_intake: [
    "send logs",
    "send logs or screenshots",
    "upload evidence",
    "provide customer data",
    "include credentials",
    "paste private key",
    "submit raw logs",
    "share sensitive exports",
  ],
  exploit_or_bypass_request: [
    "how do i exploit",
    "bypass the",
    "keep persistence",
    "evasion technique",
    "credential abuse",
    "unauthorized access instructions",
  ],
  private_system_verification: [
    "verify our private",
    "inspect private environment",
  ],
  private_receipt_or_infrastructure: [
    "show internal deployment receipt",
    "reveal private topology",
    "private custody records",
  ],
  unsupported_verification_claim: [
    "prove the whole system",
    "guarantee compliance",
    "certify as secure",
    "does this prove every",
  ],
  security_disclosure: [
    "report a suspected vulnerability",
    "safely reporting",
    "vulnerability responsible disclosure",
  ],
  support: [
    "public assistance",
    "how do i get help with",
    "verifier assistance",
  ],
  workspace_access: [
    "private-preview workspace access",
    "not included in workspace access",
    "workspace separation from proof",
  ],
  fit_check: [
    "is this in scope",
    "bounded enough for witnessops",
    "package fit",
    "do i need a fit check",
    "request a fit check",
    "proposed work scope",
  ],
  launch_readiness: [
    "readiness review for a planned launch",
  ],
  vendor_change: [
    "documenting one vendor action",
  ],
  ai_agent_action: [
    "one bounded ai-agent action",
  ],
  incident: [
    "bounded incident readiness",
  ],
  access_authority: [
    "who approved access",
  ],
  offline_inspection: [
    "packaging named artifacts for offline inspection",
  ],
  proof_packet: [
    "what is in a proof packet",
    "what does a proof packet include",
  ],
  receipt: [
    "proof layers of the receipt",
  ],
  verification_path: [
    "checking a named artifact with",
  ],
  outside_approved_public_context: [],
};

function normalizeQuestion(input: string): string {
  // Step-by-step per approved contract
  let s = input; // assume valid UTF-8

  // NFKC
  s = s.normalize("NFKC");

  // locale-independent lower
  s = s.toLowerCase();

  // trim
  s = s.trim();

  // collapse internal whitespace
  s = s.replace(/\s+/g, " ");

  // approved punctuation (basic set from plan)
  s = s.replace(/[“”]/g, '"');
  s = s.replace(/[‘’]/g, "'");
  s = s.replace(/[–—]/g, "-");

  return s;
}

function matchesSignal(normalized: string, signal: string): boolean {
  return normalized.includes(signal);
}

function getMatches(normalized: string): string[] {
  const matches: string[] = [];

  for (const [classId, signals] of Object.entries(CLASS_SIGNALS)) {
    if (classId === "outside_approved_public_context") continue;

    let matched = false;
    for (const sig of signals) {
      if (matchesSignal(normalized, sig)) {
        matched = true;
        break;
      }
    }

    // For safety classes, require compound (simplified: at least two signals or specific intent)
    if (matched && isSafetyClass(classId)) {
      let count = 0;
      for (const sig of signals) {
        if (matchesSignal(normalized, sig)) count++;
      }
      const explicitSingleSignalIntent =
        classId === "secret_or_evidence_intake" &&
        normalized.includes("send logs or screenshots");
      if (count >= 2 || explicitSingleSignalIntent) {
        matches.push(classId);
      }
    } else if (matched) {
      matches.push(classId);
    }
  }

  return matches;
}

function isSafetyClass(classId: string): boolean {
  return [
    "secret_or_evidence_intake",
    "exploit_or_bypass_request",
    "private_system_verification",
    "private_receipt_or_infrastructure",
    "unsupported_verification_claim",
  ].includes(classId);
}

function selectByPrecedence(matches: string[]): string {
  if (matches.length === 0) {
    return "outside_approved_public_context";
  }

  for (const preferred of PRECEDENCE_ORDER) {
    if (matches.includes(preferred)) {
      return preferred;
    }
  }

  // Should not reach if all classes covered, but fail closed
  return "outside_approved_public_context";
}

export function classifyQuestion(rawQuestion: string): ClassificationResult {
  if (typeof rawQuestion !== "string" || rawQuestion.length === 0) {
    return buildResult("outside_approved_public_context", [], true);
  }

  const normalized = normalizeQuestion(rawQuestion);
  const matchedClasses = getMatches(normalized);
  const winningClass = selectByPrecedence(matchedClasses);

  const matchedRuleIds = matchedClasses.map((c) => `classify.${c}.v1`);
  const fallback = winningClass === "outside_approved_public_context";

  return buildResult(winningClass, matchedRuleIds, fallback);
}

function buildResult(
  questionClassId: string,
  matchedRuleIds: string[],
  fallbackUsed: boolean
): ClassificationResult {
  return {
    schema: "witnessops.ask.classification-result.v1",
    question_class_id: questionClassId,
    question_class_version: 1,
    classifier_contract_id: "ASK_DETERMINISTIC_CLASSIFIER_V1",
    classifier_contract_version: 1,
    decision_basis: "deterministic_rule",
    matched_rule_ids: matchedRuleIds,
    precedence_rule_id: null,
    fallback_used: fallbackUsed,
  };
}
