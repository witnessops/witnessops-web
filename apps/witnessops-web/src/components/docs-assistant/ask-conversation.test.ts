import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { BUYER_SERVICES } from "@/lib/buyer-services";
import { askConversationBrief, askConversationHistory, askFollowUpQuestions, askPageService,
  clearAskConversation, getAskConversation, getEmptyAskConversation, rememberAskTurn,
  subscribeAskConversation } from "./ask-conversation";
import type { AskWitnessOpsUiAnswer } from "./ask-witnessops-response";

function answer(body = "You receive a scoped findings report."): AskWitnessOpsUiAnswer {
  return {
    schema: "witnessops.ask.generated-answer.v1", status: "success", answer_mode: "ai_assisted",
    template: { template_id: "answer.public_ai.v1", body, source_display: null },
    route: null, presented_sources: [],
    commercial_fit: { schema: "witnessops.ask.commercial-fit.v1", result: "unknown", intent: "other", offer_id: null,
      source: "ask", offer: null, matching_specimen_id: null },
  };
}

afterEach(clearAskConversation);

test("navigation consumers share only three recent completed turns and Start over clears them", () => {
  let updates = 0;
  const unsubscribe = subscribeAskConversation(() => { updates += 1; });
  for (let index = 0; index < 5; index += 1) rememberAskTurn(`Question ${index}`, answer());
  assert.deepEqual(getAskConversation().map((turn) => turn.question), ["Question 2", "Question 3", "Question 4"]);
  assert.deepEqual(getEmptyAskConversation(), [], "Server rendering never receives a visitor conversation.");
  clearAskConversation();
  assert.deepEqual(getAskConversation(), []);
  assert.equal(updates, 6);
  unsubscribe();
  rememberAskTurn("Fresh session", answer());
  assert.equal(updates, 6);
});

test("blocked input, boundary refusals and unavailable guide responses never become conversational history", () => {
  const ordinary = answer();
  rememberAskTurn("safe question", ordinary);
  rememberAskTurn("blocked input", { ...ordinary, commercial_fit: { ...ordinary.commercial_fit, result: "blocked" } });
  rememberAskTurn("refused input", { ...ordinary, status: "closed" });
  rememberAskTurn("unanswered input", { ...ordinary, fallback_reason: "ai_unavailable" });
  assert.deepEqual(getAskConversation().map((turn) => turn.question), ["safe question"]);
});

test("request context contains complete recent pairs and stays inside the API character budget", () => {
  for (let index = 0; index < 3; index += 1) rememberAskTurn(`Question ${index} ${"x".repeat(1_990)}`, answer("y".repeat(3_995)));
  const history = askConversationHistory(getAskConversation());
  assert.equal(history.length, 2);
  assert.match(history[0].content, /^Question 2/);
  assert.deepEqual(history.map((message) => message.role), ["user", "assistant"]);
  assert.ok(history.reduce((size, message) => size + message.content.length, 0) <= 6_000);
});

test("a proposed human brief contains only accepted visitor words and is bounded", () => {
  rememberAskTurn("We have a customer questionnaire.", answer("Model-only suggestion that must not enter the email request."));
  rememberAskTurn("It is due next month.", answer());
  assert.equal(askConversationBrief(getAskConversation()), "We have a customer questionnaire.\n\nIt is due next month.");
  assert.doesNotMatch(askConversationBrief(getAskConversation()), /Model-only/);
  rememberAskTurn("z".repeat(2_000), answer());
  assert.equal(askConversationBrief(getAskConversation()).length, 1_000);
});

test("page context resolves exact canonical offer paths only", () => {
  for (const service of BUYER_SERVICES) {
    if (service.detailHref.en) assert.equal(askPageService(`${service.detailHref.en}/`)?.id, service.id);
  }
  for (const path of ["/", "/catalog", "/admin", "/catalog/unknown", "https://witnessops.com/catalog", "/catalog?offerId=bounded-workflow-review"]) {
    assert.equal(askPageService(path), undefined);
  }
});

test("follow-ups and history retain a recommended service name without promoting its price or URL into context", () => {
  const service = BUYER_SERVICES.find((entry) => entry.id === "customer-security-review-sprint")!;
  const response: AskWitnessOpsUiAnswer = { ...answer(), recommendation: {
    service_id: service.id, name: service.name.en, price_label: service.price.en,
    delivery_label: service.timing.en, detail_href: service.detailHref.en!, request_href: "/review/request",
  } };
  const questions = askFollowUpQuestions(response);
  assert.equal(questions.length, 2);
  questions.forEach((item) => assert.ok(item.question.includes(service.name.en)));
  rememberAskTurn("What would we receive?", response);
  const history = askConversationHistory(getAskConversation());
  assert.ok(history[1].content.includes(service.name.en));
  assert.ok(!history[1].content.includes(service.price.en));
  assert.ok(!history[1].content.includes("/review/request"));
});
