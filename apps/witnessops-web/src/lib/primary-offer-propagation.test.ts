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
  PRIMARY_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "@/lib/public-paid-reviews";
import { loadHomeContent } from "@/lib/content";
import { classifyCommercialFit } from "@/lib/server/ask-witnessops/commercial-fit-classifier";
import { getServiceLanding } from "@/lib/service-landings";

const ACTIVE_PRIMARY_PRESENTATION_SOURCES = [
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

  const current = buyerServiceById(PUBLIC_AGENT_ACTION_OFFER.id);
  assert.equal(featured[0]?.id, PUBLIC_AGENT_ACTION_OFFER.id);
  assert.equal(primaries[0], featured[0]);
  assert.equal(current.name, PUBLIC_AGENT_ACTION_OFFER.name);
  assert.equal(current.commercialContract, PUBLIC_AGENT_ACTION_OFFER.commercialContract);
  assert.equal(current.price, PUBLIC_AGENT_ACTION_OFFER.price);
  assert.equal(current.timing, PUBLIC_AGENT_ACTION_OFFER.timing);
  assert.equal(current.detailHref.en, "/reviews/agent-action-security-review");

  const historical = buyerServiceById(PRIMARY_OFFER.id);
  assert.notEqual(historical.commercialRole, "primary");
  assert.notEqual(historical.homepageFeatured, true);
  assert.equal(historical.name, PRIMARY_OFFER.name);
  assert.equal(historical.commercialContract, PRIMARY_OFFER.commercialContract);
  assert.equal(historical.price, PRIMARY_OFFER.price);
  assert.equal(historical.timing, PRIMARY_OFFER.timing);
  assert.equal(historical.name.en, "AI Agent Tools & Access Review");
  assert.equal(PRIMARY_OFFER.deliveryMethod.en, "Manual agent/tool observation and action reconstruction");
  assert.equal(
    PRIMARY_OFFER.mailSubject,
    "WitnessOps request — AI Agent Tools & Access Review",
  );
  assert.equal(historical.price.en, "Starting at €2,500 · excluding VAT");
  assert.equal(historical.price.pl, "Od €2 500 · bez VAT");
  assert.equal(
    historical.timing.en,
    "Target: 10 working days after accepted scope, authority, payment, handling and required inputs are confirmed",
  );
  assert.equal(historical.detailHref.en, PRIMARY_OFFER.route);
  assert.equal(historical.detailHref.pl, PRIMARY_OFFER.route);
  assert.equal(historical.productId, undefined);
  assert.equal(PRIMARY_OFFER.id, "agent-tools-access-review");
  assert.equal(PRIMARY_OFFER.route, "/catalog/workflows");
  assert.equal(PRIMARY_OFFER.requestRoute, "/review/request");
  assert.equal(PRIMARY_OFFER.unit.en, "One agreed device and OS, one dated system-level inventory, one named agent setup, one selected connection and one consequential action");
  assert.equal(
    historical.cardSituation.en,
    "See which agent tools are visible on an agreed device and what one consequential action can reach.",
  );
  assert.match(historical.situation.en, /coding agents and tool connections/i);
  assert.equal(historical.requestCta?.en, "Request a scope and fixed quote");
  assert.match(historical.boundary.en, /One agreed device and dated system-level inventory/i);
  assert.match(historical.boundary.en, /Manual, read-only inspection/i);
  assert.match(historical.situation.en, /observed in agreed sources/i);

  const [first, second] = buyerServicesByCommercialPriority();
  assert.equal(first?.id, PUBLIC_AGENT_ACTION_OFFER.id);
  assert.equal(second?.id, "external-exposure-assessment");
  assert.equal(second?.commercialRole, "secondary");
});

test("the historical primary contract retains its inclusions and exclusions", () => {
  const landing = getServiceLanding(PRIMARY_OFFER.id, "en");
  for (const item of PRIMARY_OFFER.included.en) {
    assert.ok(landing.deliverables.some((line) => line.startsWith(item)), `Missing included item: ${item}`);
  }
  assert.match(landing.steps.flat().join(" "), /10 working days after accepted scope/i);
  assert.ok(PRIMARY_OFFER.notIncluded.en.includes("Platform installation or production modification"));
  assert.ok(PRIMARY_OFFER.notIncluded.en.includes("Continuous monitoring or certification"));
});

