import type {
  AnswerStatus,
  DocsAssistantAnswer,
  DocsAssistantCitation,
  DocsAssistantClaimWithCitations,
} from "./answer-contract";

const ANSWER_STATUSES: readonly AnswerStatus[] = [
  "supported_by_docs",
  "partially_supported",
  "not_found_in_docs",
  "needs_human_review",
  "cannot_claim",
];

const DEFAULT_NOT_PROVEN = [
  "source_freshness",
  "answer_correctness",
  "general_answer_correctness",
  "assistant_safe",
  "assistant_production_ready",
  "public_release_approved",
];

const NON_SUPPORTED_STATUSES: readonly AnswerStatus[] = [
  "cannot_claim",
  "not_found_in_docs",
  "needs_human_review",
];

const SUPPORTED_STATUSES: readonly AnswerStatus[] = [
  "supported_by_docs",
  "partially_supported",
];

const SUPPORTED_WITHOUT_RETRIEVAL_BOUNDARY =
  "supported_answer_missing_retrieved_citations";

const SUPPORTED_WITHOUT_CLAIMS_BOUNDARY = "supported_answer_missing_claims";

const SUPPORTED_WITHOUT_CLAIM_CITATIONS_BOUNDARY =
  "supported_answer_missing_claim_citations";

function isAnswerStatus(value: unknown): value is AnswerStatus {
  return typeof value === "string" && ANSWER_STATUSES.includes(value as AnswerStatus);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function needsNotProvenDefaults(answerStatus: AnswerStatus): boolean {
  return NON_SUPPORTED_STATUSES.includes(answerStatus);
}

function normalizeNotProven(value: unknown, answerStatus: AnswerStatus): string[] {
  const modelNotProven = stringArray(value);
  if (!needsNotProvenDefaults(answerStatus)) {
    return modelNotProven;
  }

  return unique([...modelNotProven, ...DEFAULT_NOT_PROVEN]);
}

function normalizeUnsupportedReason(
  value: unknown,
  answerStatus: AnswerStatus,
): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return needsNotProvenDefaults(answerStatus)
    ? "answer_not_supported_by_retrieved_docs"
    : null;
}

// The model is told to reference supporting file_search results by their
// retrieved_result_index (e.g. "0", "2"), because the full server citation IDs
// (prefix + case_id + index) are only minted after the model responds. This
// resolver maps whatever the model emits back to the server-bound citation IDs:
// an exact server ID, a bare index, or a value ending in the index.
function buildCitationResolver(
  citations: DocsAssistantCitation[],
): (raw: string) => string | null {
  const byId = new Set(citations.map((citation) => citation.citation_id));
  const byIndex = new Map(
    citations
      .filter(
        (citation) => citation.source_type === "openai_file_search_result",
      )
      .map((citation) => [
        String(citation.retrieved_result_index),
        citation.citation_id,
      ]),
  );

  return (raw: string): string | null => {
    const value = raw.trim();
    if (!value) {
      return null;
    }
    if (byId.has(value)) {
      return value;
    }
    if (byIndex.has(value)) {
      return byIndex.get(value) ?? null;
    }
    const trailingIndex = value.match(/(\d+)$/);
    if (trailingIndex && byIndex.has(trailingIndex[1])) {
      return byIndex.get(trailingIndex[1]) ?? null;
    }
    return null;
  };
}

function normalizeClaims(
  value: unknown,
  resolveCitationId: (raw: string) => string | null,
): DocsAssistantClaimWithCitations[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const claims: DocsAssistantClaimWithCitations[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      claims.push({
        text: item.trim(),
        citation_ids: [],
      });
      continue;
    }

    if (!item || typeof item !== "object") {
      continue;
    }

    const typedItem = item as { text?: unknown; citation_ids?: unknown };
    if (typeof typedItem.text !== "string" || !typedItem.text.trim()) {
      continue;
    }

    const citationIds = stringArray(typedItem.citation_ids)
      .map((citationId) => resolveCitationId(citationId))
      .filter((citationId): citationId is string => citationId !== null);
    claims.push({
      text: typedItem.text.trim(),
      citation_ids: unique(citationIds),
    });
  }

  return claims;
}

