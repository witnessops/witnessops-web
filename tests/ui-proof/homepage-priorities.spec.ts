import { expect, test } from "@playwright/test";
import { expectFreeToolEntryPoint, openResourcesPanel } from "./free-tool-entry";

for (const viewport of [
  { width: 1159, height: 776 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 720, height: 800 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
]) {
  test(`homepage clarity and Ask placement at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/ask-witnessops", route => route.fulfill({ status: 204 }));
    await page.goto("/");
    const hero = page.locator('[data-ui-proof-id="homepage-hero"]');
    const trigger = page.getByRole("button", { name: "Ask WitnessOps" });
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText("Understand the controls before your AI agent acts.");
    await expect(page.locator("[data-home-offer]")).toHaveCount(1);
    await expect(page.getByRole("complementary", { name: "Free check — not a review" })).toHaveCount(0);
    await expectFreeToolEntryPoint(page);
    await expect(page.locator("[data-agent-action-specimen]")).toContainText("Illustrative · shape only");
    await expect(page.locator('[data-finding-slot="unfilled"]')).toContainText("This specimen carries no finding.");
    await expect(trigger).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ask Sovereign", exact: true })).toHaveCount(0);
    await page.screenshot({ path: `artifacts/ui-proof/priorities/hero-${viewport.width}.png` });
    const sampleLink = hero.getByRole("link", { name: "Request an agent review", exact: true });
    await expect(sampleLink).toHaveAttribute("href", /\/review\/request\?offerId=agent-action-security-review/);
    await expect(hero.getByRole("link", { name: "Request an external review", exact: true })).toHaveCount(0);

    const enquiry = page.locator("#enquiry");
    await enquiry.scrollIntoViewIfNeeded();
    await expect(enquiry.getByRole("button", { name: "Request an agent review" })).toBeVisible();
    await expect(enquiry).toContainText("confirm your email with a code");
    await page.screenshot({ path: `artifacts/ui-proof/priorities/enquiry-${viewport.width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    const { panel: resources } = await openResourcesPanel(page);
    const docsEntry = resources.getByRole("link", { name: /^Docs(?:$|\s)/ });
    await expect(docsEntry).toBeVisible();
    await expect(docsEntry).toHaveAttribute("href", "/docs");
    await docsEntry.click();
    await expect(page).toHaveURL(/\/docs$/);
    await expect(page.getByRole("main")).toBeVisible();
  });
}

test("Polish homepage keeps the own-system case and localized docs destination explicit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl");
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    await expect(page.locator(selector)).toHaveAttribute("content", /Poznaj mechanizmy kontroli, zanim agent AI wykona działanie/);
    await expect(page.locator(selector)).not.toHaveAttribute("content", /co ujawniają Twoje systemy/);
  }
  await expect(page.locator('[data-ui-proof-id="homepage-hero-body"]')).toContainText("Agent Action Security Review jest dla zespołów inżynierskich i partnerów wdrażających AI");
  const offers = page.locator("[data-home-offer]");
  await expect(offers).toHaveCount(1);
  for (const offer of await offers.all()) {
    await expect(offer).toContainText("Termin realizacji według podpisanego SOW");
    await expect(offer).not.toContainText(/10 dni roboczych|3 dni roboczych|10 working days|3 working days|€550|550 €/);
  }
  const docsEntry = page.getByRole("contentinfo").getByRole("link", { name: "Dokumentacja", exact: true });
  await expect(docsEntry).toBeVisible();
  await expect(docsEntry).toHaveAttribute("href", "/pl/docs");
  await expect(page.locator("article[aria-labelledby='own-system-case-heading']")).toContainText("nie realizacja dla klienta");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await docsEntry.click();
  await expect(page).toHaveURL(/\/pl\/docs$/);
  await expect(page.getByRole("main")).toBeVisible();
});
