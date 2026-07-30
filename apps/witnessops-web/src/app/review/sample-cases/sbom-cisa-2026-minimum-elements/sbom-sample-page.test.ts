import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const contract = readFileSync(resolve(__dirname, "sample-contract.ts"), "utf-8");

test("SBOM sample page is buyer-first and sample-bounded", () => {
  assert.match(page, /SampleCaseBanner/);
  assert.match(page, /SBOM minimum-elements check/);
  assert.match(page, /Three-minute buyer walkthrough/);
  assert.match(page, /Intentional sample gaps/);
  assert.match(page, /label=\"Start a review\"/);
  assert.match(page, /not a legal compliance claim/);
  assert.match(page, /not a production deployment claim/);
  assert.match(page, /not a live customer/);
  assert.doesNotMatch(page, /This SBOM is CISA-compliant/i);
  assert.doesNotMatch(page, /Request one proof run/);
  assert.doesNotMatch(page, /Package one security workflow/);
});

test("SBOM sample page pins the published sample-cases package", () => {
  assert.match(contract, /witnessops\/witnessops-sample-cases/);
  assert.match(contract, /sample-cases\/sbom-cisa-2026-minimum-elements/);
  assert.match(contract, /8552357268a310c3aeea0ca60e744aa2bf8c52ba/);
  assert.match(
    contract,
    /2026-minimum-elements-software-bill-materials-sbom/,
  );
});
