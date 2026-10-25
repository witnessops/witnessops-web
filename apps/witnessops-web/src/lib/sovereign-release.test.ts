import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AskSovereignPreview } from "../components/ask-sovereign/ask-sovereign-preview";

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

test("a production build stays closed with no flags, the preview flag, or the release flag", async () => {
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
      const { sovereignAssistantPublished, sovereignNeedsReviewVisible, askWitnessOpsRouteAvailable } = await import("./sovereign-release");
      assert.equal(sovereignAssistantPublished(), false, JSON.stringify(flags));
      assert.equal(sovereignNeedsReviewVisible(), false, JSON.stringify(flags));
      assert.equal(askWitnessOpsRouteAvailable(), false, JSON.stringify(flags));
    }
    const en = await import("../app/docs/assistant/page");
    const pl = await import("../app/pl/docs/assistant/page");
    for (const page of [en.default, pl.default]) {
      assert.throws(() => page(), (error: unknown) => {
        const digest = typeof error === "object" && error && "digest" in error ? String(error.digest) : "";
        return digest.includes("404") || digest.includes("NEXT_HTTP_ERROR_FALLBACK");
      });
    }
    const html = renderToStaticMarkup(createElement(AskSovereignPreview));
    assert.doesNotMatch(html, /Needs review/);
    assert.doesNotMatch(html, /cloudflareinsights|witnessops-analytics/);
    const { footerResourceLinks } = await import("../components/marketing/footer");
    assert.equal(footerResourceLinks().some((link) => link.href === "/docs/assistant" || link.label === "Ask Sovereign"), false);
    const footer = readFileSync(resolve(__dirname, "../components/marketing/footer.tsx"), "utf8");
    const home = readFileSync(resolve(__dirname, "../components/marketing/buyer-homepage.tsx"), "utf8");
    const sitemap = readFileSync(resolve(__dirname, "../app/sitemap.ts"), "utf8");
    const beacon = readFileSync(resolve(__dirname, "../../public/witnessops-analytics.js"), "utf8");
    const config = readFileSync(resolve(__dirname, "../../next.config.js"), "utf8");
    assert.match(footer, /footerResourceLinks\(\)/);
    assert.match(footer, /label: "Ask Sovereign"/);
    assert.match(home, /sovereignAssistantPublished\(\) \? <p className=\{styles\.askEntry\}/);
    assert.doesNotMatch(sitemap, /\/docs\/assistant/);
    assert.match(beacon, /\/docs\/assistant/);
    assert.match(beacon, /\/pl\/docs\/assistant/);
    assert.match(config, /NEXT_PUBLIC_WO_PREVIEW: process\.env\.NEXT_PUBLIC_WO_PREVIEW \?\? "0"/);
    assert.match(config, /NEXT_PUBLIC_SOVEREIGN_RELEASE: process\.env\.NEXT_PUBLIC_SOVEREIGN_RELEASE \?\? "0"/);
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
