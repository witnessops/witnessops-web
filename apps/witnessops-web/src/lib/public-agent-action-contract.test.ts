import assert from "node:assert/strict";
import test from "node:test";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  LEGACY_AGENT_ACTION_OFFER,
  PRIMARY_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
  READ_ONLY_AGENT_ACTION_OFFER,
} from "./commercial-truth";
import {
  PUBLIC_AGENT_ACTION_REVIEW_ID,
  PUBLIC_PAID_REVIEW_IDS,
  publicPaidReviews,
} from "./public-paid-reviews";
import { getServiceLanding } from "./service-landings";

test("active one-action testing keeps its identity without inheriting the read-only fee or exclusions", () => {
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.id, PUBLIC_AGENT_ACTION_REVIEW_ID);
  assert.notEqual(PUBLIC_AGENT_ACTION_OFFER.id, LEGACY_AGENT_ACTION_OFFER.id);
  assert.notEqual(PUBLIC_AGENT_ACTION_OFFER.id, PRIMARY_OFFER.id);
  assert.equal(LEGACY_AGENT_ACTION_OFFER.id, "bounded-workflow-review");
  assert.equal(PRIMARY_OFFER.id, "agent-tools-access-review");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.name.en, "Agent Action Security Review");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.en, "Fixed fee, agreed in a signed SOW before we start.");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.pl, "Stała opłata, uzgadniana w podpisanym SOW przed rozpoczęciem.");
  assert.equal(Object.hasOwn(PUBLIC_AGENT_ACTION_OFFER.price, "amount"), false);
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.unit.en, "One consequential agent or automation action");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.commercialContract.price, "fee_agreed_in_signed_sow");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.commercialContract.scope, "one_action_adversarial_testing_v2");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.commercialContract.timing, "delivery_timing_per_signed_sow");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.timing.en, "We don't test until you give written authority.");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.timing.pl, "Nie testujemy, dopóki nie dasz pisemnego upoważnienia.");
  assert.notEqual(PUBLIC_AGENT_ACTION_OFFER.timing.en, LEGACY_AGENT_ACTION_OFFER.timing.en);
  assert.equal(LEGACY_AGENT_ACTION_OFFER.timing.en, "Within 10 working days after evidence rules are agreed");
  assert.ok(PUBLIC_AGENT_ACTION_OFFER.included.en.includes("Explicit unknowns"));
  assert.ok(PUBLIC_AGENT_ACTION_OFFER.included.pl.includes("Jawne niewiadome"));
  assert.deepEqual(PUBLIC_AGENT_ACTION_OFFER.stages.en, ["Attacker-controlled input", "Agent decision", "Tool or API call", "Effective permissions", "Actual saved change", "Evidence"]);
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.stages.pl.length, 6);
  assert.match(PUBLIC_AGENT_ACTION_OFFER.defaultAuthority.en, /Authorization must be enforced before the system changes/);
  assert.match(PUBLIC_AGENT_ACTION_OFFER.retest.en, /original agreement.*cases, window and allowance/);
  assert.doesNotMatch(PUBLIC_AGENT_ACTION_OFFER.notIncluded.en.join(" "), /Executing the action|^Exploitation$/);
  for (const locale of ["en", "pl"] as const) {
    const landing = getServiceLanding(PUBLIC_AGENT_ACTION_OFFER.id, locale);
    const rendered = [...landing.deliverables, ...landing.steps.flat()].join(" ");
    assert.match(rendered, locale === "en" ? /We don't test until you give written authority/ : /Nie testujemy, dopóki nie dasz pisemnego upoważnienia/);
    assert.match(rendered, locale === "en" ? /Explicit unknowns/ : /Czego nie udało się ustalić i jakich dowodów brakuje/);
    assert.doesNotMatch(rendered, /10 working days|10 dni roboczych/);
    assert.doesNotMatch(JSON.stringify(landing), /€2,500|€2 500|No execution of the reviewed action|read, inspect, reconstruct and report|Nie wykonujemy tego działania/);
    assert.match(rendered, locale === "en" ? /failure demonstrated, resisted under tested conditions, inconclusive, or not tested/ : /wykazane przełamanie zabezpieczenia, odparcie w warunkach testu, wynik nierozstrzygający albo brak testu/);
    assert.match(rendered, locale === "en" ? /partial, duplicate or absent changes/ : /częściowe, powielone lub niezapisane/);
  }
});

test("the earlier public read-only agreement keeps its price, method and exclusions", () => {
  assert.equal(READ_ONLY_AGENT_ACTION_OFFER.id, PUBLIC_AGENT_ACTION_OFFER.id);
  assert.equal(READ_ONLY_AGENT_ACTION_OFFER.price.amount, "2500");
  assert.equal(READ_ONLY_AGENT_ACTION_OFFER.commercialContract.price, "eur_2500_fixed");
  assert.equal(READ_ONLY_AGENT_ACTION_OFFER.price.en, "€2,500\u00A0excl.\u00A0VAT");
  assert.match(READ_ONLY_AGENT_ACTION_OFFER.defaultAuthority.en, /read, inspect, reconstruct/);
  assert.ok(READ_ONLY_AGENT_ACTION_OFFER.notIncluded.en.includes("Exploitation"));
});

test("the distinct inventory review retains its original identity and its different price model", () => {
  assert.equal(PRIMARY_OFFER.name.en, "AI Agent Tools & Access Review");
  assert.equal(PRIMARY_OFFER.price.en, "Starting at €2,500 · excluding VAT");
  assert.match(PRIMARY_OFFER.unit.en, /dated system-level inventory/);
  assert.equal(LEGACY_AGENT_ACTION_OFFER.name.en, PUBLIC_AGENT_ACTION_OFFER.name.en);
  assert.equal(LEGACY_AGENT_ACTION_OFFER.id, "bounded-workflow-review");
});

test("public new-sales projection selects the agent review only", () => {
  const privatePilot = { id: "private-ai-agent-pilot", price: "€950" };
  const inventory = { id: PRIMARY_OFFER.id, price: PRIMARY_OFFER.price.en };
  const historic = { id: LEGACY_AGENT_ACTION_OFFER.id, price: LEGACY_AGENT_ACTION_OFFER.price.en };
  const current = { id: PUBLIC_AGENT_ACTION_OFFER.id, price: PUBLIC_AGENT_ACTION_OFFER.price.en };
  const external = { id: EXTERNAL_ATTACK_SURFACE_OFFER.id, price: EXTERNAL_ATTACK_SURFACE_OFFER.price.en };
  const chosen = publicPaidReviews([historic, privatePilot, external, inventory, current]);
  assert.deepEqual(chosen, [current]);
  assert.deepEqual(PUBLIC_PAID_REVIEW_IDS, ["agent-action-security-review"]);
  assert.equal(external.price, "€1,900\u00A0excl.\u00A0VAT");
});
