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
  assert.match(source, /const offer = one\(params\.offer\)/);
  assert.match(source, /buyerServiceFromRequestOffer\(offerId, offer\)/);
  assert.match(source, /primaryOfferOrder[\s\S]*PRIMARY_OFFER\.id/);
  assert.match(source, /Selected offer: \{selectedOffer\.name\.en\}/);
  assert.match(source, /Price: \{selectedOffer\.price\.en\}/);
  assert.doesNotMatch(source, /isCurrentPublicCatalogSku\(requestedOffer/);

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
  assert.equal(buyerServiceByPublicOfferId("bounded-workflow-review"), undefined);
  assert.equal(buyerServiceFromRequestOffer("bounded-workflow-review", PRIMARY_OFFER.name.en), undefined);
  assert.equal(buyerServiceFromRequestOffer(undefined, "Agent Action Security Review"), undefined);
  for (const locale of ["", "pl/"]) {
    const page = readFileSync(resolve(__dirname, `../app/${locale}review/request/page.tsx`), "utf8");
    assert.match(page, /offerId === LEGACY_AGENT_ACTION_OFFER\.id/);
    assert.match(page, /PRIMARY_OFFER\.id/);
  }

  assert.equal(
    buyerServiceFromRequestOffer(
      PRIMARY_OFFER.id,
      "Buyer-edited conflicting title",
    ),
    offer,
  );
  assert.equal(
    buyerServiceFromRequestOffer(undefined, PRIMARY_OFFER.name.en),
    offer,
  );
  assert.equal(
    buyerServiceFromRequestOffer("not-a-real-offer", PRIMARY_OFFER.name.en),
    undefined,
  );
  assert.equal(
    buyerServiceFromRequestOffer(undefined, "Bounded Workflow Review"),
    undefined,
  );

  assert.equal(
    buyerPublicOfferRequestHref("en", "agent-tools-access-review"),
    "/review/request?offerId=agent-tools-access-review&offer=AI+Agent+Tools+%26+Access+Review",
  );
  assert.equal(
    buyerServiceRequestHref("pl", offer!),
    "/pl/review/request?offerId=agent-tools-access-review&offer=Przegl%C4%85d+narz%C4%99dzi+i+dost%C4%99pu+agenta+AI",
  );
});

test("Polish review intake preserves the same public workflow offer", () => {
  const source = readFileSync(
    resolve(__dirname, "../app/pl/review/request/page.tsx"),
    "utf8",
  );

  assert.match(source, /const offerId = oneParam\(params\.offerId\)/);
  assert.match(source, /const offer = oneParam\(params\.offer\)/);
  assert.match(source, /buyerServiceFromRequestOffer\(offerId, offer\)/);
  assert.match(source, /primaryOfferOrder[\s\S]*PRIMARY_OFFER\.id/);
  assert.match(source, /Wybrana oferta: \{selectedOffer\.name\}/);
  assert.match(source, /Cena: \{selectedOffer\.price\}/);
});
