import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  DOCS_ASSISTANT_LOCAL_EVAL_VALID_STATUSES,
  type DocsAssistantLocalEvalCase,
  runLocalEvalStub,
} from "../local-eval";

function loadEvalFixture(name: string): DocsAssistantLocalEvalCase {
  return JSON.parse(
    readFileSync(resolve(__dirname, `../fixtures/evals/${name}.json`), "utf-8"),
  ) as DocsAssistantLocalEvalCase;
}

test("docs assistant local eval fixtures use valid answer statuses", () => {
  const cases = [
    loadEvalFixture("supported"),
    loadEvalFixture("unsupported"),
    loadEvalFixture("boundary"),
  ];

  for (const evalCase of cases) {
    assert.ok(
      DOCS_ASSISTANT_LOCAL_EVAL_VALID_STATUSES.includes(
        evalCase.expected_answer_status,
      ),
      evalCase.case_id,
    );
  }
});

test("docs assistant local eval fixtures require not-proven boundaries", () => {
  const cases = [
    loadEvalFixture("supported"),
    loadEvalFixture("unsupported"),
    loadEvalFixture("boundary"),
  ];

  for (const evalCase of cases) {
    assert.ok(evalCase.required_not_proven.length > 0, evalCase.case_id);
    assert.ok(evalCase.forbidden_claims.length > 0, evalCase.case_id);
  }
});

test("docs assistant local eval stub is deterministic and structural only", () => {
  const cases = [
    loadEvalFixture("supported"),
    loadEvalFixture("unsupported"),
    loadEvalFixture("boundary"),
  ];

  const firstRun = runLocalEvalStub(cases);
  const secondRun = runLocalEvalStub(cases);

  assert.deepEqual(firstRun, secondRun);
  assert.deepEqual(
    firstRun.map((result) => result.status),
    ["pass", "pass", "pass"],
  );
});

test("docs assistant local eval module has no network model upload or platform path", () => {
  const source = readFileSync(resolve(__dirname, "../local-eval.ts"), "utf-8");

  assert.doesNotMatch(source, /OpenAI|OPENAI_API_KEY|WITNESSOPS_DOCS_ASSISTANT_/);
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /crawl/i);
  assert.doesNotMatch(source, /upload/i);
  assert.doesNotMatch(source, /vector[-_ ]?store/i);
});
