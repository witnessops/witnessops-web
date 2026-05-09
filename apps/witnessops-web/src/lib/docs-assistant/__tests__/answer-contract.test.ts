import assert from "node:assert/strict";
import test from "node:test";

import type { AnswerStatus, DocsAssistantAnswer, DocsAssistantCitation } from "../answer-contract";

test("docs assistant answer contract type admits the bounded answer statuses", () => {
  const statuses: AnswerStatus[] = [
    "supported_by_docs",
    "partially_supported",
    "not_found_in_docs",
    "needs_human_review",
    "cannot_claim",
  ];

  assert.deepEqual(statuses, [
    "supported_by_docs",
    "partially_supported",
    "not_found_in_docs",
    "needs_human_review",
    "cannot_claim",
  ]);
});

test("docs assistant citation shape supports URL and repo-path references", () => {
  const sourceUrlCitation: DocsAssistantCitation = {
    citation_id: "src-witnessops-docs",
    source_type: "source_url",
    source_url: "https://witnessops.com/docs",
    title: "WitnessOps docs",
  };

  const repoPathCitation: DocsAssistantCitation = {
    citation_id: "src-contracts-schema",
    source_type: "repo_path",
    repo_path: "witnessops/witnessops-contracts:schemas/docs-assistant/answer.schema.json",
    title: "Docs assistant answer schema",
    source_hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
  };

  assert.equal(sourceUrlCitation.source_type, "source_url");
  assert.equal(repoPathCitation.source_type, "repo_path");
});

test("docs assistant citation shape supports OpenAI file-search result references", () => {
  const fileSearchCitation: DocsAssistantCitation = {
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

  assert.equal(fileSearchCitation.source_type, "openai_file_search_result");
  assert.equal(fileSearchCitation.filename, "CORPUS_PACKAGE.json");
});

test("docs assistant answer shape keeps facts, inference, citations, and not-proven boundaries separate", () => {
  const answer: DocsAssistantAnswer = {
    schema_version: "docs-assistant.answer.v1",
    answer_status: "not_found_in_docs",
    question: "Can the assistant prove customer compliance?",
    documented_facts: [],
    inference: [],
    citations: [],
    unsupported_reason: "Not found in approved docs.",
    human_review_required: true,
    not_proven: ["compliance_correctness", "source_system_truth"],
    boundary_findings: [],
  };

  assert.equal(answer.answer_status, "not_found_in_docs");
  assert.equal(answer.human_review_required, true);
  assert.deepEqual(answer.documented_facts, []);
  assert.deepEqual(answer.inference, []);
});
