import assert from "node:assert/strict";
import test from "node:test";
import {
  PUBLIC_AGENT_ACTION_REVIEW_ID,
  PUBLIC_PAID_REVIEW_IDS,
  isPublicPaidReviewId,
  publicPaidReviews,
} from "./public-paid-reviews";

const ai = { id: PUBLIC_AGENT_ACTION_REVIEW_ID, price: "€2,500 fixed", scope: "one consequential agent or automation action" };
const external = { id: "external-exposure-assessment", productId: "OFFSEC-EXTERNAL-EXPOSURE", price: "€1,900" };
const legacy = { id: "automation-repair-handover", price: "€250 diagnosis" };

test("new paid discovery contains exactly the two founder-approved identities", () => {
  assert.deepEqual(PUBLIC_PAID_REVIEW_IDS, [ai.id, external.id]);
  assert.equal(PUBLIC_AGENT_ACTION_REVIEW_ID, "agent-action-security-review");
  assert.equal(ai.price, "€2,500 fixed");
  assert.equal(ai.scope, "one consequential agent or automation action");
});
test("discovery orders AI then external without rewriting either source record", () => {
  const selected = publicPaidReviews([legacy, external, ai]);
  assert.deepEqual(selected.map(({ id }) => id), [ai.id, external.id]);
  assert.equal(selected[0], ai);
  assert.equal(selected[1], external);
});
test("selection preserves the historical registry and its ordering", () => {
  const registry = Object.freeze([legacy, external, ai]);
  publicPaidReviews(registry);
  assert.deepEqual(registry, [legacy, external, ai]);
});
test("no fallback reintroduces a retired offer when an approved review is missing", () => {
  assert.throws(() => publicPaidReviews([ai, legacy]), /external-exposure-assessment/);
  assert.throws(() => publicPaidReviews([external, legacy]), /agent-action-security-review/);
});
test("duplicate current identities fail instead of selecting arbitrary commercial terms", () => {
  assert.throws(() => publicPaidReviews([ai, external, { ...ai, price: "€500" }]), /agent-action-security-review/);
  assert.throws(() => publicPaidReviews([ai, external, { ...external, price: "€500" }]), /external-exposure-assessment/);
});
test("only exact current service IDs pass the public-paid-review type guard", () => {
  for (const value of PUBLIC_PAID_REVIEW_IDS) assert.equal(isPublicPaidReviewId(value), true);
  for (const value of ["bounded-workflow-review", "agent-tools-access-review", "AI Agent Tools & Access Review", "AI Agent Tools & Access Review — Private Pilot", "automation-repair-handover", "customer-security-review-sprint", "one-server-security-check", "launch-readiness-check", "key-access-custody-review", "incident-readiness-review", "professional-public-footprint-audit", "early-bird", "OFFSEC-EXTERNAL-EXPOSURE", "AI Agent Tools & Access Review", "agent-tools-access-review ", "", undefined, null, 1, {}, [ai.id]]) {
    assert.equal(isPublicPaidReviewId(value), false);
  }
});

/** An existing historical offerId or private pilot must never enter the new-sales projection. */
test("older one-action, inventory review, pilot and extra-price options never select a paid offer", () => {
  for (const retiredOrPrivate of [
    "bounded-workflow-review",
    "agent-tools-access-review",
    "AI Agent Tools & Access Review — Private Pilot",
    "early-bird",
    "OFFSEC-EXTERNAL-EXPOSURE", // valid only as productId for the separate external review
    "€950",
    "€500",
  ]) {
    assert.equal(isPublicPaidReviewId(retiredOrPrivate), false, retiredOrPrivate);
  }
});
