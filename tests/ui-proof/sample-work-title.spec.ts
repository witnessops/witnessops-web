import { expect, test } from "@playwright/test";

test("retired sample downloads are no longer public", async ({ request }) => {
  for (const path of [
    "/.well-known/mesh-receipt-index.json",
    "/samples/csr-sprint-synthetic/canonical/approval_record.json",
    "/samples/offsec-access-removed/proofpack-pr_access_removed_demo_20260711130000.proofpack",
    "/samples/offsec-custody-ops/proofpack-pr_custody_demo_20260711130000.proofpack",
    "/samples/offsec-external-exposure/evidence-manifest.json",
    "/samples/offsec-incident-ready/proofpack-pr_incident_demo_20260711130000.proofpack",
    "/samples/offsec-launch-ready/proofpack-pr_lrr_20260711120000_df6bc5d205.proofpack",
    "/samples/offsec-local-audit/proofpack-pr_lsa_20260710120000_198fd7aceb.proofpack",
    "/samples/offsec-shield-local-server-audit/RECEIPT.json",
    "/samples/offsec-swarm-mesh-trust-round3/MESH_EXPORT.json",
  ]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  const discovery = await request.get("/api/mesh-gate");
  expect(discovery.status()).toBe(200);
  const body = await discovery.json();
  expect(body).toMatchObject({
    schema: "witnessops.mesh_gate_discovery.v1",
    index_published: false,
    well_known_index: null,
  });
  expect(body.disclaimer).toContain("legacy structural compatibility only");
});

for (const width of [390, 1440]) {
  test(`sample-work titles preserve routes and sample boundaries at ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    expect((await page.goto("/review/sample-cases"))?.status()).toBe(200);
    await expect(page).toHaveURL(/\/review\/sample-cases$/);
    await expect(page).toHaveTitle("Sample work | WitnessOps");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Sample work | WitnessOps");
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", "Sample work | WitnessOps");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://witnessops.com/review/sample-cases");
    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText("Sample work");
    await expect(main).toContainText("Examples of agent actions, approvals and evidence.");
    await expect(main).toContainText("Published sample, not live customer evidence. No production verification or certification.");
    await expect(main.locator("header").first().getByText("Examples", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`sample-work-${width}.png`) });
    const nav = page.getByRole("navigation", { name: "Primary navigation", exact: true });
    if (width === 390) await nav.getByRole("button", { name: "Open primary navigation" }).click();
    await nav.getByRole("button", { name: "Resources", exact: true }).click();
    const sampleLink = nav.locator('a[href="/review/sample-cases"]:visible');
    await expect(sampleLink).toHaveCount(1);
    await expect(sampleLink).toContainText("Sample work");
    await expect(sampleLink).toHaveAttribute("href", "/review/sample-cases");
    await sampleLink.click();
    await expect(page).toHaveURL(/\/review\/sample-cases$/);
    await expect(page.getByRole("heading", { level: 1, name: "Sample work", exact: true })).toBeVisible();
    await expect(page.locator('main a[href="/review/sample-cases/ai-agent-action-proof-run"]')).toHaveCount(1);
    const sampleCards = page.locator('main a[href^="/review/sample-cases/"]');
    await expect(sampleCards).toHaveCount(4);
    for (const slug of ["witnessed-crm-status-change", "privileged-access-grant", "approval-gated-containment"]) {
      await expect(page.locator(`main a[href="/review/sample-cases/${slug}"]`)).toHaveCount(1);
    }
    await expect(main).not.toContainText("External Attack Surface Review");
    await expect(main).not.toContainText("SBOM field checklist");
  });
}
