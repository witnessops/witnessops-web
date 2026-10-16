import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pdfPages } from "../proofpack/report-pdf";
import { wordingViolations } from "../../apps/witnessops-web/src/lib/external-exposure/unsigned-run-record";
import { validateExternalSnapshot } from "../../apps/witnessops-web/src/lib/external-exposure/adapter";
import { canonicalSource } from "../../apps/witnessops-app/src/lib/source-digest";
import { RECOMMENDED_PROFILE, type Run, type Workspace } from "../../apps/witnessops-app/src/lib/model";

const captured = validateExternalSnapshot(JSON.parse(readFileSync(resolve("tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json"), "utf8")));

for (const shape of ["informational", "attention", "long-evidence"] as const) {
  test(`saved run A4 export preserves source and final-page content: ${shape}`, async ({ page, baseURL }, info) => {
    const source = structuredClone(captured);
    if (shape !== "informational") {
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
    const unexpected: string[] = [], errors: string[] = [], events: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
    await page.route("**/api/**", route => {
      if (new URL(route.request().url()).pathname === "/api/workspace" && route.request().method() === "GET") return route.fulfill({ json: { user: { id: "viewer" }, workspaces: [ws], workspace: ws } });
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/feedback" && route.request().method() === "GET") return route.fulfill({ json: [] });
      if (path === "/api/events" && route.request().method() === "POST") {
        const payload = route.request().postDataJSON();
        expect(payload.runId).toBe(run.id); expect(payload.checkId).toBeNull();
        expect(Object.keys(payload).sort()).toEqual(["checkId", "name", "runId"]);
        expect(["report_opened", "source_json_downloaded", "pdf_export_requested"]).toContain(payload.name);
        events.push(payload.name);
        return route.fulfill({ json: { recorded: true } });
      }
      unexpected.push(route.request().method() + " " + new URL(route.request().url()).pathname);
      return route.abort();
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/reports/${run.id}`);
    const preview = page.locator("main article[aria-label='Snapshot results']");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(run.sourceDigest);
    await expect(preview).toContainText("Saved run");
    await expect(preview).toContainText("Checks with collected evidence:");
    await expect(preview).toContainText("Integrity hash (SHA-256), not yet signed");
    await expect(preview).toContainText("This lists only the checks named here. It does not show that the domain is secure.");
    const attention = snapshot.checks.filter(check => check.status === "NEEDS_ATTENTION");
    for (const check of attention) await expect(preview).toContainText(check.interpretation);
    await preview.getByText("Raw results", { exact: true }).click();
    await expect(preview).toContainText("canonical JSON");
    for (const check of snapshot.checks) {
      for (const value of [check.check_id, check.check_version, check.method, check.interpretation, ...check.limitations]) await expect(preview).toContainText(value);
    }
    if (shape === "long-evidence") await expect(preview).toContainText("END_OF_LONG_RECORDED_EVIDENCE");
    expect(wordingViolations(await preview.innerText())).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath("saved-report-desktop.png") });
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download source JSON", exact: true }).click();
    const downloaded = readFileSync((await (await downloadEvent).path())!, "utf8");
    expect(downloaded).toBe(canonicalSource(snapshot));
    expect(createHash("sha256").update(downloaded, "utf8").digest("hex")).toBe(run.sourceDigest);
    const recordDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download run record", exact: true }).click();
    const recordText = readFileSync((await (await recordDownload).path())!, "utf8");
    expect(JSON.parse(recordText).integrity).toMatchObject({ algorithm: "sha256", digest: run.sourceDigest, signed: false });
    expect(wordingViolations(recordText)).toEqual([]);
    await page.evaluate(() => { (window as Window & { printCalls?: number }).printCalls = 0; window.print = () => { (window as Window & { printCalls: number }).printCalls++; }; });
    await page.getByRole("button", { name: "Save report as PDF", exact: true }).click();
    expect(await page.evaluate(() => (window as Window & { printCalls: number }).printCalls)).toBe(1);
    const root = page.locator("[data-run-record-print]");
    const documentContent = (article: Element) => {
      const copy = article.cloneNode(true) as Element;
      copy.removeAttribute("data-theme");
      copy.querySelectorAll("[data-run-record-actions]").forEach(node => node.remove());
      copy.querySelectorAll("[id], [tabindex], details[open]").forEach(node => { node.removeAttribute("id"); node.removeAttribute("tabindex"); node.removeAttribute("open"); });
      return copy.innerHTML;
    };
    expect(await root.locator("article").evaluate(documentContent)).toBe(await preview.evaluate(documentContent));
    await expect(root.locator("button")).toHaveCount(0);
    await expect(root).not.toContainText("PDF Workspace");
    await expect(root).not.toContainText("Sign out");
    await page.emulateMedia({ media: "print" });
    await expect(root).toBeVisible();
    const session = await page.context().newCDPSession(page);
    const { data } = await session.send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, paperWidth: 210 / 25.4, paperHeight: 297 / 25.4 });
    await session.detach();
    const printed = pdfPages(Buffer.from(data, "base64"));
    expect(printed.length).toBeGreaterThan(0);
    expect(printed.every(item => item.runs > 2)).toBe(true);
    const pdfText = printed.map(item => item.text).join("\n");
    expect(pdfText).toContain("Integrity hash (SHA-256), not yet signed");
    expect(pdfText).toContain(run.sourceDigest);
    expect(wordingViolations(pdfText)).toEqual([]);
    expect(canonicalSource(run)).toBe(before);
    expect(unexpected).toEqual([]);
    expect(events.sort()).toEqual(["pdf_export_requested", "report_opened", "source_json_downloaded"]);
    expect(errors).toEqual([]);
  });
}
