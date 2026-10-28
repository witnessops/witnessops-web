import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { BUYER_SERVICES, buyerServiceRequestHref, type BuyerLocale } from "../../lib/buyer-services";
import { publicPaidReviews } from "../../lib/public-paid-reviews";

const previewSource = readFileSync(resolve(__dirname, "ask-sovereign-preview.tsx"), "utf8");
const service = publicPaidReviews(BUYER_SERVICES)[0];

/**
 * The component closes over `prefix`. These two lines are the whole function,
 * so the assertions below execute the same rule the widget ships.
 */
function actionHref(prefix: string, href: string): string {
  const path = href.replace(/^\/pl(?=\/)/, "");
  return /^\/(?:support|security|review\/request)(?:[/?#]|$)/.test(path) ? `${prefix}${path}` : href;
}

function recommendationHref(locale: BuyerLocale, prefix: "" | "/pl"): string {
  return actionHref(prefix, `${buyerServiceRequestHref(locale, service)}&source=ask`);
}

test("widget action links localize only the published request paths", () => {
  assert.ok(previewSource.includes('const path = href.replace(/^\\/pl(?=\\/)/, "");'));
  assert.ok(previewSource.includes("return /^\\/(?:support|security|review\\/request)(?:[/?#]|$)/.test(path) ? `${prefix}${path}` : href;"));
  assert.ok(previewSource.includes('const prefix = routePrefix ?? (locale === "pl" ? "/pl" : "");'));

  assert.equal(actionHref("/pl", "/review/request"), "/pl/review/request");
  assert.equal(actionHref("/pl", "/review/request?offerId=kept"), "/pl/review/request?offerId=kept");
  assert.equal(actionHref("/pl", "/review/request#scope"), "/pl/review/request#scope");
  assert.equal(actionHref("/pl", "/support#support-request"), "/pl/support#support-request");
  assert.equal(actionHref("/pl", "/security"), "/pl/security");
  assert.equal(actionHref("/pl", "/pl/review/request?source=ask"), "/pl/review/request?source=ask");
  assert.equal(actionHref("", "/pl/review/request?source=ask"), "/review/request?source=ask");
  assert.equal(actionHref("/pl", "/review/request-evil"), "/review/request-evil");
  assert.equal(actionHref("/pl", "/support-desk"), "/support-desk");
  assert.equal(actionHref("/pl", "/check"), "/check");
  assert.equal(actionHref("/pl", "/docs/getting-started"), "/docs/getting-started");
  assert.equal(actionHref("/pl", "mailto:engage@mail.witnessops.com"), "mailto:engage@mail.witnessops.com");
  assert.equal(actionHref("/pl", "https://witnessops.com/review/request"), "https://witnessops.com/review/request");
  assert.equal(actionHref("/pl", "//evil.example/review/request"), "//evil.example/review/request");
});

test("a recommendation stays on the catalogue request link and hides the extra route", () => {
  const cardAt = previewSource.indexOf("data-answer-recommendation");
  const card = previewSource.slice(cardAt, previewSource.indexOf("</div>", cardAt));
  assert.match(card, /actionHref\(`\$\{buyerServiceRequestHref\(locale, service\)\}&source=ask`\)/);
  assert.match(card, /Request scope/);
  assert.match(card, /Poproś o zakres/);
  assert.doesNotMatch(card, /mailto:|request_href|https?:/);
  assert.match(previewSource, /\{!service && turn\.answer\?\.route \? \(/);
  assert.equal(previewSource.includes("recommendation.request_href"), false);
  assert.equal(previewSource.includes("recommendation?.request_href"), false);

  for (const [locale, prefix] of [["en", ""], ["pl", "/pl"]] as const) {
    const href = recommendationHref(locale, prefix);
    const url = new URL(href, "https://witnessops.com");
    const catalogue = new URL(buyerServiceRequestHref(locale, service), "https://witnessops.com");
    assert.equal(url.origin, "https://witnessops.com");
    assert.equal(url.pathname, prefix === "/pl" ? `/pl${catalogue.pathname.replace(/^\/pl(?=\/)/, "")}` : catalogue.pathname.replace(/^\/pl(?=\/)/, ""));
    assert.equal(url.searchParams.get("source"), "ask");
    assert.deepEqual(url.searchParams.getAll("source"), ["ask"]);
    for (const [key, value] of catalogue.searchParams) {
      assert.equal(url.searchParams.get(key), value, `${locale} ${key}`);
    }
    assert.equal(href.startsWith("/pl/"), prefix === "/pl");
    assert.equal(href.includes("mailto:"), false);
  }

  const home = readFileSync(resolve(__dirname, "../../app/page.tsx"), "utf8");
  const polish = readFileSync(resolve(__dirname, "../../app/pl/page.tsx"), "utf8");
  assert.match(home, /<AskSovereignWidget \/>/);
  assert.match(polish, /<AskSovereignWidget locale="pl" routePrefix="\/pl" \/>/);
});
