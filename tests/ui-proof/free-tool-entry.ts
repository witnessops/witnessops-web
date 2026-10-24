import { expect, type Locator, type Page } from "@playwright/test";

const DESKTOP_NAV_MIN_WIDTH = 1024;

// Header group items stay closed until their menu is opened. Desktop items
// append a description to the accessible name; mobile items use the label alone.
export async function openResourcesPanel(page: Page): Promise<{ panel: Locator; close: () => Promise<void> }> {
  const viewport = page.viewportSize();
  expect(viewport, "viewport is set").not.toBeNull();
  const width = viewport!.width;
  const nav = page.getByRole("navigation", { name: "Primary navigation", exact: true });
  const mobile = width < DESKTOP_NAV_MIN_WIDTH;
  const toggle = nav.locator('button[aria-controls="witnessops-mobile-menu"]');
  if (mobile) {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
  const resources = nav.getByRole("button", { name: "Resources", exact: true });
  // Mobile keeps the group expanded after the menu closes, and a second click collapses it.
  if (await resources.getAttribute("aria-expanded") !== "true") await resources.click();
  await expect(resources).toHaveAttribute("aria-expanded", "true");
  const panelId = await resources.getAttribute("aria-controls");
  expect(panelId, "Resources menu controls a panel").toBeTruthy();
  const panel = nav.locator(`#${panelId}`);
  return {
    panel,
    close: async () => {
      await page.keyboard.press("Escape");
      if (mobile) {
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        // The closed menu keeps a 1px border, so its box does not reach 0.
        await expect.poll(async () => (await nav.locator("#witnessops-mobile-menu").boundingBox())?.height ?? 0).toBeLessThanOrEqual(1);
      } else {
        await expect(resources).toHaveAttribute("aria-expanded", "false");
        await expect(panel).toBeHidden();
      }
    },
  };
}

export async function expectFreeToolEntryPoint(page: Page): Promise<void> {
  const { panel, close } = await openResourcesPanel(page);
  const tool = panel.getByRole("link", { name: /^Tool · not a review(?:$|\s)/ });
  await expect(tool).toHaveCount(1);
  await expect(tool).toBeVisible();
  await expect(tool).toHaveAccessibleName(/^Tool · not a review(?:$|\s)/);
  await expect(tool).toHaveAttribute("href", "/check");
  await close();
}
