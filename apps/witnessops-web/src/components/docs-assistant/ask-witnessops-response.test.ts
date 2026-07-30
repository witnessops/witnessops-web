import assert from "node:assert/strict";
import test from "node:test";

import {
  askWitnessOpsAnswerText,
  askWitnessOpsRouteLabel,
  askWitnessOpsSourceHref,
  askWitnessOpsSourceTarget,
} from "./ask-witnessops-response";

test("ask witnessops answer text prefers the deterministic template body", () => {
  assert.equal(
    askWitnessOpsAnswerText({
      schema: "witnessops.ask.assembled-answer.v1",
      status: "success",
      template: {
        template_id: "answer.fit_check.v1",
        body: "Begin with a non-secret fit check at /review/request.",
        source_display: null,
      },
      route: { route_id: "route.fit-check", href: "/review/request" },
      presented_sources: [],
    }),
    "Begin with a non-secret fit check at /review/request.",
  );
});

test("ask witnessops closed answers fall back to bounded public guidance", () => {
  assert.match(
    askWitnessOpsAnswerText({
      schema: "witnessops.ask.assembled-answer.v1",
      status: "closed",
      template: {
        template_id: "decline.evidence_intake.v1",
        body: "",
        source_display: null,
      },
      route: null,
      presented_sources: [],
      failure_reason: "POLICY_REFUSAL_OR_DECLINE",
    }),
    /outside the bounded public Ask WitnessOps path/,
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

test("ask witnessops route labels map known buyer paths", () => {
  assert.equal(askWitnessOpsRouteLabel("route.fit-check"), "Request a fit check");
  assert.equal(askWitnessOpsRouteLabel("route.support"), "Open support");
  assert.equal(askWitnessOpsRouteLabel("route.unknown"), "Continue");
});