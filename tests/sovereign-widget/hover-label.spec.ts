import { expect, test } from "./fixtures";

test("hover reveals only Talk to Sovereign and clicking opens chat", async ({ page }, testInfo) => {
  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Ask Sovereign", exact: true });
  const label = launcher.locator("[data-sovereign-talk-label]");
  await expect(label).toHaveText("Talk to Sovereign");
  await expect(label).toHaveCSS("opacity", "0");
  await launcher.hover();
  await expect(label).toHaveCSS("opacity", "1");
  await expect(page.getByRole("button", { name: "Reset position", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Quick questions", exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toBeHidden();
  expect((await launcher.locator("[data-shellbit-state]").boundingBox())?.width).toBe(84);
  await page.screenshot({ path: testInfo.outputPath("talk-to-sovereign-hover.png"), animations: "disabled" });
  await page.mouse.move(0, 0);
  await expect(label).toHaveCSS("opacity", "0");
  await launcher.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("textbox")).toBeFocused();
});

test("keyboard focus reveals the invitation and Enter opens chat", async ({ page }) => {
  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Ask Sovereign", exact: true });
  await launcher.focus();
  await expect(launcher.locator("[data-sovereign-talk-label]")).toHaveCSS("opacity", "1");
  await launcher.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
});

test.describe("touch launcher", () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 740 } });
  test("Polish mascot opens chat directly without a persistent label", async ({ page }) => {
    await page.goto("/pl");
    const launcher = page.getByRole("button", { name: "Zapytaj Sovereign", exact: true });
    await expect(launcher.locator("[data-sovereign-talk-label]")).toHaveText("Porozmawiaj z Sovereign");
    await expect(launcher.locator("[data-sovereign-talk-label]")).toHaveCSS("opacity", "0");
    await launcher.tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").locator("[data-opening-choices]")).toBeVisible();
  });
});
