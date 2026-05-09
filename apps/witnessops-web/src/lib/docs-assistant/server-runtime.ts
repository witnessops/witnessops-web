import type { DocsAssistantAnswer } from "./answer-contract";
import { normalizeDocsAssistantAnswer } from "./answer-normalizer";
import {
  extractFileSearchResultsFromResponse,
  normalizeFileSearchCitations,
} from "./citation-normalizer";
import type { DocsAssistantRuntimeEnabledConfig } from "./runtime-config";

export interface DocsAssistantAskPayload {
  question: string;
  case_id?: string;
}

export interface DocsAssistantPayloadValidationResult {
  ok: boolean;
  payload?: DocsAssistantAskPayload;
  error?: string;
}

export type DocsAssistantFetch = typeof fetch;

const DOCS_ASSISTANT_BOUNDARY_INSTRUCTION = [
  "You are a staging probe for the WitnessOps Docs Assistant.",
  "Use only file_search results from the approved vector store.",
  "The vector store contains CORPUS_PLAN.json and CORPUS_PACKAGE.json.",
  "Source bodies are present only inside CORPUS_PACKAGE.json.",
  "Do not claim source freshness.",
  "Do not claim proof bundles, artifacts, compliance, security posture, assistant safety, production readiness, or public release are verified.",
  "If file_search results do not support the answer, return cannot_claim.",
  "Return structured JSON only with answer_status, documented_facts, inference, citations, unsupported_reason, human_review_required, not_proven, and boundary_findings.",
].join(" ");

export function validateDocsAssistantAskPayload(
  raw: unknown,
): DocsAssistantPayloadValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "request_body_must_be_json_object" };
  }

  const typedRaw = raw as { question?: unknown; case_id?: unknown };
  if (typeof typedRaw.question !== "string" || !typedRaw.question.trim()) {
    return { ok: false, error: "question_must_be_non_empty_string" };
  }

  const question = typedRaw.question.trim();
  if (question.length > 2000) {
    return { ok: false, error: "question_too_long" };
  }

  if (
    typedRaw.case_id !== undefined &&
    (typeof typedRaw.case_id !== "string" || !typedRaw.case_id.trim())
  ) {
    return { ok: false, error: "case_id_must_be_non_empty_string" };
  }

  return {
    ok: true,
    payload: {
      question,
      case_id:
        typeof typedRaw.case_id === "string" ? typedRaw.case_id.trim() : undefined,
    },
  };
}

export function buildDocsAssistantResponsesRequest(args: {
  payload: DocsAssistantAskPayload;
  config: DocsAssistantRuntimeEnabledConfig;
}) {
  return {
    model: args.config.model,
    store: false,
    tools: [
      {
        type: "file_search",
        vector_store_ids: [args.config.vectorStoreId],
        max_num_results: 5,
      },
    ],
    tool_choice: { type: "file_search" },
    max_tool_calls: 1,
    include: ["file_search_call.results"],
    input: [
      {
        role: "developer",
        content: DOCS_ASSISTANT_BOUNDARY_INSTRUCTION,
      },
      {
        role: "user",
        content: args.payload.case_id
          ? `case_id: ${args.payload.case_id}\nquestion: ${args.payload.question}`
          : args.payload.question,
      },
    ],
  };
}

function buildRuntimeErrorAnswer(args: {
  question: string;
  unsupportedReason: string;
  boundaryFindings: string[];
}): DocsAssistantAnswer {
  return {
    schema_version: "docs-assistant.answer.v1",
    answer_status: "needs_human_review",
    question: args.question,
    documented_facts: [],
    inference: [],
    citations: [],
    unsupported_reason: args.unsupportedReason,
    human_review_required: true,
    not_proven: [
      "source_freshness",
      "general_answer_correctness",
      "assistant_safe",
      "assistant_production_ready",
      "public_release_approved",
    ],
    boundary_findings: args.boundaryFindings,
  };
}

export async function executeDocsAssistantResponsesRequest(args: {
  payload: DocsAssistantAskPayload;
  config: DocsAssistantRuntimeEnabledConfig;
  fetchImpl?: DocsAssistantFetch;
}): Promise<unknown> {
  const fetchImpl = args.fetchImpl ?? globalThis.fetch;
  const requestBody = buildDocsAssistantResponsesRequest({
    payload: args.payload,
    config: args.config,
  });

  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`openai_responses_request_failed:${response.status}`);
  }

  return response.json();
}

export async function runDocsAssistantServerRuntime(args: {
  payload: DocsAssistantAskPayload;
  config: DocsAssistantRuntimeEnabledConfig;
  fetchImpl?: DocsAssistantFetch;
}): Promise<DocsAssistantAnswer> {
  try {
    const response = await executeDocsAssistantResponsesRequest(args);
    const fileSearchResults = extractFileSearchResultsFromResponse(response);
    const normalizedCitations = normalizeFileSearchCitations({
      caseId: args.payload.case_id,
      vectorStoreId: args.config.vectorStoreId,
      results: fileSearchResults,
    });

    return normalizeDocsAssistantAnswer({
      question: args.payload.question,
      response,
      citations: normalizedCitations.citations,
      boundaryFindings: normalizedCitations.boundary_findings,
    });
  } catch (error) {
    return buildRuntimeErrorAnswer({
      question: args.payload.question,
      unsupportedReason: "docs_assistant_runtime_error",
      boundaryFindings: [
        error instanceof Error ? error.message : "unknown_runtime_error",
      ],
    });
  }
}
