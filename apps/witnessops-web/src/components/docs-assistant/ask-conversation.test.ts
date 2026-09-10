import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { BUYER_SERVICES } from "@/lib/buyer-services";
import { askConversationBrief, askConversationHistory, askFollowUpQuestions, askPageService,
  clearAskConversation, getAskConversation, getEmptyAskConversation, rememberAskTurn,
  subscribeAskConversation, askServiceCardIdentity, shouldShowServiceCard } from "./ask-conversation";
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

test("navigation consumers share up to twelve recent completed turns and Start over clears them", () => {
  let updates = 0;
  const unsubscribe = subscribeAskConversation(() => { updates += 1; });
  for (let index = 0; index < 5; index += 1) rememberAskTurn(`Question ${index}`, answer());
  assert.deepEqual(getAskConversation().map((turn) => turn.question), ["Question 0", "Question 1", "Question 2", "Question 3", "Question 4"]);
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
  assert.equal(askConversationBrief(getAskConversation()), "We have a customer questionnaire.\nIt is due next month.");
  assert.doesNotMatch(askConversationBrief(getAskConversation()), /Model-only/);
  rememberAskTurn("z".repeat(2_000), answer());
  assert.ok(askConversationBrief(getAskConversation()).length <= 1_000);
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
  assert.equal(questions.length, 0);
  questions.forEach((item) => assert.ok(item.question.includes(service.name.en)));
  rememberAskTurn("What would we receive?", response);
  const history = askConversationHistory(getAskConversation());
  assert.ok(history[1].content.includes("scoped findings report"));
  assert.ok(!history[1].content.includes(service.price.en));
  assert.ok(!history[1].content.includes("/review/request"));
});


test("five turns retain a visitor correction and deadline inside the unchanged API budget", () => {
  for (const question of ["Live n8n to HubSpot. Leads stopped yesterday. Needed today.", "Maybe a configuration change.", "No, nothing changed. It just stopped reaching HubSpot.", "Missing entirely.", "Please prepare the request."]) rememberAskTurn(question, answer());
  const context = askConversationHistory(getAskConversation());
  assert.ok(JSON.stringify(context).includes("No, nothing changed"));
  assert.ok(JSON.stringify(context).includes("Needed today"));
  assert.ok(context.length <= 6);
  assert.ok(context.reduce((n,m) => n + m.content.length, 0) <= 6_000);
  assert.doesNotMatch(askConversationBrief(getAskConversation()), /scoped findings report/);
});

for (const continuation of ['Already issuing refunds.', 'We are checking before launch.']) {
  test(`only marked refund claim repairs retain safe continuation: ${continuation}`, () => {
    const original = 'Can I tell my customer you verified our refund agent is safe?';
    const repaired: AskWitnessOpsUiAnswer = {...answer('No review or test has happened. Is the agent live or pre-launch?'),
      schema:'witnessops.ask.public-boundary-response.v1',status:'closed',answer_mode:'policy_refusal',
      template:{template_id:'boundary.refund_claim_repair.v1',body:'No review or test has happened. Is the agent live or pre-launch?',source_display:null},
      commercial_fit:{...answer().commercial_fit,result:'not_fit'}};
    rememberAskTurn(original,repaired); rememberAskTurn(continuation,answer());
    assert.equal(getAskConversation()[0].question,'Refund agent.','only the safe subject is retained, not rejected claim text');
    const history=askConversationHistory(getAskConversation());
    assert.equal(history[0].content,'Refund agent.');assert.match(history[1].content,/No review or test/);assert.equal(history[2].content,continuation);
    clearAskConversation();assert.deepEqual(askConversationHistory(getAskConversation()),[]);
    rememberAskTurn('blocked input',{...repaired,commercial_fit:{...repaired.commercial_fit,result:'blocked'}});
    rememberAskTurn('ordinary refusal',{...repaired,template:{...repaired.template,template_id:'boundary.public_input.v1'}});
    assert.equal(getAskConversation().length,0);
  });
}

function paidFallback(): AskWitnessOpsUiAnswer {
  return { ...answer(), schema: "witnessops.ask.assembled-answer.v1", answer_mode: "deterministic_fallback", fallback_reason: "ai_unavailable",
    commercial_fit: { ...answer().commercial_fit, result: "likely", offer_id: "bounded-workflow-review", offer: {
      name: "Agent Action Security Review", price_label: "€2,500 fixed · excluding VAT", unit_label: "One consequential agent or automation action",
      fit_check_label: "Non-secret fit check first", delivery_label: "Within 10 working days after evidence rules are agreed",
    } } };
}

test("assembled paid fallback remains visible without becoming history or a proposed human brief", () => {
  const fallback = paidFallback();
  assert.equal(askServiceCardIdentity(fallback), "bounded-workflow-review");
  assert.equal(shouldShowServiceCard(fallback), true);
  assert.equal(shouldShowServiceCard(fallback, fallback), true, "unretained current outage must retain its scope action");
  assert.equal(rememberAskTurn("Our failed question must not be shared.", fallback), false);
  assert.deepEqual(askConversationHistory(getAskConversation()), []);
  assert.equal(askConversationBrief(getAskConversation()), "");
  assert.equal(shouldShowServiceCard({ ...fallback, commercial_fit: { ...fallback.commercial_fit, result: "needs_boundary" } }), true);
});

test("card identity deduplicates generated recommendations and distinguishes assembled offers", () => {
  const fallback = paidFallback();
  const generated = { ...answer(), recommendation: { service_id: "bounded-workflow-review", name: "Agent Action Security Review",
    price_label: "€2,500", delivery_label: "By agreement", detail_href: "/catalog/workflows", request_href: "/review/request" } } satisfies AskWitnessOpsUiAnswer;
  assert.equal(shouldShowServiceCard(generated), true);
  assert.equal(shouldShowServiceCard(generated, generated), false);
  assert.equal(shouldShowServiceCard(generated, fallback), false);
  assert.equal(shouldShowServiceCard(fallback, generated), true);
  const other = { ...generated, recommendation: { ...generated.recommendation, service_id: "customer-security-review-sprint" } } satisfies AskWitnessOpsUiAnswer;
  assert.equal(shouldShowServiceCard(other, generated), true);
  const assembled = { ...fallback, fallback_reason: undefined };
  assert.equal(shouldShowServiceCard(assembled), true);
  assert.equal(shouldShowServiceCard(assembled, assembled), false);
});

test("absent offers, blocked answers and refusals cannot acquire a commercial card", () => {
  const fallback = paidFallback();
  for (const result of ["blocked", "not_fit", "unknown"] as const) {
    assert.equal(shouldShowServiceCard({ ...fallback, commercial_fit: { ...fallback.commercial_fit, result } }), false);
  }
  assert.equal(shouldShowServiceCard({ ...fallback, status: "closed" }), false);
  assert.equal(shouldShowServiceCard({ ...fallback, commercial_fit: { ...fallback.commercial_fit, offer: null } }), false);
  assert.equal(shouldShowServiceCard(answer()), false);
});
