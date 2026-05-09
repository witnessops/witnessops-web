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
  "general_answer_correctness",
  "assistant_safe",
  "assistant_production_ready",
  "public_release_approved",
];

function isAnswerStatus(value: unknown): value is AnswerStatus {
  return typeof value === "string" && ANSWER_STATUSES.includes(value as AnswerStatus);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeClaims(
  value: unknown,
  fallbackCitationIds: string[],
): DocsAssistantClaimWithCitations[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const claims: DocsAssistantClaimWithCitations[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      claims.push({
        text: item.trim(),
        citation_ids: fallbackCitationIds,
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

    const citationIds = stringArray(typedItem.citation_ids);
    claims.push({
      text: typedItem.text.trim(),
      citation_ids: citationIds.length ? citationIds : fallbackCitationIds,
    });
  }

  return claims;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace < 0 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
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

      const text = (contentItem as { text?: unknown }).text;
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
  const citationIds = args.citations.map((citation) => citation.citation_id);
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

  return {
    schema_version: "docs-assistant.answer.v1",
    answer_status: parsed.answer_status,
    question: args.question,
    documented_facts: normalizeClaims(parsed.documented_facts, citationIds),
    inference: normalizeClaims(parsed.inference, citationIds),
    citations: args.citations,
    unsupported_reason:
      typeof parsed.unsupported_reason === "string"
        ? parsed.unsupported_reason
        : null,
    human_review_required:
      typeof parsed.human_review_required === "boolean"
        ? parsed.human_review_required
        : parsed.answer_status !== "supported_by_docs",
    not_proven: stringArray(parsed.not_proven),
    boundary_findings: boundaryFindings,
  };
}
