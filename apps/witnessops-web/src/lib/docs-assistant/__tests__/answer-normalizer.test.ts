import assert from "node:assert/strict";
import test from "node:test";

import { normalizeDocsAssistantAnswer } from "../answer-normalizer";
import type { DocsAssistantCitation } from "../answer-contract";

const citations: DocsAssistantCitation[] = [
  {
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
  },
];

test("docs assistant answer normalizer preserves cannot_claim", () => {
  const answer = normalizeDocsAssistantAnswer({
    question: "Can WitnessOps certify my company is compliant?",
    response: {
      output_text: JSON.stringify({
        answer_status: "cannot_claim",
        documented_facts: [],
        inference: [],
        citations: [],
        unsupported_reason: "compliance_certification_not_allowed",
        human_review_required: true,
        not_proven: [
          "compliance_correctness",
          "security_posture",
          "source_system_truth",
        ],
        boundary_findings: [],
      }),
    },
    citations,
  });

  assert.equal(answer.answer_status, "cannot_claim");
  assert.equal(answer.unsupported_reason, "compliance_certification_not_allowed");
  assert.deepEqual(answer.not_proven, [
    "compliance_correctness",
    "security_posture",
    "source_system_truth",
  ]);
  assert.equal(answer.citations.length, 1);
});

test("docs assistant answer normalizer fails malformed model output into human review", () => {
  const answer = normalizeDocsAssistantAnswer({
    question: "What is /verify for?",
    response: { output_text: "not-json" },
    citations: [],
  });

  assert.equal(answer.answer_status, "needs_human_review");
  assert.equal(answer.human_review_required, true);
  assert.equal(answer.unsupported_reason, "model_output_not_structured_json");
  assert.match(answer.boundary_findings.join(","), /model_output_not_structured_json/);
});
