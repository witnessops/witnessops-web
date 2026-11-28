import { expect, test } from "@playwright/test";
import { reviewRequestSchema } from "../../apps/witnessops-web/src/lib/token-contract";

for (const width of [1280, 768, 390, 320]) {
  test(`homepage and enquiry remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("AI Agent Red Teaming for agents that take real-world actions.");
    await expect(page.locator("main a[href='/check']")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const form = page.locator("main form");
    await expect(form.locator("input:not([type=hidden]), select, textarea")).toHaveCount(4);
    await form.getByRole("button", { name: "Request a security assessment" }).scrollIntoViewIfNeeded();
    await expect(form.getByRole("button", { name: "Request a security assessment" })).toBeInViewport();
    if (width < 1024) {
      const toggle = page.locator('button[aria-controls="witnessops-mobile-menu"]');
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
    }
    await expect(page.getByRole("button", { name: "Ask WitnessOps", exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

for (const pathname of ["/", "/pricing", "/review/request"]) test(`${pathname} enquiry submits the accepted contract and requires mailbox verification`, async ({ page }) => {
  let submitted: unknown;
  await page.route("**/api/review/request", async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ issuanceId: "iss_design_test", email: "buyer@example.com", expiresAt: "2099-01-01T00:00:00.000Z" }) });
  });
  await page.goto(pathname);
  if (pathname === "/pricing") await page.locator('[data-ui-proof-id="offer-in-page-cta"]').click();
  await page.locator("#email").fill("buyer@example.com");
  await page.locator("#workflow").fill("Review one agent refund action before our next release.");
  await page.locator("#approvalBoundary").fill("Billing tool and refund approvals.");
  await page.locator("#decisionTiming").fill("Before the next release.");
  await page.getByRole("button", { name: "Request a security assessment", exact: true }).click();
  await expect(page.locator("#verification-code")).toBeVisible();
  expect(reviewRequestSchema.safeParse(submitted).success).toBe(true);
  expect(submitted).toMatchObject({ email: "buyer@example.com", intent: "agent-action-security-review" });
  expect(submitted).toMatchObject({ scope: expect.stringContaining("Offer: agent-action-security-review") });
  expect(new URL(page.url()).pathname).toBe(pathname === "/pricing" ? "/review/request" : pathname);
});
