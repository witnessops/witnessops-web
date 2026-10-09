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

const webRoot = resolve(__dirname, "../..");

const PUBLIC_CLAIM_SOURCES = [
  "src/app/(library)/library/page.tsx",
  "src/app/(marketing)/pricing/page.tsx",
  "src/app/(marketing)/catalog/page.tsx",
  "src/app/(marketing)/catalog/[skuId]/page.tsx",
  "src/app/(marketing)/catalog/workflows/page.tsx",
  "src/components/marketing/buyer-catalogue.tsx",
  "src/components/marketing/buyer-homepage.tsx",
  "src/components/marketing/homepage-two-offer-copy.ts",
  "src/components/marketing/simple-homepage.tsx",
  "src/components/marketing/homepage-synthetic-preview.ts",
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
  "src/app/review/sample-cases/sbom-cisa-2026-minimum-elements/page.tsx",
  "src/app/review/sample-cases/local-server-security-review/page.tsx",
  "src/app/review/sample-cases/external-exposure-assessment/page.tsx",
  "src/app/review/sample-cases/launch-readiness-review/page.tsx",
  "src/app/review/sample-cases/custody-wallet-ops-review/page.tsx",
  "src/app/review/sample-cases/incident-readiness-review/page.tsx",
  "src/app/review/sample-cases/customer-security-review-sprint/page.tsx",
  "src/app/review/sample-cases/access-removed-proof/page.tsx",
  "src/app/review/sample-cases/approval-gated-containment/page.tsx",
  "src/app/review/sample-cases/privileged-access-grant/page.tsx",
  "src/app/review/sample-cases/page.tsx",
  "src/components/marketing/offsec-suite-sample.tsx",
  "src/app/support/page.tsx",
  "src/app/verify/page.tsx",
  "src/components/marketing/why-witnessops.tsx",
  "src/app/customer-security-review/page.tsx",
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
] as const;

const POLISH_HOMEPAGE_BOUNDARY_MARKERS = [
  "nie potwierdza rzeczywistej operacji u dostawcy",
  "fikcyjny przykład",
  "nie testowano systemu",
  "to nie jest przegląd",
] as const;

const ALLOWED_NON_APP_CLAIM_SOURCES = new Set([
  "src/components/marketing/why-witnessops.tsx",
  "src/lib/buyer-services.ts",
  "src/lib/professional-public-footprint-audit.ts",
  "src/components/marketing/buyer-catalogue.tsx",
  "src/components/marketing/buyer-homepage.tsx",
  "src/components/marketing/homepage-two-offer-copy.ts",
  "src/components/marketing/simple-homepage.tsx",
  "src/components/marketing/homepage-synthetic-preview.ts",
  "src/components/marketing/offsec-suite-sample.tsx",
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
  "this is not a penetration test. one focused retest of reported findings is included within 30 calendar days of initial report handover.",
  "a public hostname snapshot. no account needed. not a review.",
  "with written findings, supporting evidence and clear limits.",
] as const;

const HOMEPAGE_RENDERED_EVIDENCE_BOUNDARIES = [
  ...HOMEPAGE_COPY_EVIDENCE_BOUNDARIES,
  "historical synthetic one-action example",
  "illustrative · shape only",
  "designed, not executed",
  "this specimen carries no finding.",
  "no evidence was collected for this illustration.",
  "no customer, execution, verification, authorisation failure or result is shown.",
  "an enquiry does not authorise collection or start a review.",
  "evidence survives the dashboard.",
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

  assert.match(pricingHtml, /do not grant compliance certification/);
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
    PUBLIC_CLAIM_SOURCES.includes("src/components/marketing/simple-homepage.tsx"),
  );
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
    "Proof other people can check.",
    "Proof other people can check. Verified compliance.",
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
    "This is not a penetration test.",
    "This is a penetration test.",
  )}\n${dummyBoundary}`;
  const strippedRender = `${rendered.replaceAll(
    "This is not a penetration test.",
    "This is a penetration test.",
  )}\n${dummyBoundary}`;
  const stripped = assessHomepageClaims(strippedCopy, strippedRender);
  assert.ok(
    stripped.includes(
      "homepage copy missing boundary: this is not a penetration test. one focused retest of reported findings is included within 30 calendar days of initial report handover.",
    ),
  );
  assert.ok(
    stripped.includes(
      "rendered homepage missing boundary: this is not a penetration test. one focused retest of reported findings is included within 30 calendar days of initial report handover.",
    ),
  );
  assert.equal(stripped.some((failure) => failure.includes(dummyBoundary)), false);
});

test("homepage synthetic preview preserves English and Polish customer-evidence boundaries", () => {
  const source = readFileSync(
    resolve(webRoot, "src/components/marketing/homepage-synthetic-preview.ts"),
    "utf8",
  );

  assert.match(source, /Synthetic example, not customer evidence/);
  assert.match(source, /Syntetyczny przykład, nie są to materiały klienta/);
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
