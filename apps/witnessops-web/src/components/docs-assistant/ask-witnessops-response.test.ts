import assert from "node:assert/strict";
import test from "node:test";
import { BUYER_SERVICES, buyerServiceRequestHref } from "@/lib/buyer-services";

import {
  askWitnessOpsAnswerText,
  fetchAskWitnessOps,
  askWitnessOpsModeLabel,
  askWitnessOpsRouteHref,
  askWitnessOpsRouteLabel,
  askWitnessOpsSourceHref,
  askWitnessOpsSourceTarget,
} from "./ask-witnessops-response";

const unknownCommercialFit = {
  schema: "witnessops.ask.commercial-fit.v1" as const,
  result: "unknown" as const,
  intent: "other" as const,
  offer_id: null,
  source: "ask" as const,
  offer: null,
  matching_specimen_id: null,
};

const likelyCommercialFit = {
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

function generatedPayload(serviceId: string = "one-server-security-check") {
  const service = BUYER_SERVICES.find((item) => item.id === serviceId)!;
  const requestUrl = new URL(buyerServiceRequestHref("en", service), "https://witnessops.com");
  requestUrl.searchParams.set("source", "ask");
  return {
    schema: "witnessops.ask.generated-answer.v1",
    status: "success",
    answer_mode: "ai_assisted",
    model: "gpt-5.4-mini",
    template: {
      template_id: "answer.public_ai.v1",
      body: "For your Linux host, start with a read-only review. You receive findings and practical next steps for the one host you authorise.",
      source_display: null,
    },
    commercial_fit: unknownCommercialFit,
    route: null,
    recommendation: {
      service_id: service.id,
      name: service.name.en,
      price_label: service.pricingVisible === false
        ? (service.availability?.label.en ?? "Available by request")
        : service.price.en,
      delivery_label: service.timing.en,
      detail_href: service.detailHref.en ?? "/catalog",
      request_href: `${requestUrl.pathname}${requestUrl.search}`,
    },
    presented_sources: [{
      source_id: `service.${service.id}`,
      public_label: service.name.en,
      canonical_href: `https://witnessops.com${service.detailHref.en}`,
      href_class: "same_site",
    }],
    authority_answer: {
      schema: "witnessops.ask.assembled-answer.v1",
      assembler_contract_id: "ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1",
      assembler_contract_version: 1,
      deterministic_replay_hash: "test-only-original-authority-hash",
      template: { template_id: "decline.outside_public_context.v1" },
      policy_decision: { template_id: "decline.outside_public_context.v1" },
    },
  };
}

test("generated answers show provider prose and a canonical non-primary review without a receipt", async () => {
  const originalFetch = globalThis.fetch;
  const payload = generatedPayload();
  try {
    globalThis.fetch = async () => new Response(JSON.stringify(payload), {
      headers: { "X-Ask-Receipt-Id": "must-not-label-model-prose", "X-Ask-Receipt-Status": "durable" },
    });
    const answer = await fetchAskWitnessOps("What do I receive from a Linux server review?");
    assert.equal(askWitnessOpsAnswerText(answer), payload.template.body);
    assert.equal(askWitnessOpsModeLabel(answer), "AI-generated answer");
    assert.equal(answer.recommendation?.service_id, "one-server-security-check");
    assert.match(answer.recommendation?.request_href ?? "", /productId=OFFSEC-LOCAL-AUDIT/);
    assert.equal(answer.receipt_id, undefined);
    assert.equal(answer.receipt_status, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("follow-up requests include bounded caller context and the canonical page service", async () => {
  const originalFetch = globalThis.fetch;
  const history = [{ role: "user" as const, content: "What do we receive?" }, { role: "assistant" as const, content: "A scoped report." }];
  let requestBody: unknown;
  try {
    globalThis.fetch = async (_url, init) => {
      assert.ok(init?.signal instanceof AbortSignal, "A stalled browser request must have a deadline.");
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify(generatedPayload()));
    };
    await fetchAskWitnessOps("How long does that take?", { history, page_service_id: "one-server-security-check" });
    assert.deepEqual(requestBody, { question: "How long does that take?", history, page_service_id: "one-server-security-check" });
    await fetchAskWitnessOps("A new question");
    assert.deepEqual(requestBody, { question: "A new question" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a provider outage is distinguishable from normal public guidance for retry UI", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      schema: "witnessops.ask.assembled-answer.v1", status: "success", answer_mode: "deterministic_fallback",
      fallback_reason: "ai_unavailable", commercial_fit: unknownCommercialFit, presented_sources: [], route: null,
      template: { template_id: "answer.public.v1", body: "That subject is outside the approved public WitnessOps context.", source_display: null },
    }));
    const response = await fetchAskWitnessOps("Can you help?");
    assert.equal(response.fallback_reason, "ai_unavailable");
    assert.equal(askWitnessOpsModeLabel(response), "AI unavailable · public guide");
    assert.match(askWitnessOpsAnswerText(response), /couldn't generate an answer/);
    assert.doesNotMatch(askWitnessOpsAnswerText(response), /outside|not a fit|not_fit/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("generated review recommendations cannot change canonical prices or links", async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const patch of [
      { request_href: "https://untrusted.example/collect" },
      { request_href: "javascript:alert(1)" },
      { price_label: "Free forever" },
      { service_id: "unlisted-offer" },
      { detail_href: "/admin" },
    ]) {
      const payload = generatedPayload();
      Object.assign(payload.recommendation, patch);
      globalThis.fetch = async () => new Response(JSON.stringify(payload));
      await assert.rejects(() => fetchAskWitnessOps("Which review fits?"), /recommendation/i);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("request-only service recommendations preserve hidden-price availability", async () => {
  const originalFetch = globalThis.fetch;
  const payload = generatedPayload("professional-public-footprint-audit");
  try {
    globalThis.fetch = async () => new Response(JSON.stringify(payload));
    const answer = await fetchAskWitnessOps("Can you review my public professional footprint?");
    assert.equal(answer.recommendation?.price_label, "Available by request");
    payload.recommendation.price_label = BUYER_SERVICES.find((item) => item.id === "professional-public-footprint-audit")!.price.en;
    await assert.rejects(() => fetchAskWitnessOps("How much?"), /outdated review recommendation/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("invalid generated envelopes do not get presented as AI answers", async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const patch of [
      { status: "closed" },
      { answer_mode: "deterministic_fallback" },
      { model: "" },
      { authority_answer: null },
      { template: { template_id: "answer.public_ai.v1", body: " " } },
      { template: { template_id: "answer.public_ai.v1", body: "x".repeat(4_001) } },
    ]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ ...generatedPayload(), ...patch }));
      await assert.rejects(() => fetchAskWitnessOps("What does WitnessOps do?"), /invalid generated answer/);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ask witnessops answer text prefers the deterministic template body", () => {
  assert.equal(
    askWitnessOpsAnswerText({
      schema: "witnessops.ask.assembled-answer.v1",
      answer_mode: "deterministic_fallback",
      status: "success",
      template: {
        template_id: "answer.fit_check.v1",
        body: "Begin with a non-secret fit check at /review/request.",
        source_display: null,
      },
      route: { route_id: "route.fit-check", href: "/review/request" },
      commercial_fit: unknownCommercialFit,
      presented_sources: [],
    }),
    "Begin with a non-secret fit check at /review/request.",
  );
});

test("ask witnessops closed answers fall back to bounded public guidance", () => {
  assert.match(
    askWitnessOpsAnswerText({
      schema: "witnessops.ask.assembled-answer.v1",
      answer_mode: "policy_refusal",
      status: "closed",
      template: {
        template_id: "decline.evidence_intake.v1",
        body: "",
        source_display: null,
      },
      route: null,
      commercial_fit: unknownCommercialFit,
      presented_sources: [],
      failure_reason: "POLICY_REFUSAL_OR_DECLINE",
    }),
    /outside the bounded public Ask WitnessOps path/,
  );
});

test("ask witnessops labels AI, fallback, and boundary responses honestly", () => {
  const answer = {
    schema: "witnessops.ask.assembled-answer.v1" as const,
    status: "success" as const,
    template: { template_id: "answer.v1", body: "Answer", source_display: null },
    route: null,
    commercial_fit: unknownCommercialFit,
    presented_sources: [],
    answer_mode: "ai_assisted" as const,
  };

  assert.equal(
    askWitnessOpsModeLabel(answer),
    "AI-assisted · public WitnessOps material",
  );
  assert.equal(
    askWitnessOpsModeLabel({ ...answer, answer_mode: "deterministic_fallback" }),
    "Public WitnessOps guide",
  );
  assert.equal(
    askWitnessOpsModeLabel({ ...answer, answer_mode: "policy_refusal" }),
    "Boundary guidance",
  );
});

test("commercial fit turns an authority decline into bounded buyer guidance", () => {
  const answer = {
    schema: "witnessops.ask.assembled-answer.v1" as const,
    status: "closed" as const,
    template: {
      template_id: "decline.outside_public_context.v1",
      body: "That subject is outside the approved public context.",
      source_display: null,
    },
    route: null,
    commercial_fit: likelyCommercialFit,
    presented_sources: [],
    answer_mode: "policy_refusal" as const,
  };

  assert.match(askWitnessOpsAnswerText(answer), /likely commercial-fit signal/);
  assert.equal(
    askWitnessOpsModeLabel(answer),
    "Commercial fit · public boundary",
  );
  assert.doesNotMatch(askWitnessOpsAnswerText(answer), /outside the approved/);
});

test("commercial fit keeps successful public guidance coherent with the live offer", () => {
  const answer = {
    schema: "witnessops.ask.assembled-answer.v1" as const,
    status: "success" as const,
    template: {
      template_id: "route.ai_agent_action.v1",
      body: "A bounded AI-agent action may fit Workflow S.",
      source_display: null,
    },
    route: null,
    commercial_fit: likelyCommercialFit,
    presented_sources: [],
    answer_mode: "deterministic_fallback" as const,
  };

  assert.match(askWitnessOpsAnswerText(answer), /likely commercial-fit signal/);
  assert.match(askWitnessOpsAnswerText(answer), /Agent Action Security Review/);
  assert.match(askWitnessOpsAnswerText(answer), /€2,500 fixed/);
  assert.match(askWitnessOpsAnswerText(answer), /One consequential agent or automation action/);
  assert.doesNotMatch(askWitnessOpsAnswerText(answer), /Workflow S/);
});

test("AI-assisted commercial fit cannot reintroduce superseded authority-template copy", () => {
  const answer = {
    schema: "witnessops.ask.assembled-answer.v1" as const,
    status: "success" as const,
    template: {
      template_id: "route.ai_agent_action.v1",
      body: "A bounded AI-agent action may fit Workflow S.",
      source_display: null,
    },
    route: null,
    commercial_fit: likelyCommercialFit,
    presented_sources: [],
    answer_mode: "ai_assisted" as const,
  };

  assert.match(askWitnessOpsAnswerText(answer), /Agent Action Security Review/);
  assert.match(askWitnessOpsAnswerText(answer), /Non-secret fit check first/);
  assert.match(
    askWitnessOpsAnswerText(answer),
    /Within 10 working days after evidence rules are agreed/,
  );
  assert.doesNotMatch(askWitnessOpsAnswerText(answer), /Workflow S/);
  assert.equal(
    askWitnessOpsModeLabel(answer),
    "AI-assisted · public WitnessOps material",
  );
});

test("AI-assisted commercial fit preserves a current public template body", () => {
  const answer = {
    schema: "witnessops.ask.assembled-answer.v1" as const,
    status: "success" as const,
    template: {
      template_id: "route.ai_agent_action.v1",
      body: "Current grounded guidance from the approved public material.",
      source_display: null,
    },
    route: null,
    commercial_fit: likelyCommercialFit,
    presented_sources: [],
    answer_mode: "ai_assisted" as const,
  };

  assert.equal(
    askWitnessOpsAnswerText(answer),
    "Current grounded guidance from the approved public material.",
  );
  assert.equal(
    askWitnessOpsModeLabel(answer),
    "AI-assisted · public WitnessOps material",
  );
});

test("successful deterministic commercial fit retains its deterministic mode label", () => {
  const answer = {
    schema: "witnessops.ask.assembled-answer.v1" as const,
    status: "success" as const,
    template: {
      template_id: "route.ai_agent_action.v1",
      body: "A bounded AI-agent action may fit Workflow S.",
      source_display: null,
    },
    route: null,
    commercial_fit: likelyCommercialFit,
    presented_sources: [],
    answer_mode: "deterministic_fallback" as const,
  };

  assert.equal(askWitnessOpsModeLabel(answer), "Public WitnessOps guide");
});

test("ask witnessops same-site source links normalize to site-relative paths", () => {
  const source = {
    source_id: "source.fit-check.public-request",
    public_label: "Fit check request",
    canonical_href: "https://witnessops.com/review/request",
    href_class: "same_site",
  };

  assert.equal(askWitnessOpsSourceHref(source), "/review/request");
  assert.equal(askWitnessOpsSourceTarget(source), "same_site");
});

test("ask witnessops same-site href rejects lookalike hosts (no substring trap)", () => {
  const evil = {
    source_id: "source.evil",
    public_label: "Evil",
    canonical_href: "https://witnessops.com.evil.example/phish",
    href_class: "same_site" as const,
  };

  // Must not collapse to a path-only same-site link.
  assert.equal(askWitnessOpsSourceHref(evil), evil.canonical_href);

  const www = {
    source_id: "source.www",
    public_label: "WWW",
    canonical_href: "https://www.witnessops.com/docs/intro",
    href_class: "same_site" as const,
  };
  assert.equal(askWitnessOpsSourceHref(www), "/docs/intro");
});

test("ask witnessops route labels map known buyer paths", () => {
  assert.equal(askWitnessOpsRouteLabel("route.fit-check"), "Request a fit check");
  assert.equal(askWitnessOpsRouteLabel("route.support"), "Open support");
  assert.equal(askWitnessOpsRouteLabel("route.unknown"), "Continue");
});

test("ask witnessops fit-check routes carry the controlled product and source", () => {
  assert.equal(
    askWitnessOpsRouteHref({
      route_id: "route.fit-check",
      href: "/review/request",
    }),
    "/review/request?offerId=bounded-workflow-review&source=ask",
  );
  assert.equal(
    askWitnessOpsRouteHref({ route_id: "route.support", href: "/support" }),
    "/support",
  );
});

test("ask witnessops client downgrades inconsistent commercial metadata", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        schema: "witnessops.ask.assembled-answer.v1",
        status: "closed",
        answer_mode: "policy_refusal",
        template: {
          template_id: "decline.outside_public_context.v1",
          body: "Boundary",
          source_display: null,
        },
        route: null,
        presented_sources: [],
        commercial_fit: {
          ...likelyCommercialFit,
          offer_id: null,
        },
      }),
      { status: 200 },
    )) as typeof fetch;

  try {
    const answer = await fetchAskWitnessOps("bounded question");
    assert.deepEqual(answer.commercial_fit, unknownCommercialFit);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ask witnessops client reads a boundary wrapper without rewriting V1 provenance", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        schema: "witnessops.ask.public-boundary-response.v1",
        status: "closed",
        answer_mode: "policy_refusal",
        template: {
          template_id: "boundary.public_input.v1",
          body: "Do not paste secrets into public Ask.",
          source_display: "Public WitnessOps material",
        },
        route: null,
        presented_sources: [],
        failure_reason: "PUBLIC_INPUT_BOUNDARY",
        commercial_fit: {
          ...unknownCommercialFit,
          result: "blocked",
        },
        authority_answer: {
          schema: "witnessops.ask.assembled-answer.v1",
          assembler_contract_id: "ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1",
          assembler_contract_version: 1,
          deterministic_replay_hash: "replay:1234",
          template: {
            template_id: "route.ai_agent_action.v1",
            body: "Original governed answer",
            source_display: null,
          },
          policy_decision: {
            template_id: "route.ai_agent_action.v1",
          },
        },
      }),
      { status: 200 },
    )) as typeof fetch;

  try {
    const answer = await fetchAskWitnessOps("sensitive input");
    assert.equal(
      answer.schema,
      "witnessops.ask.public-boundary-response.v1",
    );
    assert.equal(answer.status, "closed");
    assert.equal(answer.route, null);
    assert.equal(answer.template.template_id, "boundary.public_input.v1");
    assert.equal(answer.commercial_fit.result, "blocked");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
