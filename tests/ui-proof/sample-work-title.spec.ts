import { expect, test } from "@playwright/test";

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
    await expect(main).toContainText("Illustrative reviews, findings and evidence.");
    await expect(main).toContainText("Published sample, not live customer evidence. No production verification or certification.");
    await expect(main.locator("header").first().getByText("Examples", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`sample-work-${width}.png`) });
    const nav = page.getByRole("navigation", { name: "Primary navigation", exact: true });
    if (width === 390) await nav.getByRole("button", { name: "Open primary navigation" }).click();
    await nav.getByRole("button", { name: "Resources", exact: true }).click();
    const sampleLink = nav.locator('a[href="/library"]:visible');
    await expect(sampleLink).toContainText("Sample work");
    await sampleLink.click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByRole("heading", { name: "All Skills Library", exact: true })).toBeVisible();
  });
}