test("English and Polish historical links preserve the former offer ID", () => {
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

test("current homepage metadata and offer ownership stay current", () => {
  const home = loadHomeContent();
  assert.equal(
    home.seo.title,
    "Agent Action Security Review | WitnessOps",
  );
  assert.equal(
    home.seo.og_title,
    "Understand the controls before your AI agent acts. | WitnessOps",
  );

  const homepageSource = readFileSync(
    resolve(__dirname, "../../../../content/witnessops/landing/home.yaml"),
    "utf8",
  );
  assert.match(homepageSource, /Find security gaps in your systems/);
  assert.match(homepageSource, /Scope a review/);
  assert.doesNotMatch(homepageSource, /€250|€750|Meet Karol/);
  assert.equal(pricingMetadata.title, "Review Pricing");
  assert.ok(String(pricingMetadata.description).includes(PUBLIC_AGENT_ACTION_OFFER.name.en));
  assert.equal(String(pricingMetadata.description).includes(EXTERNAL_ATTACK_SURFACE_OFFER.name.en), false);

  const pricing = renderToStaticMarkup(createElement(AppRouterContext.Provider, {
    value: { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} },
  }, createElement(PricingPage)));
  const agentActionCard = renderedArticle(
    pricing,
    "data-pricing-service",
    PUBLIC_AGENT_ACTION_REVIEW_ID,
  );
  assert.deepEqual(
    [...pricing.matchAll(/data-pricing-review="([^"]+)"/g)].map((match) => match[1]),
    ["agent-action"],
    "Pricing foreground contains only the agent review",
  );
  assert.doesNotMatch(pricing, /productId=OFFSEC-EXTERNAL-EXPOSURE|Request an external review/);
  assert.doesNotMatch(pricing, /€49|€149|Early Bird|Internet Footprint Review|One Server Security Check/);
  assert.doesNotMatch(agentActionCard, /Start with a broken workflow/);
  assert.match(agentActionCard, /Agent Action Security Review/);
  assert.match(agentActionCard, /€2,500\u00A0excl\.\u00A0VAT/);
  assert.doesNotMatch(agentActionCard, /AI Agent Tools &amp; Access Review/);
  assert.doesNotMatch(agentActionCard, /External Attack Surface Review/);
  assert.doesNotMatch(agentActionCard, /Agent Risk &amp; Control Review|€1,500/);
  assert.match(agentActionCard, /offerId=agent-action-security-review/);
  assert.doesNotMatch(agentActionCard, /href="\/catalog\/workflows"/);
  assert.doesNotMatch(agentActionCard, /offerId=agent-tools-access-review/);
  const catalogue = renderToStaticMarkup(
    createElement(BuyerCatalogue, { locale: "en" }),
  );
  const agentActionCatalogueCard = renderedArticle(
    catalogue,
    "data-buyer-service",
    PUBLIC_AGENT_ACTION_REVIEW_ID,
  );
  assert.doesNotMatch(agentActionCatalogueCard, /Start with a broken workflow/);
  assert.match(agentActionCatalogueCard, /Agent Action Security Review/);
  assert.match(agentActionCatalogueCard, /€2,500\u00A0excl\.\u00A0VAT/);
  assert.doesNotMatch(agentActionCatalogueCard, /AI Agent Tools &amp; Access Review|Agent Risk &amp; Control Review|€1,500/);
  assert.doesNotMatch(catalogue, /id="system-reviews"/);
  assert.match(catalogue, /id="ai-reviews"/);
  assert.doesNotMatch(catalogue, /Request an external review|€1,900/);
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
    assert.equal(assessment.offer?.price_label, "€2,500 excl. VAT");
    assert.doesNotMatch(assessment.offer?.price_label ?? "", /\u00A0/);
    assert.equal(assessment.offer?.unit_label, PUBLIC_AGENT_ACTION_OFFER.unit.en);
    assert.equal(assessment.offer?.fit_check_label, PUBLIC_AGENT_ACTION_OFFER.fitCheck.en);
    assert.equal(assessment.offer?.delivery_label, PUBLIC_AGENT_ACTION_OFFER.timing.en);
    assert.notEqual(assessment.offer_id, PRIMARY_OFFER.id);
    assert.notEqual(assessment.offer?.price_label, "From €1,500");
  }

  const askCard = readFileSync(
    resolve(
      __dirname,
      "../components/docs-assistant/ask-witnessops-commercial-fit-card.tsx",
    ),
    "utf8",
  );
  assert.match(askCard, /buyerServiceRequestHref\(language, selectedService\)/);
  assert.match(askCard, /PUBLIC_AGENT_ACTION_OFFER/);
  assert.match(askCard, /30 calendar days of initial report handover/);
  assert.doesNotMatch(askCard, /offerId=\$\{PRIMARY_OFFER\.id\}/);
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
    "€1,900\u00A0excl.\u00A0VAT",
  );
  assert.equal(secondary.timing.en, EXTERNAL_ATTACK_SURFACE_OFFER.timing.en);
  assert.match(secondary.boundary.en, /This is not a penetration test/);
});
