import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { getSourceLastModified } from "./sitemap";

const REQUIRED_PUBLIC_SITEMAP_ROUTES = [
  "/catalog",
  "/catalog/workflows",
  "/catalog/offsec-external-exposure",
  "/library",
  "/pricing",
  "/review/sample-cases",
  "/review/sample-cases/ai-agent-action-proof-run",
  "/review/sample-cases/local-server-security-review",
  "/review/sample-cases/launch-readiness-review",
  "/review/sample-cases/custody-wallet-ops-review",
  "/review/sample-cases/incident-readiness-review",
  "/review/sample-cases/customer-security-review-sprint",
  "/review/sample-cases/access-removed-proof",
  "/review/sample-cases/sbom-cisa-2026-minimum-elements",
  "/customer-security-review",
  "/pl/customer-security-review",
  "/pl/library",
  "/review/sample-cases/approval-gated-containment",
  "/review/sample-cases/privileged-access-grant",
  "/access-change-proof-run",
] as const;

test("sitemap includes canonical public buyer routes", () => {
  const source = readFileSync(resolve(__dirname, "sitemap.ts"), "utf-8");

  for (const route of REQUIRED_PUBLIC_SITEMAP_ROUTES) {
    assert.match(
      source,
      new RegExp(`route:\\s*[\"']${route.replace(/[-/]/g, "\\$&")}[\"']`),
      `Expected sitemap staticRoutes to include ${route}`,
    );
  }
});

test("sitemap lastModified fallback does not require source files at runtime", () => {
  assert.equal(
    getSourceLastModified("src/app/does-not-exist/page.tsx").toISOString(),
    "2026-01-01T00:00:00.000Z",
  );
});
