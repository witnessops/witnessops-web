import { expect, test } from "@playwright/test";

for (const width of [1280, 390, 320]) {
  test(`draft pricing is usable without billing or entitlement changes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const writes: string[] = [];
    page.on("request", request => { if (request.method() !== "GET" && request.method() !== "HEAD") writes.push(request.url()); });
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "App access and named reviews." })).toBeVisible();
    const compare = page.locator('[data-app-plan="Compare"]');
    await expect(compare).toContainText("€49");
    await page.getByRole("button", { name: "Annual · 2 months included" }).click();
    await expect(compare).toContainText("€490");
    await expect(page.locator('[data-app-plan="Workspace"]')).toContainText("€1,490");
    await page.getByRole("button", { name: "Preview Compare" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Compare selected" })).toContainText("No payment taken, account changed or check started.");
    await page.getByRole("button", { name: "Monthly", exact: true }).click();
    await expect(compare).toContainText("€49");
    await page.getByText("Does a plan authorise a scan?", { exact: true }).click();
    await expect(page.getByText("No. Selecting a plan, asking for support or making a payment does not authorise testing.", { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(writes).toEqual([]);
    await page.screenshot({ path: `/tmp/wops-price-${width}.png`, fullPage: true });
  });
}
