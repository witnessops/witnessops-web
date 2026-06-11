import assert from "node:assert/strict";
import test from "node:test";

import {
  extractOutputTextFromResponse,
  normalizeDocsAssistantAnswer,
} from "../answer-normalizer";
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
  assert.deepEqual(
    [
      "compliance_correctness",
      "security_posture",
      "source_system_truth",
      "source_freshness",
      "answer_correctness",
      "general_answer_correctness",
      "assistant_production_ready",
      "public_release_approved",
    ].every((boundary) => answer.not_proven.includes(boundary)),
    true,
  );
  assert.equal(answer.citations.length, 1);
});

test("docs assistant answer normalizer adds stable not-proven labels to verify-purpose cannot_claim fallback", () => {
  const answer = normalizeDocsAssistantAnswer({
    question: "What is /verify for?",
    response: {
      output_text: JSON.stringify({
        answer_status: "cannot_claim",
        documented_facts: [],
        inference: [],
        citations: [],
        unsupported_reason: "",
        human_review_required: true,
        not_proven: ["That /verify is intended for broader runtime claims."],
        boundary_findings: [],
      }),
    },
    citations,
  });

  assert.equal(answer.answer_status, "cannot_claim");
  assert.equal(answer.unsupported_reason, "answer_not_supported_by_retrieved_docs");
  assert.deepEqual(
    [
      "source_freshness",
      "answer_correctness",
      "general_answer_correctness",
      "assistant_production_ready",
      "public_release_approved",
    ].every((boundary) => answer.not_proven.includes(boundary)),
    true,
  );
  assert.equal(answer.citations.length, 1);
});

