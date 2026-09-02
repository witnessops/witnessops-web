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
  buyerServiceRequestHref,
} from "./buyer-services";
import { PRIMARY_OFFER } from "./commercial-truth";

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

test("request pages gate query-selected commercial records to current public SKUs", () => {
  for (const path of [
    resolve(__dirname, "../app/review/request/page.tsx"),
    resolve(__dirname, "../app/pl/review/request/page.tsx"),
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /isCurrentPublicCatalogSku\(requestedSku\.id\)/);
  }
});

test("English review intake can preserve the current workflow offer without reviving a replaced SKU", () => {
  const source = readFileSync(
    resolve(__dirname, "../app/review/request/page.tsx"),
    "utf8",
  );

  assert.match(source, /const offerId = one\(params\.offerId\)/);
  assert.match(source, /buyerServiceByPublicOfferId\(offerId\)/);
  assert.match(source, /selectedOffer\?\.id \?\? "review"/);
  assert.match(source, /Selected offer: \{selectedOffer\.name\.en\}/);
  assert.match(source, /Price: \{selectedOffer\.price\.en\}/);
  assert.doesNotMatch(source, /isCurrentPublicCatalogSku\(requestedOffer/);

  const offer = buyerServiceByPublicOfferId("bounded-workflow-review");
  assert.equal(offer?.name.en, "Agent Workflow Reconstruction");
  assert.equal(offer?.price.en, "€2,500 fixed");
  assert.equal(
    offer?.timing.en,
    "Within 10 working days after evidence rules are agreed",
  );
  assert.equal(offer?.requestCta?.en, "Start a non-secret fit check");
  assert.equal(PRIMARY_OFFER.unit.en, "One named workflow (agentic or automated)");
  assert.equal(PRIMARY_OFFER.fitCheck.en, "Non-secret fit check first");
  assert.equal(offer?.productId, undefined);
  assert.equal(
    buyerServiceByPublicOfferId("customer-security-review-sprint")?.name.en,
    "Customer Security Review Sprint",
  );
  assert.equal(
    buyerServiceByPublicOfferId("professional-public-footprint-audit")?.name.en,
    "Professional Public Footprint Audit",
  );
  assert.equal(buyerServiceByPublicOfferId("one-server-security-check"), undefined);
  assert.equal(
    buyerServiceByPublicOfferId("external-exposure-assessment"),
    undefined,
  );
  assert.equal(buyerServiceByPublicOfferId("not-a-real-offer"), undefined);

  assert.equal(
    buyerPublicOfferRequestHref("en", "bounded-workflow-review"),
    "/review/request?offerId=bounded-workflow-review&offer=Agent+Workflow+Reconstruction",
  );
  assert.equal(
    buyerServiceRequestHref("pl", offer!),
    "/pl/review/request?offerId=bounded-workflow-review&offer=Agent+Workflow+Reconstruction",
  );
});

test("Polish review intake preserves the same public workflow offer", () => {
  const source = readFileSync(
    resolve(__dirname, "../app/pl/review/request/page.tsx"),
    "utf8",
  );

  assert.match(source, /const offerId = oneParam\(params\.offerId\)/);
  assert.match(source, /buyerServiceByPublicOfferId\(offerId\)/);
  assert.match(source, /buyerService\?\.id \?\? "review"/);
  assert.match(source, /Wybrana oferta: \{selectedOffer\.name\}/);
  assert.match(source, /Cena: \{selectedOffer\.price\}/);
});
