import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { RECOMMENDED_PROFILE, type Workspace, type Run, type ExternalSnapshotV1 } from "../../apps/witnessops-app/src/lib/model";
import { canonicalSource } from "../../apps/witnessops-app/src/lib/source-digest";
const source = JSON.parse(readFileSync(resolve("tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json"), "utf8")) as ExternalSnapshotV1;

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`authenticated workspace UI projection and retained source at ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    let ws: Workspace | null = null;
    const requests: unknown[] = [];
    const user = { id: "user-fixture", displayName: "Acme Owner" };
    const state = () => ({ user, workspaces: ws ? [{ id: ws.id, name: ws.name, slug: ws.slug, role: ws.role }] : [], workspace: ws });
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/api/**", async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (path === "/api/workspace" && request.method() === "POST") {
        ws = { id: "workspace-fixture", name: request.postDataJSON().name, slug: "workspace-fixture", role: "owner", assets: [], runs: [], members: [{ ...user, role: "owner" }] };
        return route.fulfill({ status: 201, json: state() });
      }
      if (path === "/api/workspace") return route.fulfill({ json: state() });
      if (!ws) throw new Error("Workspace must be created before product writes");
      if (path === "/api/assets") {
        const asset = { id: "hostname-asset", type: "hostname" as const, hostname: request.postDataJSON().hostname, createdAt: source.finished_at };
        ws.assets.push(asset); return route.fulfill({ status: 201, json: asset });
      }
      if (path === "/api/runs") {
        requests.push(request.postDataJSON());
        const snapshot = structuredClone(source);
        if (ws.runs.length) snapshot.checks.find(c => c.check_id === "web.hsts.v1")!.observation = { header: "max-age=300", maxAge: 300 };
        const run: Run = { id: `run-${ws.runs.length + 1}`, assetId: "hostname-asset", createdAt: `2026-09-11T12:0${ws.runs.length}:00.000Z`, profile: structuredClone(RECOMMENDED_PROFILE), snapshot, sourceDigest: createHash("sha256").update(canonicalSource(snapshot)).digest("hex") };
        ws.runs.push(run); return route.fulfill({ status: 201, json: run });
      }
      throw new Error(`Unexpected API path: ${path}`);
    });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.locator("body").evaluate(node => getComputedStyle(node).fontFamily)).toContain("sans-serif");
    await page.screenshot({ path: info.outputPath("welcome-viewport.png") });
    await page.getByLabel("Workspace name", { exact: true }).fill("Acme Ltd");
    await page.getByRole("button", { name: "Create workspace", exact: true }).click();
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
    expect(readFileSync(file!, "utf8")).toBe(canonicalSource(source));
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
    await page.goto("/members"); await expect(page.locator("main")).toContainText("Acme Owner");
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    await expect(page.locator("main")).toContainText("Your workspace, assets and runs remain saved.");
    await page.reload(); await expect(page.locator("main")).toContainText("Acme Ltd");
    expect(requests).toHaveLength(2); expect(errors).toEqual([]);
  });
}

test("real HTTP API rejects unauthenticated, forged and cross-origin access without collection", async ({ request }) => {
  expect((await request.get("/api/workspace")).status()).toBe(401);
  expect((await request.get("/api/workspace", { headers: { Cookie: "wos-session=invalid", "x-workos-session": "forged", "x-workos-middleware": "true" } })).status()).toBe(401);
  expect((await request.post("/api/workspace", { headers: { Origin: "https://foreign.example" }, data: {} })).status()).toBe(403);
  expect((await request.post("/api/runs", { headers: { Origin: "http://127.0.0.1:3022" }, data: { authorized: true } })).status()).toBe(401);
  const callback = await request.get("/callback?code=fixture&state=fixture");
  expect(callback.status()).toBe(400);
  expect(await callback.text()).not.toContain("fixture");
});

test("logged-out UI keeps sign-in separate from workspace creation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in to WitnessOps" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue with email" })).toBeVisible();
  await expect(page.getByLabel("Workspace name")).toHaveCount(0);
});

test("Viewer UI has read-only asset/history access", async ({ page }) => {
  await page.route("**/api/workspace", route => route.fulfill({ json: { user: { id: "viewer", displayName: "Viewer" }, workspaces: [{ id: "workspace", name: "Acme", slug: "acme", role: "viewer" }], workspace: { id: "workspace", name: "Acme", slug: "acme", role: "viewer", assets: [{ id: "asset", type: "hostname", hostname: "example.com", createdAt: source.finished_at }], runs: [], members: [] } } }));
  await page.goto("/assets/asset");
  await expect(page.locator("main")).toContainText("Only an Owner can start an observation.");
  await expect(page.getByRole("button", { name: "Observe", exact: true })).toHaveCount(0);
  await page.goto("/assets/new");
  await expect(page.getByRole("heading", { name: "Owner access required" })).toBeVisible();
});
