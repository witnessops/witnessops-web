import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
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
  buyerServicesByCommercialPriority,
} from "@/lib/buyer-services";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
  PRIMARY_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { loadHomeContent } from "@/lib/content";
import {
  primaryOfferBreadcrumbJsonLd,
  primaryOfferServiceJsonLd,
} from "@/lib/public-seo";
import { classifyCommercialFit } from "@/lib/server/ask-witnessops/commercial-fit-classifier";
import { getServiceLanding } from "@/lib/service-landings";
import { publicPaidReviews } from "@/lib/public-paid-reviews";

const ACTIVE_PRIMARY_PRESENTATION_SOURCES = [
  "../app/(marketing)/catalog/workflows/page.tsx",
  "../app/(marketing)/contact/contact-form.tsx",
  "../app/(marketing)/pricing/page.tsx",
  "../app/pl/page.tsx",
  "../app/pl/review/request/page.tsx",
  "../app/pl/support/page.tsx",
  "../app/review/request/page.tsx",
  "../app/review/sample-cases/ai-agent-action-proof-run/page.tsx",
  "../app/review/sample-cases/witnessed-crm-status-change/witnessed-action-replay.tsx",
  "../app/support/page.tsx",
  "../components/docs-assistant/ask-witnessops-commercial-fit-card.tsx",
  "../components/docs-assistant/ask-witnessops-response.ts",
  "../components/docs-assistant/docs-assistant-contact-handoff.tsx",
  "../components/docs-assistant/docs-assistant-page.tsx",
  "../components/docs-assistant/docs-assistant-widget.tsx",
  "../components/marketing/buyer-catalogue.tsx",
  "../components/marketing/buyer-homepage.tsx",
  "../components/marketing/footer.tsx",
  "../components/marketing/public-contact-route.tsx",
  "../components/review-request/review-request-confirmed.tsx",
  "../components/review-request/review-request-record.tsx",
  "../components/shared/navbar.tsx",
  "buyer-services.ts",
  "commercial-request-intents.ts",
  "commercial-truth.ts",
  "public-contact.ts",
  "public-i18n.ts",
  "public-seo.ts",
  "review-request-confirmation.ts",
  "review-request-context.ts",
  "service-landings.ts",
  "../../../../content/witnessops/docs/faq.mdx",
  "../../../../content/witnessops/landing/home.yaml",
  "../../../../content/witnessops/docs/getting-started/index.mdx",
  "../../../../content/witnessops/docs/getting-started/proof-run-buyer-path.mdx",
] as const;

const FORMER_PRIMARY_MARKERS = [
  "Agent Risk & Control Review",
  "From €1,500",
  "from €1,500",
  "€1,500",
  "Od 6 500 zł",
  "€1 500",
  "Request an AI Agent Action Proof Run",
] as const;

const STALE_BUYER_FACING_PRODUCT_NAMES = [
  "Agent Workflow Reconstruction | WitnessOps",
  "Start your Agent Workflow Reconstruction",
  "Rozpocznij Agent Workflow Reconstruction",
  "Public Exposure Review | WitnessOps",
  "Start your Public Exposure Review",
  "Rozpocznij Public Exposure Review",
] as const;

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

