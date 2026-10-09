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
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Proof other people can check.");
    await expect(hero).toContainText("WitnessOps reviews AI agents and internet-facing systems, with written findings, supporting evidence and clear limits.");
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
    await expect(agent).toContainText("What can your AI agent actually do in production?");
    await expect(agent).toContainText("Review one action’s permissions, approvals and execution evidence. Receive an action map, findings with sources, prioritised recommendations, explicit unknowns and a readout.");
    await expect(agent).toContainText("€2,500 fixed · excluding VAT");
    await expect(agent.getByRole("link", { name: "Scope an AI review" })).toHaveAttribute("href", buyerPublicOfferRequestHref("en", PUBLIC_AGENT_ACTION_REVIEW_ID));
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.name.en);
    await expect(external).toContainText("What can the internet see that you didn’t mean to expose?");
    await expect(external).toContainText("Review one authorised internet-facing system. Receive an external attack-surface map, findings with supporting evidence, remediation priorities and one focused retest.");
    await expect(external).toContainText("€1,900 fixed · excluding VAT");
    await expect(external).toContainText("Low-impact, unauthenticated checks within the agreed scope. This is not a penetration test. One focused retest of reported findings is included within 30 calendar days of initial report handover.");
    await expect(external.getByRole("link", { name: "Scope an external review" })).toHaveAttribute("href", buyerOfferRequestHref("en", EXTERNAL_ATTACK_SURFACE_OFFER.productId));
    await expect(page.locator("[data-home-offer]")).not.toContainText(/10 working days|3 working days|€550|550 €/);
    for (const offer of [agent, external]) {
      await expect(offer).not.toContainText("Internet Footprint");
      await expect(offer).not.toContainText("AI Agent Tools & Access Review");
      await expect(offer).not.toContainText("One Server Security Check");
    }
    const free = page.getByRole("complementary", { name: "Free check — not a review" });
    await expect(free).toContainText("Not a review.");
    await expect(free.getByRole("link")).toHaveAttribute("href", "/check");
    expect(await free.evaluate(el => getComputedStyle(el).borderTopStyle)).toBe("dashed");
    const specimen = page.locator("[data-agent-action-specimen]");
    await expect(specimen.getByRole("heading", { level: 2, name: "Evidence survives the dashboard." })).toBeVisible();
    await expect(specimen).toContainText("Historical synthetic one-action example");
    await expect(specimen).toContainText("Illustrative · shape only");
    await expect(specimen).toContainText("Designed, not executed");
    await expect(specimen.locator("dt")).toHaveText(["Consequential action", "Executing identity", "Permission / authority boundary", "Supporting evidence", "Finding", "Explicit unknowns"]);
    await expect(specimen.locator('[data-finding-slot="unfilled"]')).toContainText("This specimen carries no finding.");
    await expect(specimen).toContainText("No customer, execution, verification, authorisation failure or result is shown.");
    await expect(page.locator("main")).not.toContainText(/FIRST 10|No\. 0042|free while in Early Access|€49|€149/);
    await expect(hero).not.toContainText(/One Server Security Check|External Attack Surface Review/);
    await expect(page.locator("[data-homepage-contact]")).toHaveText("Discuss a review: engage@mail.witnessops.com");
    await expect(page.locator('[data-homepage-contact] a')).toHaveAttribute("href", "mailto:engage@mail.witnessops.com");
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
