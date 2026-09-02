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
  PRIMARY_OFFER,
} from "@/lib/commercial-truth";
import { loadHomeContent } from "@/lib/content";
import {
  primaryOfferBreadcrumbJsonLd,
  primaryOfferServiceJsonLd,
} from "@/lib/public-seo";
import { classifyCommercialFit } from "@/lib/server/ask-witnessops/commercial-fit-classifier";
import { getServiceLanding } from "@/lib/service-landings";

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

test("one canonical record defines the primary paid entry point", () => {
  const featured = BUYER_SERVICES.filter(
    (service) => service.homepageFeatured === true,
  );
  const primaries = BUYER_SERVICES.filter(
    (service) => service.commercialRole === "primary",
  );
  assert.equal(featured.length, 1, "Exactly one offer may define the homepage");
  assert.equal(primaries.length, 1, "Exactly one offer may be commercially primary");

  const primary = buyerServiceById(PRIMARY_OFFER.id);
  assert.equal(featured[0], primary);
  assert.equal(primaries[0], primary);
  assert.equal(primary.name, PRIMARY_OFFER.name);
  assert.equal(primary.commercialContract, PRIMARY_OFFER.commercialContract);
  assert.equal(primary.price, PRIMARY_OFFER.price);
  assert.equal(primary.timing, PRIMARY_OFFER.timing);
  assert.equal(primary.name.en, "Agent Action Security Review");
  assert.equal(PRIMARY_OFFER.deliveryMethod.en, "Agent Workflow Reconstruction");
  assert.equal(
    PRIMARY_OFFER.mailSubject,
    "WitnessOps request — Agent Action Security Review",
  );
  assert.equal(primary.price.en, "€2,500 fixed");
  assert.equal(primary.price.pl, "€2 500 — cena stała");
  assert.equal(
    primary.timing.en,
    "Within 10 working days after evidence rules are agreed",
  );
  assert.equal(primary.detailHref.en, PRIMARY_OFFER.route);
  assert.equal(primary.detailHref.pl, PRIMARY_OFFER.route);
  assert.equal(primary.productId, undefined);
  assert.equal(PRIMARY_OFFER.id, "bounded-workflow-review");
  assert.equal(PRIMARY_OFFER.route, "/catalog/workflows");
  assert.equal(PRIMARY_OFFER.requestRoute, "/review/request");
  assert.equal(PRIMARY_OFFER.unit.en, "One consequential agent or automation action");
  assert.equal(
    primary.cardSituation.en,
    "What can your AI agent actually do in production?",
  );
  assert.match(primary.situation.en, /moves from suggesting to acting/i);
  assert.match(primary.requestCta?.en ?? "", /non-secret fit check/i);
  assert.match(primary.boundary.en, /One consequential agent or automation action only/);
  assert.match(primary.boundary.en, /read, inspect, reconstruct, and report/i);
  assert.match(primary.situation.en, /authority, identity, permissions, tools, execution path, blast radius, and evidence/i);

  const [first, second] = buyerServicesByCommercialPriority();
  assert.equal(first, primary);
  assert.equal(second?.id, "external-exposure-assessment");
  assert.equal(second?.commercialRole, "secondary");
});

test("the primary detail contract exposes every required inclusion and exclusion", () => {
  const landing = getServiceLanding(PRIMARY_OFFER.id, "en");
  for (const item of PRIMARY_OFFER.included.en) {
    assert.ok(landing.scopeLimits?.includes(item), `Missing included item: ${item}`);
  }
  assert.match(landing.steps.flat().join(" "), /10 working days after evidence rules are agreed/);

  const workflowPage = readFileSync(
    resolve(__dirname, "../app/(marketing)/catalog/workflows/page.tsx"),
    "utf8",
  );
  assert.match(workflowPage, /notIncluded=\{\[\.\.\.PRIMARY_OFFER\.notIncluded\.en\]\}/);
  assert.match(workflowPage, /promoteCommercialContract/);
  assert.match(workflowPage, /authority → identity → permissions → tools → execution → evidence/);
  assert.match(workflowPage, /over-privileged identities/);
  assert.match(workflowPage, /PRIMARY_OFFER\.deliveryMethod\.en/);
  assert.match(workflowPage, /supported receipt JSON/);
  assert.match(workflowPage, /test it through \/verify/);
  assert.match(workflowPage, /\/verify does not accept the whole pack/);
  assert.doesNotMatch(workflowPage, /The sample pack can be tested through \/verify/i);
});

test("English and Polish entry links preserve the primary offer selection", () => {
  for (const [locale, pathname] of [
    ["en", "/review/request"],
    ["pl", "/pl/review/request"],
  ] as const) {
    const href = buyerPublicOfferRequestHref(locale, PRIMARY_OFFER.id);
    const url = new URL(href, "https://witnessops.com");

    assert.equal(url.pathname, pathname);
    assert.equal(url.searchParams.get("offerId"), PRIMARY_OFFER.id);
    assert.equal(url.searchParams.get("offer"), PRIMARY_OFFER.name[locale]);
  }
});

