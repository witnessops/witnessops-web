import assert from "node:assert/strict";
import test from "node:test";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  LEGACY_AGENT_ACTION_OFFER,
  PRIMARY_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "./commercial-truth";
import {
  PUBLIC_AGENT_ACTION_REVIEW_ID,
  PUBLIC_PAID_REVIEW_IDS,
  publicPaidReviews,
} from "./public-paid-reviews";

test("new Agent Action public contract reuses the fixed one-action terms without reactivating the historical ID", () => {
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.id, PUBLIC_AGENT_ACTION_REVIEW_ID);
  assert.notEqual(PUBLIC_AGENT_ACTION_OFFER.id, LEGACY_AGENT_ACTION_OFFER.id);
  assert.notEqual(PUBLIC_AGENT_ACTION_OFFER.id, PRIMARY_OFFER.id);
  assert.equal(LEGACY_AGENT_ACTION_OFFER.id, "bounded-workflow-review");
  assert.equal(PRIMARY_OFFER.id, "agent-tools-access-review");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.name.en, "Agent Action Security Review");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.en, "€2,500 fixed · excluding VAT");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.amount, "2500");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.unit.en, "One consequential agent or automation action");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.commercialContract.price, "eur_2500_fixed");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.timing.en, "Within 10 working days after evidence rules are agreed");
  assert.ok(PUBLIC_AGENT_ACTION_OFFER.notIncluded.en.includes("Exploitation"));
});

test("the distinct inventory review retains its original identity and its different price model", () => {
  assert.equal(PRIMARY_OFFER.name.en, "AI Agent Tools & Access Review");
  assert.equal(PRIMARY_OFFER.price.en, "Starting at €2,500 · excluding VAT");
  assert.match(PRIMARY_OFFER.unit.en, /dated system-level inventory/);
  assert.equal(LEGACY_AGENT_ACTION_OFFER.name.en, PUBLIC_AGENT_ACTION_OFFER.name.en);
  assert.equal(LEGACY_AGENT_ACTION_OFFER.id, "bounded-workflow-review");
});

test("public new-sales projection selects one-action and external only, never pilot or inventory", () => {
  const privatePilot = { id: "private-ai-agent-pilot", price: "€950" };
  const inventory = { id: PRIMARY_OFFER.id, price: PRIMARY_OFFER.price.en };
  const historic = { id: LEGACY_AGENT_ACTION_OFFER.id, price: LEGACY_AGENT_ACTION_OFFER.price.en };
  const current = { id: PUBLIC_AGENT_ACTION_OFFER.id, price: PUBLIC_AGENT_ACTION_OFFER.price.en };
  const external = { id: EXTERNAL_ATTACK_SURFACE_OFFER.id, price: EXTERNAL_ATTACK_SURFACE_OFFER.price.en };
  const chosen = publicPaidReviews([historic, privatePilot, external, inventory, current]);
  assert.deepEqual(chosen, [current, external]);
  assert.deepEqual(PUBLIC_PAID_REVIEW_IDS, ["agent-action-security-review", "external-exposure-assessment"]);
  assert.equal(external.price, "€1,900 · excluding VAT");
});
