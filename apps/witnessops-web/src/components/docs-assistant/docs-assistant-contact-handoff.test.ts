import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAskAiContactRequest,
  buildAskAiContactScope,
} from "./docs-assistant-contact-handoff";

const likelyWorkflowFit = {
  schema: "witnessops.ask.commercial-fit.v1" as const,
  result: "likely" as const,
  intent: "workflow" as const,
  offer_id: "bounded-workflow-review" as const,
  source: "ask" as const,
  offer: {
    name: "Agent Risk & Control Review" as const,
    price_label: "From €1,500" as const,
    unit_label: "One agentic or automated workflow" as const,
  },
  matching_specimen_id: "ai-agent-action-proof-run" as const,
};

test("Ask AI contact handoff records controlled fit fields and the explicit note", () => {
  const rawAskPrompt =
    "We use an AI agent to rotate compromised production API keys.";
  const scope = buildAskAiContactScope(
    "  Discuss one agent workflow.  ",
    likelyWorkflowFit,
  );

  assert.match(scope, /Contact path: Ask AI panel handoff/);
  assert.match(scope, /Offer: bounded-workflow-review/);
  assert.match(scope, /Commercial fit signal: likely/);
  assert.match(scope, /Commercial intent: workflow/);
  assert.match(scope, /Source: ask/);
  assert.match(scope, /Visitor note: Discuss one agent workflow\./);
  assert.match(scope, /mailbox verification/);
  assert.match(scope, /No review starts/);
  assert.match(scope, /no files, secrets, logs, screenshots/);
  assert.doesNotMatch(scope, new RegExp(rawAskPrompt));
  assert.doesNotMatch(scope, /From €1,500/);
  assert.doesNotMatch(scope, /ai-agent-action-proof-run/);
});

test("Ask AI contact handoff keeps an omitted note explicit", () => {
  assert.match(buildAskAiContactScope("   "), /Visitor note: not provided/);
});

test("the actual contact request body excludes the raw Ask question", () => {
  const rawAskPrompt =
    "We use an AI agent to rotate compromised production API keys.";
  const requestBody = buildAskAiContactRequest(
    "buyer@example.com",
    "Review one key-rotation workflow.",
    likelyWorkflowFit,
  );
  const serialized = JSON.stringify(requestBody);

  assert.equal(requestBody.intent, "ask-ai-contact");
  assert.equal(requestBody.locale, "en");
  assert.match(requestBody.scope, /Offer: bounded-workflow-review/);
  assert.match(requestBody.scope, /Commercial fit signal: likely/);
  assert.doesNotMatch(serialized, new RegExp(rawAskPrompt));
  assert.doesNotMatch(serialized, /ai-agent-action-proof-run/);
});