test("primary metadata, structured data, and offer ownership stay current", () => {
  const home = loadHomeContent();
  assert.equal(
    home.seo.title,
    "Agent Action Security Review | WitnessOps",
  );
  assert.equal(
    home.seo.og_title,
    "What can your AI agent actually do in production?",
  );

  const workflowPage = readFileSync(
    resolve(__dirname, "../app/(marketing)/catalog/workflows/page.tsx"),
    "utf8",
  );
  assert.match(workflowPage, /buyerServiceById\(PRIMARY_OFFER\.id\)/);
  assert.match(workflowPage, /title: service\.name\.en/);
  assert.match(workflowPage, /description: service\.situation\.en/);
  assert.match(workflowPage, /canonical: PRIMARY_OFFER\.route/);
  assert.match(workflowPage, /primaryOfferServiceJsonLd\(\)/);
  assert.match(workflowPage, /primaryOfferBreadcrumbJsonLd\(\)/);

  const homepageSource = readFileSync(
    resolve(__dirname, "../../../../content/witnessops/landing/home.yaml"),
    "utf8",
  );
  assert.match(homepageSource, /What can your AI agent actually do in production\?/);
  assert.match(homepageSource, /before a customer, pentest, or incident finds the gaps for you/);
  assert.match(homepageSource, /Agent Action Security Review/);
  assert.match(homepageSource, /€2,500 fixed/);
  assert.match(homepageSource, /one consequential agent or automation action/i);
  assert.match(homepageSource, /non-secret fit check/);
  assert.match(homepageSource, /authority, identity, permissions, tools, execution, and evidence/i);
  assert.match(
    homepageSource,
    /within 10 working days after evidence rules are agreed/,
  );

  assert.equal(pricingMetadata.title, "Agent and Security Review Pricing");
  assert.equal(
    pricingMetadata.description,
    "Published prices and commercial boundaries for bounded WitnessOps reviews, led by Agent Action Security Review at €2,500 fixed.",
  );

  const serviceJsonLd = primaryOfferServiceJsonLd();
  assert.equal(serviceJsonLd.name, PRIMARY_OFFER.name.en);
  assert.equal(serviceJsonLd.url, "https://witnessops.com/catalog/workflows");
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
    PRIMARY_OFFER.name.en,
  );

  const pricing = renderToStaticMarkup(createElement(PricingPage));
  const primaryCard = renderedArticle(
    pricing,
    "data-pricing-service",
    PRIMARY_OFFER.id,
  );
  const publicExposureCard = renderedArticle(
    pricing,
    "data-pricing-service",
    "external-exposure-assessment",
  );
  assert.deepEqual(
    [...pricing.matchAll(/data-pricing-service="([^"]+)"/g)]
      .slice(0, 2)
      .map((match) => match[1]),
    [PRIMARY_OFFER.id, "external-exposure-assessment"],
    "Primary and secondary offers must lead the pricing order",
  );
  assert.match(primaryCard, /Primary paid entry point/);
  assert.match(primaryCard, /Agent Action Security Review/);
  assert.match(primaryCard, /€2,500 fixed/);
  assert.doesNotMatch(primaryCard, /External Attack Surface Review/);
  assert.doesNotMatch(primaryCard, /Agent Risk &amp; Control Review|€1,500/);
  assert.doesNotMatch(publicExposureCard, /Primary paid entry point/);
  assert.match(publicExposureCard, /Secondary catalogue offer/);
  assert.match(publicExposureCard, /External Attack Surface Review/);
  assert.match(publicExposureCard, /€1,900 ex VAT/);
  assert.match(publicExposureCard, /not a penetration test/i);

  const catalogue = renderToStaticMarkup(
    createElement(BuyerCatalogue, { locale: "en" }),
  );
  const primaryCatalogueCard = renderedArticle(
    catalogue,
    "data-buyer-service",
    PRIMARY_OFFER.id,
  );
  const publicExposureCatalogueCard = renderedArticle(
    catalogue,
    "data-buyer-service",
    "external-exposure-assessment",
  );
  assert.match(primaryCatalogueCard, /Primary paid entry point/);
  assert.match(primaryCatalogueCard, /Agent Action Security Review/);
  assert.match(primaryCatalogueCard, /€2,500 fixed/);
  assert.doesNotMatch(primaryCatalogueCard, /Agent Risk &amp; Control Review|€1,500/);
  assert.match(publicExposureCatalogueCard, /Secondary catalogue offer/);
  assert.match(publicExposureCatalogueCard, /External Attack Surface Review/);
  assert.match(publicExposureCatalogueCard, /€1,900 ex VAT/);
});

test("Ask WitnessOps presents the same current offer for likely, alias, and narrowed fits", () => {
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
    ["likely", "likely", "needs_boundary"],
  );
  for (const assessment of assessments) {
    assert.equal(assessment.offer_id, PRIMARY_OFFER.id);
    assert.equal(assessment.offer?.name, PRIMARY_OFFER.name.en);
    assert.equal(assessment.offer?.price_label, PRIMARY_OFFER.price.en);
    assert.equal(assessment.offer?.unit_label, PRIMARY_OFFER.unit.en);
    assert.equal(assessment.offer?.fit_check_label, PRIMARY_OFFER.fitCheck.en);
    assert.equal(assessment.offer?.delivery_label, PRIMARY_OFFER.timing.en);
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
  assert.match(askCard, /PRIMARY_OFFER\.requestRoute/);
  assert.match(askCard, /offerId=\$\{PRIMARY_OFFER\.id\}/);
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

test("External Attack Surface Review remains available only as the secondary catalogue offer", () => {
  const secondary = buyerServiceById("external-exposure-assessment");
  assert.equal(secondary.name.en, "External Attack Surface Review");
  assert.equal(secondary.name, EXTERNAL_ATTACK_SURFACE_OFFER.name);
  assert.equal(secondary.homepageFeatured, false);
  assert.equal(secondary.commercialRole, "secondary");
  assert.equal(secondary.productId, "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(secondary.detailHref.en, "/catalog/offsec-external-exposure");
  assert.equal(
    secondary.price.en,
    "€1,900 ex VAT — one authorised public-facing system",
  );
  assert.equal(secondary.timing.en, EXTERNAL_ATTACK_SURFACE_OFFER.timing.en);
  assert.match(secondary.boundary.en, /This is not a penetration test/);
});
