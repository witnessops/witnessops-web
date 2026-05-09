import assert from "node:assert/strict";
import test from "node:test";

import {
  extractFileSearchResultsFromResponse,
  normalizeFileSearchCitations,
} from "../citation-normalizer";

test("docs assistant citation normalizer converts collected corpus file-search results", () => {
  const result = normalizeFileSearchCitations({
    caseId: "probe-verify-purpose",
    results: [
      {
        index: 0,
        file_id: "file-9ztnkfLvWtUvi9ZY52q2UQ",
        filename: "CORPUS_PACKAGE.json",
      },
    ],
  });

  assert.deepEqual(result.boundary_findings, []);
  assert.deepEqual(result.citations, [
    {
      citation_id: "src-collected-corpus-probe-verify-purpose-0",
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
  ]);
});

test("docs assistant citation normalizer records unexpected file-search result ids", () => {
  const result = normalizeFileSearchCitations({
    results: [{ index: 0, file_id: "file-unapproved", filename: "other.json" }],
  });

  assert.deepEqual(result.citations, []);
  assert.deepEqual(result.boundary_findings, [
    "unexpected_file_search_result_file_id:file-unapproved",
  ]);
});

test("docs assistant citation normalizer extracts file-search results from Responses output", () => {
  const results = extractFileSearchResultsFromResponse({
    output: [
      { type: "message", content: [] },
      {
        type: "file_search_call",
        results: [
          {
            file_id: "file-9ztnkfLvWtUvi9ZY52q2UQ",
            filename: "CORPUS_PACKAGE.json",
          },
        ],
      },
    ],
  });

  assert.deepEqual(results, [
    {
      index: 0,
      file_id: "file-9ztnkfLvWtUvi9ZY52q2UQ",
      filename: "CORPUS_PACKAGE.json",
    },
  ]);
});
