import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroActionVisual } from "./hero-action-visual";

for (const locale of ["en", "pl"] as const) {
  test(`${locale} hero scenario is explicitly illustrative and not a customer result`, () => {
    const html = renderToStaticMarkup(createElement(HeroActionVisual, { locale }));
    assert.match(html, /<figure[^>]+aria-labelledby="home-hero-example-caption"/);
    assert.match(html, /<svg[^>]+aria-hidden="true"[^>]+focusable="false"/);
    const caption = html.match(/<figcaption[\s\S]*?<\/figcaption>/)?.[0];
    assert.ok(caption);
    assert.match(caption, locale === "en" ? /Illustrative example/ : /Przykład poglądowy/);
    assert.match(caption, locale === "en" ? /Not a customer test result/ : /To nie jest wynik testu u klienta/);
    assert.match(caption, locale === "en" ? /fictional refund scenario/ : /fikcyjnym scenariuszu/);
    assert.doesNotMatch(html, /AS FOUND|480\.00|€|EUR|PLN|<script|<image|<button|<input|<a\s/);
  });
}
