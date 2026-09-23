import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { INTERNET_FOOTPRINT_REVIEW_OFFER, PRIMARY_OFFER, EXTERNAL_ATTACK_SURFACE_OFFER } from "./commercial-truth";
import { buyerRequestHref, buyerServiceById, buyerPublicOfferRequestHref } from "./buyer-services";

test("Pricing T1 footprint terms create no intake identity or delivery contract", () => {
  assert.deepEqual(INTERNET_FOOTPRINT_REVIEW_OFFER, {
    name: { en: "Early Bird — Internet Footprint Review" },
    price: { amount: "500", currency: "EUR", en: "€500 fixed · excluding VAT" },
  });
  assert.equal(buyerRequestHref("en"), "/review/request");
  assert.equal(PRIMARY_OFFER.price.en, "€2,500 fixed · excluding VAT");
  assert.equal(PRIMARY_OFFER.timing.en, "Within 10 working days after evidence rules are agreed");
  assert.match(buyerPublicOfferRequestHref("en", PRIMARY_OFFER.id), /offerId=bounded-workflow-review/);
  assert.equal(buyerServiceById("professional-public-footprint-audit").price.en, "€4,900 · excluding VAT");
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.en, "€1,900 · excluding VAT");
  assert.equal(buyerServiceById("one-server-security-check").detailHref.en, "/catalog/offsec-local-audit");
  assert.equal(buyerServiceById("external-exposure-assessment").detailHref.en, "/catalog/offsec-external-exposure");
});

test("English FAQ describes review pricing without changing signup boundaries", () => {
  const faq = readFileSync(resolve(__dirname, "../../../../content/witnessops/docs/faq.mdx"), "utf8");
  assert.ok(faq.includes("Creating an account is free. No card or subscription is required. The pricing page now lists the published one-off review offers. Signup does not grant a paid app plan."));
  assert.doesNotMatch(faq, /Paid app plans on the pricing page are illustrative/);
});
