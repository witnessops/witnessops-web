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

const DOCS_ASSISTANT_CLAIM_SCHEMA = {
  type: "object",
  properties: {
    text: { type: "string" },
    citation_ids: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    },
  },
  required: ["text", "citation_ids"],
  additionalProperties: false,
} as const;

const DOCS_ASSISTANT_FILE_SEARCH_CITATION_SCHEMA = {
  type: "object",
  properties: {
    citation_id: { type: "string" },
    source_type: { type: "string", enum: ["openai_file_search_result"] },
    source_file_id: { type: "string" },
    filename: { type: "string" },
    source_artifact: { type: "string" },
    vector_store_id: { type: "string" },
    retrieved_result_index: { type: "integer" },
    supports: {
      type: "string",
      enum: ["collected_source_corpus_package", "corpus_plan_record_only"],
    },
    source_bodies_collected: { type: "boolean" },
    source_bodies_uploaded: { type: "boolean" },
  },
  required: [
    "citation_id",
    "source_type",
    "source_file_id",
    "filename",
    "source_artifact",
    "vector_store_id",
    "retrieved_result_index",
    "supports",
    "source_bodies_collected",
    "source_bodies_uploaded",
  ],
  additionalProperties: false,
} as const;

const DOCS_ASSISTANT_ANSWER_JSON_SCHEMA = {
  type: "object",
  properties: {
    schema_version: { type: "string", enum: ["docs-assistant.answer.v1"] },
    answer_status: {
      type: "string",
      enum: [
        "supported_by_docs",
        "partially_supported",
        "not_found_in_docs",
        "needs_human_review",
        "cannot_claim",
      ],
    },
    documented_facts: {
      type: "array",
      items: DOCS_ASSISTANT_CLAIM_SCHEMA,
    },
    inference: {
      type: "array",
      items: DOCS_ASSISTANT_CLAIM_SCHEMA,
    },
    citations: {
      type: "array",
      items: DOCS_ASSISTANT_FILE_SEARCH_CITATION_SCHEMA,
    },
    unsupported_reason: { type: ["string", "null"] },
    human_review_required: { type: "boolean" },
    not_proven: {
      type: "array",
      items: { type: "string" },
    },
    boundary_findings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "schema_version",
    "answer_status",
    "documented_facts",
    "inference",
    "citations",
    "unsupported_reason",
    "human_review_required",
    "not_proven",
    "boundary_findings",
  ],
  additionalProperties: false,
} as const;

const DOCS_ASSISTANT_BOUNDARY_INSTRUCTION = [
  "You are a staging probe for the WitnessOps Docs Assistant.",
  "Use only file_search results from the approved vector store.",
  "The vector store contains CORPUS_PLAN.json and CORPUS_PACKAGE.json.",
  "Source bodies are present only inside CORPUS_PACKAGE.json.",
  "Do not claim source freshness.",
  "Do not claim proof bundles, artifacts, compliance, security posture, assistant safety, production readiness, or public release are verified.",
  "If file_search results do not support the answer, return cannot_claim.",
  "Return exactly one JSON object matching the supplied schema. Do not return Markdown or prose outside the JSON object.",
  "Set schema_version to docs-assistant.answer.v1.",
  "For each documented_facts and inference claim, set citation_ids to the retrieved_result_index values (as strings) of the file_search results that support that claim, for example [\"0\", \"2\"].",
  "Leave the top-level citations array empty; the server binds the full file_search citations from the tool results.",
  "When retrieved docs support a bounded route purpose, use supported_by_docs or partially_supported and place broader limits in not_proven instead of refusing the whole answer.",
  "For verify-purpose questions, include source_freshness, general_answer_correctness, assistant_production_ready, and public_release_approved in not_proven.",
  "For cannot_claim, not_found_in_docs, or needs_human_review, include a non-empty unsupported_reason and stable not_proven boundaries.",
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
    text: {
      format: {
        type: "json_schema",
        name: "docs_assistant_answer",
        strict: true,
        schema: DOCS_ASSISTANT_ANSWER_JSON_SCHEMA,
      },
    },
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
