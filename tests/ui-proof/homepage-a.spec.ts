import { expect, test } from "@playwright/test";
import { PRIMARY_OFFER, INTERNET_FOOTPRINT_REVIEW_OFFER } from "../../apps/witnessops-web/src/lib/commercial-truth";
import { buyerPublicOfferRequestHref } from "../../apps/witnessops-web/src/lib/buyer-services";

for (const width of [390, 1440]) {
  test(`Homepage A hierarchy and honest specimen at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    expect((await page.goto("/"))?.status()).toBe(200);
    const hero = page.locator('[data-ui-proof-id="homepage-hero"]');
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Agents act. WitnessOps reviews what yours are permitted to do.");
    await expect(hero).toContainText("AI agents can send, buy, write, delete and call other systems.");
    const primary = hero.getByRole("link", { name: "Scope an agent review" });
    const secondary = hero.locator('[data-ui-proof-id="homepage-footprint-cta"]');
    await expect(primary).toHaveAttribute("href", buyerPublicOfferRequestHref("en", PRIMARY_OFFER.id));
    await expect(secondary).toHaveAttribute("href", "/review/request");
    await expect(secondary).toContainText("€500 footprint review");
    for (const control of [primary, secondary]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    }
    expect(await primary.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    expect(await secondary.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    await expect(page.locator("[data-home-offer]")).toHaveCount(2);
    const agent = page.locator('[data-home-offer="agent-action"]');
    const footprint = page.locator('[data-home-offer="footprint"]');
    await expect(agent).toContainText(PRIMARY_OFFER.name.en);
    await expect(agent).toContainText(PRIMARY_OFFER.price.en);
    await expect(agent).toContainText(PRIMARY_OFFER.timing.en);
    await expect(footprint).toContainText(INTERNET_FOOTPRINT_REVIEW_OFFER.name.en);
    await expect(footprint).toContainText(INTERNET_FOOTPRINT_REVIEW_OFFER.price.en);
    await expect(footprint).not.toContainText(/working days|response time|delivery time/i);
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
    await expect(page.locator("[data-home-offer]")).not.toContainText(["One Server Security Check", "External Attack Surface Review"]);
    await expect(page.locator("main")).toContainText("Monitor continuously");
    await expect(page.locator("main")).toContainText("Replace a penetration test");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`home-${width}.png`), fullPage: true });
    await primary.click();
    await expect(page).toHaveURL(new RegExp("/review/request\\?offerId=" + PRIMARY_OFFER.id));
    await page.goto("/");
    await page.getByRole("link", { name: "Explore the full catalogue", exact: true }).click();
    await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.locator("main")).toContainText("One Server Security Check");
    await expect(page.locator("main")).toContainText("External Attack Surface Review");
    expect(errors).toEqual([]);
  });
}
