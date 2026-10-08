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

test("English intake retains historical identity lookups without making them new-offer selectors", () => {
  const offer = buyerServiceByPublicOfferId("agent-tools-access-review");
  assert.equal(offer?.name.en, "AI Agent Tools & Access Review");
  assert.equal(offer?.price.en, "Starting at €2,500 · excluding VAT");
  assert.equal(
    offer?.timing.en,
    "Target: 10 working days after accepted scope, authority, payment, handling and required inputs are confirmed",
  );
  assert.equal(offer?.requestCta?.en, "Request a scope and fixed quote");
  assert.equal(PRIMARY_OFFER.unit.en, "One agreed device and OS, one dated system-level inventory, one named agent setup, one selected connection and one consequential action");
  assert.equal(PRIMARY_OFFER.fitCheck.en, "Non-secret fit and scoping request first");
  assert.equal(offer?.productId, undefined);

  // Historical lookup data must still be available, but not as NEW issue authority.
  for (const id of ["customer-security-review-sprint", "professional-public-footprint-audit"]) {
    assert.ok(buyerServiceByPublicOfferId(id));
    assert.equal(resolveNewReviewSelection({ offerId: id }).kind, "unavailable");
  }
  assert.equal(buyerServiceByPublicOfferId("one-server-security-check"), undefined);
  assert.equal(buyerServiceByPublicOfferId("external-exposure-assessment"), undefined);
  assert.equal(buyerServiceByPublicOfferId("not-a-real-offer"), undefined);
  assert.equal(buyerServiceByPublicOfferId("bounded-workflow-review"), undefined);
  assert.equal(buyerServiceFromRequestOffer("bounded-workflow-review", PRIMARY_OFFER.name.en), undefined);
  assert.equal(buyerServiceFromRequestOffer(undefined, "Agent Action Security Review"), undefined);
  assert.equal(
    buyerServiceFromRequestOffer(PRIMARY_OFFER.id, "Buyer-edited conflicting title"), offer,
  );
  assert.equal(buyerServiceFromRequestOffer(undefined, PRIMARY_OFFER.name.en), offer);
  assert.equal(resolveNewReviewSelection({ offer: PRIMARY_OFFER.name.en }).kind, "unavailable");
  assert.equal(resolveNewReviewSelection({ offerId: "bounded-workflow-review" }).kind, "unavailable");

  assert.equal(
    buyerPublicOfferRequestHref("en", "agent-tools-access-review"),
    "/review/request?offerId=agent-tools-access-review&offer=AI+Agent+Tools+%26+Access+Review",
  );
  assert.equal(
    buyerServiceRequestHref("pl", offer!),
    "/pl/review/request?offerId=agent-tools-access-review&offer=Przegl%C4%85d+narz%C4%99dzi+i+dost%C4%99pu+agenta+AI",
  );
});

test("Polish intake preserves the same exact new paid selectors and old confirmations", () => {
  assert.match(polish, /twoOfferRequestMetadata\("pl"\)/);
  assert.match(polish, /params=\{\(await searchParams\) \?\? \{\}\}/);
  assert.match(shared, /<ContactForm[\s\S]*locale=\{locale\}[\s\S]*intent=\{selection.intent\}/);
  assert.deepEqual(resolveNewReviewSelection({ offerId: PRIMARY_OFFER.id }), {
    kind: "selected", serviceId: PRIMARY_OFFER.id, intent: PRIMARY_OFFER.id,
  });
  for (const params of [
    { offerId: "bounded-workflow-review" },
    { offerId: "agent-tools-access-review", productId: "OFFSEC-EXTERNAL-EXPOSURE" },
    { productId: ["OFFSEC-EXTERNAL-EXPOSURE", "OFFSEC-EXTERNAL-EXPOSURE"] },
    { offerId: ["agent-tools-access-review", "agent-tools-access-review"] },
    { enquiryPath: "early-bird" },
  ]) assert.equal(resolveNewReviewSelection(params).kind, "unavailable");
});
