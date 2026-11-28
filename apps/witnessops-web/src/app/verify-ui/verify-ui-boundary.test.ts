import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeHomepageHeroReport } from "../../../../../tests/ui-proof/report";
import { homepageHeroScenarios } from "../../../../../tests/ui-proof/scenarios";
import VerifyUiPage from "./page";

test("verify-ui remains a noindex UI-proof presentation surface", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /robots:\s*{\s*\n\s*index:\s*false,\s*\n\s*follow:\s*false,/);
  assert.match(source, /UI proof report/);
  assert.match(source, /homepage hero UI proof/);
  assert.match(source, /not a deployment, release, or broader product\s+assurance claim/);
  assert.match(source, /public["'],\s*\n\s*["']ui-proofs["'],\s*\n\s*["']homepage-hero["'],\s*\n\s*["']latest\.json["']/);
  assert.match(source, /gridPublicPath = \"\/ui-proofs\/homepage-hero\/grid\.png\"/);

  assert.doesNotMatch(source, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
  assert.doesNotMatch(source, /Request one proof run|Package one security workflow|ContactForm|SupportIntake/);
});

test("the mobile report renders scenario evidence and preserves archived asset context only in V1", async (t) => {
  const relativeDir = "public/ui-proofs/homepage-hero";
  const archive = resolve(__dirname, "../../..", relativeDir);
  const scratch = await mkdtemp(join(tmpdir(), "wops-mobile-ui-report-"));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  const outputDir = join(scratch, relativeDir);
  await mkdir(outputDir, { recursive: true });
  await copyFile(join(archive, "grid.png"), join(outputDir, "grid.png"));
  t.mock.method(process, "cwd", () => scratch);
  const observation = {
    scenario: homepageHeroScenarios[0],
    status: "pass" as const,
    checks: [],
    metrics: { clientWidth: 320 },
    screenshotPath: "synthetic-test-scenario.png",
  };
  const report = await writeHomepageHeroReport([observation], outputDir);
  assert.equal(report.schemaVersion, "ui-proof-report.v2");
  assert.equal(Object.hasOwn(report, "asset"), false);
  assert.deepEqual(report.scenarios, [observation]);
  const currentPage = renderToStaticMarkup(createElement(VerifyUiPage));
  assert.match(currentPage, /ui-proof-report\.v2/);
  assert.ok(currentPage.includes(observation.scenario.name));
  assert.doesNotMatch(currentPage, /hero_home_proof_execution_surface|Source SHA-256/);

  const archivedReport = {
    ...report,
    schemaVersion: "ui-proof-report.v1",
    asset: { assetId: "archived-raster-fixture", src: "/historical.png", width: 1920, height: 640 },
  };
  await writeFile(join(outputDir, "latest.json"), JSON.stringify(archivedReport));
  const archivedPage = renderToStaticMarkup(createElement(VerifyUiPage));
  assert.match(archivedPage, /ui-proof-report\.v1/);
  assert.match(archivedPage, /archived-raster-fixture/);
  assert.match(archivedPage, /1920x640/);
});
