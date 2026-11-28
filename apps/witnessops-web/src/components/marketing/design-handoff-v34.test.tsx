import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";
import { ReviewOffer } from "@/components/marketing/review-offer";
import { SimpleHomepage } from "@/components/marketing/simple-homepage";
import { HOMEPAGE_TWO_OFFER_COPY } from "@/components/marketing/homepage-two-offer-copy";
import {
  agentActionServiceJsonLd,
  homepageReviewsJsonLd,
  publicExposureServiceJsonLd,
} from "@/lib/public-seo";

const appRouter = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
};

function render(node: ReactNode) {
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: appRouter },
      node,
    ),
  );
}

const webSrc = resolve(__dirname, "../..");
const COPPER = "#" + "b94716";
const PARKED_FEE = /€1,900|1,900|€1\u00A0900|1900/;

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(tsx?|css)$/.test(entry)) files.push(path);
  }
  return files;
}

function headings(html: string) {
  return html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/g) ?? [];
}

test("rendered buyer copy and JSON-LD show the public fee and no parked price", () => {
  const html = [
    render(createElement(SimpleHomepage)),
    render(createElement(SimpleHomepage, { locale: "pl" })),
    render(createElement(BuyerHomepage, { locale: "en" })),
    render(createElement(BuyerHomepage, { locale: "pl" })),
    render(createElement(ReviewOffer, { locale: "en" })),
    render(createElement(ReviewOffer, { locale: "pl" })),
  ].join("\n");
  const json = JSON.stringify([
    homepageReviewsJsonLd(),
    agentActionServiceJsonLd("en"),
    agentActionServiceJsonLd("pl"),
    publicExposureServiceJsonLd("en"),
    publicExposureServiceJsonLd("pl"),
  ]);
  assert.match(html, /€2,500\u00A0excl\.\u00A0VAT/);
  assert.match(html, /€2\u00A0500\u00A0bez\u00A0VAT/);
  assert.match(json, /€2,500 excl\. VAT|€2,500\u00A0excl\.\u00A0VAT/);
  assert.doesNotMatch(html, PARKED_FEE);
  assert.doesNotMatch(json, PARKED_FEE);
  assert.doesNotMatch(html, /Starting at €2,500|€2,500 fixed/);
  assert.doesNotMatch(html, /\.\.(?!\.)/);
});

test("home renders one h1 whose accessible name is the full sentence", () => {
  for (const [locale, node] of [
    ["en", createElement(SimpleHomepage)],
    ["pl", createElement(SimpleHomepage, { locale: "pl" })],
  ] as const) {
    const copy = HOMEPAGE_TWO_OFFER_COPY[locale];
    const html = render(node);
    const h1s = headings(html);
    assert.equal(h1s.length, 1, locale);
    const h1 = h1s[0] ?? "";
    assert.match(h1, new RegExp(`<span class="sr-only">${copy.headline.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</span>`));
    assert.match(h1, /aria-hidden="true"/);
    const visual = h1.match(/<span aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g) ?? [];
    assert.equal(visual.length, 2, locale);
    assert.match(visual.join(" "), new RegExp(copy.headlineMobile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(h1, /display:\s*none/);
  }
});

test("public source has no copper accent outside an explicit allowlist", () => {
  const allowlist = new Set<string>();
  const hits: string[] = [];
  for (const file of walk(webSrc)) {
    const text = readFileSync(file, "utf8");
    if (!text.toLowerCase().includes(COPPER)) continue;
    const rel = relative(webSrc, file);
    if (allowlist.has(rel)) continue;
    hits.push(rel);
  }
  assert.deepEqual(hits, []);
});

test("Request a security assessment is the English CTA on header, hero, review page, form and restart", () => {
  const navbar = readFileSync(resolve(webSrc, "components/shared/navbar.tsx"), "utf8");
  const form = readFileSync(resolve(webSrc, "app/(marketing)/contact/contact-form.tsx"), "utf8");
  const confirmed = readFileSync(resolve(webSrc, "components/review-request/review-request-confirmed.tsx"), "utf8");
  const home = render(createElement(SimpleHomepage));
  const offer = render(createElement(ReviewOffer, { locale: "en" }));
  assert.match(navbar, /label: "Request a security assessment"/);
  assert.match(form, /send: polish \? "Zapytaj o ocenę bezpieczeństwa" : "Request a security assessment"/);
  assert.match(confirmed, /restart: "Request a security assessment"/);
  assert.doesNotMatch(confirmed, /uppercase tracking-\[0\.08em\]/);
  const hero = home.match(/data-ui-proof-id="homepage-hero-primary-cta"[^>]*>[^<]+/)?.[0] ?? "";
  assert.match(hero, /Request a security assessment/);
  // The 2026-11-13 homepage cut has no offer card; the form submit keeps the CTA.
  assert.doesNotMatch(home, /data-home-offer=/);
  assert.match(home, /<button type="submit"[^>]*>Request a security assessment<\/button>/);
  assert.match(offer, /data-ui-proof-id="offer-in-page-cta"[^>]*>Request a security assessment/);
  assert.equal(HOMEPAGE_TWO_OFFER_COPY.en.headlineMobile, "AI Agent Red Teaming.");
  assert.equal(
    HOMEPAGE_TWO_OFFER_COPY.pl.headlineDesktopVisual,
    "Red teaming agentów AI, które mogą zmieniać dane, pieniądze lub dostęp.",
  );
});
