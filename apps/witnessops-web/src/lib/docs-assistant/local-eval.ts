import type { AnswerStatus } from "./answer-contract";

export type DocsAssistantEvalExecutionStatus =
  | "not_executable_until_corpus_collected"
  | "structural_only";

export type DocsAssistantRequiredCitationBehavior =
  | "not_required_for_cannot_claim"
  | "requires_citation_after_corpus_collected";

export interface DocsAssistantLocalEvalCase {
  case_id: string;
  question: string;
  expected_answer_status: AnswerStatus;
  execution_status: DocsAssistantEvalExecutionStatus;
  required_not_proven: string[];
  required_citation_behavior: DocsAssistantRequiredCitationBehavior;
  forbidden_claims: string[];
}

export interface DocsAssistantLocalEvalResult {
  case_id: string;
  status: "pass" | "fail";
  errors: string[];
}

export const DOCS_ASSISTANT_LOCAL_EVAL_VALID_STATUSES: readonly AnswerStatus[] = [
  "supported_by_docs",
  "partially_supported",
  "not_found_in_docs",
  "needs_human_review",
  "cannot_claim",
];

export function validateLocalEvalCase(
  evalCase: DocsAssistantLocalEvalCase,
): DocsAssistantLocalEvalResult {
  const errors: string[] = [];

  if (!evalCase.case_id) {
    errors.push("missing_case_id");
  }

  if (!evalCase.question) {
    errors.push("missing_question");
  }

  if (!DOCS_ASSISTANT_LOCAL_EVAL_VALID_STATUSES.includes(evalCase.expected_answer_status)) {
    errors.push("invalid_expected_answer_status");
  }

  if (evalCase.required_not_proven.length === 0) {
    errors.push("missing_required_not_proven_boundaries");
  }

  if (evalCase.forbidden_claims.length === 0) {
    errors.push("missing_forbidden_claims");
  }

  if (
    evalCase.execution_status === "not_executable_until_corpus_collected" &&
    evalCase.expected_answer_status !== "supported_by_docs"
  ) {
    errors.push("not_executable_cases_are_reserved_for_future_supported_answers");
  }

  if (
    evalCase.execution_status === "structural_only" &&
    evalCase.expected_answer_status !== "cannot_claim"
  ) {
    errors.push("structural_only_cases_must_fail_closed");
  }

  return {
    case_id: evalCase.case_id,
    status: errors.length === 0 ? "pass" : "fail",
    errors,
  };
}

export function runLocalEvalStub(
  cases: DocsAssistantLocalEvalCase[],
): DocsAssistantLocalEvalResult[] {
  return cases.map(validateLocalEvalCase);
}
