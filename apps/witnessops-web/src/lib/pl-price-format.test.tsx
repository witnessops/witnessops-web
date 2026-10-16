import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PolishReviewRequestPage from "@/app/pl/review/request/page";
import PolishSupportPage from "@/app/pl/support/page";
import PolishAgentActionSecurityReviewPage from "@/app/pl/reviews/agent-action-security-review/page";
import PolishExternalAttackSurfaceReviewPage from "@/app/pl/reviews/external-attack-surface-review/page";
import { AskSovereignPreview } from "@/components/ask-sovereign/ask-sovereign-preview";
import { sovereignAnswer } from "@/components/ask-sovereign/ask-sovereign-answers";
import { BuyerHomepage } from "@/components/marketing/buyer-homepage";
import { Footer } from "@/components/marketing/footer";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { loadHomeContent } from "@/lib/content";
import { homepageReviewsJsonLd, publicExposureServiceJsonLd } from "@/lib/public-seo";
import { getServiceLanding } from "@/lib/service-landings";

const FORBIDDEN = /€\s?[\d\s\u00A0]+\s?·\s?bez VAT/;
const LOCKED = /€\d\u00A0\d{3}\u00A0bez\u00A0VAT/;

function render(node: ReactNode) {
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      {
        value: {
          back() {},
          forward() {},
          refresh() {},
          push() {},
          replace() {},
          prefetch() {},
        },
      },
      createElement(
        PathnameContext.Provider,
        { value: "/pl" },
        createElement(SearchParamsContext.Provider, { value: new URLSearchParams() }, node),
      ),
    ),
  );
}

test("Polish rendered prices drop the middot and keep a non-breaking space", async () => {
  const footer = loadHomeContent().footer;
  const agentLanding = getServiceLanding("agent-action-security-review", "pl");
  const externalLanding = getServiceLanding("external-exposure-assessment", "pl");
  const agentMeta = await (await import("@/app/pl/review/request/page")).generateMetadata({
    searchParams: Promise.resolve({ offerId: "agent-action-security-review" }),
  });
  const externalMeta = await (await import("@/app/pl/review/request/page")).generateMetadata({
    searchParams: Promise.resolve({ productId: "OFFSEC-EXTERNAL-EXPOSURE" }),
  });
  const polishRequest = render(await PolishReviewRequestPage({
    searchParams: Promise.resolve({ offerId: "agent-action-security-review" }),
  }));
  const polishExternalRequest = render(await PolishReviewRequestPage({
    searchParams: Promise.resolve({ productId: "OFFSEC-EXTERNAL-EXPOSURE" }),
  }));

  const rendered = [
    render(createElement(AskSovereignPreview, { locale: "pl" })),
    sovereignAnswer("ile kosztuje przegląd agenta za 2500", "pl").text,
    sovereignAnswer("ile kosztuje ekspozycja", "pl").text,
    render(createElement(BuyerHomepage, { locale: "pl" })),
    render(createElement(PolishSupportPage)),
    render(createElement(PolishAgentActionSecurityReviewPage)),
    render(createElement(PolishExternalAttackSurfaceReviewPage)),
    polishRequest,
    polishExternalRequest,
    render(createElement(Footer, {
      brand_line: footer.brand_line,
      subline: footer.subline,
      links: footer.links,
      legal_links: footer.legal_links,
      build_label: footer.build_label,
      copyright: footer.copyright,
    })),
    JSON.stringify(agentLanding),
    JSON.stringify(externalLanding),
    String(agentMeta.description),
    String(externalMeta.description),
    JSON.stringify(publicExposureServiceJsonLd("pl")),
    JSON.stringify(homepageReviewsJsonLd()),
    PUBLIC_AGENT_ACTION_OFFER.price.pl,
    EXTERNAL_ATTACK_SURFACE_OFFER.price.pl,
  ].join("\n");

  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.en, "€2,500\u00A0excl.\u00A0VAT");
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.en, "€1,900\u00A0excl.\u00A0VAT");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.amount, "2500");
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.amount, "1900");
  assert.doesNotMatch(rendered, FORBIDDEN);
  assert.match(PUBLIC_AGENT_ACTION_OFFER.price.pl, LOCKED);
  assert.match(EXTERNAL_ATTACK_SURFACE_OFFER.price.pl, LOCKED);
  const prices = rendered.match(/€[0-9\u00A0][^\n]{0,24}bez\u00A0VAT/g) ?? [];
  assert.ok(prices.length >= 2);
  for (const price of prices) {
    assert.match(price, LOCKED);
  }
  assert.match(rendered, /€2\u00A0500\u00A0bez\u00A0VAT/);
  assert.match(rendered, /€1\u00A0900\u00A0bez\u00A0VAT/);
});
