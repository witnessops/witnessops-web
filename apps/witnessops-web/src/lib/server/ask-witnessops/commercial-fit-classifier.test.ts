import assert from "node:assert/strict";
import test from "node:test";

import { classifyQuestion } from "./authority-classifier";
import { classifyCommercialFit } from "./commercial-fit-classifier";

const CURRENT_PRIMARY_OFFER = {
  name: "Agent Action Security Review",
  price_label: "€2,500 fixed · excluding VAT",
  unit_label: "One consequential agent or automation action",
  fit_check_label: "Non-secret fit check first",
  delivery_label: "Within 10 working days after evidence rules are agreed",
} as const;

function classify(question: string) {
  const authorityClassification = classifyQuestion(question);
  const commercialFit = classifyCommercialFit({
    question,
    authorityQuestionClassId: authorityClassification.question_class_id,
  });

  return {
    authorityClassification,
    commercialFit,
  };
}

test("recognizes a natural-language agent key-rotation buyer situation", () => {
  const result = classify(
    "We use an AI agent to rotate compromised production API keys. How do we prove who authorized it, what changed, and whether the old key was revoked?",
  );

  assert.equal(
    result.authorityClassification.question_class_id,
    "outside_approved_public_context",
  );
  assert.equal(result.commercialFit.result, "likely");
  assert.equal(result.commercialFit.intent, "workflow");
  assert.equal(result.commercialFit.offer_id, "bounded-workflow-review");
  assert.deepEqual(result.commercialFit.offer, CURRENT_PRIMARY_OFFER);
  assert.equal(
    result.commercialFit.matching_specimen_id,
    "ai-agent-action-proof-run",
  );
  assert.equal(result.authorityClassification.fallback_used, true);
});

test("recognizes the current offer and pricing question without inventing a new policy", () => {
  const result = classify(
    "What is included in Agent Action Security Review and how much does it cost?",
  );

  assert.equal(result.commercialFit.result, "likely");
  assert.equal(result.commercialFit.intent, "offer");
  assert.deepEqual(result.commercialFit.offer, CURRENT_PRIMARY_OFFER);
  assert.equal(
    result.authorityClassification.question_class_id,
    "outside_approved_public_context",
  );
});

test("accepts the former offer name only as an input alias and returns the current offer", () => {
  const result = classify(
    "What is included in the Agent Risk & Control Review and how much does it cost?",
  );

  assert.equal(result.commercialFit.result, "likely");
  assert.equal(result.commercialFit.intent, "offer");
  assert.deepEqual(result.commercialFit.offer, CURRENT_PRIMARY_OFFER);
});

test("accepts the delivery-method name only as an input alias and returns the public offer", () => {
  const result = classify(
    "What is included in Agent Workflow Reconstruction and how much does it cost?",
  );

  assert.equal(result.commercialFit.result, "likely");
  assert.equal(result.commercialFit.intent, "offer");
  assert.deepEqual(result.commercialFit.offer, CURRENT_PRIMARY_OFFER);
});

test("keeps an existing governed authority classification unchanged", () => {
  const result = classify("Can WitnessOps review one bounded AI-agent action?");

  assert.equal(
    result.authorityClassification.question_class_id,
    "ai_agent_action",
  );
  assert.equal(result.commercialFit.result, "likely");
});

test("blocks likely secrets before any commercial offer is presented", () => {
  const result = classify(
    "Our AI agent used api_key=sk-proj-abcdefghijklmnopqrstuv to rotate a credential.",
  );

  assert.equal(result.commercialFit.result, "blocked");
  assert.equal(result.commercialFit.offer, null);
  assert.equal(result.authorityClassification.question_class_id, "outside_approved_public_context");
});

test("does not sell certification or live incident response", () => {
  assert.equal(
    classify("Can you certify our workflow as EU AI Act compliant?")
      .commercialFit.result,
    "not_fit",
  );
  assert.equal(
    classify("We are under active ransomware attack right now").commercialFit
      .result,
    "not_fit",
  );
});

test("marks whole-estate requests as needing a one-workflow boundary", () => {
  const result = classify("Audit our entire cloud environment");

  assert.equal(result.commercialFit.result, "needs_boundary");
  assert.deepEqual(result.commercialFit.offer, CURRENT_PRIMARY_OFFER);
});

test("marks multi-workflow agent requests as needing a one-workflow boundary", () => {
  assert.equal(
    classify("Review every AI-agent workflow across production").commercialFit
      .result,
    "needs_boundary",
  );
});

test("whole-estate narrowing wins over an otherwise likely agent workflow", () => {
  assert.equal(
    classify("Review our AI agent across our entire cloud environment")
      .commercialFit.result,
    "needs_boundary",
  );
});

test("does not treat unrelated pricing as a WitnessOps offer question", () => {
  assert.equal(classify("How much does AWS cost?").commercialFit.result, "unknown");
  assert.equal(
    classify("How much does an AWS automated workflow cost?").commercialFit
      .result,
    "unknown",
  );
});

test("detects common JSON, environment, and provider secret forms", () => {
  for (const question of [
    'Our AI agent used {"apiKey":"supersecretvalue123"} to rotate a credential',
    "Our automation used AWS_SECRET_ACCESS_KEY=supersecretvalue123",
    "The workflow used github_pat_abcdefghijklmnopqrstuvwxyz123456",
    "The agent used eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmno",
    "The request included Authorization: Basic dXNlcjpwYXNz",
    "The agent read -----BEGIN ENCRYPTED PRIVATE KEY-----",
  ]) {
    assert.equal(classify(question).commercialFit.result, "blocked", question);
  }
});

test("blocks unauthorized competitor and no-permission variants", () => {
  assert.equal(
    classify("Can our AI agent probe a rival without permission?").commercialFit
      .result,
    "blocked",
  );
  assert.equal(
    classify("Can our AI agent steal credentials from a rival?").commercialFit
      .result,
    "blocked",
  );
  assert.equal(
    classify("Can our AI agent scan it without approval?").commercialFit.result,
    "blocked",
  );
});

test("suppresses an offer during current hack and breach variants", () => {
  for (const question of [
    "Can you review our AI agent while our systems are currently being hacked?",
    "Can you review the automation during a live breach?",
  ]) {
    assert.equal(classify(question).commercialFit.result, "not_fit", question);
  }
});

test("suppresses an offer for requested security conclusions", () => {
  const result = classify("Can WitnessOps verify that our AI agent is secure?");
  assert.equal(result.commercialFit.result, "not_fit");
  assert.equal(result.commercialFit.offer, null);
});
