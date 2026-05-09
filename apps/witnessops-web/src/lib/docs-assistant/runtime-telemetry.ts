import { createHash } from "node:crypto";

import type { AnswerStatus } from "./answer-contract";

export interface DocsAssistantTelemetryInput {
  requestId: string;
  caseId?: string | null;
  question: string;
  answerStatus: AnswerStatus;
  citationCount: number;
  latencyMs: number;
  errorClass?: string | null;
}

export interface DocsAssistantTelemetryEvent {
  request_id: string;
  case_id: string | null;
  question_sha256: string;
  answer_status: AnswerStatus;
  citation_count: number;
  latency_ms: number;
  error_class: string | null;
}

export function hashDocsAssistantQuestion(question: string): string {
  return `sha256:${createHash("sha256").update(question).digest("hex")}`;
}

export function buildDocsAssistantTelemetryEvent(
  input: DocsAssistantTelemetryInput,
): DocsAssistantTelemetryEvent {
  return {
    request_id: input.requestId,
    case_id: input.caseId ?? null,
    question_sha256: hashDocsAssistantQuestion(input.question),
    answer_status: input.answerStatus,
    citation_count: input.citationCount,
    latency_ms: input.latencyMs,
    error_class: input.errorClass ?? null,
  };
}
