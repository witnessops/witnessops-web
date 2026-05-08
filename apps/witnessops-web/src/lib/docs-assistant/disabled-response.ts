import type { DocsAssistantDisabledResponse } from "./answer-contract";

export const DOCS_ASSISTANT_DISABLED_RESPONSE: DocsAssistantDisabledResponse = {
  schema_version: "docs-assistant.disabled.v1",
  status: "disabled",
  answer_status: "cannot_claim",
  message: "WitnessOps Docs Assistant is not enabled.",
  human_review_required: true,
  not_proven: [
    "assistant_implemented",
    "retrieval_configured",
    "model_call_enabled",
    "source_freshness",
    "answer_correctness",
    "artifact_verification",
    "proof_bundle_verification",
    "production_readiness",
  ],
};

export function buildDocsAssistantDisabledResponse(): DocsAssistantDisabledResponse {
  return DOCS_ASSISTANT_DISABLED_RESPONSE;
}
