import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { assertReportPdf } from "../proofpack/report-pdf";
import { validateExternalSnapshot } from "../../apps/witnessops-web/src/lib/external-exposure/adapter";
import { canonicalSource } from "../../apps/witnessops-app/src/lib/source-digest";
import { RECOMMENDED_PROFILE, type Run, type Workspace } from "../../apps/witnessops-app/src/lib/model";

const captured = validateExternalSnapshot(JSON.parse(readFileSync(resolve("tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json"), "utf8")));

for (const shape of ["clean", "attention", "long-evidence"] as const) {
  test(`saved run A4 export preserves source and final-page content: ${shape}`, async ({ page, baseURL }, info) => {
    const source = structuredClone(captured);
    if (shape !== "clean") {
      const check = source.checks.find(item => item.check_id === "web.hsts.v1")!;
      check.status = "NEEDS_ATTENTION"; check.observation = { hsts: null, url: "https://witnessops.com/", statusCode: 200 };
      check.interpretation = "No HSTS header was recorded in this deterministic fixture.";
      check.recommendation = "Review the HTTPS response configuration with its owner.";
      if (shape === "long-evidence") {
        check.interpretation = "Long recorded interpretation for local pagination acceptance. ".repeat(30);
        check.observation = { ...check.observation as object, detail: "Long evidence retained in the full source. ".repeat(250), end: "END_OF_LONG_RECORDED_EVIDENCE" };
      }
    }
    const snapshot = validateExternalSnapshot(source);
    const run: Run = { id: "saved-run-fixture", assetId: "asset", createdAt: "2026-09-11T11:00:00Z", profile: structuredClone(RECOMMENDED_PROFILE), snapshot, sourceDigest: createHash("sha256").update(canonicalSource(snapshot), "utf8").digest("hex") };
    const before = canonicalSource(run);
    const ws: Workspace = { id: "workspace", name: "PDF Workspace", slug: "workspace", role: "viewer", members: [], assets: [{ id: "asset", hostname: snapshot.target, type: "hostname", createdAt: run.createdAt }], runs: [run] };
    const unexpected: string[] = [], errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
    await page.route("**/api/**", route => {
      if (new URL(route.request().url()).pathname === "/api/workspace" && route.request().method() === "GET") return route.fulfill({ json: { user: { id: "viewer" }, workspaces: [ws], workspace: ws } });
      unexpected.push(route.request().method() + " " + new URL(route.request().url()).pathname);
      return route.abort();
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/reports/${run.id}`);
    const preview = page.locator("main article[aria-label='Derived buyer report']");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(run.sourceDigest);
    await expect(preview).toContainText("Saved run");
    await expect(preview).toContainText("canonical JSON");
    await expect(preview).toContainText("10 coverage items");
    await expect(preview).toContainText("No verification receipt or signed proofpack was issued.");
    for (const check of snapshot.checks) {
      for (const value of [check.check_id, check.check_version, check.method, check.interpretation, ...check.limitations]) await expect(preview).toContainText(value);
    }
    if (shape === "long-evidence") await expect(preview).toContainText("END_OF_LONG_RECORDED_EVIDENCE");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath("saved-report-desktop.png") });
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download source JSON", exact: true }).click();
    const downloaded = readFileSync((await (await downloadEvent).path())!, "utf8");
    expect(downloaded).toBe(canonicalSource(snapshot));
    expect(createHash("sha256").update(downloaded, "utf8").digest("hex")).toBe(run.sourceDigest);
    await page.evaluate(() => { (window as Window & { printCalls?: number }).printCalls = 0; window.print = () => { (window as Window & { printCalls: number }).printCalls++; }; });
    await page.getByRole("button", { name: "Save report as PDF", exact: true }).click();
    expect(await page.evaluate(() => (window as Window & { printCalls: number }).printCalls)).toBe(1);
    const root = page.locator("[data-buyer-print-root]");
    expect(await root.locator("article").innerHTML()).toBe(await preview.innerHTML());
    await expect(root).not.toContainText("PDF Workspace");
    await expect(root).not.toContainText("Sign out");
    const { textRuns } = await assertReportPdf(page, info);
    expect(textRuns.length).toBeGreaterThan(5);
    expect(canonicalSource(run)).toBe(before);
    expect(unexpected).toEqual([]);
    expect(errors).toEqual([]);
  });
}
