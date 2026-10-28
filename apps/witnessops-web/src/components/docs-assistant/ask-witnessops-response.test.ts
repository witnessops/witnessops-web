import assert from "node:assert/strict";
import test from "node:test";
import { BUYER_SERVICES, buyerServiceRequestHref } from "@/lib/buyer-services";
import { EXTERNAL_ATTACK_SURFACE_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { plainOfferPrice } from "@/lib/offer-price-unit";

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
  offer_id: PUBLIC_AGENT_ACTION_OFFER.id,
  source: "ask" as const,
  offer: {
    name: PUBLIC_AGENT_ACTION_OFFER.name.en,
    price_label: plainOfferPrice(PUBLIC_AGENT_ACTION_OFFER.price.en),
    unit_label: PUBLIC_AGENT_ACTION_OFFER.unit.en,
    fit_check_label: PUBLIC_AGENT_ACTION_OFFER.fitCheck.en,
    delivery_label: PUBLIC_AGENT_ACTION_OFFER.timing.en,
  },
  matching_specimen_id: "ai-agent-action-proof-run" as const,
};

function generatedPayload(serviceId: string = "agent-action-security-review") {
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
        : plainOfferPrice(service.price.en),
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
    assert.equal(answer.recommendation?.service_id, "agent-action-security-review");
    assert.match(answer.recommendation?.request_href ?? "", /offerId=agent-action-security-review/);
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

test("caller cancellation aborts a pending request without serializing the signal", async (t) => {
  const controller = new AbortController();
  let observedSignal: AbortSignal | undefined;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    assert.deepEqual(JSON.parse(String(init.body)), { question: "Can you help?" });
    observedSignal = init.signal as AbortSignal;
    return new Promise<Response>((_resolve, reject) => {
      observedSignal!.addEventListener("abort", () => reject(observedSignal!.reason), { once: true });
    });
  });
  const request = fetchAskWitnessOps("Can you help?", { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  assert.equal(observedSignal?.aborted, true);
});

test("widget requests explicitly identify their surface without changing ordinary callers", async (t) => {
  const requests: unknown[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify(generatedPayload()));
  });
  await fetchAskWitnessOps("What can you help with?", { surface: "sovereign_widget" });
  await fetchAskWitnessOps("An ordinary question");
  assert.deepEqual(requests, [
    { question: "What can you help with?", surface: "sovereign_widget" },
    { question: "An ordinary question" },
  ]);
});

test("an already-cancelled request does not reach fetch", async (t) => {
  const controller = new AbortController();
  controller.abort();
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response("unused"));
  await assert.rejects(fetchAskWitnessOps("Can you help?", { signal: controller.signal }), { name: "AbortError" });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("the 20-second deadline still aborts when the caller supplied a signal", async (t) => {
  const deadline = new AbortController();
  const caller = new AbortController();
  t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    assert.equal(milliseconds, 20_000);
    return deadline.signal;
  });
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    const signal = init.signal as AbortSignal;
    return new Promise<Response>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  });
  const request = fetchAskWitnessOps("A stalled question", { signal: caller.signal });
  deadline.abort(new DOMException("The request timed out.", "TimeoutError"));
  await assert.rejects(request, { name: "TimeoutError" });
  assert.equal(caller.signal.aborted, false);
});

test("HTTP failures do not retry automatically and a caller retry uses the same history", async (t) => {
  const history = [{ role: "user" as const, content: "What does WitnessOps do?" }, { role: "assistant" as const, content: "Scoped public guidance." }];
  const requests: { body: unknown; signal: RequestInit["signal"] }[] = [];
  let status = 429;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    requests.push({ body: JSON.parse(String(init.body)), signal: init.signal });
    return status === 200
      ? new Response(JSON.stringify(generatedPayload()))
      : new Response("upstream unavailable", { status });
  });
  await assert.rejects(fetchAskWitnessOps("What about pricing?", { history }), /Too many questions/);
  assert.equal(requests.length, 1);
  status = 503;
  await assert.rejects(fetchAskWitnessOps("What about pricing?", { history }), /could not answer/);
  assert.equal(requests.length, 2);
  status = 200;
  const answer = await fetchAskWitnessOps("What about pricing?", { history });
  assert.equal(answer.status, "success");
  assert.equal(requests.length, 3);
  assert.deepEqual(requests.map(({ body }) => body), Array.from({ length: 3 }, () => ({ question: "What about pricing?", history })));
  assert.notEqual(requests[0].signal, requests[2].signal);
});

test("malformed responses and network failures remain failures", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response("not JSON"));
  await assert.rejects(fetchAskWitnessOps("Question"), SyntaxError);
  for (const payload of [null, {}, { schema: "unrecognized" }]) {
    mock.mock.mockImplementation(async () => new Response(JSON.stringify(payload)));
    await assert.rejects(fetchAskWitnessOps("Question"), /invalid response|unexpected response schema/);
  }
  mock.mock.mockImplementation(async () => { throw new TypeError("Network unavailable"); });
  await assert.rejects(fetchAskWitnessOps("Question"), /Network unavailable/);
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

