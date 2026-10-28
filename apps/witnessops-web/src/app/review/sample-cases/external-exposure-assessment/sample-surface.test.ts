import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PricingPage from "@/app/(marketing)/pricing/page";
import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";

const page = readFileSync(resolve(__dirname, "page.tsx"), "utf8");
const pricing = readFileSync(
  resolve(__dirname, "../../../(marketing)/pricing/page.tsx"),
  "utf8",
);
const homepage = readFileSync(
  resolve(__dirname, "../../../../components/marketing/buyer-homepage.tsx"),
  "utf8",
);
const homepagePreview = readFileSync(
  resolve(
    __dirname,
    "../../../../components/marketing/homepage-synthetic-preview.ts",
  ),
  "utf8",
);

const expectedFiles = [
  "README.md",
  "external-exposure-assessment.md",
  "exposure-map.json",
  "findings.json",
  "evidence-register.json",
  "handover-agenda.md",
  "focused-retest-result.md",
  "synthetic-rehearsal-checklist.md",
  "synthetic-timesheet.md",
  "CLAIM_BOUNDARY.md",
  "evidence-manifest.json",
  "verifier-result.json",
  "MANIFEST.sha256",
] as const;

test("External Attack Surface Review sample surface expects only the sanitized buyer-safe files", () => {
  assert.match(page, /EXTERNAL_ATTACK_SURFACE_OFFER\.name\.en/);
  assert.match(page, /former Public Exposure Review title as historical artifact identity/);
  assert.match(page, /\/samples\/offsec-external-exposure/);
  for (const file of expectedFiles) {
    assert.match(page, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(page, /proofpack|receipt\.json|sig\.json/i);
});

test("External Attack Surface Review sample preserves the synthetic and integrity boundaries", () => {
  assert.match(page, /Synthetic worked example, not customer evidence\./);
  assert.match(page, /Neither result proves that\s+observations are complete/);
  assert.match(page, /does not prove.*system is secure/is);
  assert.match(page, /OFFSEC-EXTERNAL-EXPOSURE/);
});

test("the parked external sample stays labelled and is not a booking path", () => {
  const route = "/review/sample-cases/external-exposure-assessment";
  const pricingHtml = renderToStaticMarkup(createElement(PricingPage));
  const catalogueHtml = renderToStaticMarkup(
    createElement(BuyerCatalogue, { locale: "en" }),
  );
  assert.match(page, /robots: \{ index: false, follow: true \}/);
  assert.match(page, /no longer available for new\s+engagements/);
  assert.doesNotMatch(page, /Request an external review/);
  assert.match(pricing, /<BuyerCatalogue locale="en" surface="pricing" \/>/);
  assert.match(pricingHtml, /href="\/reviews\/agent-action-security-review"/);
  assert.match(pricingHtml, /offerId=agent-action-security-review/);
  assert.doesNotMatch(pricingHtml, /productId=OFFSEC-EXTERNAL-EXPOSURE/);
  assert.doesNotMatch(catalogueHtml, /productId=OFFSEC-EXTERNAL-EXPOSURE/);
  assert.doesNotMatch(catalogueHtml, new RegExp(route));
  assert.doesNotMatch(homepage, /HOMEPAGE_SYNTHETIC_PREVIEW/);
  assert.match(homepagePreview, new RegExp(route));
});
