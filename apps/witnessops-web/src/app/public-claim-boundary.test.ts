import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";

import HomePage from "@/app/page";
import PricingPage from "@/app/(marketing)/pricing/page";
import { HOMEPAGE_TWO_OFFER_COPY } from "@/components/marketing/homepage-two-offer-copy";

const webRoot = resolve(__dirname, "../..");

const PUBLIC_CLAIM_SOURCES = [
  "src/app/(library)/library/page.tsx",
  "src/app/(marketing)/pricing/page.tsx",
  "src/app/(marketing)/catalog/page.tsx",
  "src/app/(marketing)/catalog/[skuId]/page.tsx",
  "src/app/(marketing)/catalog/workflows/page.tsx",
  "src/components/marketing/buyer-catalogue.tsx",
  "src/components/marketing/buyer-homepage.tsx",
  "src/components/marketing/homepage-synthetic-preview.ts",
  "src/components/marketing/homepage-two-offer-copy.ts",
  "src/components/marketing/simple-homepage.tsx",
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
  "is not a penetration test",
  "not a compliance certificate",
  "compliance certification",
  "named limits",
  "non-secret fit check",
  "does not authorise collection or start a review",
] as const;

const ALLOWED_NON_APP_CLAIM_SOURCES = new Set([
  "src/components/marketing/why-witnessops.tsx",
  "src/lib/buyer-services.ts",
  "src/lib/professional-public-footprint-audit.ts",
  "src/components/marketing/buyer-catalogue.tsx",
  "src/components/marketing/buyer-homepage.tsx",
  "src/components/marketing/homepage-synthetic-preview.ts",
  "src/components/marketing/homepage-two-offer-copy.ts",
  "src/components/marketing/simple-homepage.tsx",
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

function normalize(value: string): string {
  return value.toLowerCase();
}

function findProhibitedClaims(content: string): string[] {
  const normalized = normalize(content);
  return PROHIBITED_PUBLIC_CLAIMS.filter((phrase) =>
    normalized.includes(phrase.toLowerCase()),
  );
}

function hasRequiredBoundaryMarker(content: string): boolean {
  const normalized = normalize(content);
  return REQUIRED_BOUNDARY_MARKERS.some((marker) =>
    normalized.includes(marker.toLowerCase()),
  );
}

// ContactForm calls useRouter(), so the live homepage render needs a mounted
// app-router context. Navigation is never exercised during static rendering.
const staticRenderRouter = {
  back: () => undefined,
  forward: () => undefined,
  refresh: () => undefined,
  hmrRefresh: () => undefined,
  push: () => undefined,
  replace: () => undefined,
  prefetch: () => undefined,
} as unknown as AppRouterInstance;

function renderHomepageHtml(): string {
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: staticRenderRouter },
      createElement(HomePage),
    ),
  );
}

const RENDERED_HOMEPAGE_SOURCE = "rendered:/ (HomePage)";

test("public claim surfaces do not contain hard-blocked overclaim phrases", () => {
  const failures: string[] = [];
  const scanTargets = [
    ...readPublicClaimSources(),
    { path: RENDERED_HOMEPAGE_SOURCE, content: renderHomepageHtml() },
  ];

  for (const source of scanTargets) {
    for (const phrase of findProhibitedClaims(source.content)) {
      failures.push(`${source.path}: ${phrase}`);
    }
  }

  assert.deepEqual(failures, []);
});

test("public claim surfaces preserve at least one explicit boundary marker", () => {
  const failures: string[] = [];
  const pricingSource = "src/app/(marketing)/pricing/page.tsx";
  const pricingHtml = renderToStaticMarkup(createElement(PricingPage));
  const homepageHtml = renderHomepageHtml();

  const scanTargets = [
    ...readPublicClaimSources(),
    { path: RENDERED_HOMEPAGE_SOURCE, content: homepageHtml },
  ];

  for (const source of scanTargets) {
    const content =
      source.path === pricingSource ? pricingHtml : source.content;
    if (!hasRequiredBoundaryMarker(content)) {
      failures.push(source.path);
    }
  }

  assert.match(pricingHtml, /do not grant compliance certification/);
  assert.match(pricingHtml, /does not authorise collection or start a review/);
  assert.deepEqual(failures, []);
});

test("the rendered homepage keeps its approved evidence boundaries verbatim", () => {
  const homepageHtml = renderHomepageHtml();

  assert.match(
    homepageHtml,
    /An enquiry does not authorise collection or start a review\./,
  );
  assert.match(homepageHtml, /This is not a penetration test\./);
  assert.match(homepageHtml, /Historical synthetic one-action example/);
  assert.match(
    homepageHtml,
    /No customer, execution, verification, authorisation failure or result is shown\./,
  );
  assert.match(
    homepageHtml,
    /This is the shape of a record, not a record\./,
  );
});

test("prohibited homepage copy fails validation", () => {
  // A single prohibited phrase slipped into otherwise-approved homepage copy
  // must be caught by the same scan the positive test uses.
  const poisonedCopy = JSON.stringify({
    ...HOMEPAGE_TWO_OFFER_COPY.en,
    support:
      "WitnessOps guarantees compliance and provides whole-environment assurance.",
  });
  assert.deepEqual(findProhibitedClaims(poisonedCopy), [
    "guarantees compliance",
    "provides whole-environment assurance",
  ]);

  const poisonedHomepage = `${renderHomepageHtml()} This report is audit-ready.`;
  assert.deepEqual(findProhibitedClaims(poisonedHomepage), ["audit-ready"]);

  // Homepage copy without its boundary language must fail the boundary
  // requirement: headline, questions and prices alone are not enough.
  const copyWithoutBoundaries = [
    HOMEPAGE_TWO_OFFER_COPY.en.headline,
    HOMEPAGE_TWO_OFFER_COPY.en.support,
    HOMEPAGE_TWO_OFFER_COPY.en.aiQuestion,
    HOMEPAGE_TWO_OFFER_COPY.en.aiPrice,
    HOMEPAGE_TWO_OFFER_COPY.en.externalQuestion,
    HOMEPAGE_TWO_OFFER_COPY.en.externalPrice,
    HOMEPAGE_TWO_OFFER_COPY.en.evidenceHeadline,
  ].join("\n");
  assert.equal(hasRequiredBoundaryMarker(copyWithoutBoundaries), false);

  // Stripping every boundary marker from the rendered homepage must flip the
  // boundary check to failing, proving the positive result is not vacuous.
  let strippedHomepage = normalize(renderHomepageHtml());
  for (
    let pass = 0;
    pass < 5 && hasRequiredBoundaryMarker(strippedHomepage);
    pass += 1
  ) {
    for (const marker of REQUIRED_BOUNDARY_MARKERS) {
      strippedHomepage = strippedHomepage.split(marker.toLowerCase()).join("");
    }
  }
  assert.equal(hasRequiredBoundaryMarker(strippedHomepage), false);
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
