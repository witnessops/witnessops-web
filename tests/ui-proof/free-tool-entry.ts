import { expect, type Page } from "@playwright/test";

const DESKTOP_NAV_MIN_WIDTH = 1024;
const RETIRED_MENU_HREFS = ["/check", "/pl/check", "/early-access", "/docs", "/pl/docs", "/pricing", "/docs/assistant"] as const;

// Design 2026-11-13: the header is a flat list (review, how it works, examples,
// about). The free check, Early access, Docs and Pricing pages stay reachable by
// URL but are no longer offered from the header or the mobile menu.
export async function expectMenusOmitRetiredEntries(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  expect(viewport, "viewport is set").not.toBeNull();
  // The shared shell nav is labelled per locale; select it structurally.
  const nav = page.locator("nav.public-shell");
  const mobile = viewport!.width < DESKTOP_NAV_MIN_WIDTH;
  const toggle = nav.locator('button[aria-controls="witnessops-mobile-menu"]');
  if (mobile) {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
  await expect(nav.getByRole("button", { name: "Resources", exact: true })).toHaveCount(0);
  for (const href of RETIRED_MENU_HREFS) {
    await expect(nav.locator(`a[href="${href}"]`), `menu must not link ${href}`).toHaveCount(0);
  }
  if (mobile) {
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
}