test("one current fixed-price Agent Action review owns the public primary position", () => {
  const featured=BUYER_SERVICES.filter(service=>service.homepageFeatured===true);
  const primaries=BUYER_SERVICES.filter(service=>service.commercialRole==="primary");
  assert.equal(featured.length,1,"There must be exactly one public homepage lead");
  assert.equal(primaries.length,1,"There must be exactly one primary sales review");
  const primary=buyerServiceById(PUBLIC_AGENT_ACTION_OFFER.id);
  assert.equal(featured[0]?.id, PUBLIC_AGENT_ACTION_OFFER.id);
  assert.equal(primaries[0],featured[0]);
  assert.equal(primary.name,PUBLIC_AGENT_ACTION_OFFER.name);
  assert.equal(primary.price,PUBLIC_AGENT_ACTION_OFFER.price);
  assert.equal(primary.commercialContract,PUBLIC_AGENT_ACTION_OFFER.commercialContract);
  assert.equal(primary.name.en,"Agent Action Security Review");
  assert.equal(primary.price.en,"€2,500 fixed · excluding VAT");
  assert.equal(primary.detailHref.en,"/catalog/workflows");
  assert.equal(primary.productId,undefined);
  const historical=buyerServiceById(PRIMARY_OFFER.id);
  assert.equal(historical.id,"agent-tools-access-review");
  assert.equal(historical.homepageFeatured,false);
  assert.notEqual(historical.commercialRole,"primary");
  assert.equal(historical.price.en,"Starting at €2,500 · excluding VAT");
  assert.deepEqual(publicPaidReviews(BUYER_SERVICES).map(service=>service.id),[
    "agent-action-security-review","external-exposure-assessment",
  ]);
  const [first,second]=buyerServicesByCommercialPriority();
  assert.equal(first?.id,PUBLIC_AGENT_ACTION_OFFER.id);
  assert.equal(second?.id,"external-exposure-assessment");
  assert.equal(second?.commercialRole,"secondary");
});

test("the primary detail contract exposes every required inclusion and exclusion", () => {
  const landing = getServiceLanding(PRIMARY_OFFER.id, "en");
  for (const item of PRIMARY_OFFER.included.en) {
    assert.ok(landing.deliverables.some((line) => line.startsWith(item)), `Missing included item: ${item}`);
  }
  assert.match(landing.steps.flat().join(" "), /10 working days after accepted scope/i);

  const workflowPage = readFileSync(
    resolve(__dirname, "../app/(marketing)/catalog/workflows/page.tsx"),
    "utf8",
  );
  assert.match(workflowPage, /notIncluded=\{\[\.\.\.PUBLIC_AGENT_ACTION_OFFER\.notIncluded\.en\]\}/);
  assert.match(workflowPage, /promoteCommercialContract/);
  assert.match(workflowPage, /one agreed consequential agent or automation action/i);
  assert.match(workflowPage, /effective permissions/);
  assert.match(workflowPage, /historical synthetic one-action sample/i);
  assert.doesNotMatch(workflowPage, /The sample pack can be tested through \/verify/i);
});

test("English and Polish entry links preserve the primary offer selection", () => {
  for (const [locale, pathname] of [
    ["en", "/review/request"],
    ["pl", "/pl/review/request"],
  ] as const) {
    const href = buyerPublicOfferRequestHref(locale, PUBLIC_AGENT_ACTION_OFFER.id);
    const url = new URL(href, "https://witnessops.com");

    assert.equal(url.pathname, pathname);
    assert.equal(url.searchParams.get("offerId"), PUBLIC_AGENT_ACTION_OFFER.id);
    assert.equal(url.searchParams.get("offer"), PUBLIC_AGENT_ACTION_OFFER.name[locale]);
  }
});

