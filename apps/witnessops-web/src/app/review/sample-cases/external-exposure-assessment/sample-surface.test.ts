import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(__dirname, "page.tsx"), "utf8");
const serviceLandings = readFileSync(
  resolve(__dirname, "../../../../lib/service-landings.ts"),
  "utf8",
);
const pricing = readFileSync(
  resolve(__dirname, "../../../(marketing)/pricing/page.tsx"),
  "utf8",
);
const catalogue = readFileSync(
  resolve(__dirname, "../../../../components/marketing/buyer-catalogue.tsx"),
  "utf8",
);
const homepage = readFileSync(
  resolve(__dirname, "../../../../components/marketing/buyer-homepage.tsx"),
  "utf8",
);
const homepagePreview = readFileSync(
  resolve(
    __dirname,
    "../../../../components/marketing/homepage-synthetic-preview.ts",
  ),
  "utf8",
);

const expectedFiles = [
  "README.md",
  "external-exposure-assessment.md",
  "exposure-map.json",
  "findings.json",
  "evidence-register.json",
  "handover-agenda.md",
  "focused-retest-result.md",
  "synthetic-rehearsal-checklist.md",
  "synthetic-timesheet.md",
  "CLAIM_BOUNDARY.md",
  "evidence-manifest.json",
  "verifier-result.json",
  "MANIFEST.sha256",
] as const;

test("Public Exposure Review sample surface expects only the sanitized buyer-safe files", () => {
  assert.match(page, /Public Exposure Review/);
  assert.match(page, /\/samples\/offsec-external-exposure/);
  for (const file of expectedFiles) {
    assert.match(page, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(page, /proofpack|receipt\.json|sig\.json/i);
});

test("Public Exposure Review sample preserves the synthetic and integrity boundaries", () => {
  assert.match(page, /Synthetic worked example — not customer evidence\./);
  assert.match(page, /Neither result proves that\s+observations are complete/);
  assert.match(page, /does not prove.*system is secure/is);
  assert.match(page, /OFFSEC-EXTERNAL-EXPOSURE/);
});

test("sample is linked from the homepage, offer detail, catalogue, and pricing entry", () => {
  const route = "/review/sample-cases/external-exposure-assessment";
  assert.match(serviceLandings, new RegExp(route));
  assert.match(pricing, new RegExp(route));
  assert.match(catalogue, new RegExp(route));
  assert.match(`${homepage}\n${homepagePreview}`, new RegExp(route));
});
