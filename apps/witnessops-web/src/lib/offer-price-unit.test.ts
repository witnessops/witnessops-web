import assert from "node:assert/strict";
import test from "node:test";

import { classifyCommercialFit } from "@/lib/server/ask-witnessops/commercial-fit-classifier";
import {
  AUTOMATION_REPAIR_OFFER,
  EXTERNAL_ATTACK_SURFACE_OFFER,
  INTERNET_FOOTPRINT_REVIEW_OFFER,
  LEGACY_AGENT_ACTION_OFFER,
  PRIMARY_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import {
  AGENT_PRICE_EN,
  AGENT_PRICE_PL,
  bindOfferPriceUnits,
  EXTERNAL_PRICE_EN,
  EXTERNAL_PRICE_PL,
  isOfferPriceUnit,
  OFFER_PRICE_UNIT_PATTERN,
  plainOfferPrice,
} from "@/lib/offer-price-unit";
import { homepageReviewsJsonLd } from "@/lib/public-seo";

function matchesOfferPriceUnit(value: string): boolean {
  return new RegExp(OFFER_PRICE_UNIT_PATTERN.source, "g").test(value);
}

test("the two public offers use the locked EN and PL price units", () => {
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.name.en, "Agent Action Security Review");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.name.pl, "Agent Action Security Review");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.amount, "2500");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.en, AGENT_PRICE_EN);
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.pl, AGENT_PRICE_PL);
  assert.equal(plainOfferPrice(PUBLIC_AGENT_ACTION_OFFER.price.en), "€2,500 excl. VAT");
  assert.equal(plainOfferPrice(PUBLIC_AGENT_ACTION_OFFER.price.pl), "€2 500 bez VAT");

  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.name.en, "External Attack Surface Review");
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.name.pl, "External Attack Surface Review");
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.amount, "1900");
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.en, EXTERNAL_PRICE_EN);
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.pl, EXTERNAL_PRICE_PL);
  assert.equal(plainOfferPrice(EXTERNAL_ATTACK_SURFACE_OFFER.price.en), "€1,900 excl. VAT");
  assert.equal(plainOfferPrice(EXTERNAL_ATTACK_SURFACE_OFFER.price.pl), "€1 900 bez VAT");
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.vatIncluded, false);

  for (const unit of [AGENT_PRICE_EN, AGENT_PRICE_PL, EXTERNAL_PRICE_EN, EXTERNAL_PRICE_PL]) {
    assert.equal(isOfferPriceUnit(unit), true, unit);
    assert.equal(matchesOfferPriceUnit(unit), true, unit);
  }
  assert.equal(isOfferPriceUnit(plainOfferPrice(AGENT_PRICE_EN)), false);
  assert.equal(isOfferPriceUnit("€2,500 excl. VAT"), false);
});

test("ask classification quotes those plain prices and does not sell withdrawn offers", () => {
  const agent = classifyCommercialFit({
    question: "What is included in Agent Action Security Review and how much does it cost?",
    authorityQuestionClassId: "fit_check",
  });
  assert.equal(agent.result, "likely");
  assert.equal(agent.offer?.name, "Agent Action Security Review");
  assert.equal(agent.offer?.price_label, "€2,500 excl. VAT");

  const external = classifyCommercialFit({
    question: "What is included in the External Attack Surface Review and how much does it cost?",
    authorityQuestionClassId: "fit_check",
  });
  assert.equal(external.result, "likely");
  assert.equal(external.offer?.name, "External Attack Surface Review");
  assert.equal(external.offer?.price_label, "€1,900 excl. VAT");

  const withdrawn = classifyCommercialFit({
    question: "What is included in AI Agent Tools & Access Review and how much does it cost?",
    authorityQuestionClassId: "fit_check",
  });
  assert.equal(withdrawn.result, "unknown");
  assert.equal(withdrawn.offer, null);
});

test("held and withdrawn prices stay outside the public price unit", () => {
  const held = [
    PRIMARY_OFFER.price.en,
    PRIMARY_OFFER.price.pl,
    LEGACY_AGENT_ACTION_OFFER.price.en,
    LEGACY_AGENT_ACTION_OFFER.price.pl,
    AUTOMATION_REPAIR_OFFER.price.en,
    AUTOMATION_REPAIR_OFFER.price.pl,
    AUTOMATION_REPAIR_OFFER.repairPrice.en,
    AUTOMATION_REPAIR_OFFER.repairPrice.pl,
    INTERNET_FOOTPRINT_REVIEW_OFFER.price.en,
    EXTERNAL_ATTACK_SURFACE_OFFER.additionalOrLateRetestPrice.en,
    EXTERNAL_ATTACK_SURFACE_OFFER.additionalOrLateRetestPrice.pl,
    "€250 diagnosis",
    "€750 total",
    "€1,500",
    "€550",
  ];

  for (const value of held) {
    assert.equal(isOfferPriceUnit(value), false, value);
    assert.equal(matchesOfferPriceUnit(value), false, value);
    assert.equal(bindOfferPriceUnits(value), value, value);
  }

  assert.equal(bindOfferPriceUnits("The review is €2,500 excl. VAT."), `The review is ${AGENT_PRICE_EN}.`);
  assert.equal(PRIMARY_OFFER.name.en, "AI Agent Tools & Access Review");
  assert.equal(isOfferPriceUnit(PRIMARY_OFFER.name.en), false);
});

test("homepage review data names only the two public offers and their net prices", () => {
  const data = homepageReviewsJsonLd();
  const items = data.itemListElement.map((entry) => ({
    name: entry.item.name,
    price: entry.item.offers.price,
    currency: entry.item.offers.priceCurrency,
    vatIncluded: entry.item.offers.valueAddedTaxIncluded,
    url: entry.item.url,
  }));

  assert.deepEqual(
    items.map(({ name, price, currency, vatIncluded }) => ({ name, price, currency, vatIncluded })),
    [
      {
        name: "Agent Action Security Review",
        price: "2500",
        currency: "EUR",
        vatIncluded: false,
      },
      {
        name: "External Attack Surface Review",
        price: "1900",
        currency: "EUR",
        vatIncluded: false,
      },
    ],
  );
  // canonicalUrl() keeps only the pathname, so the agent item's
  // /reviews#agent-action-security-review fragment is not pinned here.
  assert.equal(items[1]?.url, "https://witnessops.com/reviews/external-attack-surface-review");

  const serialized = JSON.stringify(data);
  for (const hidden of [
    "AI Agent Tools",
    "Automation Repair",
    "Early Bird",
    "Internet Footprint",
    "Customer Security Review",
    "One Server Security",
    "Agent Risk & Control",
    "Agent Workflow Reconstruction",
    "€250",
    "€500",
    "€550",
    "€750",
    "€1,500",
    "Starting at",
    "/catalog/",
  ]) {
    assert.equal(serialized.includes(hidden), false, hidden);
  }
});
