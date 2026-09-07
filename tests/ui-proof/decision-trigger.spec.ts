import { expect, test } from "@playwright/test";
import { reviewRequestSchema } from "../../apps/witnessops-web/src/lib/token-contract";

for (const locale of ["en", "pl"] as const) {
  for (const width of [390, 1440]) {
    test(`decision triggers and optional timing ${locale} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const prefix = locale === "pl" ? "/pl" : "";
      await page.goto(prefix || "/");
      const triggers = page.locator('section[aria-labelledby="home-decision-heading"]');
      await expect(triggers.getByRole("heading", { level: 3 })).toHaveCount(2);
      await triggers.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `artifacts/ui-proof/decision-triggers/home-${locale}-${width}.png` });
      await triggers.getByRole("link").click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/review/request$`));

      const submissions: Record<string, unknown>[] = [];
      await page.route("**/api/review/request", async route => {
        const payload = route.request().postDataJSON();
        submissions.push(payload);
        expect(reviewRequestSchema.safeParse(payload).success).toBe(true);
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Local test response. Nothing sent." }),
        });
      });
      const form = page.locator("main form");
      const timing = form.locator('[name="decisionTiming"]');
      await expect(timing).not.toHaveAttribute("required", "");
      await expect(timing).toHaveAttribute("maxlength", "240");
      await expect(form.locator("[required]")).toHaveCount(3);
      await form.locator('[name="name"]').fill("Test Buyer");
      await form.locator('[name="email"]').fill("buyer@example.com");
      await form.locator('[name="workflow"]').fill("Review an agent before it gets write access.");
      await form.locator('[type="submit"]').click();
      await expect.poll(() => submissions.length).toBe(1);
      expect(submissions[0].scope).not.toContain("Decision and target date:");

      const dateAnswer = "Production access next Friday. A delay holds up the customer pilot.";
      await timing.fill(dateAnswer);
      await timing.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `artifacts/ui-proof/decision-triggers/form-${locale}-${width}.png` });
      await form.locator('[type="submit"]').click();
      await expect.poll(() => submissions.length).toBe(2);
      expect(submissions[1].scope).toContain(`Decision and target date: ${dateAnswer}`);
      await expect(timing).toHaveValue(dateAnswer);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

      // The new field must fit the existing server contract even when every
      // longer context field is full. All submissions are intercepted locally.
      await form.locator("summary").click();
      for (const field of ["workflow", "agentPath", "approvalBoundary", "evidenceAvailable"]) {
        await form.locator(`[name="${field}"]`).fill("x".repeat(1500));
      }
      await timing.fill("x".repeat(240));
      await form.locator('[type="submit"]').click();
      await expect.poll(() => submissions.length).toBe(3);
    });
  }
}
