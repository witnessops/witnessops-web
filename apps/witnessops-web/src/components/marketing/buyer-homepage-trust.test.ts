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
import { PRIMARY_OFFER } from "@/lib/commercial-truth";

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

test("the sample-review link reaches a fictional review with evidence limits, not a verifier verdict", () => {
  const html = renderToStaticMarkup(createElement(CatalogWorkflowsPage));
  assert.match(html, /href="\/catalog\/workflows#sample-review"/);
  assert.match(html, /id="sample-review"/);
  assert.match(html, /Synthetic example · Not customer evidence/);
  assert.match(html, /All inputs and findings below are fictional; no system was tested/);
  assert.match(html, /document-level inconsistency, not an observed unauthorized refund/);
  assert.match(html, /No execution log or provider result is supplied/);
  assert.match(html, /No fix or retest has been performed in this illustration/);
  assert.match(html, /href="\/review\/sample-cases\/ai-agent-action-proof-run"/);
  assert.doesNotMatch(html.slice(html.indexOf('id="sample-review"'), html.indexOf('aria-labelledby="buyer-preparation-heading"')), /VALID_SYNTHETIC_SPECIMEN|data-verdict="valid"/);
});

test("homepage leads with security and evidence while keeping repair accessible", () => {
  assert.match(source, /Find security gaps in your AI and automation/);
  assert.match(source, /HeroGap/);
  assert.match(source, /buyerRequestHref\(locale\)/);
  assert.match(source, /\/catalog\/automation-repair/);
  assert.match(source, /not customer evidence/);
  assert.match(source, /does not establish a real provider action/);
  assert.doesNotMatch(source, /€250|€750|Meet Karol|Work directly with|RepairOptions|VALID_SYNTHETIC_SPECIMEN/);
});

test("security leads while the repair contract stays intact", () => {
  const lead = BUYER_SERVICES.find(service => service.commercialRole === "primary");
  assert.equal(lead?.id, PRIMARY_OFFER.id);
  const repair = BUYER_SERVICES.find(service => service.id === "automation-repair-handover");
  assert.equal(repair?.price.en, "€250 diagnosis · excluding VAT");
  assert.match(repair?.boundary.en ?? "", /stop after diagnosis or accept a separate quote/);
  const specialist = BUYER_SERVICES.find(service => service.id === PRIMARY_OFFER.id);
  assert.equal(specialist?.homepageFeatured, true);
  assert.equal(specialist?.price.en, "€2,500 fixed · excluding VAT");
  assert.equal(sampleSourceRepository, "witnessops/witnessops-sample-cases");
  assert.equal(sampleCommitShort, "d4ad234bd815");
  assert.equal(sampleManifestSha256, "9d8668507f3da027886a1847a92b705671063ed89cbb354d45909c119bb414e7");
});

test("External Attack Surface Review remains a current catalog offer but is not the homepage lead", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "external-exposure-assessment",
  );

  assert.equal(offer?.name.en, "External Attack Surface Review");
  assert.equal(offer?.commercialRole, "secondary");
  assert.equal(offer?.productId, "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(offer?.price.en, "€1,900 · excluding VAT");
  assert.match(offer?.timing.en ?? "", /Within 3 working days after/);
  assert.match(offer?.boundary.en ?? "", /No exploitation/);
  assert.match(offer?.boundary.en ?? "", /not a penetration test/i);
  assert.doesNotMatch(source, /External Attack Surface Review/);
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