function isSupportedStatus(answerStatus: AnswerStatus): boolean {
  return SUPPORTED_STATUSES.includes(answerStatus);
}

// Supported status is fail-closed: global retrieval is not enough. Every claim
// must bind to at least one citation ID resolved from approved retrieval output.
function supportedDowngradeReason(
  answerStatus: AnswerStatus,
  claims: DocsAssistantClaimWithCitations[],
  hasRetrievalCitations: boolean,
): string | null {
  if (!isSupportedStatus(answerStatus)) {
    return null;
  }
  if (!hasRetrievalCitations) {
    return SUPPORTED_WITHOUT_RETRIEVAL_BOUNDARY;
  }
  if (claims.length === 0) {
    return SUPPORTED_WITHOUT_CLAIMS_BOUNDARY;
  }
  if (claims.some((claim) => claim.citation_ids.length === 0)) {
    return SUPPORTED_WITHOUT_CLAIM_CITATIONS_BOUNDARY;
  }
  return null;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function extractOutputTextFromResponse(response: unknown): string | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const outputText = (response as { output_text?: unknown }).output_text;
  if (typeof outputText === "string") {
    return outputText;
  }

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return null;
  }

  const fragments: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") {
        continue;
      }

      const typedContentItem = contentItem as { type?: unknown; text?: unknown };
      if (
        typedContentItem.type !== undefined &&
        typedContentItem.type !== "output_text"
      ) {
        continue;
      }

      const text = typedContentItem.text;
      if (typeof text === "string") {
        fragments.push(text);
      }
    }
  }

  return fragments.length ? fragments.join("\n") : null;
}

export function normalizeDocsAssistantAnswer(args: {
  question: string;
  response: unknown;
  citations: DocsAssistantCitation[];
  boundaryFindings?: string[];
}): DocsAssistantAnswer {
  const resolveCitationId = buildCitationResolver(args.citations);
  const outputText = extractOutputTextFromResponse(args.response);
  const parsed = outputText ? parseJsonObject(outputText) : null;

  if (!parsed || !isAnswerStatus(parsed.answer_status)) {
    return {
      schema_version: "docs-assistant.answer.v1",
      answer_status: "needs_human_review",
      question: args.question,
      documented_facts: [],
      inference: [],
      citations: args.citations,
      unsupported_reason: "model_output_not_structured_json",
      human_review_required: true,
      not_proven: DEFAULT_NOT_PROVEN,
      boundary_findings: [
        ...(args.boundaryFindings ?? []),
        "model_output_not_structured_json",
      ],
    };
  }

  const boundaryFindings = [
    ...(args.boundaryFindings ?? []),
    ...stringArray(parsed.boundary_findings),
  ];
  const documentedFacts = normalizeClaims(parsed.documented_facts, resolveCitationId);
  const inference = normalizeClaims(parsed.inference, resolveCitationId);
  const allClaims = [...documentedFacts, ...inference];

  const downgradeReason = supportedDowngradeReason(
    parsed.answer_status,
    allClaims,
    args.citations.length > 0,
  );
  if (downgradeReason) {
    return {
      schema_version: "docs-assistant.answer.v1",
      answer_status: "needs_human_review",
      question: args.question,
      documented_facts: [],
      inference: [],
      citations: args.citations,
      unsupported_reason: downgradeReason,
      human_review_required: true,
      not_proven: normalizeNotProven(parsed.not_proven, "needs_human_review"),
      boundary_findings: unique([...boundaryFindings, downgradeReason]),
    };
  }

  return {
    schema_version: "docs-assistant.answer.v1",
    answer_status: parsed.answer_status,
    question: args.question,
    documented_facts: documentedFacts,
    inference,
    citations: args.citations,
    unsupported_reason: normalizeUnsupportedReason(
      parsed.unsupported_reason,
      parsed.answer_status,
    ),
    human_review_required:
      typeof parsed.human_review_required === "boolean"
        ? parsed.human_review_required
        : parsed.answer_status !== "supported_by_docs",
    not_proven: normalizeNotProven(parsed.not_proven, parsed.answer_status),
    boundary_findings: boundaryFindings,
  };
}
