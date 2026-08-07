import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const webRoot = resolve(__dirname, "../..");

const PUBLIC_CLAIM_SOURCES = [
  "src/app/(library)/library/page.tsx",
  "src/app/(marketing)/pricing/page.tsx",
  "src/app/(marketing)/catalog/page.tsx",
  "src/app/(marketing)/catalog/offsec/page.tsx",
  "src/app/(marketing)/catalog/[skuId]/page.tsx",
  "src/app/(marketing)/catalog/workflows/page.tsx",
  "src/components/marketing/buyer-catalogue.tsx",
  "src/components/marketing/homepage-synthetic-preview.ts",
  "src/lib/buyer-services.ts",
  "src/app/access-change-proof-run/page.tsx",
  "src/app/proof-backed-security-systems/page.tsx",
  "src/app/docs/page.tsx",
  "src/app/review/page.tsx",
  "src/app/review/request/page.tsx",
  "src/app/review/request/confirmed/page.tsx",
  "src/app/review/sample-report/page.tsx",
  "src/app/review/sample-cases/ai-agent-action-proof-run/page.tsx",
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
  "src/app/why-witnessops/page.tsx",
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
  "receipt-first v1",
  "No proof run starts",
  "No customer evidence",
  "not a penetration test or certification",
  "not a compliance certificate",
  "compliance certification",
  "named limits",
  "non-secret fit check",
] as const;

const ALLOWED_NON_APP_CLAIM_SOURCES = new Set([
  "src/lib/buyer-services.ts",
  "src/components/marketing/buyer-catalogue.tsx",
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

function normalize(value: string): string {
  return value.toLowerCase();
}

test("public claim surfaces do not contain hard-blocked overclaim phrases", () => {
  const failures: string[] = [];

  for (const source of readPublicClaimSources()) {
    const content = normalize(source.content);
    for (const phrase of PROHIBITED_PUBLIC_CLAIMS) {
      if (content.includes(phrase.toLowerCase())) {
        failures.push(`${source.path}: ${phrase}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});

test("public claim surfaces preserve at least one explicit boundary marker", () => {
  const failures: string[] = [];

  for (const source of readPublicClaimSources()) {
    const content = normalize(source.content);
    const hasBoundary = REQUIRED_BOUNDARY_MARKERS.some((marker) =>
      content.includes(marker.toLowerCase()),
    );
    if (!hasBoundary) {
      failures.push(source.path);
    }
  }

  assert.deepEqual(failures, []);
});

test("homepage synthetic preview preserves English and Polish customer-evidence boundaries", () => {
  const source = readFileSync(
    resolve(webRoot, "src/components/marketing/homepage-synthetic-preview.ts"),
    "utf8",
  );

  assert.match(source, /Synthetic worked example — not customer evidence\./);
  assert.match(source, /Syntetyczny przykład roboczy — nie są to materiały klienta\./);
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
