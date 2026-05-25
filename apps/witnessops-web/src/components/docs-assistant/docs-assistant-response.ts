import type {
  DocsAssistantAnswer,
  DocsAssistantCitation,
} from "@/lib/docs-assistant/answer-contract";

export type DocsAssistantUiAnswer = Pick<
  DocsAssistantAnswer,
  | "answer_status"
  | "documented_facts"
  | "inference"
  | "citations"
  | "unsupported_reason"
  | "human_review_required"
  | "not_proven"
  | "boundary_findings"
>;

export interface DocsAssistantRequestErrorDetails {
  message: string;
  answer?: DocsAssistantUiAnswer;
}

export function answerText(answer: DocsAssistantUiAnswer): string {
  const facts = answer.documented_facts.map((claim) => claim.text);
  const inferences = answer.inference.map((claim) => claim.text);
  const lines = [...facts, ...inferences];

  if (lines.length > 0) {
    return lines.join("\n\n");
  }

  if (answer.unsupported_reason) {
    return friendlyUnsupportedReason(answer.unsupported_reason);
  }

  return answer.answer_status.replaceAll("_", " ");
}

export async function docsAssistantRequestErrorMessage(
  response: Response,
): Promise<string> {
  return (await docsAssistantRequestErrorDetails(response)).message;
}

export async function docsAssistantRequestErrorDetails(
  response: Response,
): Promise<DocsAssistantRequestErrorDetails> {
  try {
    const payload: unknown = await response.clone().json();

    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
    ) {
      return {
        message: payload.message,
        answer: boundaryAnswerFromPayload(payload),
      };
    }

    const answer = boundaryAnswerFromPayload(payload);
    if (answer) {
      return {
        message: `Docs Assistant request failed (${response.status}).`,
        answer,
      };
    }
  } catch {
    // Fall back to a status-based message when the response body is not JSON.
  }

  return { message: `Docs Assistant request failed (${response.status}).` };
}

export function boundaryLabel(label: string): string {
  const labels: Record<string, string> = {
    answer_correctness: "answer correctness",
    artifact_verification: "artifact verification",
    assistant_implemented: "assistant implementation",
    assistant_production_ready: "production readiness",
    assistant_safe: "assistant safety",
    compliance_correctness: "compliance correctness",
    general_answer_correctness: "general answer correctness",
    model_call_enabled: "model call enabled",
    production_readiness: "production readiness",
    proof_bundle_verification: "proof bundle verification",
    public_release_approved: "public release approval",
    retrieval_configured: "retrieval configured",
    security_posture: "security posture",
    source_freshness: "source freshness",
    source_system_truth: "source-system truth",
    verifier_authority: "verifier authority",
  };

  return labels[label] ?? label.replaceAll("_", " ");
}

function friendlyUnsupportedReason(reason: string): string {
  if (reason === "production_readiness_not_allowed") {
    return "I cannot claim production readiness from the docs assistant boundary. A human review is required for that claim.";
  }

  if (reason === "proof_bundle_verification_not_allowed") {
    return "I cannot verify proof bundles or artifacts. Use the approved verifier path for receipt-scoped checks, or ask a human to review the broader proof package.";
  }

  if (reason === "compliance_certification_not_allowed") {
    return "I cannot certify compliance or security posture. The docs assistant can only summarize approved documentation with its stated limits.";
  }

  const normalizedReason = reason.replaceAll("_", " ").trim();
  const punctuatedReason = /[.!?]$/.test(normalizedReason)
    ? normalizedReason
    : `${normalizedReason}.`;

  return `I cannot answer that within the approved docs assistant boundary. Boundary reason: ${punctuatedReason}`;
}

function boundaryAnswerFromPayload(payload: unknown): DocsAssistantUiAnswer | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const humanReviewRequired =
    typeof record.human_review_required === "boolean"
      ? record.human_review_required
      : false;
  const notProven = stringArray(record.not_proven);
  const boundaryFindings = stringArray(record.boundary_findings);
  const hasBoundary =
    humanReviewRequired || notProven.length > 0 || boundaryFindings.length > 0;

  if (!hasBoundary) {
    return undefined;
  }

  return {
    answer_status: "cannot_claim",
    documented_facts: [],
    inference: [],
    citations: [],
    unsupported_reason: null,
    human_review_required: humanReviewRequired,
    not_proven: notProven,
    boundary_findings: boundaryFindings,
  };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function citationLabel(citation: DocsAssistantCitation): string {
  if (citation.source_type === "openai_file_search_result") {
    return citation.filename || citation.source_artifact;
  }

  return citation.title;
}

export type DocsAssistantCitationTarget = "external" | "in_page";

export function citationSourceTarget(
  citation: DocsAssistantCitation,
): DocsAssistantCitationTarget {
  return citation.source_type === "openai_file_search_result"
    ? "in_page"
    : "external";
}

export function citationSourceHref(citation: DocsAssistantCitation): string | null {
  if (citation.source_type === "source_url") {
    return withOptionalHash(
      withOptionalLineFragment(citation.source_url, citation),
      citation.section,
    );
  }

  if (citation.source_type === "repo_path") {
    return repoPathHref(citation);
  }

  return `#${docsAssistantSourceId(citation)}`;
}

export function docsAssistantSourceId(citation: DocsAssistantCitation): string {
  return `docs-assistant-source-${citation.citation_id.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

export function visibleCitations(
  citations: DocsAssistantUiAnswer["citations"],
): DocsAssistantUiAnswer["citations"] {
  const seen = new Set<string>();
  const unique: DocsAssistantUiAnswer["citations"] = [];

  for (const citation of citations) {
    const key =
      citation.source_type === "openai_file_search_result"
        ? `${citation.source_file_id}:${citation.filename}`
        : citation.citation_id;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(citation);
    }
  }

  return unique;
}

export function supportingCitations(
  answer: DocsAssistantUiAnswer,
): DocsAssistantUiAnswer["citations"] {
  if (
    answer.answer_status !== "supported_by_docs" &&
    answer.answer_status !== "partially_supported"
  ) {
    return [];
  }

  const citedIds = new Set(
    [...answer.documented_facts, ...answer.inference].flatMap(
      (claim) => claim.citation_ids,
    ),
  );

  if (citedIds.size === 0) {
    return [];
  }

  return visibleCitations(
    answer.citations.filter((citation) => citedIds.has(citation.citation_id)),
  );
}

function repoPathHref(citation: Extract<DocsAssistantCitation, { source_type: "repo_path" }>): string | null {
  if (/^https?:\/\//.test(citation.repo_path)) {
    return withOptionalHash(
      withOptionalLineFragment(citation.repo_path, citation),
      citation.section,
    );
  }

  const [repo, repoPath] = citation.repo_path.split(":");
  if (!repo || !repoPath) {
    return null;
  }

  return withOptionalHash(
    withOptionalLineFragment(
      `https://github.com/${repo}/blob/main/${repoPath}`,
      citation,
    ),
    citation.section,
  );
}

function withOptionalLineFragment(
  href: string,
  citation: Pick<DocsAssistantCitation, "source_line_start" | "source_line_end">,
): string {
  if (typeof citation.source_line_start !== "number") {
    return href;
  }

  const lineEnd =
    typeof citation.source_line_end === "number" &&
    citation.source_line_end > citation.source_line_start
      ? `-L${citation.source_line_end}`
      : "";

  return `${href}#L${citation.source_line_start}${lineEnd}`;
}

function withOptionalHash(href: string, section: string | null | undefined): string {
  if (!section || href.includes("#")) {
    return href;
  }

  if (section.startsWith("#")) {
    return `${href}${section}`;
  }

  return href;
}
