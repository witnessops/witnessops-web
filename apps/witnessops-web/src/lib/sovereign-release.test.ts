import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AskSovereignPreview } from "../components/ask-sovereign/ask-sovereign-preview";
import { AskSovereignWidget } from "../components/ask-sovereign/ask-sovereign-widget";

const saved = {
  node: process.env.NODE_ENV,
  preview: process.env.NEXT_PUBLIC_WO_PREVIEW,
  release: process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE,
};

function restore() {
  Object.assign(process.env, { NODE_ENV: saved.node });
  if (saved.preview === undefined) delete process.env.NEXT_PUBLIC_WO_PREVIEW;
  else process.env.NEXT_PUBLIC_WO_PREVIEW = saved.preview;
  if (saved.release === undefined) delete process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE;
  else process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE = saved.release;
}

test("production publishes real chat while preview flags cannot expose internal controls", async () => {
  const cases = [
    {},
    { NEXT_PUBLIC_WO_PREVIEW: "1" },
    { NEXT_PUBLIC_SOVEREIGN_RELEASE: "1" },
    { NEXT_PUBLIC_WO_PREVIEW: "1", NEXT_PUBLIC_SOVEREIGN_RELEASE: "1" },
  ];
  try {
    for (const flags of cases) {
      Object.assign(process.env, { NODE_ENV: "production" });
      delete process.env.NEXT_PUBLIC_WO_PREVIEW;
      delete process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE;
      Object.assign(process.env, flags);
      const { sovereignAssistantPublished, sovereignNeedsReviewVisible } = await import("./sovereign-release");
      assert.equal(sovereignAssistantPublished(), true, JSON.stringify(flags));
      assert.equal(sovereignNeedsReviewVisible(), false, JSON.stringify(flags));
      for (const locale of ["en", "pl"] as const) {
        const launcher = renderToStaticMarkup(createElement(AskSovereignWidget, { locale }));
        assert.match(launcher, /aria-haspopup="dialog"/);
        assert.doesNotMatch(launcher, /Preview|Podgląd|podgląd/);
        const html = renderToStaticMarkup(createElement(AskSovereignPreview, { locale, connection: "preview" }));
        assert.match(html, /OpenAI/);
        assert.doesNotMatch(html, /Needs review|PL copy pending native review|Preview, sends nothing|Podgląd, nic nie wysyła|Simulated|Symulacja/);
      }
    }
    const en = await import("../app/docs/assistant/page");
    const pl = await import("../app/pl/docs/assistant/page");
    for (const page of [en.default, pl.default]) {
      assert.match(renderToStaticMarkup(page()), /OpenAI/);
    }
    const { footerResourceLinks } = await import("../components/marketing/footer");
    assert.equal(footerResourceLinks().some((link) => link.href === "/docs/assistant"), true);
    const sitemap = readFileSync(resolve(__dirname, "../app/sitemap.ts"), "utf8");
    const beacon = readFileSync(resolve(__dirname, "../../public/witnessops-analytics.js"), "utf8");
    assert.doesNotMatch(sitemap, /\/docs\/assistant/);
    assert.match(beacon, /\/docs\/assistant/);
    assert.match(beacon, /\/pl\/docs\/assistant/);
  } finally {
    restore();
  }
});

test("a development preview publishes the assistant and keeps the review rail behind the release flag", async () => {
  try {
    Object.assign(process.env, { NODE_ENV: "development" });
    process.env.NEXT_PUBLIC_WO_PREVIEW = "1";
    delete process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE;
    const { sovereignAssistantPublished, sovereignNeedsReviewVisible } = await import("./sovereign-release");
    assert.equal(sovereignAssistantPublished(), true);
    assert.equal(sovereignNeedsReviewVisible(), false);
    const launcher = renderToStaticMarkup(createElement(AskSovereignWidget));
    assert.match(launcher, /aria-label="Ask Sovereign"/);
    assert.match(launcher, /aria-haspopup="dialog"/);
    assert.match(launcher, /aria-expanded="false"/);
    assert.match(launcher, /Preview/);
    assert.doesNotMatch(launcher, /data-sovereign-preview/);
    process.env.NEXT_PUBLIC_WO_PREVIEW = "0";
    assert.equal(renderToStaticMarkup(createElement(AskSovereignWidget)), "");
    process.env.NEXT_PUBLIC_WO_PREVIEW = "1";
    process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE = "1";
    assert.equal(sovereignNeedsReviewVisible(), true);
    const html = renderToStaticMarkup(createElement(AskSovereignPreview));
    for (const topic of ["Retention", "Data location", "AI provider", "AI disclosure", "Legal clauses"]) {
      assert.match(html, new RegExp(`${topic}.*Needs review`));
    }
  } finally {
    restore();
  }
});
