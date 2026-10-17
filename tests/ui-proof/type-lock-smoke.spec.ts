import { expect, test } from "@playwright/test";

test("Polish home renders diacritics in Inter", async ({ page }) => {
  await page.goto("/pl");
  await page.evaluate(() => document.fonts.ready);
  const covered = await page.evaluate(() => document.fonts.check("16px Inter", "ąęłńśźż"));
  expect(covered).toBe(true);
});

test("Chronicle 001 title uses weight 300", async ({ page }) => {
  await page.goto("/chronicles/001-the-unauthorized-feline");
  await expect(page.locator("h1")).toHaveCSS("font-weight", "300");
});

test("Ask Sovereign review tag has 16px side padding at 390", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl/docs/assistant");
  await expect(page.locator("[class*='reviewTag']").first()).toHaveCSS("padding-left", "16px");
});
