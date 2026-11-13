import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  footerGroups,
  isExternalFooterHref,
  isFooterRequestHref,
  isLibraryPath,
  resolveFooterHref,
} from "./footer";
import { COMPANY_LEGAL_LINE } from "@/lib/company-details";

const source = () => readFileSync(resolve(__dirname, "footer.tsx"), "utf-8");
const globals = () => readFileSync(resolve(__dirname, "../../app/globals.css"), "utf-8");

test("footer keeps readable text contrast, sizing and 44px targets", () => {
  const footer = source();
  assert.match(footer, /FOOTER_LINK_CLASS/);
  assert.match(footer, /FOOTER_LEGAL_LINK_CLASS/);
  assert.match(footer, /text-text-secondary/);
  assert.match(footer, /min-h-11 min-w-11/, "Every footer link keeps a 44×44 tap target (Terms/About width).");
  assert.match(footer, /FOOTER_NAV_STYLE/);
  assert.match(footer, /fontFamily: "var\(--font-sans\)"/);
  assert.match(globals(), /footer\.public-shell\.public-footer\[data-brand-footer\]/);
  assert.match(globals(), /\.simple-public-footer \.footer-email-link \{ display: inline-flex; align-items: center; min-height: 44px;/);
  assert.doesNotMatch(footer, /fontSize:\s*(?:9|10)|text-\[(?:9|10)px\]/);
  assert.doesNotMatch(footer, /color:\s*"var\(--color-surface-border\)"/);
});

test("footer brand lockup uses the canonical horizontal files without a live wordmark", () => {
  const footer = source();
  assert.match(footer, /alt="WitnessOps"/);
  assert.match(footer, /witnessops-horizontal-black\.svg/);
  assert.match(footer, /witnessops-horizontal-white\.svg/);
  assert.match(footer, /wo-lockup--footer/);
  assert.match(footer, /className="public-shell public-footer border-t/);
  assert.match(footer, /data-footer-brand-lockup/);
  assert.match(footer, /data-brand-footer="approved-2026-07-30"/);
  assert.doesNotMatch(footer, /WitnessOpsMark/);
  assert.doesNotMatch(footer, /drop-shadow|neon|bevel|glowing/i);
});

test("footer shows one review, two columns and no retired or second-product links", () => {
  for (const locale of ["en", "pl"] as const) {
    const hrefs = footerGroups(locale).flatMap((group) => group.links.map((link) => link.href));
    assert.equal(footerGroups(locale).length, 2);
    for (const banned of ["/pricing", "/reviews", "/pl/reviews", "/docs/assistant", "/about", "/pl/docs", "/early-access", "/check", "/verify", "/pl/verify", "/media-kit", "/pl/media-kit"]) {
      assert.equal(hrefs.includes(banned), false, `${locale} footer must not link ${banned}`);
    }
    assert.equal(hrefs.some(isFooterRequestHref), false, "The request action is the single brand CTA, not a column link.");
  }
  assert.deepEqual(footerGroups("en").map((group) => [group.label, group.links.map((link) => link.label)]), [
    ["The review", ["Agent Action Security Review", "How it works", "Examples"]],
    ["Company", ["Docs", "Security", "Company details"]],
  ]);
  assert.deepEqual(footerGroups("pl").map((group) => [group.label, group.links.map((link) => link.href)]), [
    ["Przegląd", ["/pl/reviews/agent-action-security-review", "/pl/why-witnessops", "/review/sample-cases"]],
    ["Firma", ["/docs", "/pl/security", "/pl/company"]],
  ]);
  const footer = source();
  assert.doesNotMatch(footer, /Ask Sovereign|sovereignAssistantPublished|label: "Pricing"|Talk to an expert|Media kit/);
  assert.match(footer, /data-footer-review-cta/);
  assert.match(footer, /reviewRequestHrefForLocation\(/);
});

test("footer legal line names the company, KRS and NIP from company details", () => {
  assert.equal(COMPANY_LEGAL_LINE, "© 2026 Witnessops P.S.A. · KRS 0001271405 · NIP 8262233962");
  assert.match(source(), /\{COMPANY_LEGAL_LINE\}/);
});

test("footer bottom row: language switch and GitHub, no theme control and no X link (bundle B)", () => {
  const footer = source();
  assert.doesNotMatch(footer, /ThemeMemory|data-theme-choice/);
  assert.doesNotMatch(footer, /x\.com|twitter|X_PROFILE_HREF/i);
  assert.match(footer, /GITHUB_PROFILE_HREF = "https:\/\/github\.com\/witnessops"/);
  assert.match(footer, /role="group" aria-label=\{copy\.language\}/);
  assert.match(footer, /hrefLang="pl"/);
  assert.match(footer, /aria-current="true"/);
  assert.match(footer, /target="_blank" rel="noopener noreferrer"/);
});

test("library surface includes English and Polish library paths", () => {
  assert.equal(isLibraryPath("/library"), true);
  assert.equal(isLibraryPath("/library/extra"), true);
  assert.equal(isLibraryPath("/pl/library"), true);
  assert.equal(isLibraryPath("/pl/library/"), true);
  assert.equal(isLibraryPath("/pl"), false);
  assert.equal(isLibraryPath("/catalog"), false);
});

test("footer classifies the source route before same-site URL resolution", () => {
  assert.equal(isExternalFooterHref("/privacy"), false);
  assert.equal(isExternalFooterHref("/review/request"), false);
  assert.equal(isExternalFooterHref("https://github.com/witnessops"), true);
  for (const href of ["/privacy", "/terms", "/security", "/docs", "/review/request"]) {
    assert.equal(resolveFooterHref(href), href);
  }
});

test("footer does not reintroduce canonical production URLs for internal routes", () => {
  const footer = source();
  assert.doesNotMatch(footer, /getSurfaceUrl\("witnessops"/);
  assert.doesNotMatch(footer, /https:\/\/witnessops\.com\/(?:catalog|why|verify|docs|library|privacy|terms|security|media-kit)/);
  assert.match(footer, /isPublicBuildLabel/);
});

test("selected-offer enquiry links are recognised as the footer request action", () => {
  assert.equal(isFooterRequestHref("/review/request"), true);
  assert.equal(isFooterRequestHref("/review/request?offerId=agent-tools-access-review"), true);
  assert.equal(isFooterRequestHref("/pl/review/request?productId=OFFSEC-LOCAL-AUDIT"), true);
  assert.equal(isFooterRequestHref("/review/sample-cases"), false);
  assert.equal(isFooterRequestHref("/review/request/confirmed"), false);
});

test("footer carries a labelled 'Tested on agents built with' strip with xAI and Codex marks above the legal line", () => {
  const footer = source();
  assert.match(footer, /testedWith: "Tested on agents built with"/);
  assert.match(footer, /testedWith: "Testujemy agentów zbudowanych na"/);
  assert.match(footer, /XAI_HREF = "https:\/\/x\.ai"/);
  assert.match(footer, /CODEX_HREF = "https:\/\/openai\.com\/codex\/"/);
  assert.match(footer, /https:\/\/agents\.md\/logos\/codex\.svg/);
  assert.match(footer, /aria-label=\{copy\.xai\}/);
  assert.match(footer, /codex: "OpenAI Codex"/);
  assert.ok(footer.indexOf("data-footer-tested") < footer.indexOf("data-footer-legal"), "strip sits above the legal divider");
  assert.doesNotMatch(footer, /Partners?\b|Official/);
});
