import { expect, test } from "@playwright/test";
import { PUBLIC_AGENT_ACTION_OFFER } from "../../apps/witnessops-web/src/lib/commercial-truth";
import { buyerPublicOfferRequestHref } from "../../apps/witnessops-web/src/lib/buyer-services";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "../../apps/witnessops-web/src/lib/public-paid-reviews";

// Homepage cut for a 5-second read (Design 2026-11-13): five sections, one CTA,
// the example record lives on the review page.
for (const [width, height] of [[390, 844], [1440, 900]] as const) {
  test(`Homepage A five-section hierarchy at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    expect((await page.goto("/"))?.status()).toBe(200);
    const hero = page.locator('[data-ui-proof-id="homepage-hero"]');
    await expect(hero.getByRole("heading", { level: 1 })).toHaveAccessibleName("We try to break your AI agent before someone else does.");
    await expect(hero).toContainText("For teams launching an AI agent that can refund, change records or grant access. We attack one action and show you what got through");
    const primary = hero.getByRole("link", { name: "Request a break test" });
    await expect(primary).toHaveCount(1);
    await expect(primary).toHaveAttribute("href", buyerPublicOfferRequestHref("en", PUBLIC_AGENT_ACTION_REVIEW_ID));
    const box = await primary.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    expect(await primary.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    await expect(hero.locator("[data-home-fee]")).toHaveText("Fixed fee, agreed in a signed SOW before we start.");
    await expect(page.locator("[data-home-offer]")).toHaveCount(0);
    await expect(page.locator("[data-agent-action-specimen]")).toHaveCount(0);
    await expect(page.locator("main section")).toHaveCount(5);
    await expect(page.locator("main")).not.toContainText(/10 working days|3 working days|€|EUR|PLN|2,500|Request an external review|One Server Security Check/);
    await expect(page.locator("main")).not.toContainText(/FIRST 10|No\. 0042|free while in Early Access/);
    expect((await page.locator("body").innerText()).split("We don't test until you give written authority").length - 1).toBe(1);
    await expect(page.locator("main")).toContainText("Not a full pentest, certification, fixing or monitoring.");
    await expect(page.locator("[data-homepage-contact]")).toHaveText("Discuss a review: engage@mail.witnessops.com");
    const mail = page.locator("[data-homepage-contact] a");
    await expect(mail).toHaveAttribute("href", "mailto:engage@mail.witnessops.com");
    for (const target of [mail, hero.getByRole("link", { name: "See an example record" }), page.getByRole("link", { name: "See the full scope" })]) {
      expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByRole("button", { name: "Ask Sovereign", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`home-${width}.png`), fullPage: true });
    await primary.click();
    await expect(page).toHaveURL(new RegExp("/review/request\\?offerId=" + PUBLIC_AGENT_ACTION_REVIEW_ID));
    await page.goto("/");
    await page.getByRole("link", { name: "See an example record", exact: true }).click();
    await expect(page).toHaveURL(/\/reviews\/agent-action-security-review#example-record$/);
    const specimen = page.locator("#example-record[data-agent-action-specimen]");
    await expect(specimen.getByRole("heading", { level: 2, name: "What the record looks like." })).toBeVisible();
    await expect(specimen.locator("dt")).toHaveText(["Consequential action", "Executing identity", "Permission / authority boundary", "Supporting evidence", "Finding", "Explicit unknowns"]);
    await expect(specimen.locator('[data-finding-slot="unfilled"]')).toContainText("This specimen carries no finding.");
    await expect(page.locator("main")).toContainText(PUBLIC_AGENT_ACTION_OFFER.name.en);
    await expect(page.locator("main")).not.toContainText("Request an external review");
    expect(errors).toEqual([]);
  });
}

test("retired /pricing and /reviews permanently redirect to the agent review", async ({ request }) => {
  for (const from of ["/pricing", "/reviews"]) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    expect(response.headers().location, from).toMatch(/\/reviews\/agent-action-security-review$/);
  }
});
