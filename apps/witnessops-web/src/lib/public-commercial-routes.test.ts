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
  buyerServiceFromRequestOffer,
  buyerServiceRequestHref,
} from "./buyer-services";
import { PRIMARY_OFFER } from "./commercial-truth";
import { BUYER_SERVICES } from "./buyer-services";
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

test("old source contracts remain readable but cannot be selected for new public issue", () => {
  const old = BUYER_SERVICES.find(s => s.id === PRIMARY_OFFER.id);
  assert.equal(old?.name.en, "AI Agent Tools & Access Review");
  assert.equal(old?.price.en, "Starting at €2,500 · excluding VAT");
  assert.equal(PRIMARY_OFFER.id, "agent-tools-access-review");
  assert.equal(buyerServiceByPublicOfferId(PRIMARY_OFFER.id), undefined);
  assert.equal(buyerServiceFromRequestOffer(PRIMARY_OFFER.id, PRIMARY_OFFER.name.en), undefined);
  assert.equal(buyerServiceFromRequestOffer(undefined, PRIMARY_OFFER.name.en), undefined);
  assert.equal(buyerServiceRequestHref("en", old!), "/review/request");
  for (const id of ["bounded-workflow-review", "agent-tools-access-review", "customer-security-review-sprint", "professional-public-footprint-audit"]) {
    assert.equal(buyerServiceByPublicOfferId(id), undefined);
    assert.equal(resolveNewReviewSelection({offerId:id}).kind, "unavailable");
  }
  const current = buyerServiceByPublicOfferId("agent-action-security-review");
  assert.equal(current?.name.en, "Agent Action Security Review");
  assert.equal(current?.price.en, "€2,500 fixed · excluding VAT");
  assert.equal(buyerServiceFromRequestOffer("agent-action-security-review", "Untrusted label"),current);
  assert.equal(buyerServiceFromRequestOffer(undefined, current?.name.en),undefined);
  assert.equal(buyerPublicOfferRequestHref("en","agent-action-security-review"), "/review/request?offerId=agent-action-security-review&offer=Agent+Action+Security+Review");
  assert.equal(buyerServiceRequestHref("pl",current!),"/pl/review/request?offerId=agent-action-security-review&offer=Agent+Action+Security+Review");
});

test("Polish intake preserves the same exact new paid selectors and old confirmations", () => {
  assert.match(polish, /twoOfferRequestMetadata\("pl"\)/);
  assert.match(polish, /params=\{\(await searchParams\) \?\? \{\}\}/);
  assert.match(shared, /<ContactForm[\s\S]*locale=\{locale\}[\s\S]*intent=\{selection.intent\}/);
  assert.deepEqual(resolveNewReviewSelection({ offerId: "agent-action-security-review" }), {
    kind: "selected", serviceId: "agent-action-security-review", intent: "agent-action-security-review",
  });
  assert.equal(resolveNewReviewSelection({offerId: PRIMARY_OFFER.id}).kind, "unavailable");
  for (const params of [
    { offerId: "bounded-workflow-review" },
    { offerId: "agent-tools-access-review", productId: "OFFSEC-EXTERNAL-EXPOSURE" },
    { productId: ["OFFSEC-EXTERNAL-EXPOSURE", "OFFSEC-EXTERNAL-EXPOSURE"] },
    { offerId: ["agent-tools-access-review", "agent-tools-access-review"] },
    { enquiryPath: "early-bird" },
  ]) assert.equal(resolveNewReviewSelection(params).kind, "unavailable");
});
