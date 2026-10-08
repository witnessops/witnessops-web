import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  catalogSkuDisposition,
  isCurrentPublicCatalogSku,
} from "./public-commercial-routes";
import {
  buyerPublicOfferRequestHref,
  buyerServiceByPublicOfferId,
  buyerServiceById,
  buyerServiceFromRequestOffer,
  buyerServiceRequestHref,
} from "./buyer-services";
import { PRIMARY_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "./commercial-truth";
import { resolveNewReviewSelection } from "./new-review-request-policy";

test("commercial SKU route dispositions preserve current offers and contain drift", () => {
  assert.equal(catalogSkuDisposition("OFFSEC-LOCAL-AUDIT"), "current");
  assert.equal(catalogSkuDisposition("OFFSEC-EXTERNAL-EXPOSURE"), "current");
  assert.equal(catalogSkuDisposition("SAAS-TEAM"), "private_preview");
  assert.equal(catalogSkuDisposition("WORKFLOW-S"), "replacement_available");
  assert.equal(catalogSkuDisposition("OFFSEC-PILOT"), "unresolved");
  assert.equal(catalogSkuDisposition("OFFSEC-RETAINER"), "unresolved");
  assert.equal(isCurrentPublicCatalogSku("OFFSEC-LOCAL-AUDIT"), true);
  assert.equal(isCurrentPublicCatalogSku("OFFSEC-PILOT"), false);
});

const english = readFileSync(resolve(__dirname, "../app/review/request/page.tsx"), "utf8");
const polish = readFileSync(resolve(__dirname, "../app/pl/review/request/page.tsx"), "utf8");
const shared = readFileSync(resolve(__dirname, "../components/review-request/two-offer-request.tsx"), "utf8");

test("request pages reject retired SKU selection while historical SKU route dispositions remain intact", () => {
  assert.match(english, /<TwoOfferRequest locale="en"/);
  assert.match(polish, /<TwoOfferRequest locale="pl"/);
  assert.match(shared, /resolveNewReviewSelection\(params\)/);
  assert.match(shared, /publicPaidReviews\(BUYER_SERVICES\)/);
  assert.match(shared, /buyerServiceRequestHref\(locale, review\)/);

  // A current public detail route is NOT automatically a new sellable offer.
  assert.equal(isCurrentPublicCatalogSku("OFFSEC-LOCAL-AUDIT"), true);
  assert.equal(resolveNewReviewSelection({ productId: "OFFSEC-LOCAL-AUDIT" }).kind, "unavailable");
  assert.deepEqual(resolveNewReviewSelection({ productId: "OFFSEC-EXTERNAL-EXPOSURE" }), {
    kind: "selected", serviceId: "external-exposure-assessment", intent: "OFFSEC-EXTERNAL-EXPOSURE",
  });
  assert.equal(resolveNewReviewSelection({ offerId: "agent-tools-access-review", productId: "OFFSEC-EXTERNAL-EXPOSURE" }).kind, "unavailable");
});

test("English intake preserves old terms but restricts every new public offer selector", () => {
  const historical=buyerServiceById("agent-tools-access-review");
  assert.equal(historical.name.en,"AI Agent Tools & Access Review");
  assert.equal(historical.price.en,"Starting at €2,500 · excluding VAT");
  assert.equal(historical.requestCta?.en,"Request a scope and fixed quote");
  assert.equal(PRIMARY_OFFER.unit.en,"One agreed device and OS, one dated system-level inventory, one named agent setup, one selected connection and one consequential action");
  assert.equal(historical.productId,undefined);
  for(const id of ["agent-tools-access-review","customer-security-review-sprint","professional-public-footprint-audit","automation-repair-handover"] as const){
    assert.equal(buyerServiceByPublicOfferId(id),undefined,id);
    assert.equal(resolveNewReviewSelection({offerId:id}).kind,"unavailable",id);
    assert.equal(buyerServiceRequestHref("en",buyerServiceById(id)),"/review/request",id);
  }
  assert.equal(buyerServiceByPublicOfferId("agent-action-security-review")?.name.en,"Agent Action Security Review");
  for(const id of ["one-server-security-check","external-exposure-assessment","not-a-real-offer","bounded-workflow-review"])
    assert.equal(buyerServiceByPublicOfferId(id),undefined,id);
  assert.equal(buyerServiceFromRequestOffer("bounded-workflow-review",PRIMARY_OFFER.name.en),undefined);
  assert.equal(buyerServiceFromRequestOffer(undefined,"Agent Action Security Review"),undefined);
  assert.equal(buyerServiceFromRequestOffer(undefined,PRIMARY_OFFER.name.en),undefined);
  assert.equal(buyerServiceFromRequestOffer("agent-action-security-review","buyer-edited label")?.id,"agent-action-security-review");
  assert.equal(resolveNewReviewSelection({offer:PRIMARY_OFFER.name.en}).kind,"unavailable");
  assert.equal(buyerPublicOfferRequestHref("en","agent-tools-access-review"),"/review/request");
  assert.equal(buyerServiceRequestHref("pl",historical),"/pl/review/request");
  assert.equal(
    buyerPublicOfferRequestHref("en",PUBLIC_AGENT_ACTION_OFFER.id),
    "/review/request?offerId=agent-action-security-review&offer=Agent+Action+Security+Review",
  );
});

test("Polish intake preserves the same exact new paid selectors and old confirmations", () => {
  assert.match(polish, /twoOfferRequestMetadata\("pl"\)/);
  assert.match(polish, /params=\{\(await searchParams\) \?\? \{\}\}/);
  assert.match(shared, /<ContactForm[\s\S]*locale=\{locale\}[\s\S]*intent=\{selection.intent\}/);
  assert.deepEqual(resolveNewReviewSelection({ offerId: PUBLIC_AGENT_ACTION_OFFER.id }), {
    kind: "selected", serviceId: PUBLIC_AGENT_ACTION_OFFER.id, intent: PUBLIC_AGENT_ACTION_OFFER.id,
  });
  assert.equal(resolveNewReviewSelection({offerId:PRIMARY_OFFER.id}).kind,"unavailable");
  for (const params of [
    { offerId: "bounded-workflow-review" },
    { offerId: "agent-tools-access-review", productId: "OFFSEC-EXTERNAL-EXPOSURE" },
    { productId: ["OFFSEC-EXTERNAL-EXPOSURE", "OFFSEC-EXTERNAL-EXPOSURE"] },
    { offerId: ["agent-tools-access-review", "agent-tools-access-review"] },
    { enquiryPath: "early-bird" },
  ]) assert.equal(resolveNewReviewSelection(params).kind, "unavailable");
});
