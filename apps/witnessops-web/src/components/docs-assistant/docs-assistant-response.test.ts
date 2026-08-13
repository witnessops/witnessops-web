import assert from "node:assert/strict";
import test from "node:test";

import type { DocsAssistantCitation } from "@/lib/docs-assistant/answer-contract";
import {
  answerText,
  citationSourceHref,
  citationSourceTarget,
  docsAssistantSourceId,
  supportingCitations,
} from "./docs-assistant-response";
import { boundarySourceHref } from "./docs-assistant-source-links";

test("docs assistant source URL citations link to the source URL", () => {
  const citation: DocsAssistantCitation = {
    citation_id: "src-witnessops-docs",
    source_type: "source_url",
    source_url: "https://witnessops.com/docs",
    title: "WitnessOps docs",
  };

  assert.equal(citationSourceHref(citation), "https://witnessops.com/docs");
  assert.equal(citationSourceTarget(citation), "external");
});

test("docs assistant repo-path citations link to GitHub source lines when line metadata exists", () => {
  const citation: DocsAssistantCitation = {
    citation_id: "src-contracts-schema",
    source_type: "repo_path",
    repo_path: "witnessops/witnessops-contracts:schemas/docs-assistant/answer.schema.json",
    title: "Docs assistant answer schema",
    source_line_start: 12,
    source_line_end: 18,
  };

  assert.equal(
    citationSourceHref(citation),
    "https://github.com/witnessops/witnessops-contracts/blob/main/schemas/docs-assistant/answer.schema.json#L12-L18",
  );
  assert.equal(citationSourceTarget(citation), "external");
});

test("docs assistant file-search citations target the retrieved result block", () => {
  const citation: DocsAssistantCitation = {
    citation_id: "src-collected-corpus-runtime-0",
    source_type: "openai_file_search_result",
    source_file_id: "file-9ztnkfLvWtUvi9ZY52q2UQ",
    filename: "CORPUS_PACKAGE.json",
    source_artifact: "CORPUS_PACKAGE.json",
    vector_store_id: "vs_69fe62ba0e8c81918d2763cece82f0c0",
    retrieved_result_index: 0,
    supports: "collected_source_corpus_package",
    source_bodies_collected: true,
    source_bodies_uploaded: true,
  };

  assert.equal(
    citationSourceHref(citation),
    `#${docsAssistantSourceId(citation)}`,
  );
  assert.equal(citationSourceTarget(citation), "in_page");
});

test("docs assistant unsupported reason does not double-punctuate sentences", () => {
  assert.equal(
    answerText({
      answer_status: "cannot_claim",
      documented_facts: [],
      inference: [],
      citations: [],
      unsupported_reason:
        "The user message 'lll' does not contain a discernible request that can be answered from the provided documents.",
      human_review_required: true,
      not_proven: ["user_intent"],
      boundary_findings: ["user_intent_not_discernible"],
    }),
    "I cannot answer that within the Ask WitnessOps public-material boundary. Do not paste secrets. For private systems, request a fit check. Verification claims require a named artifact, verifier, and proof path. Boundary reason: The user message 'lll' does not contain a discernible request that can be answered from the provided documents.",
  );
});

test("Ask WitnessOps refusal copy preserves the public proof boundary", () => {
  assert.equal(
    answerText({
      answer_status: "cannot_claim",
      documented_facts: [],
      inference: [],
      citations: [],
      unsupported_reason: "proof_bundle_verification_not_allowed",
      human_review_required: true,
      not_proven: ["proof_bundle_verification"],
      boundary_findings: [],
    }),
    "I cannot verify proof bundles or artifacts here. Verification claims require a named artifact, verifier, and proof path. For private systems, request a fit check.",
  );
});

test("Ask WitnessOps refusal copy ignores contradictory model claims", () => {
  assert.equal(
    answerText({
      answer_status: "cannot_claim",
      documented_facts: [
        { text: "An ungrounded model claim.", citation_ids: [] },
      ],
      inference: [],
      citations: [],
      unsupported_reason: "answer_not_supported_by_retrieved_docs",
      human_review_required: true,
      not_proven: ["answer_correctness"],
      boundary_findings: [],
    }),
    "I cannot answer that within the Ask WitnessOps public-material boundary. Do not paste secrets. For private systems, request a fit check. Verification claims require a named artifact, verifier, and proof path. Boundary reason: answer not supported by retrieved docs.",
  );
});

test("docs assistant source links use only claim-supporting citations", () => {
  const citation: DocsAssistantCitation = {
    citation_id: "src-collected-corpus-runtime-0",
    source_type: "openai_file_search_result",
    source_file_id: "file-9ztnkfLvWtUvi9ZY52q2UQ",
    filename: "CORPUS_PACKAGE.json",
    source_artifact: "CORPUS_PACKAGE.json",
    vector_store_id: "vs_69fe62ba0e8c81918d2763cece82f0c0",
    retrieved_result_index: 0,
    supports: "collected_source_corpus_package",
    source_bodies_collected: true,
    source_bodies_uploaded: true,
  };

  assert.deepEqual(
    supportingCitations({
      answer_status: "cannot_claim",
      documented_facts: [],
      inference: [],
      citations: [citation],
      unsupported_reason: "answer_not_supported_by_retrieved_docs",
      human_review_required: true,
      not_proven: ["general_answer_correctness"],
      boundary_findings: [],
    }),
    [],
  );

  assert.deepEqual(
    supportingCitations({
      answer_status: "supported_by_docs",
      documented_facts: [
        {
          text: "WitnessOps docs include a receipt verification page.",
          citation_ids: [citation.citation_id],
        },
      ],
      inference: [],
      citations: [citation],
      unsupported_reason: null,
      human_review_required: false,
      not_proven: [],
      boundary_findings: [],
    }),
    [citation],
  );

  assert.deepEqual(
    supportingCitations({
      answer_status: "supported_by_docs",
      documented_facts: [
        {
          text: "WitnessOps docs include a receipt verification page.",
          citation_ids: [],
        },
      ],
      inference: [],
      citations: [citation],
      unsupported_reason: null,
      human_review_required: false,
      not_proven: [],
      boundary_findings: [],
    }),
    [],
  );
});

test("docs assistant not-proven boundaries link to source lines where mapped", () => {
  assert.equal(
    boundarySourceHref("source_freshness"),
    "https://github.com/witnessops/witnessops-web/blob/main/docs/docs-assistant/DOCS_ASSISTANT_CORPUS_MANIFEST_RUNBOOK.md#L15",
  );
  assert.equal(
    boundarySourceHref("unknown_boundary"),
    null,
  );
});
