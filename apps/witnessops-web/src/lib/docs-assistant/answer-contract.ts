export type AnswerStatus =
  | "supported_by_docs"
  | "partially_supported"
  | "not_found_in_docs"
  | "needs_human_review"
  | "cannot_claim";

export type DocsAssistantSourceType =
  | "source_url"
  | "repo_path"
  | "openai_file_search_result";

export type DocsAssistantFileSearchSupports =
  | "collected_source_corpus_package"
  | "corpus_plan_record_only";

export interface DocsAssistantSourceUrlCitation {
  citation_id: string;
  source_type: "source_url";
  source_url: string;
  title: string;
  section?: string | null;
  source_hash?: string | null;
  source_line_start?: number | null;
  source_line_end?: number | null;
}

export interface DocsAssistantRepoPathCitation {
  citation_id: string;
  source_type: "repo_path";
  repo_path: string;
  title: string;
  section?: string | null;
  source_hash?: string | null;
  source_line_start?: number | null;
  source_line_end?: number | null;
}

export interface DocsAssistantFileSearchCitation {
  citation_id: string;
  source_type: "openai_file_search_result";
  source_file_id: string;
  filename: string;
  source_artifact: string;
  vector_store_id: string;
  retrieved_result_index: number;
  supports: DocsAssistantFileSearchSupports;
  source_bodies_collected: boolean;
  source_bodies_uploaded: boolean;
  source_excerpt?: string | null;
  source_line_start?: number | null;
  source_line_end?: number | null;
}

export type DocsAssistantCitation =
  | DocsAssistantSourceUrlCitation
  | DocsAssistantRepoPathCitation
  | DocsAssistantFileSearchCitation;

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
  boundary_findings: string[];
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
