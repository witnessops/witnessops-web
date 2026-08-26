import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const webRoot = resolve(import.meta.dirname, "../..");
const runScan = readFileSync(resolve(webRoot, "lib/skill-verify/run-scan.ts"), "utf8");
const consoleSrc = readFileSync(
  resolve(webRoot, "components/verify/skill-console.tsx"),
  "utf8",
);
const pageSrc = readFileSync(resolve(webRoot, "app/verify/skill/page.tsx"), "utf8");

test("skill verification has no server verification endpoint", () => {
  for (const source of [runScan, consoleSrc, pageSrc]) {
    assert.doesNotMatch(source, /\/api\/verify/);
    assert.doesNotMatch(source, /fetch\(/);
    assert.doesNotMatch(source, /trackEvent/);
    assert.doesNotMatch(source, /localStorage/);
    assert.doesNotMatch(source, /sessionStorage/);
    assert.doesNotMatch(source, /indexedDB/i);
    assert.doesNotMatch(source, /use server/);
  }
});

test("engine is consumed as a package import", () => {
  assert.match(runScan, /from ["']aegis-deterministic["']/);
  assert.match(runScan, /from ["']aegis-deterministic\/report["']/);
  assert.doesNotMatch(runScan, /lib\/verifier\/scan\.ts/);
  assert.doesNotMatch(runScan, /PATTERNS/);
});

test("route stays noindex and unannounced", () => {
  assert.match(pageSrc, /index:\s*false/);
  assert.match(pageSrc, /Check an agent skill before you trust it/);
  assert.doesNotMatch(pageSrc, /Verified safe/);
});
