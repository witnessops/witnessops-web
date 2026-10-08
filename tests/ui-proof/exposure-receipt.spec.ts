import { expect, test } from "@playwright/test";

for (const width of [320, 390, 1440]) {
  test(`€99 pilot is readable and connected at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/exposure-receipt");
    await expect(page).toHaveURL(/\/exposure-receipt$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Evidence you can");
    await expect(page.getByLabel("Pilot price and scope")).toContainText("excluding VAT · one-off");
    await expect(page.getByRole("main")).toContainText("pilot receipt is unsigned and is not supported by public /verify");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await page.getByRole("link", { name: "Request a €99 receipt", exact: true }).click();
    await expect(page.getByLabel("Which path?")).toHaveValue("External Exposure Receipt");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `artifacts/ui-proof/exposure-receipt/receipt-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Try the free hostname check", exact: true }).click();
    await expect(page).toHaveURL(/\/check$/);
    await expect(page.getByRole("main")).toContainText(/hostname/i);
  });
}

test("pilot enquiry uses existing mailbox flow and preserves offer context without starting collection", async ({ page }) => {
  let payload: { intent: string; scope: string } | undefined;
  let collected = false;
  await page.route("**/api/external-exposure", route => { collected = true; return route.abort(); });
  await page.route("**/api/review/request", async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { issuanceId: "pilot-browser-fixture", email: "buyer@example.com", expiresAt: "2099-01-01T00:00:00Z" } });
  });
  await page.goto("/exposure-receipt#request");
  await page.getByLabel("Your name", { exact: true }).fill("Pilot Buyer");
  await page.getByLabel("Work email", { exact: true }).fill("buyer@example.com");
  await page.getByLabel("What needs checking?", { exact: true }).fill("example.com. I own this hostname and want the €99 receipt before a launch.");
  await page.getByRole("button", { name: "Submit non-secret enquiry" }).click();
  await expect(page.getByRole("heading", { name: "Enter your email code" })).toBeVisible();
  expect(payload?.intent).toBe("review");
  expect(payload?.scope).toContain("Enquiry path: External Exposure Receipt");
  expect(payload?.scope).toContain("example.com");
  expect(collected).toBe(false);
});
