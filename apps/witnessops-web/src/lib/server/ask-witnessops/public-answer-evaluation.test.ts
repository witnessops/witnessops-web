import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_ASK_EVALUATION_CASES, scorePublicAskEvaluation } from "./public-answer-evaluation";
import { normalizeAskRequest } from "./ask-request-normalizer";

test("buyer evaluation fixtures fit the real request contract and cover continuity and boundaries", () => {
  assert.equal(new Set(PUBLIC_ASK_EVALUATION_CASES.map((item) => item.id)).size, PUBLIC_ASK_EVALUATION_CASES.length);
  for (const item of PUBLIC_ASK_EVALUATION_CASES) assert.equal(normalizeAskRequest(item.request).ok, true, item.id);
  assert.ok(PUBLIC_ASK_EVALUATION_CASES.some((item) => item.id === "timing-follow-up"));
  assert.ok(PUBLIC_ASK_EVALUATION_CASES.some((item) => item.id === "explicit-service-over-page"));
  assert.ok(PUBLIC_ASK_EVALUATION_CASES.some((item) => item.id === "synthetic-secret-history"));
});

test("evaluation catches the wrong offer, provider fallback and missing answer rather than counting an HTTP200 as success", () => {
  const item = PUBLIC_ASK_EVALUATION_CASES.find((entry) => entry.id === "timing-follow-up")!;
  assert.deepEqual(scorePublicAskEvaluation(item, { answer_mode: "ai_assisted", recommendation: { service_id: "one-server-security-check" }, template: { body: "The delivery details are below." } }), []);
  assert.ok(scorePublicAskEvaluation(item, { answer_mode: "ai_assisted", recommendation: { service_id: "bounded-workflow-review" }, template: { body: "Details below." } }).includes("expected service one-server-security-check"));
  assert.ok(scorePublicAskEvaluation(item, { answer_mode: "deterministic_fallback", recommendation: null, template: { body: "Guide" } }).includes("expected mode ai_assisted"));
  assert.ok(scorePublicAskEvaluation(item, { answer_mode: "ai_assisted", recommendation: { service_id: "one-server-security-check" } }).includes("missing visible answer"));
});
