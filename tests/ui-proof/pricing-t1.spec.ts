import { expect, test } from "@playwright/test";
import { EXTERNAL_ATTACK_SURFACE_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "../../apps/witnessops-web/src/lib/commercial-truth";

for (const width of [390, 1440]) {
  test(`pricing shows only AI and external with valid enquiry paths at ${width}px`, async ({ page }) => {
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
    const agent = main.locator('[data-pricing-review="agent-action-security"]');
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.name.en);
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.price.en);
    await expect(external).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.timing.en);
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.price.en);
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.timing.en);
    await expect(main).not.toContainText(/€0|€49|€149|FIRST 10|No\. 0042|free while in Early Access|One Server Security Check|Early Bird|Internet Footprint Review/i);
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
    await expect(page).toHaveURL(/\/review\/request\?offerId=agent-action-security-review&/);
    expect(new URL(page.url()).searchParams.get("offerId")).toBe(PUBLIC_AGENT_ACTION_OFFER.id);
    await expect(page.locator("main")).toContainText(PUBLIC_AGENT_ACTION_OFFER.name.en);
  });
}

test("discovery changes preserve old direct routes without promoting them in the catalogue", async ({ page }) => {
  await page.goto("/pricing");
  await page.getByRole("link", { name: "Compare scopes and prices" }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(page.locator("[data-buyer-service]")).toHaveCount(2);
  for (const route of ["/catalog/offsec-local-audit", "/catalog/offsec-external-exposure", "/catalog/professional-public-footprint-audit", PUBLIC_AGENT_ACTION_OFFER.route]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
});

test("retired footprint URLs cannot create a new enquiry or silently select another offer", async ({ page }) => {
  let posted = false;
  await page.route("**/api/review/request", async route => {
    posted = true;
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false }) });
  });
  await page.goto("/review/request");
  await expect(page.locator('main[data-request-selection="fit"]')).toBeVisible();
  await expect(page.locator("main [data-review-choice]")).toHaveCount(2);
  await expect(page.locator("main form")).toHaveCount(0);
  await page.goto("/review/request?enquiryPath=early-bird");
  await expect(page.locator('main[data-request-selection="unavailable"]')).toBeVisible();
  await expect(page.locator("main")).toContainText("Nothing has been substituted");
  await expect(page.locator("main [data-review-choice]")).toHaveCount(2);
  await expect(page.locator("main form")).toHaveCount(0);
  expect(posted).toBe(false);
});

test("published English FAQ keeps free-signup boundaries and current pricing guidance", async ({ page }) => {
  await page.goto("/docs/faq");
  const main = page.locator("main");
  await expect(main).toContainText("Creating an account is free. No card or subscription is required. The pricing page now lists the published one-off review offers. Signup does not grant a paid app plan.");
  await expect(main).not.toContainText("Paid app plans on the pricing page are illustrative");
});

for (const locale of ["en", "pl"] as const) {
  test(`Two-Offer V1 ${locale} homepage and new-request selection`, async ({ page }) => {
    const prefix = locale === "pl" ? "/pl" : "";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(prefix || "/");
    const main = page.locator("main");
    await expect(main.locator("[data-home-offer]")).toHaveCount(2);
    await expect(main.locator('[data-home-offer="agent-action-security"]')).toContainText(locale === "pl" ? "€2 500: cena stała" : "€2,500 fixed");
    await expect(main.locator('[data-home-offer="external-exposure"]')).toContainText(locale === "pl" ? "€1 900" : "€1,900");
    await expect(main).not.toContainText(/Early Bird|Internet Footprint Review|€500|€49|€149/);
    await expect(main.locator('a[href="/check"]')).toHaveCount(1);
    await expect(main.locator("#enquiryPath")).toHaveCount(0);
    await main.locator('[data-ui-proof-id="homepage-external-cta"]').click();
    expect(new URL(page.url()).searchParams.get("productId")).toBe("OFFSEC-EXTERNAL-EXPOSURE");
    await expect(page.locator('main[data-request-selection="external-exposure-assessment"]')).toBeVisible();
    await expect(page.locator("main form")).toHaveCount(1);
    await page.goto(`${prefix}/review/request?offerId=agent-action-security-review`);
    await expect(page.locator('main[data-request-selection="agent-action-security-review"]')).toBeVisible();
    await expect(page.locator("main form")).toHaveCount(1);
    await page.goto(`${prefix}/review/request`);
    await expect(page.locator('main[data-request-selection="fit"]')).toBeVisible();
    await expect(page.locator("main [data-review-choice]")).toHaveCount(2);
    await expect(page.locator("main form")).toHaveCount(0);
    for (const query of ["enquiryPath=early-bird", "offerId=agent-tools-access-review", "offerId=bounded-workflow-review", "offerId=automation-repair-handover", "productId=OFFSEC-LOCAL-AUDIT", "offerId=agent-action-security-review&productId=OFFSEC-EXTERNAL-EXPOSURE", "offerId=agent-action-security-review&offerId=agent-action-security-review"]) {
      await page.goto(`${prefix}/review/request?${query}`);
      await expect(page.locator('main[data-request-selection="unavailable"]')).toBeVisible();
      await expect(page.locator("main form")).toHaveCount(0);
      await expect(page.locator("main [data-review-choice]")).toHaveCount(2);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
