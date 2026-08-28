import assert from "node:assert/strict";
import test from "node:test";

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
    name: "Agent Risk & Control Review" as const,
    price_label: "From €1,500" as const,
    unit_label: "One agentic or automated workflow" as const,
  },
  matching_specimen_id: "ai-agent-action-proof-run" as const,
};

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
    "Deterministic public guide",
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
  assert.match(askWitnessOpsAnswerText(answer), /paid-review path is shown above/);
  assert.doesNotMatch(askWitnessOpsAnswerText(answer), /Workflow S/);
});

test("AI-assisted commercial fit preserves the approved public template body", () => {
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

  assert.equal(
    askWitnessOpsAnswerText(answer),
    "A bounded AI-agent action may fit Workflow S.",
  );
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