test("primary metadata, structured data, and offer ownership stay current", () => {
  const home = loadHomeContent();
  assert.equal(
    home.seo.title,
    "Security Verification & Evidence | WitnessOps",
  );
  assert.equal(
    home.seo.og_title,
    "Find security gaps in your systems.",
  );

  const workflowPage = readFileSync(
    resolve(__dirname, "../app/(marketing)/catalog/workflows/page.tsx"),
    "utf8",
  );
  assert.match(workflowPage, /buyerServiceById\(PUBLIC_AGENT_ACTION_OFFER\.id\)/);
  assert.match(workflowPage, /title: service\.name\.en/);
  assert.match(workflowPage, /description: service\.situation\.en/);
  assert.match(workflowPage, /canonical: PUBLIC_AGENT_ACTION_OFFER\.route/);
  assert.match(workflowPage, /primaryOfferServiceJsonLd\(\)/);
  assert.match(workflowPage, /primaryOfferBreadcrumbJsonLd\(\)/);

  const homepageSource = readFileSync(
    resolve(__dirname, "../../../../content/witnessops/landing/home.yaml"),
    "utf8",
  );
  assert.match(homepageSource, /Find security gaps in your systems/);
  assert.match(homepageSource, /Scope a review/);
  assert.doesNotMatch(homepageSource, /€250|€750|Meet Karol/);
  assert.equal(pricingMetadata.title, "Review Pricing");
  assert.ok(String(pricingMetadata.description).includes(PUBLIC_AGENT_ACTION_OFFER.name.en));
  assert.ok(String(pricingMetadata.description).includes(EXTERNAL_ATTACK_SURFACE_OFFER.name.en));

  const serviceJsonLd = primaryOfferServiceJsonLd();
  assert.equal(serviceJsonLd.name, PUBLIC_AGENT_ACTION_OFFER.name.en);
  assert.equal(serviceJsonLd.url, "https://witnessops.com/catalog/workflows");
  assert.equal(serviceJsonLd.offers["@type"], "Offer");
  assert.equal(serviceJsonLd.offers.price, "2500");
  assert.equal(serviceJsonLd.offers.priceCurrency, "EUR");
  assert.match(serviceJsonLd.offers.description, /One consequential agent or automation action/);
  assert.match(serviceJsonLd.offers.description, /Non-secret fit check first/);
  assert.match(
    serviceJsonLd.offers.description,
    /Within 10 working days after evidence rules are agreed/,
  );
  assert.equal(
    primaryOfferBreadcrumbJsonLd().itemListElement.at(-1)?.name,
    PUBLIC_AGENT_ACTION_OFFER.name.en,
  );

  const pricing = renderToStaticMarkup(createElement(AppRouterContext.Provider, {
    value: { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} },
  }, createElement(PricingPage)));
  const primaryCard = renderedArticle(
    pricing,
    "data-pricing-service",
    PUBLIC_AGENT_ACTION_OFFER.id,
  );
  assert.deepEqual(
    [...pricing.matchAll(/data-pricing-review="([^"]+)"/g)].map((match) => match[1]),
    ["agent-action-security", "external-exposure"],
    "Pricing foreground contains exactly the two founder-approved reviews",
  );
  const externalCard = renderedArticle(pricing, "data-pricing-review", "external-exposure");
  assert.ok(externalCard.includes(EXTERNAL_ATTACK_SURFACE_OFFER.name.en));
  assert.ok(externalCard.includes(EXTERNAL_ATTACK_SURFACE_OFFER.price.en));
  assert.match(externalCard, /productId=OFFSEC-EXTERNAL-EXPOSURE/);
  assert.doesNotMatch(pricing, /€49|€149|Early Bird|Internet Footprint Review|One Server Security Check/);
  assert.doesNotMatch(primaryCard, /Start with a broken workflow/);
  assert.match(primaryCard, /Agent Action Security Review/);
  assert.match(primaryCard, /€2,500 fixed/);
  assert.doesNotMatch(primaryCard, /External Attack Surface Review/);
  assert.doesNotMatch(primaryCard, /Agent Risk &amp; Control Review|€1,500/);
  const catalogue = renderToStaticMarkup(
    createElement(BuyerCatalogue, { locale: "en" }),
  );
  const primaryCatalogueCard = renderedArticle(
    catalogue,
    "data-buyer-service",
    PUBLIC_AGENT_ACTION_OFFER.id,
  );
  const publicExposureCatalogueCard = renderedArticle(
    catalogue,
    "data-buyer-service",
    "external-exposure-assessment",
  );
  assert.doesNotMatch(primaryCatalogueCard, /Start with a broken workflow/);
  assert.match(primaryCatalogueCard, /Agent Action Security Review/);
  assert.match(primaryCatalogueCard, /€2,500 fixed/);
  assert.doesNotMatch(primaryCatalogueCard, /Agent Risk &amp; Control Review|€1,500/);
  assert.match(catalogue, /id="system-reviews"/);
  assert.match(publicExposureCatalogueCard, /External Attack Surface Review/);
  assert.match(publicExposureCatalogueCard, /€1,900 · excluding VAT/);
});

