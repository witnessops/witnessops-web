import assert from "node:assert/strict";
import test from "node:test";

import { BUYER_SERVICES } from "@/lib/buyer-services";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PRIMARY_OFFER,
} from "@/lib/commercial-truth";

const expectedPrices = {
  "customer-security-review-sprint": {
    en: "From €1,600 · excluding VAT",
    pl: "Od 7 000 zł (ok. €1 600) · bez VAT",
  },
  "bounded-workflow-review": {
    en: "€2,500 fixed · excluding VAT",
    pl: "€2 500 — cena stała · bez VAT",
  },
  "one-server-security-check": {
    en: "€950 standard · excluding VAT",
    pl: "Standardowo 4 100 zł (ok. €950) · bez VAT",
  },
  "external-exposure-assessment": {
    en: "€1,900 · excluding VAT",
    pl: "€1 900 · bez VAT",
  },
  "launch-readiness-check": {
    en: "€2,500–€7,500 · excluding VAT",
    pl: "11 000–32 000 zł (ok. €2 500–€7 500) · bez VAT",
  },
  "key-access-custody-review": {
    en: "€3,000–€15,000 · excluding VAT",
    pl: "13 000–65 000 zł (ok. €3 000–€15 000) · bez VAT",
  },
  "incident-readiness-review": {
    en: "€5,000–€25,000 · excluding VAT",
    pl: "22 000–108 000 zł (ok. €5 000–€25 000) · bez VAT",
  },
  "professional-public-footprint-audit": {
    en: "€4,900 · excluding VAT",
    pl: "4 900 EUR · bez VAT",
  },
} as const;

test("every live buyer offer uses the canonical EN and PL VAT display", () => {
  assert.equal(BUYER_SERVICES.length, Object.keys(expectedPrices).length);

  for (const service of BUYER_SERVICES) {
    assert.deepEqual(
      { en: service.price.en, pl: service.price.pl },
      expectedPrices[service.id],
    );
    assert.match(service.price.en, / · excluding VAT$/);
    assert.match(service.price.pl, / · bez VAT$/);
  }
});

test("presentation cleanup preserves locked names, ids, and price contracts", () => {
  assert.equal(PRIMARY_OFFER.name.en, "Agent Action Security Review");
  assert.equal(PRIMARY_OFFER.deliveryMethod.en, "Agent Workflow Reconstruction");
  assert.equal(PRIMARY_OFFER.id, "bounded-workflow-review");
  assert.equal(PRIMARY_OFFER.route, "/catalog/workflows");
  assert.equal(PRIMARY_OFFER.requestRoute, "/review/request");
  assert.equal(PRIMARY_OFFER.commercialContract.price, "eur_2500_fixed");
  assert.equal(PRIMARY_OFFER.price.amount, "2500");

  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.name.en, "External Attack Surface Review");
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.productId, "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(
    EXTERNAL_ATTACK_SURFACE_OFFER.commercialContract.price,
    "eur_1900_ex_vat_one_authorised_public_facing_system",
  );
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.amount, "1900");
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.additionalOrLateRetestPrice.amount, "550");
  assert.equal(
    EXTERNAL_ATTACK_SURFACE_OFFER.additionalOrLateRetestPrice.en,
    "€550 · excluding VAT",
  );
});
