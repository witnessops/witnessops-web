import { expect, test } from "@playwright/test";

test("missing Polish offer has a localized 404 with useful next steps", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/pl/catalog/no-such-product", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(404);
  const main = page.locator("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("Nie znaleziono strony");
  await expect(main.getByRole("link", { name: "Strona główna" })).toHaveAttribute("href", "/pl");
  await expect(main.getByRole("link", { name: "Pomoc" })).toHaveAttribute("href", "/pl/support");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("missing English offer retains the English 404", async ({ page }) => {
  const response = await page.goto("/catalog/no-such-product", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(404);
  await expect(page.locator("main h1")).toHaveText("Page not found");
  await expect(page.locator("main").getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
});

test("unmatched Polish and English paths keep the correct language", async ({ page }) => {
  for (const [path, heading, linkName, href] of [
    ["/pl/this-page-does-not-exist", "Nie znaleziono strony", "Strona główna", "/pl"],
    ["/this-page-does-not-exist", "Page not found", "Home", "/"],
  ]) {
    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.status(), path).toBe(404);
    await expect(page.locator("main h1")).toHaveText(heading);
    await expect(page.locator("main").getByRole("link", { name: linkName, exact: true })).toHaveAttribute("href", href);
  }
});
