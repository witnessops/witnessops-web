import { test, expect } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`support email verification is recoverable and keyboard usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let submissions = 0;
    let verifications = 0;
    await page.route("**/api/support", async route => {
      submissions++;
      expect(route.request().postDataJSON().email).toBe("pilot@example.com");
      await route.fulfill({ json: {
        channel: "support", intakeId: "qa-intake", issuanceId: "qa-issuance", threadId: null,
        email: "pilot@example.com", createdAt: "2026-09-18T10:00:00Z", expiresAt: "2099-09-18T11:00:00Z",
        status: "issued", admissionState: "verification_sent",
      } });
    });
    await page.route("**/api/verify-token", async route => {
      verifications++;
      if (verifications === 1) {
        await route.fulfill({ status: 400, json: { error: "Token mismatch" } });
      } else {
        await route.fulfill({ json: {
          channel: "support", intakeId: "qa-intake", issuanceId: "qa-issuance", threadId: null,
          email: "pilot@example.com", verifiedAt: "2026-09-18T10:01:00Z", status: "verified",
          admissionState: "admitted", assessmentRunId: null, assessmentStatus: "pending",
          postVerifyPath: "/support?verified=1",
        } });
      }
    });
    await page.goto("/support");
    await page.getByLabel("Search docs first").fill("invitations");
    await expect(page.getByRole("link", { name: /Account, signup, invitations/ })).toHaveAttribute("href", "/docs/getting-started/access-help");
    await page.getByLabel("Email address", { exact: true }).fill("invalid");
    await page.getByRole("button", { name: "Still need help? Email support" }).click();
    await expect(page.locator("#si-email-error")).toContainText("valid email");
    await expect(page.locator("#si-email")).toBeFocused();
    await page.locator("#si-email").fill("Pilot@example.com");
    await page.getByRole("button", { name: "Still need help? Email support" }).click();
    await expect(page.locator("#si-desc")).toBeFocused();
    await page.locator("#si-desc").fill("Synthetic QA request; no delivery.");
    await page.locator("#si-cat").selectOption("access");
    await page.locator("#si-sev").selectOption("general");
    await page.getByRole("button", { name: "Send Request", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Verify your email" })).toBeFocused();
    await page.getByLabel("Verification code", { exact: true }).fill("ABCD-EFGH-JKLM");
    await page.getByRole("button", { name: "Verify code", exact: true }).click();
    await expect(page.locator("#si-verification-error")).toContainText("did not match");
    await page.getByLabel("Verification code", { exact: true }).fill("ABCD-EFGH-JKLN");
    await page.getByRole("button", { name: "Verify code", exact: true }).click();
    await expect(page.getByText("Support request verified.", { exact: true })).toBeVisible();
    await expect(page.getByText("Your request is ready for the support team. We will continue by email.")).toBeVisible();
    expect(submissions).toBe(1);
    expect(verifications).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