test("docs assistant answer normalizer adds stable not-proven labels to not_found and human-review fallbacks", () => {
  for (const answerStatus of ["not_found_in_docs", "needs_human_review"] as const) {
    const answer = normalizeDocsAssistantAnswer({
      question: "What is outside the docs?",
      response: {
        output_text: JSON.stringify({
          answer_status: answerStatus,
          documented_facts: [],
          inference: [],
          citations: [],
          unsupported_reason: null,
          human_review_required: true,
          not_proven: [],
          boundary_findings: [],
        }),
      },
      citations: [],
    });

    assert.equal(answer.answer_status, answerStatus);
    assert.equal(answer.unsupported_reason, "answer_not_supported_by_retrieved_docs");
    assert.deepEqual(
      [
        "source_freshness",
        "answer_correctness",
        "general_answer_correctness",
        "assistant_production_ready",
        "public_release_approved",
      ].every((boundary) => answer.not_proven.includes(boundary)),
      true,
    );
  }
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

test("docs assistant answer normalizer rejects JSON embedded in prose", () => {
  const answer = normalizeDocsAssistantAnswer({
    question: "What is /verify for?",
    response: {
      output_text: `Here is the JSON: ${JSON.stringify({
        answer_status: "partially_supported",
        documented_facts: [],
        inference: [],
        citations: [],
        unsupported_reason: null,
        human_review_required: false,
        not_proven: ["source_freshness"],
        boundary_findings: [],
      })}`,
    },
    citations,
  });

  assert.equal(answer.answer_status, "needs_human_review");
  assert.equal(answer.unsupported_reason, "model_output_not_structured_json");
  assert.match(answer.boundary_findings.join(","), /model_output_not_structured_json/);
});

test("docs assistant answer normalizer keeps supported answers grounded by retrieval even when claim citations are unresolved", () => {
  const answer = normalizeDocsAssistantAnswer({
    question: "What does the public verifier prove?",
    response: {
      output_text: JSON.stringify({
        answer_status: "supported_by_docs",
        documented_facts: [
          {
            text: "The public verifier runs receipt-first checks.",
            citation_ids: [],
          },
        ],
        inference: [],
        citations: [],
        unsupported_reason: null,
        human_review_required: false,
        not_proven: ["source_freshness"],
        boundary_findings: [],
      }),
    },
    citations,
  });

  assert.equal(answer.answer_status, "supported_by_docs");
  assert.equal(answer.documented_facts.length, 1);
  assert.deepEqual(answer.documented_facts[0]?.citation_ids, []);
  assert.equal(answer.citations.length, 1);
});

test("docs assistant answer normalizer resolves claim citation indices to server citation ids", () => {
  const answer = normalizeDocsAssistantAnswer({
    question: "What does the public verifier prove?",
    response: {
      output_text: JSON.stringify({
        answer_status: "partially_supported",
        documented_facts: [
          {
            text: "The public verifier runs receipt-first checks.",
            citation_ids: ["0"],
          },
        ],
        inference: [],
        citations: [],
        unsupported_reason: null,
        human_review_required: false,
        not_proven: ["source_freshness"],
        boundary_findings: [],
      }),
    },
    citations,
  });

  assert.equal(answer.answer_status, "partially_supported");
  assert.deepEqual(answer.documented_facts[0]?.citation_ids, [
    "src-collected-corpus-runtime-0",
  ]);
});

test("docs assistant answer normalizer downgrades supported answers when retrieval returned no citations", () => {
  const answer = normalizeDocsAssistantAnswer({
    question: "What does the public verifier prove?",
    response: {
      output_text: JSON.stringify({
        answer_status: "supported_by_docs",
        documented_facts: [
          { text: "An ungrounded claim.", citation_ids: [] },
        ],
        inference: [],
        citations: [],
        unsupported_reason: null,
        human_review_required: false,
        not_proven: ["source_freshness"],
        boundary_findings: [],
      }),
    },
    citations: [],
  });

  assert.equal(answer.answer_status, "needs_human_review");
  assert.equal(
    answer.unsupported_reason,
    "supported_answer_missing_retrieved_citations",
  );
  assert.equal(answer.human_review_required, true);
  assert.deepEqual(answer.documented_facts, []);
  assert.match(
    answer.boundary_findings.join(","),
    /supported_answer_missing_retrieved_citations/,
  );
});

test("docs assistant answer normalizer downgrades supported answers with no stated claims", () => {
  const answer = normalizeDocsAssistantAnswer({
    question: "What does the public verifier prove?",
    response: {
      output_text: JSON.stringify({
        answer_status: "supported_by_docs",
        documented_facts: [],
        inference: [],
        citations: [],
        unsupported_reason: null,
        human_review_required: false,
        not_proven: ["source_freshness"],
        boundary_findings: [],
      }),
    },
    citations,
  });

  assert.equal(answer.answer_status, "needs_human_review");
  assert.equal(answer.unsupported_reason, "supported_answer_missing_claims");
  assert.deepEqual(answer.documented_facts, []);
});

test("docs assistant answer normalizer reads real Responses output_text content items", () => {
  const outputText = JSON.stringify({
    answer_status: "partially_supported",
    documented_facts: [
      {
        text: "The docs describe a bounded /verify receipt-check surface.",
        citation_ids: ["src-collected-corpus-runtime-0"],
      },
    ],
    inference: [],
    citations: [],
    unsupported_reason: null,
    human_review_required: false,
    not_proven: [
      "source_freshness",
      "general_answer_correctness",
      "public_release_approved",
    ],
    boundary_findings: [],
  });

  assert.equal(
    extractOutputTextFromResponse({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: outputText }],
        },
      ],
    }),
    outputText,
  );

  const answer = normalizeDocsAssistantAnswer({
    question: "What is /verify for?",
    response: {
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: outputText }],
        },
      ],
    },
    citations,
  });

  assert.equal(answer.answer_status, "partially_supported");
  assert.equal(answer.documented_facts.length, 1);
  assert.deepEqual(answer.documented_facts[0]?.citation_ids, [
    "src-collected-corpus-runtime-0",
  ]);
  assert.deepEqual(
    ["source_freshness", "general_answer_correctness", "public_release_approved"].every(
      (boundary) => answer.not_proven.includes(boundary),
    ),
    true,
  );
});
