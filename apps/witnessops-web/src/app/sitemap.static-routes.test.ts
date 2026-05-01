import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const REQUIRED_PUBLIC_SITEMAP_ROUTES = [
  "/library",
  "/pricing",
  "/review/sample-cases",
  "/review/sample-cases/ai-agent-action-proof-run",
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
