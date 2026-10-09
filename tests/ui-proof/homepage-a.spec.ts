import { expect, test } from "@playwright/test";
import { EXTERNAL_ATTACK_SURFACE_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "../../apps/witnessops-web/src/lib/commercial-truth";
import { buyerOfferRequestHref, buyerPublicOfferRequestHref } from "../../apps/witnessops-web/src/lib/buyer-services";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "../../apps/witnessops-web/src/lib/public-paid-reviews";

for (const width of [390, 1440]) {
  test(`Homepage A hierarchy and honest specimen at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    expect((await page.goto("/"))?.status()).toBe(200);
    const hero = page.locator('[data-ui-proof-id="homepage-hero"]');
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Understand what your agents can do and what your systems expose.");
    await expect(hero).toContainText("WitnessOps provides focused security reviews for AI agents and internet-facing systems.");
    const primary = hero.getByRole("link", { name: "Scope an AI review" });
    const secondary = hero.locator('[data-ui-proof-id="homepage-external-cta"]');
    await expect(primary).toHaveAttribute("href", buyerPublicOfferRequestHref("en", PUBLIC_AGENT_ACTION_REVIEW_ID));
    await expect(secondary).toHaveAttribute("href", buyerOfferRequestHref("en", EXTERNAL_ATTACK_SURFACE_OFFER.productId));
    await expect(secondary).toContainText("Scope an external review");
    for (const control of [primary, secondary]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    }
    expect(await primary.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    expect(await secondary.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    await expect(page.locator("[data-home-offer]")).toHaveCount(2);
    const agent = page.locator(`[data-home-offer="${PUBLIC_AGENT_ACTION_REVIEW_ID}"]`);
    const external = page.locator('[data-home-offer="external-exposure-assessment"]');
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.name.en);
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.price.en);
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.timing.en);
    await expect(agent).toContainText("Know what your AI agent can reach—before you rely on it.");
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.name.en);
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.price.en);
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.timing.en);
    await expect(page.locator("[data-home-offer]")).not.toContainText(/10 working days|3 working days|€550|550 €/);
    await expect(external).toContainText("See what your internet-facing system exposes—and what needs attention.");
    await expect(page.locator("[data-home-offer]")).not.toContainText("Internet Footprint");
    await expect(page.locator("[data-home-offer]")).not.toContainText("AI Agent Tools & Access Review");
    const free = page.getByRole("complementary", { name: "Free check — not a review" });
    await expect(free).toContainText("Not a review.");
    await expect(free.getByRole("link")).toHaveAttribute("href", "/check");
    expect(await free.evaluate(el => getComputedStyle(el).borderTopStyle)).toBe("dashed");
    const specimen = page.locator("[data-agent-action-specimen]");
    await expect(specimen).toContainText("Illustrative · shape only");
    await expect(specimen).toContainText("Designed, not executed");
    await expect(specimen.locator("dt")).toHaveText(["Consequential action", "Executing identity", "Permission / authority boundary", "Supporting evidence", "Finding", "Explicit unknowns"]);
    await expect(specimen.locator('[data-finding-slot="unfilled"]')).toContainText("This specimen carries no finding.");
    await expect(specimen).toContainText("No customer, execution, verification, authorisation failure or result is shown.");
    await expect(page.locator("main")).not.toContainText(/FIRST 10|No\. 0042|free while in Early Access|€49|€149/);
    await expect(hero).not.toContainText(/One Server Security Check|External Attack Surface Review/);
    await expect(page.locator("[data-home-offer]")).not.toContainText("One Server Security Check");
    await expect(page.locator("main")).toContainText("Monitor continuously");
    await expect(page.locator("main")).toContainText("Replace a penetration test");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`home-${width}.png`), fullPage: true });
    await primary.click();
    await expect(page).toHaveURL(new RegExp("/review/request\\?offerId=" + PUBLIC_AGENT_ACTION_REVIEW_ID));
    await page.goto("/");
    await page.getByRole("link", { name: "Compare these two reviews", exact: true }).click();
    await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.locator("main")).toContainText(PUBLIC_AGENT_ACTION_OFFER.name.en);
    await expect(page.locator("main")).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.name.en);
    await expect(page.locator("main")).not.toContainText("One Server Security Check");
    expect(errors).toEqual([]);
  });
}
