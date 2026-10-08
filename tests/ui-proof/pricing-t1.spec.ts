import { expect, test } from "@playwright/test";
import { EXTERNAL_ATTACK_SURFACE_OFFER, INTERNET_FOOTPRINT_REVIEW_OFFER, PRIMARY_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "../../apps/witnessops-web/src/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "../../apps/witnessops-web/src/lib/public-paid-reviews";

for (const width of [390, 1440]) {
  test(`pricing shows only Agent Action and external with valid enquiry paths at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pricing");
    const description = `Compare ${PUBLIC_AGENT_ACTION_OFFER.name.en} and ${EXTERNAL_ATTACK_SURFACE_OFFER.name.en}. See their scope, evidence, prices and start conditions before requesting a review.`;
    await expect(page).toHaveTitle("Review Pricing | WitnessOps");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://witnessops.com/pricing");
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      await expect(page.locator(selector)).toHaveAttribute("content", description);
    }
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", "Review Pricing | WitnessOps");
    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText("Review pricing and scope");
    await expect(main.locator("[data-pricing-review]")).toHaveCount(2);
    const external = main.locator('[data-pricing-review="external-exposure"]');
    const agent = main.locator('[data-pricing-review="agent-action"]');
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.name.en);
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.price.en);
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.timing.en);
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.name.en);
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.price.en);
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.timing.en);
    await expect(main).not.toContainText(/€0|€49|€149|FIRST 10|No\. 0042|free while in Early Access|One Server Security Check|Early Bird|Internet Footprint Review|AI Agent Tools & Access Review/i);
    const externalCta = external.getByRole("link", { name: "Scope an external review", exact: true });
    const agentCta = agent.getByRole("link", { name: "Scope an AI review", exact: true });
    for (const cta of [agentCta, externalCta]) {
      expect(await cta.evaluate(el => parseFloat(getComputedStyle(el).borderTopWidth))).toBeGreaterThanOrEqual(1);
      expect(await cta.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
      expect((await cta.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`pricing-${width}.png`), fullPage: true });
    await externalCta.click();
    expect(new URL(page.url()).searchParams.get("productId")).toBe("OFFSEC-EXTERNAL-EXPOSURE");
    await expect(page.locator("main")).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.name.en);
    await page.goto("/pricing");
    await page.getByRole("link", { name: "Scope an AI review", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/review/request\\?offerId=${PUBLIC_AGENT_ACTION_REVIEW_ID}&`));
    expect(new URL(page.url()).searchParams.get("offerId")).toBe(PUBLIC_AGENT_ACTION_REVIEW_ID);
    await expect(page.locator("main")).toContainText(PUBLIC_AGENT_ACTION_OFFER.name.en);
  });
}

test("discovery changes preserve old direct routes without promoting them in the catalogue", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("link", { name: "Compare scopes and prices" }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.locator("[data-buyer-service]")).toHaveCount(2);
  for (const route of ["/catalog/offsec-local-audit", "/catalog/offsec-external-exposure", "/catalog/professional-public-footprint-audit", PRIMARY_OFFER.route]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
});

// Compatibility evidence for this discovery-only stage, NOT final new-sales acceptance.
// The separate intake stage must retire new legacy selection without breaking historical confirmations.
test("legacy direct enquiry compatibility is unchanged by the discovery-only patch", async ({ page }) => {
  let scope = "";
  await page.route("**/api/review/request", async route => {
    scope = (route.request().postDataJSON() as { scope: string }).scope;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ issuanceId: "iss_early_bird", email: "buyer@example.com", expiresAt: "2026-09-27T22:00:00.000Z" }) });
  });
  await page.goto("/review/request");
  await expect(page.locator("#enquiryPath")).toHaveValue("Free check");
  await expect(page.locator("#enquiryPath option")).toHaveCount(5);
  await page.goto("/review/request?enquiryPath=early-bird");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#enquiryPath")).toHaveValue(INTERNET_FOOTPRINT_REVIEW_OFFER.name.en);
  await page.locator("#name").fill("Synthetic Buyer");
  await page.locator("#email").fill("buyer@example.com");
  await page.locator("#workflow").fill("Please review the public footprint of our authorised domain.");
  await page.locator('main form button[type="submit"]').click();
  await expect.poll(() => scope).toContain(`Enquiry path: ${INTERNET_FOOTPRINT_REVIEW_OFFER.name.en}`);
});

test("published English FAQ keeps free-signup boundaries and current pricing guidance", async ({ page }) => {
  await page.goto("/docs/faq");
  const main = page.locator("main");
  await expect(main).toContainText("Creating an account is free. No card or subscription is required. The pricing page now lists the published one-off review offers. Signup does not grant a paid app plan.");
  await expect(main).not.toContainText("Paid app plans on the pricing page are illustrative");
});
