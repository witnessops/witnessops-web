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

  return `I cannot answer that within the approved docs assistant boundary. Boundary reason: ${reason.replaceAll("_", " ")}.`;
}

export function citationLabel(citation: DocsAssistantCitation): string {
  if (citation.source_type === "openai_file_search_result") {
    return citation.filename || citation.source_artifact;
  }

  return citation.title;
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
