import assert from "node:assert/strict";
import test from "node:test";
import { BUYER_SERVICES, type BuyerService } from "@/lib/buyer-services";

import {
  ASK_CONTACT_NOTE_MAX_LENGTH,
  ASK_CONTACT_QUESTION_MAX_LENGTH,
  buildAskAiContactRequest,
  buildAskAiContactScope,
} from "./docs-assistant-contact-handoff-contract";

const likelyWorkflowFit = {
  schema: "witnessops.ask.commercial-fit.v1" as const,
  result: "likely" as const,
  intent: "workflow" as const,
  offer_id: "bounded-workflow-review" as const,
  source: "ask" as const,
  offer: {
    name: "Agent Action Security Review" as const,
    price_label: "€2,500 fixed · excluding VAT" as const,
    unit_label: "One consequential agent or automation action" as const,
    fit_check_label: "Non-secret fit check first" as const,
    delivery_label:
      "Within 10 working days after evidence rules are agreed" as const,
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
  assert.match(scope, /Follow-up requested: reply by email about this request/);
  assert.match(scope, /No mailing list signup/);
  assert.match(scope, /Question sharing: not requested/);
  assert.match(scope, /Visitor note: Discuss one agent workflow\./);
  assert.match(scope, /mailbox verification/);
  assert.match(scope, /No review starts/);
  assert.match(scope, /no files, secrets, logs, screenshots/);
  assert.doesNotMatch(scope, new RegExp(rawAskPrompt));
  assert.doesNotMatch(scope, /From €1,500|€2,500 fixed/);
  assert.doesNotMatch(scope, /ai-agent-action-proof-run/);
});

test("Ask AI contact handoff keeps an omitted note explicit", () => {
  const scope = buildAskAiContactScope("   ");
  assert.match(scope, /Visitor note: not provided/);
  assert.match(scope, /Source: ask/);
  assert.match(scope, /Question sharing: not requested/);
});

test("the actual contact request body excludes the raw Ask question", () => {
  const rawAskPrompt =
    "We use an AI agent to rotate compromised production API keys.";
  const requestBody = buildAskAiContactRequest(
    "buyer@example.com",
    "Review one key-rotation workflow.",
    likelyWorkflowFit,
    { question: rawAskPrompt },
  );
  const serialized = JSON.stringify(requestBody);

  assert.equal(requestBody.intent, "ask-ai-contact");
  assert.equal(requestBody.locale, "en");
  assert.match(requestBody.scope, /Offer: bounded-workflow-review/);
  assert.match(requestBody.scope, /Commercial fit signal: likely/);
  assert.doesNotMatch(serialized, new RegExp(rawAskPrompt));
  assert.doesNotMatch(serialized, /ai-agent-action-proof-run/);
});

test("Ask contact includes only the explicitly approved question text", () => {
  const request = buildAskAiContactRequest(
    "buyer@example.com",
    "Review one workflow.",
    likelyWorkflowFit,
    { includeQuestion: true, question: "  Does this agent need an approval step?  " },
  );

  assert.match(request.scope, /Question sharing: visitor opted in/);
  assert.match(request.scope, /Visitor-approved question: Does this agent need an approval step\?/);
  assert.deepEqual(Object.keys(request), ["email", "intent", "locale", "scope"]);
  assert.doesNotMatch(request.scope, /AI answer:|Generated answer:/);
});

test("Ask contact bounds the shared question and note within the existing intake limit", () => {
  const scope = buildAskAiContactScope("n".repeat(9_000), likelyWorkflowFit, {
    includeQuestion: true,
    question: "q".repeat(9_000),
  });

  assert.equal(scope.match(/Visitor note: (.+)/)?.[1].length, ASK_CONTACT_NOTE_MAX_LENGTH);
  assert.equal(scope.match(/Visitor-approved question: (.+)/)?.[1].length, ASK_CONTACT_QUESTION_MAX_LENGTH);
  assert.ok(scope.length < 8_000);
});

test("removing question-sharing permission excludes the edited question", () => {
  const scope = buildAskAiContactScope("Only use this note.", undefined, {
    includeQuestion: false,
    question: "Previously selected question",
  });

  assert.match(scope, /Question sharing: not requested/);
  assert.doesNotMatch(scope, /Previously selected question|Visitor-approved question:/);
});

test("Ask follow-up records every supported service using canonical catalog names", () => {
  for (const service of BUYER_SERVICES) {
    const scope = buildAskAiContactScope("Discuss this review.", undefined, { serviceId: service.id });
    assert.ok(scope.includes(`Offer: ${service.id}\n`));
    assert.ok(scope.includes(`Offer name: ${service.name.en}\n`));
    assert.match(scope, /Source: ask/);
  }
});

test("an explicit catalog service does not inherit a different legacy offer's fit signal", () => {
  const scope = buildAskAiContactScope("Review our server.", likelyWorkflowFit, {
    serviceId: "one-server-security-check",
  });

  assert.match(scope, /Offer: one-server-security-check/);
  assert.match(scope, /Offer name: One Server Security Check/);
  assert.doesNotMatch(scope, /bounded-workflow-review|Commercial fit signal:/);
});

test("unknown runtime service values cannot become offer identities or names", () => {
  const scope = buildAskAiContactScope("Discuss a review.", undefined, {
    serviceId: "provider-invented-service" as BuyerService["id"],
  });

  assert.doesNotMatch(scope, /Offer:|Offer name:|provider-invented-service/);
  assert.match(scope, /Source: ask/);
});
