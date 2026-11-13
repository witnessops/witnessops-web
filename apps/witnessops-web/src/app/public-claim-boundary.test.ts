import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PricingPage from "@/app/(marketing)/pricing/page";
import HomePage from "@/app/page";
import PolishHomePage from "@/app/pl/page";
import { SimpleHomepage } from "@/components/marketing/simple-homepage";
import AgentActionSecurityReviewPage from "@/app/(marketing)/reviews/agent-action-security-review/page";

const webRoot = resolve(__dirname, "../..");

const PUBLIC_CLAIM_SOURCES = [
  "src/app/(library)/library/page.tsx",
  "src/app/(marketing)/pricing/page.tsx",
  "src/app/(marketing)/catalog/page.tsx",
  "src/app/(marketing)/catalog/[skuId]/page.tsx",
  "src/components/marketing/buyer-catalogue.tsx",
  "src/components/marketing/buyer-homepage.tsx",
  "src/components/marketing/homepage-two-offer-copy.ts",
  "src/components/marketing/homepage-cut-copy.ts",
  "src/components/marketing/hero-action-visual.tsx",
  "src/lib/buyer-services.ts",
  "src/lib/professional-public-footprint-audit.ts",
  "src/app/proof-backed-security-systems/page.tsx",
  "src/app/docs/page.tsx",
  "src/app/review/page.tsx",
  "src/app/review/request/page.tsx",
  "src/app/review/request/confirmed/page.tsx",
  "src/app/review/sample-report/page.tsx",
  "src/app/review/sample-cases/ai-agent-action-proof-run/page.tsx",
  "src/app/review/sample-cases/ai-agent-action-proof-run/api-key-rotation-demo.tsx",
  "src/app/review/sample-cases/approval-gated-containment/page.tsx",
  "src/app/review/sample-cases/privileged-access-grant/page.tsx",
  "src/app/review/sample-cases/page.tsx",
  "src/app/support/page.tsx",
  "src/app/verify/page.tsx",
  "src/components/marketing/why-witnessops.tsx",
  "../../content/witnessops/legal/privacy.mdx",
  "../../content/witnessops/legal/security.mdx",
  "../../content/witnessops/legal/terms.mdx",
  "../../content/witnessops/support/support-policy.mdx",
  "../../content/witnessops/landing/home.yaml",
] as const;

const PROHIBITED_PUBLIC_CLAIMS = [
  "verified compliance",
  "certified compliance",
  "audit-ready",
  "audit opinion provided",
  "proves compliance",
  "proves the receipt shape",
  "guarantees compliance",
  "platform for AI governance",
  "complete AI governance program replacement",
  // Positive whole-environment claims only; negation "not whole-environment assurance" is allowed
  "provides whole-environment assurance",
  "production deployment proof",
] as const;

const REQUIRED_BOUNDARY_MARKERS = [
  "not a legal compliance claim",
  "not a production deployment claim",
  "not a complete AI governance program",
  "does not claim production deployment",
  "does not prove production deployment",
  "does not prove the full runtime story",
  "not live customer proof artifacts",
  "not live customer evidence",
  "no real provider",
  "not verified",
  "not customer evidence",
  "not a customer test result",
  "not a live customer artifact",
  "not a live customer report",
  "not a live customer audit",
  "not a claim of completed verification",
  "not a production verification result",
  "this page explains the architecture model",
  "the artifacts carry the proof",
  "this page explains why the proof-run model exists",
  "a proof claim requires a named receipt",
  "support is for product help",
  "need a proof run instead",
  "do not eliminate external trust assumptions",
  "web is a presentation layer only",
  "public by design",
  "verification confirms integrity of the artifact",
  "not the correctness",
  "does not guarantee",
  "does not certify compliance",
  "does not invent evidence",
  "do not launch an OffSec portal",
  "certify compliance",
  "enters the operator queue only after verification",
  "not a 24/7 guarantee",
  "does not promise 24/7 live support",
  "security reports do not go through the normal support channel",
  "these docs explain how the system works",
  "do not claim complete runtime truth",
  "receipt-only",
  "were not independently checked",
  "No proof run starts",
  "No customer evidence",
  "not a penetration test or certification",
  "this is not a penetration test",
  "no evidence was collected",
  "this specimen carries no finding",
  "does not authorise collection or start a review",
  "not a compliance certificate",
  "compliance certification",
  "named limits",
  "non-secret fit check",
  "not a full pentest, certification, fixing or monitoring",
] as const;

