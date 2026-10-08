import { expect, test } from "@playwright/test";
import { PUBLIC_AGENT_ACTION_OFFER, EXTERNAL_ATTACK_SURFACE_OFFER } from "../../apps/witnessops-web/src/lib/commercial-truth";
import { buyerPublicOfferRequestHref, buyerOfferRequestHref } from "../../apps/witnessops-web/src/lib/buyer-services";

for (const width of [390, 1440]) {
  test(`Homepage A two-review hierarchy, evidence limits and CTAs at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    expect((await page.goto("/"))?.status()).toBe(200);
    const main = page.locator('main[data-home-direction="two-offer-v1"]');
    const hero = main.locator('[data-ui-proof-id="homepage-hero"]');
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Understand what your agents can do and what your systems expose.");
    const primary = hero.locator('[data-ui-proof-id="homepage-hero-primary-cta"]');
    const secondary = hero.locator('[data-ui-proof-id="homepage-external-cta"]');
    await expect(primary).toHaveAttribute("href", buyerPublicOfferRequestHref("en", PUBLIC_AGENT_ACTION_OFFER.id));
    await expect(secondary).toHaveAttribute("href", buyerOfferRequestHref("en", EXTERNAL_ATTACK_SURFACE_OFFER.productId));
    for (const link of [primary, secondary]) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await primary.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    const cards = main.locator("[data-home-offer]");
    await expect(cards).toHaveCount(2);
    const agent = main.locator('[data-home-offer="agent-action-security"]');
    const external = main.locator('[data-home-offer="external-exposure"]');
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.name.en);
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.price.en);
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.timing.en);
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.name.en);
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.price.en);
    await expect(external).toContainText("Not a penetration test");
    await expect(main.locator('a[href="/check"]')).toHaveCount(1);
    await expect(main).toContainText("Not a review.");
    await expect(main).toContainText("Historical synthetic one-action example");
    await expect(main).toContainText("Historical synthetic action example, not customer evidence");
    await expect(main.locator('[data-agent-action-specimen]')).toHaveCount(0);
    await expect(main.locator("#enquiry form")).toHaveCount(0);
    await expect(main.locator("#enquiry")).toContainText("non-secret description");
    await expect(main).not.toContainText(/Early Bird|Internet Footprint Review|Private Pilot|€950|€500|Starting at €2,500|AI Agent Tools & Access Review/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`home-${width}.png`), fullPage: true });
    await primary.click();
    await expect(page.locator('main[data-request-selection="agent-action-security-review"]')).toBeVisible();
    await expect(page.locator("main form")).toHaveCount(1);
    await page.goto("/");
    await secondary.click();
    await expect(page.locator('main[data-request-selection="external-exposure-assessment"]')).toBeVisible();
    await expect(page.locator("main form")).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
