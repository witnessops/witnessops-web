import assert from "node:assert/strict";
import test from "node:test";

import { ASK_AI_CONTACT_INTENT } from "@/lib/commercial-request-intents";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  LEGACY_AGENT_ACTION_OFFER,
  PRIMARY_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { WITHDRAWN_CATALOG_SKU_IDS } from "@/lib/public-commercial-routes";
import {
  evaluateNewSalesIntakeBody,
  newSalesEnquiryOptions,
  resolveNewSalesPageQuery,
} from "@/lib/new-review-request-policy";

const agent = PUBLIC_AGENT_ACTION_OFFER.id;
const external = EXTERNAL_ATTACK_SURFACE_OFFER.productId;

test("new-sales enquiry options are exactly the agent review", () => {
  assert.deepEqual(
    newSalesEnquiryOptions("en").map((option) => option.intent),
    [agent],
  );
  assert.deepEqual(
    newSalesEnquiryOptions("pl").map((option) => option.label),
    [PUBLIC_AGENT_ACTION_OFFER.name.pl],
  );
});

test("raw JSON accepts only the Agent Action offer id", () => {
  assert.deepEqual(evaluateNewSalesIntakeBody({ intent: agent, email: "a@b.co" }), {
    accepted: true,
    role: "offer",
    intent: agent,
  });
  assert.deepEqual(evaluateNewSalesIntakeBody({ intent: external }), {
    accepted: false,
    reason: "parked",
  });
  assert.deepEqual(evaluateNewSalesIntakeBody({ intent: ASK_AI_CONTACT_INTENT }), {
    accepted: true,
    role: "contact",
    intent: ASK_AI_CONTACT_INTENT,
  });
});

test("withdrawn catalogue SKU IDs retain their historical intake identity", () => {
  for (const intent of WITHDRAWN_CATALOG_SKU_IDS) {
    assert.deepEqual(evaluateNewSalesIntakeBody({ intent }), {
      accepted: false,
      reason: "historical",
    });
  }
});

test("raw JSON rejects missing, ambiguous, wrong-role, historical, and unsupported identities", () => {
  const cases: Array<[unknown, string]> = [
    [{ email: "a@b.co" }, "missing"],
    [{ intent: "" }, "missing"],
    [{ intent: ` ${agent}` }, "unsupported"],
    [{ intent: `${agent} ` }, "unsupported"],
    [{ intent: agent.toUpperCase() }, "unsupported"],
    [{ intent: "review" }, "unsupported"],
    [{ intent: "not-a-real-offer" }, "unsupported"],
    [{ intent: "unclassified-request" }, "unsupported"],
    [{ intent: PUBLIC_AGENT_ACTION_OFFER.name.en }, "unsupported"],
    [{ intent: PRIMARY_OFFER.name.en }, "unsupported"],
    [{ intent: "AI Agent Tools & Access Review — Private Pilot" }, "unsupported"],
    [{ intent: "OFFSEC-PILOT" }, "unsupported"],
    [{ intent: "Free check" }, "unsupported"],
    [{ intent: "Not sure" }, "unsupported"],
    [{ intent: "early-bird" }, "unsupported"],
    [{ productId: external }, "unsupported"],
    [{ offerId: agent }, "unsupported"],
    [{ offer: PUBLIC_AGENT_ACTION_OFFER.name.en }, "unsupported"],
    [{ intent: LEGACY_AGENT_ACTION_OFFER.id }, "historical"],
    [{ intent: PRIMARY_OFFER.id }, "historical"],
    [{ intent: "OFFSEC-LOCAL-AUDIT" }, "historical"],
    [{ intent: "customer-security-review-sprint" }, "historical"],
    [{ intent: "professional-public-footprint-audit" }, "historical"],
    [{ intent: "ai-agent-action-proof-run" }, "historical"],
    [{ intent: "access-change-proof-run" }, "historical"],
    [{ intent: "automation-repair-handover" }, "historical"],
    [{ intent: "Third-party assessment" }, "historical"],
    [{ intent: EXTERNAL_ATTACK_SURFACE_OFFER.id }, "parked"],
    [{ intent: external }, "parked"],
    [{ intent: agent, productId: external }, "ambiguous"],
    [{ intent: external, offerId: agent }, "parked"],
    [{ intent: agent, offerId: PRIMARY_OFFER.id }, "ambiguous"],
    [{ intent: agent, offer: PRIMARY_OFFER.name.en }, "ambiguous"],
    [{ intent: external, offer: PUBLIC_AGENT_ACTION_OFFER.name.en }, "parked"],
    [{ intent: ASK_AI_CONTACT_INTENT, offerId: agent }, "ambiguous"],
    [{ intent: ASK_AI_CONTACT_INTENT, productId: external }, "ambiguous"],
    [{ intent: 1 }, "unsupported"],
    ["agent-action-security-review", "unsupported"],
  ];

  for (const [body, reason] of cases) {
    const decision = evaluateNewSalesIntakeBody(body);
    assert.equal(decision.accepted, false, JSON.stringify(body));
    if (!decision.accepted) assert.equal(decision.reason, reason, JSON.stringify(body));
  }
});

