import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { wopsCase } from "../../apps/witnessops-web/src/app/review/sample-cases/wops-0001/case-contract";

for (const width of [1440, 390]) {
  test(`WOPS-0001 inspection, keyboard and downloads at ${width}`, async ({ page, context }, testInfo) => {
    // Preview content stays local; prevent existing shell integrations from sending requests.
    await context.route(/https?:\/\//, async (route) => {
      if (new URL(route.request().url()).hostname === "127.0.0.1") await route.continue();
      else await route.abort();
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width, height: 1000 });
    expect((await page.goto(wopsCase.route))?.status()).toBe(200);
    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText(wopsCase.title);
    await expect(main.getByText(wopsCase.boundary, { exact: true })).toBeVisible();
    await expect(main.locator("[data-case-result]")).toContainText(wopsCase.scope);
    await expect(main.locator('[data-claim="mechanism"]')).toContainText("INFERENCE");
    await expect(main.locator('[data-claim="mechanism"]')).not.toContainText("FACT_ARTIFACT");
    await expect(main.locator("[data-artifact-count]")).toContainText(`${wopsCase.artifacts.length} selected`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const sections = main.getByRole("navigation", { name: "Case sections" });
    await sections.getByRole("link", { name: "Case", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(sections.getByRole("link", { name: "Evidence", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#evidence$/);
    const summary = main.locator("summary");
    await summary.focus(); await page.keyboard.press("Enter");
    await expect(main.locator("details")).toHaveAttribute("open", "");
    await page.keyboard.press("Enter");

    for (const artifact of wopsCase.artifacts) {
      const downloadPromise = page.waitForEvent("download");
      await main.getByRole("link", { name: `Download ${artifact.file}`, exact: true }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(artifact.file);
      const bytes = await readFile((await download.path())!);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(artifact.sha256);
      const button = main.getByRole("button", { name: `Copy SHA-256 for ${artifact.file}`, exact: true });
      await button.focus(); await page.keyboard.press("Enter");
      await expect(main.locator(`[data-artifact="${artifact.file}"] [role="status"]`)).toHaveText("Full SHA-256 copied.");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(artifact.sha256);
    }
    expect((await page.request.get(`${wopsCase.artifactBase}/raw-trace.txt`)).status()).toBe(404);
    await page.goto(wopsCase.route);
    await page.screenshot({ path: testInfo.outputPath(`wops-0001-${width}.png`), fullPage: true });
  });
}
