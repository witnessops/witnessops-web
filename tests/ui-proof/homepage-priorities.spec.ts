import { expect, test } from "@playwright/test";
import { HOMEPAGE_CUT_COPY } from "../../apps/witnessops-web/src/components/marketing/homepage-cut-copy";
import { expectMenusOmitRetiredEntries } from "./free-tool-entry";

// Homepage cut for a 5-second read (Design 2026-11-13): one offer, one CTA,
// no Ask Sovereign widget, and the free check, Early access and Docs only by URL.
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
    await expect(hero.getByRole("heading", { level: 1 })).toHaveAccessibleName("We try to break your AI agent before someone else does.");
    await expect(page.locator("[data-home-offer]")).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Free check — not a review" })).toHaveCount(0);
    await expectMenusOmitRetiredEntries(page);
    await expect(page.locator("[data-agent-action-specimen]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ask WitnessOps" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ask Sovereign", exact: true })).toHaveCount(0);
    await page.screenshot({ path: `artifacts/ui-proof/priorities/hero-${viewport.width}.png` });
    const primary = hero.getByRole("link", { name: "Request a break test", exact: true });
    await expect(primary).toHaveAttribute("href", /\/review\/request\?offerId=agent-action-security-review/);
    if (viewport.width >= 360) {
      // Fold check at the phone sizes the spec names; 320px is legacy-only.
      const box = await primary.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
    await expect(hero.getByRole("link", { name: "Request an external review", exact: true })).toHaveCount(0);

    const enquiry = page.locator("#enquiry");
    await enquiry.scrollIntoViewIfNeeded();
    await expect(enquiry.getByRole("button", { name: "Request a break test" })).toBeVisible();
    await expect(enquiry).toContainText("We'll ask you to confirm your email, then reply about fit.");
    await page.screenshot({ path: `artifacts/ui-proof/priorities/enquiry-${viewport.width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    // Pages dropped from the menus stay published.
    for (const kept of ["/docs", "/check", "/early-access", "/docs/assistant"]) {
      expect((await page.request.get(kept)).status(), kept).toBe(200);
    }
  });
}

test("Polish homepage carries the same five sections and keeps docs reachable by URL", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl");
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    await expect(page.locator(selector)).toHaveAttribute("content", /Próbujemy przełamać Twojego agenta AI/);
    await expect(page.locator(selector)).not.toHaveAttribute("content", /co ujawniają Twoje systemy/);
  }
  await expect(page.locator('[data-ui-proof-id="homepage-hero-body"]')).toContainText(HOMEPAGE_CUT_COPY.pl.sub);
  const hero = page.locator('[data-ui-proof-id="homepage-hero"]');
  await expect(hero).toContainText("Agent Action Security Review");
  await expect(hero).toContainText("Stała opłata, uzgadniana w podpisanym SOW przed rozpoczęciem.");
  await expect(hero.getByRole("link", { name: "Poproś o test przełamania", exact: true })).toHaveAttribute("href", /\/pl\/review\/request\?offerId=agent-action-security-review/);
  await expect(page.locator("#enquiry form")).toBeVisible();
  await expect(page.locator("[data-home-offer]")).toHaveCount(0);
  await expect(page.locator("main")).toContainText("Nie testujemy bez Twojej pisemnej zgody.");
  await expect(page.locator("main")).not.toContainText(/10 dni roboczych|3 dni roboczych|10 working days|3 working days|€|EUR|PLN/);
  // Footer bundle B (Design 2026-11-13): About became Docs, labelled Dokumentacja (pending native review).
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Dokumentacja", exact: true })).toHaveAttribute("href", "/docs");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect((await page.request.get("/pl/docs")).status()).toBe(200);
});
