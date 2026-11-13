import { expect, test, type Page } from "@playwright/test";

async function controlledPanel(page: Page, button: ReturnType<Page["getByRole"]>) {
  return page.locator(`#${await button.getAttribute("aria-controls")}`);
}

for (const locale of [
  { route: "/", nav: "Primary navigation", review: "The review", explore: "Explore", docs: "Docs", docsPath: "/docs", chronicles: "The Sovereign Chronicles" },
  { route: "/pl", nav: "Nawigacja główna", review: "Przegląd", explore: "Odkrywaj", docs: "Dokumentacja", docsPath: "/pl/docs", chronicles: "The Sovereign Chronicles (EN)" },
]) {
  test(`desktop dropdown navigation works on ${locale.route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(locale.route);
    const nav = page.getByRole("navigation", { name: locale.nav, exact: true });
    const review = nav.getByRole("button", { name: locale.review, exact: true });
    const explore = nav.getByRole("button", { name: locale.explore, exact: true });
    await expect(nav.getByRole("link", { name: locale.docs, exact: true }).filter({ visible: true })).toHaveAttribute("href", locale.docsPath);
    await expect(review).toHaveAttribute("aria-expanded", "false");
    await review.click();
    const reviewPanel = await controlledPanel(page, review);
    await expect(reviewPanel).toBeVisible();
    expect((await reviewPanel.boundingBox())!.width).toBeGreaterThanOrEqual(1000);
    await explore.click();
    await expect(reviewPanel).toBeHidden();
    const explorePanel = await controlledPanel(page, explore);
    await expect(explorePanel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(explorePanel).toBeHidden();
    await expect(explore).toBeFocused();
    await explore.click();
    await page.mouse.click(20, 700);
    await expect(explorePanel).toBeHidden();
    await explore.click();
    await explorePanel.getByRole("link", { name: new RegExp(locale.chronicles.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
    await expect(page).toHaveURL(/\/chronicles$/);
    await expect(page.locator("section[id^=public-nav-group-]:visible")).toHaveCount(0);
  });
}

test("desktop keyboard navigation and a short window keep the dropdown usable", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 400 });
  await page.goto("/", { waitUntil: "networkidle" });
  const review = page.getByRole("button", { name: "The review", exact: true });
  await review.focus();
  await page.keyboard.press("ArrowDown");
  const panel = await controlledPanel(page, review);
  await expect(panel.locator("a").first()).toBeFocused();
  const bounds = (await panel.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(1024);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(400);
  await panel.locator("a").last().focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(panel).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 740, height: 320 }]) {
  test(`mobile grouped navigation at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open primary navigation" });
    await toggle.click();
    const menu = page.locator("#witnessops-mobile-menu");
    const review = menu.getByRole("button", { name: "The review", exact: true });
    const explore = menu.getByRole("button", { name: "Explore", exact: true });
    await expect(review).toHaveAttribute("aria-expanded", "false");
    await explore.click();
    const explorePanel = await controlledPanel(page, explore);
    await expect(explorePanel).toBeVisible();
    await review.click();
    await expect(explorePanel).toBeHidden();
    const reviewPanel = await controlledPanel(page, review);
    await expect(reviewPanel.getByRole("link", { name: /How it works/ })).toBeVisible();
    const last = menu.locator("[data-mobile-language-link]");
    await last.focus();
    await page.keyboard.press("Tab");
    await expect(menu.locator("[data-mobile-account-actions] a").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open primary navigation" })).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    await toggle.click();
    await menu.getByRole("button", { name: "Explore", exact: true }).click();
    await menu.getByRole("link", { name: /The Sovereign Chronicles/ }).click();
    await expect(page).toHaveURL(/\/chronicles$/);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("Polish mobile groups use Polish destinations and label English content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl");
  await page.getByRole("button", { name: "Otwórz główną nawigację" }).click();
  const menu = page.locator("#witnessops-mobile-menu");
  await menu.getByRole("button", { name: "Przegląd", exact: true }).click();
  await expect(menu.getByRole("link", { name: /Agent Action Security Review/ })).toHaveAttribute("href", "/pl/reviews/agent-action-security-review");
  await menu.getByRole("button", { name: "Odkrywaj", exact: true }).click();
  await expect(menu.getByRole("link", { name: /The Sovereign Chronicles \(EN\)/ })).toHaveAttribute("href", "/chronicles");
  await expect(menu.getByRole("link", { name: /Dane firmy/ })).toHaveAttribute("href", "/pl/company");
  await expect(menu.getByRole("link", { name: "Dokumentacja", exact: true })).toHaveAttribute("href", "/pl/docs");
});
