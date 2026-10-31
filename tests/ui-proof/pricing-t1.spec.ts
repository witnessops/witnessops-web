import { expect, test } from "@playwright/test";
import { PUBLIC_AGENT_ACTION_OFFER } from "../../apps/witnessops-web/src/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "../../apps/witnessops-web/src/lib/public-paid-reviews";

for (const width of [390, 1440]) {
  test(`pricing shows only Agent Action with its current request path at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/pricing");
    expect(response?.status()).toBe(200);
    const description = `${PUBLIC_AGENT_ACTION_OFFER.name.en}: ${PUBLIC_AGENT_ACTION_OFFER.price.en}. ${PUBLIC_AGENT_ACTION_OFFER.timing.en}.`;
    await expect(page).toHaveTitle("Review Pricing | WitnessOps");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://witnessops.com/pricing");
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      await expect(page.locator(selector)).toHaveAttribute("content", description);
    }
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", "Review Pricing | WitnessOps");
    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 1 })).toHaveText("Review pricing and scope");
    await expect(main.locator("[data-pricing-review]")).toHaveCount(1);
    const agent = main.locator('[data-pricing-review="agent-action"]');
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.name.en);
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.price.en);
    await expect(agent).toContainText(PUBLIC_AGENT_ACTION_OFFER.timing.en);
    await expect(main).not.toContainText(/External Attack Surface Review|One Server Security Check|Early Bird|Internet Footprint Review|AI Agent Tools & Access Review/i);
    const agentCta = agent.getByRole("link", { name: "Request an agent review", exact: true });
    expect(await agentCta.evaluate(el => parseFloat(getComputedStyle(el).borderTopWidth))).toBeGreaterThanOrEqual(1);
    expect(await agentCta.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    expect((await agentCta.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await agentCta.click();
    await expect(page).toHaveURL(/\/review\/request\?/);
    const requestUrl = new URL(page.url());
    expect(requestUrl.pathname).toBe("/review/request");
    expect(requestUrl.searchParams.get("offerId")).toBe(PUBLIC_AGENT_ACTION_REVIEW_ID);
    expect(requestUrl.searchParams.get("productId")).toBeNull();
    await expect(page.locator("main")).toContainText(PUBLIC_AGENT_ACTION_OFFER.name.en);
    await expect(page.locator("#enquiryPath")).toHaveCount(0);
  });
}

test("catalogue and withdrawn routes preserve their current dispositions", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page).toHaveURL(/\/reviews$/);
  await expect(page.locator("[data-buyer-service]")).toHaveCount(1);
  for (const route of ["/catalog/workflows", "/catalog/offsec-local-audit"]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(410);
    await expect(page.locator("main h1").first()).toHaveText("This offer has been withdrawn");
    await expect(page.locator("main form")).toHaveCount(0);
  }
  const external = await page.goto("/catalog/offsec-external-exposure");
  expect(external?.status()).toBe(200);
  await expect(page).toHaveURL(/\/reviews\/external-attack-surface-review$/);
  await expect(page.locator("main h1").first()).toContainText("no longer available");
});

test("new-sales request accepts Agent Action and rejects parked or historical IDs", async ({ page }) => {
  await page.goto(`/review/request?offerId=${PUBLIC_AGENT_ACTION_REVIEW_ID}`);
  await expect(page.locator("main")).toContainText(PUBLIC_AGENT_ACTION_OFFER.name.en);
  await expect(page.locator("main form")).toHaveCount(1);
  await expect(page.locator("#enquiryPath")).toHaveCount(0);

  for (const [query, reason] of [
    ["productId=OFFSEC-EXTERNAL-EXPOSURE", "parked"],
    ["offerId=agent-tools-access-review", "historical"],
  ] as const) {
    await page.goto(`/review/request?${query}`);
    await expect(page.locator(`main[data-intake-rejection="${reason}"]`)).toBeVisible();
    await expect(page.locator("main form")).toHaveCount(0);
  }
});

test("published English FAQ keeps free signup and one-review boundaries", async ({ page }) => {
  await page.goto("/docs/faq");
  const main = page.locator("main");
  await expect(main).toContainText("Creating an account is free. No card or subscription is required. The pricing page lists the current one-off review. Signup does not grant a paid app plan.");
  await expect(main).toContainText("The former agent-tools-access-review identity is historical.");
  await expect(main).toContainText("Its /catalog/workflows URL now shows a withdrawal notice and cannot start a new request.");
  await expect(main.locator('a[href="/catalog/workflows"]')).toHaveCount(0);
});