test("withdrawn service recommendations are not shown as new-sales cards", async () => {
  const originalFetch = globalThis.fetch;
  const payload = generatedPayload("professional-public-footprint-audit");
  try {
    globalThis.fetch = async () => new Response(JSON.stringify(payload));
    const answer = await fetchAskWitnessOps("Can you review my public professional footprint?");
    assert.equal(answer.recommendation, null);
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

test("deterministic fallback names each public review without ranking either one", () => {
  const offers = [
    {
      id: PUBLIC_AGENT_ACTION_OFFER.id,
      offer: likelyCommercialFit.offer,
    },
    {
      id: EXTERNAL_ATTACK_SURFACE_OFFER.id,
      offer: {
        name: EXTERNAL_ATTACK_SURFACE_OFFER.name.en,
        price_label: plainOfferPrice(EXTERNAL_ATTACK_SURFACE_OFFER.price.en),
        unit_label:
          "One authorised public-facing system. One focused retest within 30 calendar days of initial report handover.",
        fit_check_label: "Non-secret fit check first. This is not a penetration test.",
        delivery_label: EXTERNAL_ATTACK_SURFACE_OFFER.timing.en,
      },
    },
  ] as const;

  for (const item of offers) {
    const text = askWitnessOpsAnswerText({
      schema: "witnessops.ask.assembled-answer.v1",
      status: "success",
      template: {
        template_id: "route.ai_agent_action.v1",
        body: "A bounded action may fit Workflow S.",
        source_display: null,
      },
      route: null,
      commercial_fit: {
        ...likelyCommercialFit,
        offer_id: item.id,
        offer: item.offer,
      },
      presented_sources: [],
      answer_mode: "deterministic_fallback",
    });
    assert.match(text, new RegExp(`${item.offer.name} is a public review`));
    assert.match(text, new RegExp(item.offer.price_label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(text, /primary review|the primary|secondary review/i);
    for (const other of offers) {
      if (other.id !== item.id) {
        assert.doesNotMatch(text, new RegExp(other.offer.name));
      }
    }
  }
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
  assert.match(askWitnessOpsAnswerText(answer), /€2,500 excl\. VAT/);
  assert.doesNotMatch(askWitnessOpsAnswerText(answer), /\u00A0/);
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
    /Delivery timing agreed in the signed statement of work/,
  );
  assert.match(askWitnessOpsAnswerText(answer), /€2,500 excl\. VAT/);
  assert.doesNotMatch(askWitnessOpsAnswerText(answer), /\u00A0/);
  assert.doesNotMatch(askWitnessOpsAnswerText(answer), /fixed quote after scope|10 working days|€550/);
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
  assert.equal(askWitnessOpsSourceTarget(evil), "external");

  const www = {
    source_id: "source.www",
    public_label: "WWW",
    canonical_href: "https://www.witnessops.com/docs/intro",
    href_class: "same_site" as const,
  };
  assert.equal(askWitnessOpsSourceHref(www), "/docs/intro");
});

test("canonical HTTPS sources retain their path, query, fragment and true origin", () => {
  const source = {
    source_id: "source.reference", public_label: "Reference", href_class: "same_site",
    canonical_href: "https://witnessops.com/docs/getting-started?lang=en#reports",
  };
  assert.equal(askWitnessOpsSourceHref(source), "/docs/getting-started?lang=en#reports");
  for (const canonical_href of [
    "https://github.com/witnessops/witnessops-web/blob/main/README.md",
    "https://witnessops.com:8443/docs",
  ]) {
    assert.equal(askWitnessOpsSourceTarget({ ...source, canonical_href }), "external");
    assert.equal(askWitnessOpsSourceHref({ ...source, canonical_href }), canonical_href);
  }
});

test("unsafe source URLs never reach rendering consumers", async (t) => {
  const payload = generatedPayload();
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(payload)));
  for (const canonical_href of [
    "javascript:alert(1)", "data:text/html,unsafe", "http://witnessops.com/docs",
    "//untrusted.example/path", "/docs", "https://user:password@witnessops.com/docs",
    "https://witnessops.com//untrusted.example/path", "https://witnessops.com/\\untrusted.example",
    "https://witnessops.com/\n/docs",
  ]) {
    payload.presented_sources[0].canonical_href = canonical_href;
    assert.throws(() => askWitnessOpsSourceHref(payload.presented_sources[0]), /invalid source link/);
    await assert.rejects(fetchAskWitnessOps("Question"), /invalid source link/);
  }
});

test("unsafe and external action routes are omitted without changing the answer", async (t) => {
  const payload = { ...generatedPayload(), route: { route_id: "route.support", href: "/support" } };
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(payload)));
  for (const href of ["javascript:alert(1)", "//untrusted.example", "https://untrusted.example", "/\\untrusted.example", "https://witnessops.com//untrusted.example"]) {
    payload.route.href = href;
    const answer = await fetchAskWitnessOps("Question");
    assert.equal(answer.route, null);
    assert.equal(answer.template.body, payload.template.body);
  }
  payload.route.href = "https://witnessops.com/support#support-request";
  assert.equal((await fetchAskWitnessOps("Question")).route?.href, "/support#support-request");
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
    "/review/request?source=ask",
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
