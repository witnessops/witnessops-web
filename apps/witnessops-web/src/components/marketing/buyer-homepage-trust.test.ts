import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import CatalogWorkflowsPage from "@/app/(marketing)/catalog/workflows/page";

import {
  sampleCommitShort,
  sampleManifestSha256,
  sampleSourceRepository,
} from "@/app/review/sample-cases/ai-agent-action-proof-run/sample-artifact-contract";
import { BUYER_SERVICES } from "@/lib/buyer-services";
import { PRIMARY_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "@/lib/public-paid-reviews";
import { HOMEPAGE_TWO_OFFER_COPY } from "./homepage-two-offer-copy";

const source = readFileSync(resolve(__dirname, "buyer-homepage.tsx"), "utf8");
const catalogueSource = readFileSync(resolve(__dirname, "buyer-catalogue.tsx"), "utf8");
const detailSource = readFileSync(resolve(__dirname, "buyer-service-detail.tsx"), "utf8");
const customerReviewSource = readFileSync(
  resolve(__dirname, "../../app/customer-security-review/page.tsx"),
  "utf8",
);
const polishCustomerReviewSource = readFileSync(
  resolve(__dirname, "../../app/pl/customer-security-review/page.tsx"),
  "utf8",
);
const onePagerDir = resolve(__dirname, "../../../public/assets/one-pagers");

test("the current review links to a clearly historical one-action example", () => {
  const html = renderToStaticMarkup(createElement(CatalogWorkflowsPage));
  assert.match(html, /href="\/review\/sample-cases\/ai-agent-action-proof-run"/);
  assert.match(html, /historical synthetic one-action example/);
  assert.doesNotMatch(html, /id="sample-review"/);
});

test("homepage leads with the two public paid reviews and keeps the free hostname check", () => {
  assert.match(source, /publicPaidReviews\(BUYER_SERVICES\)/);
  assert.match(source, /HOMEPAGE_TWO_OFFER_COPY/);
  assert.match(source, /See how WitnessOps verifies/);
  assert.match(source, /Describe the system and the security question/);
  assert.match(source, /Proof bundle example/);
  assert.match(source, /Przykład paczki dowodowej/);
  assert.match(source, /href="\/check"/);
  assert.doesNotMatch(source, /Proofpack/);
  assert.doesNotMatch(source, /\/catalog\/automation-repair/);
  assert.doesNotMatch(source, /agent-tools-access-review/);
  assert.doesNotMatch(source, /See all review options/);
  const ownCase = readFileSync(resolve(__dirname, "own-system-case.tsx"), "utf8");
  assert.match(ownCase, /recorded request details/);
  assert.match(ownCase, /zapisane szczegóły żądań/);
  assert.doesNotMatch(ownCase, /preserves the requests/);
  assert.match(source, /HeroGap/);
  assert.match(source, /buyerRequestHref\(locale\)/);
  assert.match(source, /not customer evidence/);
  assert.match(source, /does not establish a real provider action/);
  assert.doesNotMatch(source, /€250|€750|Meet Karol|Work directly with|RepairOptions|VALID_SYNTHETIC_SPECIMEN/);
});

test("EN and PL homepage sources project only the two new-sales reviews", () => {
  const simple = readFileSync(resolve(__dirname, "simple-homepage.tsx"), "utf8");
  assert.match(simple, /publicPaidReviews\(BUYER_SERVICES\)/);
  assert.match(simple, /data-home-offer=\{service\.id\}/);
  assert.match(simple, /buyerServiceRequestHref\("en", service\)/);
  assert.match(simple, /href="\/check"/);
  assert.doesNotMatch(simple, /INTERNET_FOOTPRINT_REVIEW_OFFER|PRIMARY_OFFER|agent-tools-access-review|automation-repair/);
  assert.match(source, /data-home-offer=\{service\.id\}/);
  assert.match(source, /buyerServiceRequestHref\(locale, service\)/);
  for (const locale of ["en", "pl"] as const) {
    const copy = HOMEPAGE_TWO_OFFER_COPY[locale];
    assert.equal(copy.aiCta.length > 0, true);
    assert.match(copy.headline, locale === "en" ? /Proof other people can check/ : /Twoi agenci/);
    assert.match(copy.support, /WitnessOps/);
    assert.match(copy.freeBody, locale === "en" ? /Not a review/ : /nie jest przegląd/);
    assert.doesNotMatch(`${copy.headline} ${copy.aiHeadline} ${copy.externalHeadline}`, /inventory|€500|One Server/);
  }
  assert.equal(HOMEPAGE_TWO_OFFER_COPY.en.aiCta, "Scope an AI review");
  assert.equal(HOMEPAGE_TWO_OFFER_COPY.en.externalCta, "Scope an external review");
  assert.equal(HOMEPAGE_TWO_OFFER_COPY.en.headline, "Proof other people can check.");
  assert.equal(
    HOMEPAGE_TWO_OFFER_COPY.en.support,
    "WitnessOps reviews AI agents and internet-facing systems, with written findings, supporting evidence and clear limits.",
  );
  assert.equal(HOMEPAGE_TWO_OFFER_COPY.en.aiQuestion, "What can your AI agent actually do in production?");
  assert.equal(HOMEPAGE_TWO_OFFER_COPY.en.externalQuestion, "What can the internet see that you didn’t mean to expose?");
  assert.match(HOMEPAGE_TWO_OFFER_COPY.en.aiDescription, /explicit unknowns/);
  assert.doesNotMatch(
    `${HOMEPAGE_TWO_OFFER_COPY.en.aiDescription} ${HOMEPAGE_TWO_OFFER_COPY.en.externalScopeNote}`,
    /10 working days|3 working days|€550|550 €|fixed quote after scope/,
  );
  assert.equal(HOMEPAGE_TWO_OFFER_COPY.en.aiPrice, "€2,500 fixed · excluding VAT");
  assert.equal(HOMEPAGE_TWO_OFFER_COPY.en.externalPrice, "€1,900 fixed · excluding VAT");
  assert.equal(HOMEPAGE_TWO_OFFER_COPY.en.evidenceHeadline, "Evidence survives the dashboard.");
  assert.equal(HOMEPAGE_TWO_OFFER_COPY.en.contactLead, "Discuss a review:");
  assert.equal(
    HOMEPAGE_TWO_OFFER_COPY.pl.headline,
    "Poznaj, co potrafią Twoi agenci i co ujawniają Twoje systemy.",
  );
  assert.match(simple, /text\.evidenceHeadline/);
  assert.match(simple, /text\.externalScopeNote/);
  assert.match(simple, /salesReviewMailto\(\)/);
  assert.match(simple, /\{PUBLIC_SALES_REVIEW_EMAIL\}/);
  assert.doesNotMatch(simple, /PUBLIC_CONTACT_EMAIL/);
  assert.doesNotMatch(simple, /Understand what your agents can do|€500|€950|€4,900|Private Pilot|One Server/);
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.id, PUBLIC_AGENT_ACTION_REVIEW_ID);
});