test("Ask WitnessOps keeps the current and historical identities distinct", () => {
  const assessments = [
    classifyCommercialFit({
      question:
        "What is included in Agent Action Security Review and how much does it cost?",
      authorityQuestionClassId: "outside_approved_public_context",
    }),
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
    ["likely", "unknown", "needs_boundary"],
  );
  assert.equal(assessments[1]?.offer_id, null);
  assert.equal(assessments[1]?.offer, null);
  for (const assessment of [assessments[0], assessments[2]]) {
    assert.equal(assessment.offer_id, PUBLIC_AGENT_ACTION_OFFER.id);
    assert.equal(assessment.offer?.name, PUBLIC_AGENT_ACTION_OFFER.name.en);
    assert.equal(assessment.offer?.price_label, PUBLIC_AGENT_ACTION_OFFER.price.en);
    assert.equal(assessment.offer?.unit_label, PUBLIC_AGENT_ACTION_OFFER.unit.en);
    assert.equal(assessment.offer?.fit_check_label, PUBLIC_AGENT_ACTION_OFFER.fitCheck.en);
    assert.equal(assessment.offer?.delivery_label, PUBLIC_AGENT_ACTION_OFFER.timing.en);
    assert.notEqual(assessment.offer?.name, "Agent Risk & Control Review");
    assert.notEqual(assessment.offer?.price_label, "From €1,500");
  }

  const askCard = readFileSync(
    resolve(
      __dirname,
      "../components/docs-assistant/ask-witnessops-commercial-fit-card.tsx",
    ),
    "utf8",
  );
  assert.match(askCard, /PUBLIC_AGENT_ACTION_OFFER\.requestRoute/);
  assert.match(askCard, /offerId=\$\{PUBLIC_AGENT_ACTION_OFFER\.id\}/);
  assert.match(askCard, /source=ask&result=\$\{fit\.result\}/);
});

test("active presentation sources cannot restore the former primary name or price", () => {
  const failures: string[] = [];

  for (const relativePath of ACTIVE_PRIMARY_PRESENTATION_SOURCES) {
    const source = readFileSync(resolve(__dirname, relativePath), "utf8");
    for (const marker of FORMER_PRIMARY_MARKERS) {
      if (source.includes(marker)) failures.push(`${relativePath}: ${marker}`);
    }
  }

  assert.deepEqual(failures, []);
});

test("active presentation sources do not restore stale buyer-facing product names", () => {
  const failures: string[] = [];

  for (const relativePath of ACTIVE_PRIMARY_PRESENTATION_SOURCES) {
    const source = readFileSync(resolve(__dirname, relativePath), "utf8");
    for (const marker of STALE_BUYER_FACING_PRODUCT_NAMES) {
      if (source.includes(marker)) failures.push(`${relativePath}: ${marker}`);
    }
  }

  assert.deepEqual(failures, []);
});

test("External Attack Surface Review retains its legacy registry role while current discovery includes it", () => {
  const secondary = buyerServiceById("external-exposure-assessment");
  assert.equal(secondary.name.en, "External Attack Surface Review");
  assert.equal(secondary.name, EXTERNAL_ATTACK_SURFACE_OFFER.name);
  assert.equal(secondary.homepageFeatured, false);
  assert.equal(secondary.commercialRole, "secondary");
  assert.equal(secondary.productId, "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(secondary.detailHref.en, "/catalog/offsec-external-exposure");
  assert.equal(
    secondary.price.en,
    "€1,900 · excluding VAT",
  );
  assert.equal(secondary.timing.en, EXTERNAL_ATTACK_SURFACE_OFFER.timing.en);
  assert.match(secondary.boundary.en, /This is not a penetration test/);
});
