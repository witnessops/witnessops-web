import assert from "node:assert/strict";
import test from "node:test";

import sitemap from "./sitemap";
import { canonicalUrl } from "@/lib/public-seo";

const REQUIRED_PUBLIC_SITEMAP_ROUTES = [
  "/catalog",
  "/catalog/workflows",
  "/catalog/offsec-external-exposure",
  "/catalog/offsec-local-audit",
  "/catalog/offsec-launch-ready",
  "/catalog/offsec-custody-ops",
  "/catalog/offsec-incident-ready",
  "/catalog/professional-public-footprint-audit",
  "/library",
  "/media-kit",
  "/pricing",
  "/review/sample-cases",
  "/review/sample-cases/ai-agent-action-proof-run",
  "/review/sample-cases/local-server-security-review",
  "/review/sample-cases/external-exposure-assessment",
  "/review/sample-cases/launch-readiness-review",
  "/review/sample-cases/custody-wallet-ops-review",
  "/review/sample-cases/incident-readiness-review",
  "/review/sample-cases/customer-security-review-sprint",
  "/review/sample-cases/access-removed-proof",
  "/review/sample-cases/sbom-cisa-2026-minimum-elements",
  "/customer-security-review",
  "/pl/customer-security-review",
  "/pl/library",
  "/pl/catalog/professional-public-footprint-audit",
  "/review/sample-cases/approval-gated-containment",
  "/review/sample-cases/privileged-access-grant",
] as const;

const EXCLUDED_SITEMAP_ROUTES = [
  "/catalog/offsec",
  "/catalog/operator-platform",
  "/access-change-proof-run",
  "/pl/catalog/offsec-pilot",
  "/catalog/sbom-min-elements",
  "/verify/skill",
] as const;

test("sitemap includes canonical public buyer routes", async () => {
  const entries = await sitemap();
  const urls = new Set(entries.map(({ url }) => url));

  for (const route of REQUIRED_PUBLIC_SITEMAP_ROUTES) {
    assert.ok(
      urls.has(canonicalUrl(route)),
      `Expected sitemap to include ${route}`,
    );
  }
});

test("sitemap excludes redirects, private previews, and unresolved commercial routes", async () => {
  const entries = await sitemap();
  const urls = new Set(entries.map(({ url }) => url));

  for (const route of EXCLUDED_SITEMAP_ROUTES) {
    assert.ok(
      !urls.has(canonicalUrl(route)),
      `Expected sitemap to exclude ${route}`,
    );
  }
});

test("sitemap URLs and reciprocal language targets stay on the canonical apex", async () => {
  const entries = await sitemap();
  const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

  assert.equal(byUrl.size, entries.length, "Sitemap must not contain duplicate URLs");

  for (const entry of entries) {
    assert.match(entry.url, /^https:\/\/witnessops\.com(?:\/|$)/);
    assert.doesNotMatch(entry.url, /[?#]/);

    const languages = entry.alternates?.languages;
    if (!languages) continue;

    assert.deepEqual(Object.keys(languages).sort(), ["en", "pl", "x-default"]);
    for (const target of [languages.en, languages.pl]) {
      assert.equal(typeof target, "string");
      const reciprocal = byUrl.get(String(target));
      assert.ok(reciprocal, `Missing sitemap hreflang target ${String(target)}`);
      assert.deepEqual(reciprocal.alternates?.languages, languages);
    }
    assert.equal(languages["x-default"], languages.en);
  }
});

test("sitemap omits freshness dates without an explicit modification contract", async () => {
  const entries = await sitemap();

  assert.ok(entries.length > 0, "Sitemap must remain populated");
  for (const entry of entries) {
    assert.equal(
      Object.hasOwn(entry, "lastModified"),
      false,
      `${entry.url} must not expose a filesystem or build timestamp as page freshness`,
    );
  }
});
