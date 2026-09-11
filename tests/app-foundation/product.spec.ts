import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { RECOMMENDED_PROFILE, type Workspace, type Run, type ExternalSnapshotV1 } from "../../apps/witnessops-app/src/lib/model";
const source = JSON.parse(readFileSync(resolve("tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json"), "utf8")) as ExternalSnapshotV1;

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`session product journey and retained source at ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    let ws: Workspace | null = null;
    const requests: unknown[] = [];
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/api/**", async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (path === "/api/session" && request.method() === "POST") {
        ws = { id: "local-workspace", name: "Local workspace", expiresAt: "2026-09-11T23:00:00.000Z", assets: [], runs: [] };
        return route.fulfill({ json: ws });
      }
      if (path === "/api/session" && request.method() === "DELETE") { ws = null; return route.fulfill({ json: { cleared: true } }); }
      if (!ws) return route.fulfill({ status: 401, json: { error: "Start a local workspace." } });
      if (path === "/api/workspace") return route.fulfill({ json: ws });
      if (path === "/api/assets") {
        const asset = { id: "hostname-asset", hostname: request.postDataJSON().hostname, createdAt: source.finished_at };
        ws.assets.push(asset); return route.fulfill({ status: 201, json: asset });
      }
      if (path === "/api/runs") {
        requests.push(request.postDataJSON());
        const snapshot = structuredClone(source);
        if (ws.runs.length) snapshot.checks.find(c => c.check_id === "web.hsts.v1")!.observation = { header: "max-age=300", maxAge: 300 };
        const run: Run = { id: `run-${ws.runs.length + 1}`, assetId: "hostname-asset", createdAt: `2026-09-11T12:0${ws.runs.length}:00.000Z`, profile: structuredClone(RECOMMENDED_PROFILE), snapshot, sourceDigest: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") };
        ws.runs.push(run); return route.fulfill({ status: 201, json: run });
      }
      throw new Error(`Unexpected API path: ${path}`);
    });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.locator("body").evaluate(node => getComputedStyle(node).fontFamily)).toContain("sans-serif");
    await page.screenshot({ path: info.outputPath("welcome-viewport.png") });
    await page.getByRole("button", { name: "Start local workspace", exact: true }).click();
    await page.getByRole("link", { name: "Add asset", exact: true }).first().click();
    await page.getByLabel("Public hostname", { exact: true }).fill("witnessops.com");
    await page.getByRole("button", { name: "Add asset", exact: true }).click();
    await expect(page.getByRole("heading", { name: "witnessops.com", exact: true })).toBeVisible();
    expect(requests).toHaveLength(0);
    await page.getByText("Edit checks", { exact: false }).first().click();
    await expect(page.locator(".check-list li")).toHaveCount(10);
    await expect(page.locator(".method-panel")).toContainText("Individual check selection is not available");
    await expect(page.getByRole("button", { name: "Observe", exact: true })).toBeDisabled();
    await page.screenshot({ path: info.outputPath("asset-recommended.png"), fullPage: true });
    await page.getByRole("checkbox", { name: "I own this hostname or am authorized to check it.", exact: true }).check();
    await page.getByRole("button", { name: "Observe", exact: true }).click();
    await expect(page).toHaveURL(/\/runs\/run-1$/);
    expect(requests).toEqual([{ assetId: "hostname-asset", authorized: true }]);
    await expect(page.locator(".observations > li")).toHaveCount(10);
    await page.getByRole("link").filter({ hasText: "TLS certificate state" }).click();
    for (const text of ["Contract ID", "Version", "Recorded status", "Collection state", "tls.certificate.v1", "What remains unknown", "Evidence references", "Interpretation"]) await expect(page.locator("main")).toContainText(text);
    await page.screenshot({ path: info.outputPath("observation-provenance.png"), fullPage: true });
    await page.goto("/runs/run-1");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download source JSON", exact: true }).click();
    const download = await downloadPromise, file = await download.path();
    expect(readFileSync(file!, "utf8")).toBe(JSON.stringify(source));
    await page.goto("/assets/hostname-asset");
    await expect(page.getByRole("button", { name: "Run again", exact: true })).toBeDisabled();
    await page.getByRole("checkbox", { name: "I own this hostname or am authorized to check it.", exact: true }).check();
    await page.getByRole("button", { name: "Run again", exact: true }).click();
    await expect(page).toHaveURL(/\/runs\/run-2$/);
    await expect(page.locator("main")).toContainText("HTTP Strict Transport Security: observed state changed.");
    await expect(page.locator("main")).toContainText("The check set and method are unchanged.");
    await page.screenshot({ path: info.outputPath("run-comparison.png"), fullPage: true });
    await page.screenshot({ path: info.outputPath("run-viewport.png") });
    await page.getByRole("link", { name: "View report", exact: true }).click();
    await expect(page.locator(".report-paper")).toContainText("All observations");
    await expect(page.locator(".report-observations > li")).toHaveCount(10);
    await page.screenshot({ path: info.outputPath("report.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.goto("/reports"); await expect(page.locator("main .ledger > li")).toHaveCount(2);
    await page.goto("/runs/run-1"); await expect(page.locator("main")).toContainText("First observation");
    await page.goto("/members"); await expect(page.locator("main")).toContainText("Local developer");
    await page.goto("/settings"); await page.getByRole("button", { name: "Clear local session", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start local workspace", exact: true })).toBeVisible();
    expect(requests).toHaveLength(2); expect(errors).toEqual([]);
  });
}

test("real local API rejects absent session, foreign origin and unauthorized execution without collection", async ({ request }) => {
  expect((await request.get("/api/workspace")).status()).toBe(401);
  expect((await request.post("/api/session", { headers: { Origin: "https://foreign.example" }, data: {} })).status()).toBe(403);
  expect((await request.post("/api/session", { headers: { Origin: "http://127.0.0.1:3022" }, data: {} })).status()).toBe(201);
  expect((await request.post("/api/assets", { headers: { Origin: "http://127.0.0.1:3022" }, data: { hostname: "127.0.0.1" } })).status()).toBe(400);
  const asset = await (await request.post("/api/assets", { headers: { Origin: "http://127.0.0.1:3022" }, data: { hostname: "witnessops.com" } })).json();
  expect((await request.post("/api/runs", { headers: { Origin: "http://127.0.0.1:3022" }, data: { assetId: asset.id, authorized: false } })).status()).toBe(400);
  const ws = await (await request.get("/api/workspace")).json(); expect(ws.runs).toHaveLength(0);
  await request.delete("/api/session", { headers: { Origin: "http://127.0.0.1:3022" } });
});
