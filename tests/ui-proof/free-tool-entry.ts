import { expect, type Page } from "@playwright/test";

const DESKTOP_NAV_MIN_WIDTH = 1024;

// The free hostname tool is a header Resources item. Its panel stays closed,
// so a page-level role query does not see it until that menu is open.
export async function expectFreeToolEntryPoint(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  expect(viewport, "viewport is set").not.toBeNull();
  const width = viewport!.width;
  const nav = page.getByRole("navigation", { name: "Primary navigation", exact: true });
  if (width < DESKTOP_NAV_MIN_WIDTH) {
    const toggle = nav.getByRole("button", { name: "Open primary navigation", exact: true });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
  const resources = nav.getByRole("button", { name: "Resources", exact: true });
  await resources.click();
  await expect(resources).toHaveAttribute("aria-expanded", "true");
  const panelId = await resources.getAttribute("aria-controls");
  expect(panelId, "Resources menu controls a panel").toBeTruthy();
  const panel = nav.locator(`#${panelId}`);
  // Desktop items append a description to the accessible name. Mobile items
  // use the label alone. Both must start with the free-tool label.
  const tool = panel.getByRole("link", { name: /^Tool · not a review(?:$|\s)/ });
  await expect(tool).toHaveCount(1);
  await expect(tool).toBeVisible();
  await expect(tool).toHaveAccessibleName(/^Tool · not a review(?:$|\s)/);
  await expect(tool).toHaveAttribute("href", "/check");
  await page.keyboard.press("Escape");
  if (width < DESKTOP_NAV_MIN_WIDTH) {
    const toggle = nav.getByRole("button", { name: "Open primary navigation", exact: true });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect.poll(async () => (await nav.locator("#witnessops-mobile-menu").boundingBox())?.height ?? 0).toBe(0);
  } else {
    await expect(resources).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
  }
}
