import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PricingPage, {
  metadata as pricingMetadata,
} from "@/app/(marketing)/pricing/page";
import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import {
  BUYER_SERVICES,
  buyerPublicOfferRequestHref,
  buyerServiceById,
} from "@/lib/buyer-services";
import { loadHomeContent } from "@/lib/content";
import { classifyCommercialFit } from "@/lib/server/ask-witnessops/commercial-fit-classifier";

const PRIMARY_OFFER_NAME = "Agent Risk & Control Review";
const PRIMARY_OFFER_ID = "bounded-workflow-review";
const PRIMARY_PRICE = "From €1,500";
const PRIMARY_ROUTE = "/catalog/workflows";
const PRIMARY_REQUEST = "bounded-workflow-review";

const PRIMARY_OFFER = {
  id: PRIMARY_OFFER_ID,
  name: PRIMARY_OFFER_NAME,
  priceContract: "from_eur_1500",
  priceEn: PRIMARY_PRICE,
  pricePl: "Od 6 500 zł (ok. €1 500)",
  route: PRIMARY_ROUTE,
  requestOfferId: PRIMARY_REQUEST,
  unit: "One agentic or automated workflow",
} as const;

function renderedArticle(html: string, attribute: string, value: string) {
  const marker = `${attribute}="${value}"`;
  const markerIndex = html.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Rendered surface is missing ${marker}`);

  const start = html.lastIndexOf("<article", markerIndex);
  const end = html.indexOf("</article>", markerIndex);
  assert.notEqual(start, -1, `${marker} is not inside an article`);
  assert.notEqual(end, -1, `${marker} article is not closed`);
  return html.slice(start, end + "</article>".length);
}

test("one canonical record defines the primary paid entry point", () => {
  const featured = BUYER_SERVICES.filter(
    (service) => service.homepageFeatured === true,
  );
  assert.equal(featured.length, 1, "Exactly one offer may define the homepage");

  const primary = buyerServiceById(PRIMARY_OFFER.id);
  assert.equal(featured[0], primary);
  assert.equal(primary.name.en, PRIMARY_OFFER.name);
  assert.equal(primary.name.pl, PRIMARY_OFFER.name);
  assert.equal(primary.commercialContract.price, PRIMARY_OFFER.priceContract);
  assert.equal(primary.price.en, PRIMARY_OFFER.priceEn);
  assert.equal(primary.price.pl, PRIMARY_OFFER.pricePl);
  assert.equal(primary.detailHref.en, PRIMARY_OFFER.route);
  assert.equal(primary.productId, undefined);
  assert.match(primary.cardSituation.en, /One agentic or automated workflow/);
  assert.match(primary.timing.en, /non-secret fit check/);
  assert.match(primary.boundary.en, /One named workflow only/);
});

test("English and Polish entry links preserve the primary offer selection", () => {
  for (const [locale, pathname] of [
    ["en", "/review/request"],
    ["pl", "/pl/review/request"],
  ] as const) {
    const href = buyerPublicOfferRequestHref(locale, PRIMARY_OFFER.id);
    const url = new URL(href, "https://witnessops.com");

    assert.equal(url.pathname, pathname);
    assert.equal(url.searchParams.get("offerId"), PRIMARY_OFFER.requestOfferId);
    assert.equal(url.searchParams.get("offer"), PRIMARY_OFFER.name);
  }
});

test("primary metadata and rendered offer ownership stay current", () => {
  const home = loadHomeContent();
  assert.equal(
    home.seo.title,
    "Proof infrastructure for agentic operations | WitnessOps",
  );
  assert.equal(home.seo.og_title, "Agents act. WitnessOps proves.");

  const workflowPage = readFileSync(
    resolve(__dirname, "../app/(marketing)/catalog/workflows/page.tsx"),
    "utf8",
  );
  assert.match(workflowPage, /buyerServiceById\("bounded-workflow-review"\)/);
  assert.match(workflowPage, /title: service\.name\.en/);
  assert.match(workflowPage, /description: service\.situation\.en/);
  assert.match(workflowPage, /canonical: "\/catalog\/workflows"/);

  const homepage = readFileSync(
    resolve(__dirname, "../components/marketing/buyer-homepage.tsx"),
    "utf8",
  );
  assert.match(homepage, /offerTitle: "Agent Risk & Control Review"/);
  assert.match(homepage, /From €1,500 · Timing confirmed/);
  assert.match(
    homepage,
    /buyerPublicOfferRequestHref\(\s*locale,\s*"bounded-workflow-review"/,
  );

  assert.equal(pricingMetadata.title, "Agent and Security Review Pricing");
  assert.equal(
    pricingMetadata.description,
    "Published prices and commercial boundaries for bounded WitnessOps reviews, led by the Agent Risk & Control Review from €1,500.",
  );

  const pricing = renderToStaticMarkup(createElement(PricingPage));
  const primaryCard = renderedArticle(
    pricing,
    "data-pricing-service",
    PRIMARY_OFFER_ID,
  );
  const publicExposureCard = renderedArticle(
    pricing,
    "data-pricing-service",
    "external-exposure-assessment",
  );
  assert.equal(
    pricing.match(/data-pricing-service="([^"]+)"/)?.[1],
    PRIMARY_OFFER_ID,
    "The primary paid entry point must render before secondary pricing offers",
  );
  assert.match(primaryCard, /Primary paid entry point/);
  assert.match(primaryCard, /Agent Risk &amp; Control Review/);
  assert.match(primaryCard, /From €1,500/);
  assert.doesNotMatch(publicExposureCard, /Primary paid entry point/);
  assert.match(publicExposureCard, /Public Exposure Review/);
  assert.match(publicExposureCard, /€1,900 ex VAT/);

  const catalogue = renderToStaticMarkup(
    createElement(BuyerCatalogue, { locale: "en" }),
  );
  const primaryCatalogueCard = renderedArticle(
    catalogue,
    "data-buyer-service",
    PRIMARY_OFFER_ID,
  );
  const publicExposureCatalogueCard = renderedArticle(
    catalogue,
    "data-buyer-service",
    "external-exposure-assessment",
  );
  assert.match(primaryCatalogueCard, /Agent Risk &amp; Control Review/);
  assert.match(primaryCatalogueCard, /From €1,500/);
  assert.match(publicExposureCatalogueCard, /Public Exposure Review/);
});

test("Ask WitnessOps presents the same offer for likely and narrowed fits", () => {
  const assessments = [
    classifyCommercialFit({
      question:
        "What is included in the Agent Risk & Control Review and how much does it cost?",
      authorityQuestionClassId: "outside_approved_public_context",
    }),
    classifyCommercialFit({
      question: "Review every AI-agent workflow across production",
      authorityQuestionClassId: "outside_approved_public_context",
    }),
  ];

  assert.deepEqual(
    assessments.map(({ result }) => result),
    ["likely", "needs_boundary"],
  );
  for (const assessment of assessments) {
    assert.equal(assessment.offer_id, PRIMARY_OFFER.requestOfferId);
    assert.equal(assessment.offer?.name, PRIMARY_OFFER.name);
    assert.equal(assessment.offer?.price_label, PRIMARY_OFFER.priceEn);
    assert.equal(assessment.offer?.unit_label, PRIMARY_OFFER.unit);
  }

  const askCard = readFileSync(
    resolve(
      __dirname,
      "../components/docs-assistant/ask-witnessops-commercial-fit-card.tsx",
    ),
    "utf8",
  );
  assert.match(
    askCard,
    new RegExp(
      `/review/request\\?offerId=${PRIMARY_OFFER.requestOfferId}&source=ask`,
    ),
  );
});

test("Public Exposure Review remains available as a secondary catalogue offer", () => {
  const secondary = buyerServiceById("external-exposure-assessment");
  assert.equal(secondary.name.en, "Public Exposure Review");
  assert.equal(secondary.homepageFeatured, false);
  assert.equal(secondary.productId, "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(secondary.detailHref.en, "/catalog/offsec-external-exposure");
  assert.equal(
    secondary.price.en,
    "€1,900 ex VAT — one authorised public-facing system",
  );
});
