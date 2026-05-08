export type AnswerStatus =
  | "supported_by_docs"
  | "partially_supported"
  | "not_found_in_docs"
  | "needs_human_review"
  | "cannot_claim";

export type DocsAssistantSourceType = "source_url" | "repo_path";

export interface DocsAssistantCitation {
  citation_id: string;
  source_type: DocsAssistantSourceType;
  source_url?: string;
  repo_path?: string;
  title: string;
  section?: string | null;
  source_hash?: string | null;
}

export interface DocsAssistantClaimWithCitations {
  text: string;
  citation_ids: string[];
}

export interface DocsAssistantAnswer {
  schema_version: "docs-assistant.answer.v1";
  answer_status: AnswerStatus;
  question: string;
  documented_facts: DocsAssistantClaimWithCitations[];
  inference: DocsAssistantClaimWithCitations[];
  citations: DocsAssistantCitation[];
  unsupported_reason: string | null;
  human_review_required: boolean;
  not_proven: string[];
}

export interface DocsAssistantDisabledResponse {
  schema_version: "docs-assistant.disabled.v1";
  status: "disabled";
  answer_status: "cannot_claim";
  message: "WitnessOps Docs Assistant is not enabled.";
  human_review_required: true;
  not_proven: readonly [
    "assistant_implemented",
    "retrieval_configured",
    "model_call_enabled",
    "source_freshness",
    "answer_correctness",
    "artifact_verification",
    "proof_bundle_verification",
    "production_readiness",
  ];
}