const POLISH_HOMEPAGE_BOUNDARY_MARKERS = [
  "nie potwierdza rzeczywistej operacji u dostawcy",
  "fikcyjny przykład",
  "nie testowano systemu",
  "to nie jest przegląd",
  "to nie pełny pentest, certyfikacja, naprawa ani monitoring",
] as const;

const ALLOWED_NON_APP_CLAIM_SOURCES = new Set([
  "src/components/marketing/hero-action-visual.tsx",
  "src/components/marketing/why-witnessops.tsx",
  "src/lib/buyer-services.ts",
  "src/lib/professional-public-footprint-audit.ts",
  "src/components/marketing/buyer-catalogue.tsx",
  "src/components/marketing/buyer-homepage.tsx",
  "src/components/marketing/homepage-two-offer-copy.ts",
  "src/components/marketing/homepage-cut-copy.ts",
  "../../content/witnessops/legal/privacy.mdx",
  "../../content/witnessops/legal/security.mdx",
  "../../content/witnessops/legal/terms.mdx",
  "../../content/witnessops/support/support-policy.mdx",
  "../../content/witnessops/landing/home.yaml",
]);

function readPublicClaimSources(): Array<{ path: string; content: string }> {
  return PUBLIC_CLAIM_SOURCES.map((sourcePath) => ({
    path: sourcePath,
    content: readFileSync(resolve(webRoot, sourcePath), "utf-8"),
  }));
}

const HOMEPAGE_COPY_SOURCE = "src/components/marketing/homepage-two-offer-copy.ts";
const RENDERED_HOMEPAGE_SOURCE = "rendered:/";
const RENDERED_POLISH_HOMEPAGE_SOURCE = "rendered:/pl";

const appRouter = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
};

const HOMEPAGE_COPY_EVIDENCE_BOUNDARIES = [
  "this is not a penetration test of the whole environment.",
  "the free hostname check stays a separate tool, not a second review.",
  "authorization must be enforced before the system changes.",
  "no production changes without separate explicit authorization, remediation implementation, continuous monitoring or safety certification.",
] as const;

/** The 2026-11-13 homepage cut keeps one short boundary per section. */
const HOMEPAGE_RENDERED_EVIDENCE_BOUNDARIES = [
  "not a full pentest, certification, fixing or monitoring.",
  "test until you give written authority.",
  "it is not a booking, a payment or permission to test.",
  "examples of what we try, not findings.",
  "no secrets, logs or customer data.",
] as const;

/** Boundaries and the example record moved from the homepage to the review page. */
const REVIEW_PAGE_EVIDENCE_BOUNDARIES = [
  ...HOMEPAGE_COPY_EVIDENCE_BOUNDARIES,
  "historical synthetic one-action example",
  "illustrative · shape only",
  "designed, not executed",
  "this specimen carries no finding.",
  "no evidence was collected for this illustration.",
  "no customer, execution, verification, authorisation failure or result is shown.",
  "what the record looks like.",
  'id="example-record"',
] as const;

function normalize(value: string): string {
  return value.toLowerCase();
}

function prohibitedClaimsIn(content: string): string[] {
  const normalized = normalize(content);
  return PROHIBITED_PUBLIC_CLAIMS.filter((phrase) =>
    normalized.includes(phrase.toLowerCase()),
  );
}