test("security leads while the repair contract stays intact", () => {
  const lead = BUYER_SERVICES.find(service => service.commercialRole === "primary");
  assert.equal(lead?.id, PRIMARY_OFFER.id);
  const repair = BUYER_SERVICES.find(service => service.id === "automation-repair-handover");
  assert.equal(repair?.price.en, "€250 diagnosis · excluding VAT");
  assert.match(repair?.boundary.en ?? "", /stop after diagnosis or accept a separate quote/);
  const specialist = BUYER_SERVICES.find(service => service.id === PRIMARY_OFFER.id);
  assert.equal(specialist?.homepageFeatured, true);
  assert.equal(specialist?.price.en, "Starting at €2,500 · excluding VAT");
  assert.equal(sampleSourceRepository, "witnessops/witnessops-sample-cases");
  assert.equal(sampleCommitShort, "d4ad234bd815");
  assert.equal(sampleManifestSha256, "9d8668507f3da027886a1847a92b705671063ed89cbb354d45909c119bb414e7");
});

test("External Attack Surface Review stays a registry secondary and a homepage card", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "external-exposure-assessment",
  );

  assert.equal(offer?.name.en, "External Attack Surface Review");
  assert.equal(offer?.commercialRole, "secondary");
  assert.equal(offer?.homepageFeatured, false);
  assert.equal(offer?.productId, "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(offer?.price.en, "€1,900 · excluding VAT");
  assert.equal(offer?.timing.en, "Delivery timing per signed SOW");
  assert.doesNotMatch(offer?.timing.en ?? "", /3 working days|10 working days|€550/);
  assert.match(offer?.boundary.en ?? "", /No exploitation/);
  assert.match(offer?.boundary.en ?? "", /not a penetration test/i);
  assert.match(source, /publicPaidReviews\(BUYER_SERVICES\)/);
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.id, PUBLIC_AGENT_ACTION_REVIEW_ID);
});

test("request-only public footprint audit stays off the homepage", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "professional-public-footprint-audit",
  );

  assert.equal(offer?.homepageFeatured, false);
  assert.equal(offer?.pricingVisible, false);
  assert.equal(offer?.productId, undefined);
  assert.doesNotMatch(source, /Professional Public Footprint Audit/);
});

test("marketing PDFs remain stored but are absent from public buyer choices", () => {
  const pdfs = readdirSync(onePagerDir)
    .filter((name) => name.endsWith(".pdf"))
    .sort();

  assert.deepEqual(pdfs, ["csr-sprint-en-a4.pdf", "csr-sprint-pl-a4.pdf"]);
  assert.ok(BUYER_SERVICES.every((service) => !("onePagerHref" in service)));
  for (const buyerSource of [
    catalogueSource,
    detailSource,
    customerReviewSource,
    polishCustomerReviewSource,
  ]) {
    assert.doesNotMatch(buyerSource, /One-pager|data-one-pager|\.pdf/i);
  }
});
