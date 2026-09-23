import { expect, test } from "@playwright/test";
import { reviewRequestSchema } from "../../apps/witnessops-web/src/lib/token-contract";

for (const width of [1280, 768, 390, 320]) {
  test(`simple landing and chat remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toHaveText("Agents act. WitnessOps reviews what yours are permitted to do.");
    await expect(page.getByRole("link", { name: "Start a free check", exact: true })).toHaveAttribute("href", "/check");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const form = page.locator("main form");
    await expect(form.locator("input:not([type=hidden]), select, textarea")).toHaveCount(4);
    await form.getByRole("button", { name: "Submit non-secret enquiry" }).scrollIntoViewIfNeeded();
    await expect(form.getByRole("button", { name: "Submit non-secret enquiry" })).toBeInViewport();
    if (width < 1024) {
      const toggle = page.locator('button[aria-controls="witnessops-mobile-menu"]');
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
    }
    await page.route("**/api/ask-witnessops", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
    await page.getByRole("button", { name: "Ask WitnessOps", exact: true }).click();
    const input = page.getByRole("textbox", { name: "Ask WitnessOps question" });
    await input.fill("How do I start a free check?");
    await page.getByRole("button", { name: "Ask AI", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry question", exact: true })).toBeVisible();
    await expect(input).toHaveValue("How do I start a free check?");
    await expect(page.getByRole("dialog").getByRole("link", { name: "Support help", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Ask WitnessOps", exact: true })).toBeFocused();
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
  if (pathname === "/pricing") await page.getByRole("link", { name: "Ask about this review", exact: true }).click();
  await page.locator("#name").fill("Example Buyer");
  await page.locator("#email").fill("buyer@example.com");
  await page.locator("#enquiryPath").selectOption("One Server Security Check");
  await page.locator("#workflow").fill("Review one server before our next release.");
  await page.getByRole("button", { name: "Submit non-secret enquiry", exact: true }).click();
  await expect(page.locator("#verification-code")).toBeVisible();
  expect(reviewRequestSchema.safeParse(submitted).success).toBe(true);
  expect(submitted).toMatchObject({ name: "Example Buyer", email: "buyer@example.com", org: "", intent: "review" });
  expect(submitted).toMatchObject({ scope: expect.stringContaining("Enquiry path: One Server Security Check") });
  expect(new URL(page.url()).pathname).toBe(pathname === "/pricing" ? "/review/request" : pathname);
});