function renderRoute(page: ReactNode): string {
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: appRouter },
      page,
    ),
  );
}

/** English homepage route (`src/app/page.tsx`), including its JSON-LD. */
function renderHomepage(): string {
  return renderRoute(createElement(HomePage));
}

/** Polish homepage route (`src/app/pl/page.tsx`), including its JSON-LD. */
function renderPolishHomepage(): string {
  return renderRoute(createElement(PolishHomePage));
}

/** English review page, the target of the homepage "See an example record" link. */
function renderReviewPage(): string {
  return renderRoute(createElement(AgentActionSecurityReviewPage));
}

function claimSurfaces(): Array<{ path: string; content: string }> {
  return [
    ...readPublicClaimSources(),
    { path: RENDERED_HOMEPAGE_SOURCE, content: renderHomepage() },
    { path: RENDERED_POLISH_HOMEPAGE_SOURCE, content: renderPolishHomepage() },
  ];
}

function boundaryMarkersFor(path: string): readonly string[] {
  return path === RENDERED_POLISH_HOMEPAGE_SOURCE
    ? POLISH_HOMEPAGE_BOUNDARY_MARKERS
    : REQUIRED_BOUNDARY_MARKERS;
}

function missingBoundaries(content: string, markers: readonly string[]): string[] {
  const normalized = normalize(content);
  return markers.filter((marker) => !normalized.includes(marker.toLowerCase()));
}

function assessHomepageClaims(copy: string, rendered: string): string[] {
  return [
    ...prohibitedClaimsIn(copy).map((phrase) => `homepage copy: ${phrase}`),
    ...prohibitedClaimsIn(rendered).map((phrase) => `rendered homepage: ${phrase}`),
    ...missingBoundaries(copy, HOMEPAGE_COPY_EVIDENCE_BOUNDARIES).map(
      (marker) => `homepage copy missing boundary: ${marker}`,
    ),
    ...missingBoundaries(rendered, HOMEPAGE_RENDERED_EVIDENCE_BOUNDARIES).map(
      (marker) => `rendered homepage missing boundary: ${marker}`,
    ),
  ];
}

test("public claim surfaces do not contain hard-blocked overclaim phrases", () => {
  const failures: string[] = [];

  for (const source of claimSurfaces()) {
    for (const phrase of prohibitedClaimsIn(source.content)) {
      failures.push(`${source.path}: ${phrase}`);
    }
  }

  assert.deepEqual(failures, []);
});

test("public claim surfaces preserve at least one explicit boundary marker", () => {
  const failures: string[] = [];
  const pricingSource = "src/app/(marketing)/pricing/page.tsx";
  const pricingHtml = renderToStaticMarkup(createElement(PricingPage));

  for (const source of claimSurfaces()) {
    const content = normalize(
      source.path === pricingSource ? pricingHtml : source.content,
    );
    const hasBoundary = boundaryMarkersFor(source.path).some((marker) =>
      content.includes(marker.toLowerCase()),
    );
    if (!hasBoundary) {
      failures.push(source.path);
    }
  }

  assert.match(pricingHtml, /does not grant compliance certification/);
  assert.match(pricingHtml, /does not authorise collection or start a review/);
  assert.deepEqual(failures, []);
});

test("homepage copy source and rendered homepage keep evidence boundaries", () => {
  const copy = readFileSync(resolve(webRoot, HOMEPAGE_COPY_SOURCE), "utf8");
  const rendered = renderHomepage();

  assert.deepEqual(assessHomepageClaims(copy, rendered), []);
  assert.match(rendered, /id="witnessops-organization"/);
  assert.match(rendered, /type="application\/ld\+json"/);
  assert.ok(PUBLIC_CLAIM_SOURCES.includes(HOMEPAGE_COPY_SOURCE));
  assert.ok(
    PUBLIC_CLAIM_SOURCES.includes("src/components/marketing/homepage-cut-copy.ts"),
  );
});

