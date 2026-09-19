import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { assertReportPdf } from "../proofpack/report-pdf";
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
    // The evidence and explanatory content must match; screen-only actions and drafts must not print.
    const documentContent = (article: Element) => {
      const copy = article.cloneNode(true) as Element;
      copy.querySelectorAll('.finding-interactive').forEach(node => node.remove());
      copy.querySelectorAll('[id], [tabindex], details[open]').forEach(node => { node.removeAttribute('id'); node.removeAttribute('tabindex'); node.removeAttribute('open'); });
      return copy.innerHTML;
    };
    expect(await root.locator("article").evaluate(documentContent)).toBe(await preview.evaluate(documentContent));
    await expect(root.locator('.finding-interactive')).toHaveCount(0);
    await expect(root).toContainText('What to do next');
    await expect(root).not.toContainText("PDF Workspace");
    await expect(root).not.toContainText("Sign out");
    const { textRuns, pageTexts } = await assertReportPdf(page, info);
    // Detaching the PDF CDP session restores media; reapply it for computed-style assertions.
    await page.emulateMedia({ media: 'print' });
    const finding = root.locator('.finding-follow-through').first().locator('..');
    await expect(finding).toHaveCSS('break-inside', 'auto');
    await expect(root.locator('article > section').first()).toHaveCSS('min-height', '0px');
    const metadata = root.locator('article section').filter({ has: page.getByRole('heading', { name: 'Unsigned source observations', exact: true }) }).last().locator(':scope > div').first();
    await expect(metadata).toHaveCSS('break-inside', 'avoid');
    await expect(metadata).toHaveCSS('break-after', 'avoid');
    const compact = (s: string) => s.replace(/\s/g, '');
    const pages = pageTexts.map(compact);
    const findingsPage = pages.findIndex(text => text.includes('THEFINDINGS'));
    expect(findingsPage).toBeGreaterThan(0);
    const firstFinding = shape === 'informational' ? 'Vulnerability reporting contact' : 'HTTP Strict Transport Security';
    expect(pages[findingsPage], 'Chapter introduction must share a page with its first finding').toContain(compact(firstFinding));
    expect(pages[findingsPage]).toContain(compact('WHAT WE OBSERVED'));
    const appendixPage = pages.findIndex(text => text.includes(compact('Unsigned source observations')));
    expect(appendixPage).toBeGreaterThan(0);
    expect(pages[appendixPage]).toContain('external-exposure-snapshot.json');
    expect(pages[appendixPage]).toContain(run.sourceDigest);
    expect(pages[appendixPage]).toContain('"version":');
    expect(pages.at(-1)!.length, 'Final page must contain substantial source content, not an isolated digest').toBeGreaterThan(250);
    const pdfText = pages.join('');
    for (const check of snapshot.checks) {
      for (const text of [check.interpretation, ...check.limitations]) expect(pdfText).toContain(compact(text));
    }
    for (const control of ['Ask about this finding', 'Copy request', 'Publish link', 'Cancel draft']) expect(pdfText).not.toContain(compact(control));
    if (shape === 'informational') {
      expect(pages[0]).toContain(compact('This report is a derived presentation of the source evidence.'));
      expect(pages[1]).toContain('THESCOPE');
    }
    expect(textRuns.length).toBeGreaterThan(5);
    expect(canonicalSource(run)).toBe(before);
    expect(unexpected).toEqual([]);
    expect(events.sort()).toEqual(["pdf_export_requested", "report_opened", "source_json_downloaded"]);
    expect(errors).toEqual([]);
  });
}
