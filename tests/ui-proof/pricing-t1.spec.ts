import { expect, test } from "@playwright/test";
import { INTERNET_FOOTPRINT_REVIEW_OFFER, PRIMARY_OFFER } from "../../apps/witnessops-web/src/lib/commercial-truth";
for (const width of [390, 1440]) {
  test(`Pricing T1 two fixed reviews and valid enquiry paths at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pricing");
    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText("Two reviews. Two fixed prices.");
    await expect(main.locator("article")).toHaveCount(2);
    const footprint = main.locator('[data-pricing-review="footprint"]');
    const agent = main.locator('[data-pricing-review="agent-action"]');
    await expect(footprint).toContainText(INTERNET_FOOTPRINT_REVIEW_OFFER.name.en);
    await expect(footprint).toContainText(INTERNET_FOOTPRINT_REVIEW_OFFER.price.en);
    await expect(footprint).not.toContainText(/working days|delivery time|response time/i);
    await expect(agent).toContainText(PRIMARY_OFFER.price.en);
    await expect(agent).toContainText(PRIMARY_OFFER.timing.en);
    await expect(main).not.toContainText(/€0|€49|€149|FIRST 10|No\. 0042|free while in Early Access|starting at|quoted on scope|One Server Security Check|External Attack Surface Review/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`pricing-${width}.png`), fullPage: true });
    await footprint.getByRole("link", { name: "Ask about this review" }).click();
    await expect(page).toHaveURL(/\/review\/request$/);
    await expect(page.locator("main")).toContainText("Non-secret details only.");
    await page.goto("/pricing");
    await page.getByRole("link", { name: "Scope this review", exact: true }).click();
    await expect(page).toHaveURL(/\/review\/request\?offerId=bounded-workflow-review&/);
    expect(new URL(page.url()).searchParams.get("offerId")).toBe(PRIMARY_OFFER.id);
    await expect(page.locator("main")).toContainText(PRIMARY_OFFER.name.en);
  });
}
test("secondary catalogue capabilities remain reachable", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("link", { name: "Explore the full catalogue" }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  for (const route of ["/catalog/offsec-local-audit", "/catalog/offsec-external-exposure", "/catalog/professional-public-footprint-audit", PRIMARY_OFFER.route]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
});
