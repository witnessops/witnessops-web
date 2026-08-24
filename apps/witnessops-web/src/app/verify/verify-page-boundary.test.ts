import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const consoleSrc = readFileSync(
  resolve(__dirname, "../../components/verify/verify-console.tsx"),
  "utf-8",
);

test("public /verify page is a single-job receipt console", () => {
  assert.match(page, /Verify a WitnessOps receipt/);
  assert.match(page, /indeterminate receipt-only result/);
  assert.match(page, /were not independently checked/);
  assert.match(page, /production key policy is not/);
  assert.match(page, /What this result means/);
  assert.match(page, /\/docs\/how-it-works\/verification/);
  assert.match(page, /\/docs\/evidence\/receipts/);
  assert.match(page, /\/library/);

  // Keep the page free of pre-console tutorial matrix / bundle catalogue.
  assert.doesNotMatch(page, /Artifact state matrix/);
  assert.doesNotMatch(page, /Published first-party proof bundles/);
  assert.doesNotMatch(page, /publicProofBundles/);
  assert.doesNotMatch(page, /First run/);
  assert.doesNotMatch(page, /Result verdicts/);
});

test("verify console exposes one example path, not a fixture wall", () => {
  assert.match(consoleSrc, /Try an example/);
  assert.match(consoleSrc, /Upload receipt/);
  assert.match(consoleSrc, /Verify receipt/);
  assert.match(consoleSrc, /exampleReceipt/);
  assert.doesNotMatch(consoleSrc, /fixtures\.map/);
  assert.doesNotMatch(consoleSrc, /Valid PV receipt/);
  assert.doesNotMatch(consoleSrc, /Invalid QV receipt/);
  assert.doesNotMatch(consoleSrc, /fail closed/);
  assert.doesNotMatch(consoleSrc, /artifact revalidation/i);
  // No pseudo-terminal log pane
  assert.doesNotMatch(consoleSrc, /buildLogs|> verdict:|> stage:/);
});
