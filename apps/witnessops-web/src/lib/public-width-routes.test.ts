import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { mergeWidthRoutes, sampleCaseRoutes } from "../../scripts/public-width-routes.mjs";

const appDir = resolve(__dirname, "../..");

test("width routes include every sample case, including ones missing from the sitemap", () => {
  const samples = sampleCaseRoutes(appDir);
  assert.ok(samples.includes("/review/sample-cases/customer-security-review-sprint"));
  assert.ok(samples.length >= 12);
  const merged = mergeWidthRoutes(["/support", "/pl"], samples);
  assert.equal(merged.includes("/pl/check"), false);
  assert.ok(merged.includes("/review/sample-cases/customer-security-review-sprint"));
  assert.ok(merged.includes("/support"));
});

test("the customer security sample table scrolls inside a labelled region", () => {
  const page = readFileSync(
    resolve(appDir, "src/app/review/sample-cases/customer-security-review-sprint/page.tsx"),
    "utf8",
  );
  assert.match(page, /role="region"/);
  assert.match(page, /min-w-0/);
  assert.match(page, /overflow-x-auto/);
  assert.match(page, /tabIndex=\{0\}/);
  assert.match(page, /aria-label="Synthetic example response table"/);
  assert.match(page, /csr-sprint-synthetic\/\$\{file\}`[\s\S]{0,180}\[overflow-wrap:anywhere\]/);
});

test("support email can break and the direct-email control is not a fixed flex line", () => {
  const page = readFileSync(resolve(appDir, "src/app/support/page.tsx"), "utf8");
  assert.match(page, /\[overflow-wrap:anywhere\]/);
  assert.doesNotMatch(page, /inline-flex items-center border border-surface-border px-4 py-2 text-sm text-text-secondary/);
  const start = readFileSync(resolve(appDir, "src/components/support/support-start.module.css"), "utf8");
  assert.doesNotMatch(start, /button:disabled\s*\{[^}]*opacity:\s*\.45/);
});