test("the request page preselects the agent review and parks the external product", () => {
  assert.deepEqual(resolveNewSalesPageQuery({}), {
    state: "selected",
    role: "offer",
    intent: agent,
  });
  assert.deepEqual(resolveNewSalesPageQuery({ offerId: agent }), {
    state: "selected",
    role: "offer",
    intent: agent,
  });
  assert.deepEqual(
    resolveNewSalesPageQuery({
      offerId: agent,
      offer: PUBLIC_AGENT_ACTION_OFFER.name.en,
    }),
    { state: "selected", role: "offer", intent: agent },
  );
  assert.deepEqual(resolveNewSalesPageQuery({ productId: external }), {
    state: "rejected",
    reason: "parked",
  });
  assert.deepEqual(
    resolveNewSalesPageQuery({
      productId: external,
      offer: EXTERNAL_ATTACK_SURFACE_OFFER.name.pl,
    }),
    { state: "rejected", reason: "parked" },
  );
});

test("the request page rejects legacy, ambiguous, wrong-role, and display-only selectors", () => {
  const cases: Array<[Parameters<typeof resolveNewSalesPageQuery>[0], string]> = [
    [{ offerId: PRIMARY_OFFER.id }, "historical"],
    [{ offerId: LEGACY_AGENT_ACTION_OFFER.id }, "historical"],
    [{ offerId: "customer-security-review-sprint" }, "historical"],
    [{ productId: "OFFSEC-LOCAL-AUDIT" }, "historical"],
    [{ offerId: external }, "parked"],
    [{ productId: agent }, "wrong-role"],
    [{ offerId: EXTERNAL_ATTACK_SURFACE_OFFER.id }, "parked"],
    [{ offerId: agent, productId: external }, "ambiguous"],
    [{ offerId: [agent, PRIMARY_OFFER.id] }, "ambiguous"],
    [{ offerId: agent, offer: PRIMARY_OFFER.name.en }, "ambiguous"],
    [{ offer: PUBLIC_AGENT_ACTION_OFFER.name.en }, "unsupported"],
    [{ offer: PRIMARY_OFFER.name.en }, "unsupported"],
    [{ offerId: "OFFSEC-PILOT" }, "unsupported"],
    [{ productId: "OFFSEC-PILOT" }, "unsupported"],
    [{ offerId: "unknown" }, "unsupported"],
    [{ offerId: `${agent} ` }, "unsupported"],
  ];

  for (const [query, reason] of cases) {
    const decision = resolveNewSalesPageQuery(query);
    assert.equal(decision.state, "rejected", JSON.stringify(query));
    if (decision.state === "rejected") assert.equal(decision.reason, reason, JSON.stringify(query));
  }

});
