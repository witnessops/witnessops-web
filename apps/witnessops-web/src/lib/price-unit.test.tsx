import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PathnameContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AskSovereignPreview } from "@/components/ask-sovereign/ask-sovereign-preview";
import { sovereignAnswer } from "@/components/ask-sovereign/ask-sovereign-answers";
import { BuyerHomepage } from "@/components/marketing/buyer-homepage";
import {
  AGENT_PRICE_EN,
  AGENT_PRICE_PL,
  bindOfferPriceUnits,
  EXTERNAL_PRICE_EN,
  EXTERNAL_PRICE_PL,
} from "@/lib/offer-price-unit";
import { PriceText } from "@/lib/price-unit";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";

const MIDDOT = /·\s*bez VAT/;
const LOOSE = /€(?:2,500|1,900|2[\s\u00A0]500|1[\s\u00A0]900)(?!\u00A0(?:excl\.|bez)\u00A0VAT)/;

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
        { value: "/docs/assistant" },
        createElement(SearchParamsContext.Provider, { value: new URLSearchParams() }, node),
      ),
    ),
  );
}

test("simulated answer sources use the unbreakable price unit and no middot", () => {
  const source = readFileSync(resolve(__dirname, "../components/ask-sovereign/ask-sovereign-answers.ts"), "utf8");
  assert.doesNotMatch(source, MIDDOT);
  const answers = [
    sovereignAnswer("What does the External Attack Surface Review include?", "en").text,
    sovereignAnswer("What does the Agent Action Security Review cover?", "en").text,
    sovereignAnswer("Co obejmuje Agent Action Security Review?", "pl").text,
    sovereignAnswer("Co obejmuje External Attack Surface Review?", "pl").text,
  ];
  assert.match(answers[0], new RegExp(EXTERNAL_PRICE_EN.replace(/[.]/g, "\\.")));
  assert.match(answers[1], new RegExp(AGENT_PRICE_EN.replace(/[.]/g, "\\.")));
  assert.match(answers[2], new RegExp(AGENT_PRICE_PL));
  assert.match(answers[3], new RegExp(EXTERNAL_PRICE_PL));
  for (const text of answers) {
    assert.doesNotMatch(text, MIDDOT);
    assert.doesNotMatch(text, LOOSE);
  }
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.amount, "2500");
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.amount, "1900");
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.en, AGENT_PRICE_EN);
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.en, EXTERNAL_PRICE_EN);
  assert.equal(PUBLIC_AGENT_ACTION_OFFER.price.pl, AGENT_PRICE_PL);
  assert.equal(EXTERNAL_ATTACK_SURFACE_OFFER.price.pl, EXTERNAL_PRICE_PL);
  assert.equal(bindOfferPriceUnits("€2 500 · bez VAT"), AGENT_PRICE_PL);
  assert.equal(bindOfferPriceUnits("€1,900 excl. VAT"), EXTERNAL_PRICE_EN);
  assert.equal(bindOfferPriceUnits("€2,500 excl. VAT"), AGENT_PRICE_EN);
  assert.equal(bindOfferPriceUnits(EXTERNAL_PRICE_EN), EXTERNAL_PRICE_EN);
  assert.equal(bindOfferPriceUnits("Od €2 500 · bez VAT"), "Od €2 500 · bez VAT");
  assert.equal(bindOfferPriceUnits("od €2 500 bez VAT"), "od €2 500 bez VAT");
});

test("rendered Ask and homepage prices are nowrap units", () => {
  const html = [
    render(createElement(AskSovereignPreview, { locale: "en" })),
    render(createElement(AskSovereignPreview, { locale: "pl" })),
    render(createElement(BuyerHomepage, { locale: "en" })),
    render(createElement(BuyerHomepage, { locale: "pl" })),
    renderToStaticMarkup(createElement(PriceText, { text: `The price is ${AGENT_PRICE_EN}.` })),
    renderToStaticMarkup(createElement(PriceText, { text: `Cena: ${AGENT_PRICE_PL}.` })),
  ].join("\n");
  assert.match(html, /data-price-unit=""/);
  assert.match(html, /white-space:nowrap/);
  assert.doesNotMatch(html, MIDDOT);
  assert.match(html, /€2,500\u00A0excl\.\u00A0VAT/);
  assert.match(html, /€1,900\u00A0excl\.\u00A0VAT/);
  assert.match(html, /€2\u00A0500\u00A0bez\u00A0VAT/);
  assert.match(html, /€1\u00A0900\u00A0bez\u00A0VAT/);
  const wrapped = renderToStaticMarkup(createElement(PriceText, { text: `The price is ${EXTERNAL_PRICE_EN}.` }));
  assert.match(wrapped, new RegExp(`<span data-price-unit="" style="white-space:nowrap">${EXTERNAL_PRICE_EN.replace(/[.]/g, "\\.")}</span>`));
});
