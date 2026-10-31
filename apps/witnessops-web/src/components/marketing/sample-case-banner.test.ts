import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const banner = readFileSync(resolve(__dirname, "sample-case-banner.tsx"), "utf-8");

const samplePages = [
  "app/review/sample-cases/page.tsx",
  "app/review/sample-cases/ai-agent-action-proof-run/page.tsx",
  "app/review/sample-cases/approval-gated-containment/page.tsx",
  "app/review/sample-cases/privileged-access-grant/page.tsx",
  "app/review/sample-report/page.tsx",
] as const;

test("sample case banner is the shared not-live boundary with primary CTAs", () => {
  assert.match(banner, /Published sample, not live customer evidence/);
  assert.match(banner, /showActions = true/);
  assert.match(banner, /showActions \?/);
  assert.match(banner, /Start a review/);
  assert.match(banner, /Verify a receipt/);
  assert.match(banner, /Skills/);
});

test("all published sample surfaces render the shared or an explicit not-live boundary", () => {
  for (const rel of samplePages) {
    const source = readFileSync(resolve(__dirname, "../../", rel), "utf-8");
    const hasBanner =
      /SampleCaseBanner/.test(source) ||
      /Published sample, not live customer evidence/.test(source);
    assert.ok(
      hasBanner,
      `${rel} should include the shared banner or an explicit not-live boundary`,
    );
  }
});