test("review page carries the boundaries and example record moved off the homepage", () => {
  assert.deepEqual(missingBoundaries(renderReviewPage(), REVIEW_PAGE_EVIDENCE_BOUNDARIES), []);
  assert.deepEqual(prohibitedClaimsIn(renderReviewPage()), []);
});

test("homepage claim guard scans the EN and PL route output, including JSON-LD", () => {
  const en = renderHomepage();
  const pl = renderPolishHomepage();
  const innerOnly = renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: appRouter },
      createElement(SimpleHomepage),
    ),
  );

  assert.doesNotMatch(innerOnly, /witnessops-organization/);
  assert.match(en, /engage@mail\.witnessops\.com/);
  assert.doesNotMatch(en, /karol\.stefanski@/);
  assert.doesNotMatch(pl, /karol\.stefanski@/);

  for (const html of [en, pl]) {
    assert.match(html, /id="witnessops-organization"/);
    assert.match(html, /id="witnessops-website"/);
    assert.match(html, /type="application\/ld\+json"/);
    assert.match(html, /"@type":"Organization"/);
    assert.match(html, /"@type":"WebSite"/);
    const poisoned = html.replace(
      '"@type":"Organization"',
      '"@type":"Organization","description":"verified compliance"',
    );
    assert.ok(prohibitedClaimsIn(poisoned).includes("verified compliance"));
  }

  const surfaces = claimSurfaces();
  assert.equal(
    surfaces.find((surface) => surface.path === RENDERED_HOMEPAGE_SOURCE)?.content.includes("witnessops-organization"),
    true,
  );
  assert.equal(
    surfaces.find((surface) => surface.path === RENDERED_POLISH_HOMEPAGE_SOURCE)?.content.includes("witnessops-organization"),
    true,
  );
});

test("prohibited homepage copy fails validation", () => {
  const copy = readFileSync(resolve(webRoot, HOMEPAGE_COPY_SOURCE), "utf8");
  const rendered = renderHomepage();
  const dummyBoundary = "not a legal compliance claim";
  const prohibitedCopy = `${copy.replace(
    "We try to break your AI agent before someone else does.",
    "We try to break your AI agent before someone else does. Verified compliance.",
  )}\n${dummyBoundary}`;

  const prohibited = assessHomepageClaims(prohibitedCopy, rendered);
  assert.deepEqual(prohibited, ["homepage copy: verified compliance"]);

  const prohibitedRender = assessHomepageClaims(
    copy,
    `${rendered}\nproduction deployment proof\n${dummyBoundary}`,
  );
  assert.deepEqual(prohibitedRender, [
    "rendered homepage: production deployment proof",
  ]);

  const strippedCopy = `${copy.replace(
    "This is not a penetration test of the whole environment.",
    "This is a penetration test of the whole environment.",
  )}\n${dummyBoundary}`;
  const strippedRender = `${rendered.replaceAll(
    "Not a full pentest, certification, fixing or monitoring.",
    "A full pentest.",
  )}\n${dummyBoundary}`;
  const stripped = assessHomepageClaims(strippedCopy, strippedRender);
  assert.ok(
    stripped.includes(
      "homepage copy missing boundary: this is not a penetration test of the whole environment.",
    ),
  );
  assert.ok(
    stripped.includes(
      "rendered homepage missing boundary: not a full pentest, certification, fixing or monitoring.",
    ),
  );
  assert.equal(stripped.some((failure) => failure.includes(dummyBoundary)), false);
});

test("claim-boundary guard scans only public presentation sources", () => {
  assert.ok(
    PUBLIC_CLAIM_SOURCES.every(
      (sourcePath) =>
        sourcePath.startsWith("src/app/") ||
        ALLOWED_NON_APP_CLAIM_SOURCES.has(sourcePath),
    ),
  );
});
