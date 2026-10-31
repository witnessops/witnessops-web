import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { mergeWidthRoutes, sampleCaseRoutes } from "../../scripts/public-width-routes.mjs";

const appDir = resolve(__dirname, "../..");

test("width routes include all four retained agent-action examples", () => {
  const samples = sampleCaseRoutes(appDir);
  assert.deepEqual([...samples].sort(), [
    "/review/sample-cases/ai-agent-action-proof-run",
    "/review/sample-cases/approval-gated-containment",
    "/review/sample-cases/privileged-access-grant",
    "/review/sample-cases/witnessed-crm-status-change",
  ]);
  const merged = mergeWidthRoutes(["/support", "/pl"], samples);
  assert.equal(merged.includes("/pl/check"), false);
  assert.ok(merged.includes("/review/sample-cases/witnessed-crm-status-change"));
  assert.ok(merged.includes("/support"));
});

test("support email can break and the direct-email control is not a fixed flex line", () => {
  const page = readFileSync(resolve(appDir, "src/app/support/page.tsx"), "utf8");
  assert.match(page, /\[overflow-wrap:anywhere\]/);
  assert.doesNotMatch(page, /inline-flex items-center border border-surface-border px-4 py-2 text-sm text-text-secondary/);
  const start = readFileSync(resolve(appDir, "src/components/support/support-start.module.css"), "utf8");
  assert.doesNotMatch(start, /button:disabled\s*\{[^}]*opacity:\s*\.45/);
});
