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
      if (path === "/api/feedback" && request.method() === "GET") return route.fulfill({ json: [] });
      if (path === "/api/events" && request.method() === "POST") return route.fulfill({ json: { recorded: true } });
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
        if (ws.runs.length) snapshot.checks.find(c => c.check_id === "web.hsts.v1")!.observation = { url: "https://witnessops.com/", statusCode: 200, hsts: "max-age=300", maxAge: 300, includeSubDomains: false, preload: false };
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
    await expect(page.getByRole("heading", { name: "What do you want to check?" })).toBeVisible();
    await expect(page.locator("main")).toContainText("Adding an asset does not start collection.");
    await expect(page.getByRole("link", { name: "Choose External Exposure Check", exact: true })).toHaveCount(1);
    await expect(page.locator(".overview-stats")).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("empty-workspace.png"), fullPage: true });
    await page.getByRole("link", { name: "Choose External Exposure Check", exact: true }).click();
    await expect(page.locator(".check-list li")).toHaveCount(10);
    await expect(page.locator(".check-list")).toBeVisible();
    await expect(page.locator("main")).toContainText("Adding saves the hostname only.");
    await page.getByLabel("Public hostname", { exact: true }).fill("witnessops.com");
    await page.getByRole("button", { name: "Add without scanning", exact: true }).click();
    await expect(page.getByRole("heading", { name: "witnessops.com", exact: true })).toBeVisible();
    expect(requests).toHaveLength(0);
    await page.getByRole("link", { name: "Run observation ↓", exact: true }).click();
    await expect(page.getByRole("checkbox")).toBeInViewport();
    expect(requests).toHaveLength(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator(".check-list li")).toHaveCount(10);
    await expect(page.locator(".method-panel")).toContainText("Individual check selection is not available");
    await expect(page.getByRole("button", { name: "Run observation", exact: true })).toBeDisabled();
    await page.screenshot({ path: info.outputPath("asset-recommended.png"), fullPage: true });
    await page.getByRole("checkbox", { name: "I own this hostname or am authorized to check it.", exact: true }).check();
    await page.getByRole("button", { name: "Run observation", exact: true }).click();
    await expect(page).toHaveURL(/\/runs\/run-1$/);
    expect(requests).toEqual([{ assetId: "hostname-asset", authorized: true }]);
    await expect(page.locator(".observations > li")).toHaveCount(10);
    await expect(page.getByRole("region", { name: "Observation summary" })).toBeVisible();
    await page.goto("/assets/hostname-asset");
    await expect(page.getByRole("heading", { name: "Recorded result", exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath("completed-asset.png"), fullPage: true });
    await page.screenshot({ path: info.outputPath("completed-asset-viewport.png") });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.getByRole("link").filter({ hasText: "TLS certificate state" }).click();
    await expect(page.getByRole("heading", { name: "What we observed", exact: true })).toBeVisible();
    await expect(page.locator(".evidence-facts")).toContainText("Certificate expires");
    await expect(page.locator("pre")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "What this means" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What you can do next" })).toBeVisible();
    await page.screenshot({ path: info.outputPath("evidence-readable.png"), fullPage: true });
    await page.getByText("Method and provenance", { exact: true }).click();
    for (const text of ["Contract ID", "Version", "Recorded status", "Collection state", "tls.certificate.v1", "What remains unknown", "Evidence references"]) await expect(page.locator("main")).toContainText(text);
    await expect(page.locator("details .facts")).toContainText("external-demo-v0.1");
    await page.getByText("Raw source observation", { exact: true }).click();
    await expect(page.locator("pre")).toHaveText(JSON.stringify(source.checks.find(check => check.check_id === "tls.certificate.v1")!.observation, null, 2));
    await page.screenshot({ path: info.outputPath("observation-provenance.png"), fullPage: true });
    await page.goto("/runs/run-1");
    await page.getByText("Method and source evidence", { exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download source JSON", exact: true }).click();
    const download = await downloadPromise, file = await download.path();
    expect(readFileSync(file!, "utf8")).toBe(canonicalSource(source));
    const firstSource = canonicalSource(ws!.runs[0]);
    await page.goto("/assets/hostname-asset");
    await expect(page.getByRole("button", { name: "Run again", exact: true })).toBeDisabled();
    await page.getByRole("checkbox", { name: "I own this hostname or am authorized to check it.", exact: true }).check();
    await page.getByRole("button", { name: "Run again", exact: true }).click();
    await expect(page).toHaveURL(/\/runs\/run-2$/);
    expect(canonicalSource(ws!.runs[0])).toBe(firstSource);
    expect(ws!.runs.map(run => run.id)).toEqual(["run-1", "run-2"]);
    await expect(page.locator("main")).toContainText("HTTP Strict Transport Security: observed state changed.");
    await expect(page.locator("main")).toContainText("The check set and method are unchanged.");
    await page.screenshot({ path: info.outputPath("run-comparison.png"), fullPage: true });
    await page.screenshot({ path: info.outputPath("run-viewport.png") });
    await page.getByRole("link", { name: "View report", exact: true }).click();
    await expect(page.locator("main article")).toHaveAttribute("aria-label", "Derived buyer report");
    await expect(page.locator("main article")).toContainText("10 coverage items");
    await expect(page.locator("main article")).toContainText("Saved run");
    await expect(page.getByRole("button", { name: "Save report as PDF", exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath("report.png"), fullPage: true });
    await page.screenshot({ path: info.outputPath("report-viewport.png") });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.evaluate(() => { window.print = () => {}; });
    await page.getByRole("button", { name: "Save report as PDF", exact: true }).click();
    const printRoot = page.locator("[data-buyer-print-root]");
    expect(await printRoot.locator("article").innerHTML()).toBe(await page.locator("main article").innerHTML());
    await expect(printRoot).toContainText(ws!.runs[1].sourceDigest);
    await expect(printRoot).toContainText("Environment changes");
    await expect(printRoot).toContainText("HTTP Strict Transport Security: observed state changed.");
    await expect(printRoot).toContainText("Coverage changes");
    await expect(printRoot).toContainText("The check set and method are unchanged.");
    await expect(printRoot).not.toContainText("Acme Owner");
    await page.getByRole("link", { name: "← Open observation", exact: true }).click();
    await expect(printRoot).toHaveCount(0);
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
  for (const endpoint of ["workspace", "early-access", "feedback"]) expect((await request.get(`/api/${endpoint}`)).status()).toBe(401);
  expect((await request.post("/api/events", { headers: { Origin: "http://127.0.0.1:3022" }, data: {} })).status()).toBe(401);
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
  await expect(page.getByRole("button", { name: "Run observation", exact: true })).toHaveCount(0);
  await page.goto("/assets/new");
  await expect(page.getByRole("heading", { name: "Owner access required" })).toBeVisible();
});

function recordedRun(id: string): Run {
  const snapshot = structuredClone(source);
  return { id, assetId: "asset", createdAt: id === "previous" ? "2026-09-11T10:00:00Z" : "2026-09-11T11:00:00Z", profile: structuredClone(RECOMMENDED_PROFILE), snapshot, sourceDigest: createHash("sha256").update(canonicalSource(snapshot)).digest("hex") };
}

function customerWorkspace(runs: Run[]): Workspace {
  return { id: "workspace", name: "Acme", slug: "acme", role: "owner", assets: [{ id: "asset", type: "hostname", hostname: source.target, createdAt: source.finished_at }], runs, members: [] };
}

for (const width of [1440, 390]) {
  test(`attention and undetermined evidence remain distinct at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    const run = recordedRun("current");
    const hsts = run.snapshot.checks.find(check => check.check_id === "web.hsts.v1")!;
    hsts.status = "NEEDS_ATTENTION"; hsts.observation = { hsts: null, url: "https://witnessops.com/", statusCode: 200 };
    hsts.interpretation = "No HSTS header was observed on this HTTPS response.";
    hsts.recommendation = "Review the HTTPS response configuration before deciding whether to publish HSTS.";
    const tls = run.snapshot.checks.find(check => check.check_id === "tls.certificate.v1")!;
    tls.status = "CHECK_ERROR"; tls.collected = false; tls.observation = { reason: "COLLECTION_TIMEOUT" };
    tls.interpretation = "A certificate observation could not be collected.";
    run.sourceDigest = createHash("sha256").update(canonicalSource(run.snapshot)).digest("hex");
    const ws = customerWorkspace([run]);
    await page.route("**/api/workspace", route => route.fulfill({ json: { user: { id: "owner" }, workspaces: [ws], workspace: ws } }));
    await page.goto("/assets/asset");
    const summary = page.getByRole("region", { name: "Observation summary" });
    await expect(summary.getByRole("heading", { name: "1 check is Undetermined" })).toBeVisible();
    await expect(summary.getByRole("link", { name: "HTTP Strict Transport Security →" })).toBeVisible();
    await expect(page.locator(".observations > li")).toHaveCount(10);
    await expect(page.locator(".status-check_error")).toHaveText("Undetermined");
    await expect(page.locator(".status-needs_attention")).toHaveText("Needs attention");
    await expect(page.locator(".status-observed_expected")).toHaveCount(6);
    await expect(page.locator("main")).not.toContainText("No attention flags in this snapshot");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath("attention-completed-asset.png"), fullPage: true });
    await page.screenshot({ path: info.outputPath("attention-completed-viewport.png") });
    await summary.getByRole("link", { name: "HTTP Strict Transport Security →" }).click();
    await expect(page.locator(".evidence-facts")).toContainText("Not recorded");
    await expect(page.locator("main")).toContainText(hsts.recommendation);
    await expect(page.locator("main")).toContainText(hsts.limitations[0]);
    await expect(page.locator("pre")).not.toBeVisible();
    await page.goto("/runs/current/observations/tls.certificate.v1");
    await expect(page.locator("main")).toContainText("COLLECTION_TIMEOUT");
    await expect(page.locator("main")).toContainText("A collection error is Undetermined, not evidence of a vulnerability.");
  });
}

test("unchanged evidence is useful; a method update is Coverage without an Environment claim", async ({ page }, info) => {
  const previous = recordedRun("previous"), current = recordedRun("current");
  const ws = customerWorkspace([previous, current]);
  await page.route("**/api/workspace", route => route.fulfill({ json: { user: { id: "owner" }, workspaces: [ws], workspace: ws } }));
  await page.goto("/runs/current");
  await expect(page.locator("main")).toContainText("No change in comparable target observations.");
  await expect(page.locator("main")).toContainText("The check set and method are unchanged.");
  await expect(page.locator("main")).toContainText("Keep this baseline and run again later to compare.");
  await page.screenshot({ path: info.outputPath("unchanged-comparison.png"), fullPage: true });
  const original = canonicalSource(previous);
  current.profile.version = "new-method-fixture";
  await page.reload();
  await expect(page.locator("main")).toContainText("Recommended-check method or version changed.");
  await expect(page.locator("main")).toContainText("No change in comparable target observations.");
  await expect(page.locator("main")).not.toContainText("observed state changed.");
  expect(canonicalSource(previous)).toBe(original);
});

test("recorded strings render as inert text in readable evidence and raw disclosure", async ({ page }) => {
  const run = recordedRun("current"), check = run.snapshot.checks.find(item => item.check_id === "mail.spf.v1")!;
  const literal = '<img src=x onerror="alert(1)">';
  check.observation = { records: [literal] };
  const ws = customerWorkspace([run]);
  await page.route("**/api/workspace", route => route.fulfill({ json: { user: { id: "owner" }, workspaces: [ws], workspace: ws } }));
  await page.goto("/runs/current/observations/mail.spf.v1");
  await expect(page.locator(".evidence-facts")).toContainText(literal);
  await expect(page.locator("main img")).toHaveCount(0);
  await page.getByText("Raw source observation", { exact: true }).click();
  await expect(page.locator("pre")).toHaveText(JSON.stringify(check.observation, null, 2));
});

test("overview guides the next visit without treating unobserved or uncertain assets as clear", async ({ page }) => {
  const unknown = recordedRun("current");
  unknown.snapshot.checks[0].status = "UNDETERMINED";
  unknown.snapshot.checks[0].collected = false;
  const ws = customerWorkspace([unknown]);
  ws.assets.unshift({ id: "unobserved", type: "hostname", hostname: "new.example.com", createdAt: source.finished_at });
  await page.route("**/api/workspace", route => route.fulfill({ json: { user: { id: "owner" }, workspaces: [ws], workspace: ws } }));
  await page.goto("/");
  await expect(page.locator(".overview-note")).toContainText("1 asset has undetermined checks.");
  await expect(page.locator(".overview-note")).toContainText("1 asset has not been observed yet.");
  await expect(page.locator(".ledger > li").first()).toContainText("1 undetermined");
  await expect(page.locator(".ledger > li").last()).toContainText("Not observed yet");
  await expect(page.locator("main")).toContainText("compare later checks");
});
