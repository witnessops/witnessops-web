import { expect, test } from "@playwright/test";
import { buyerServiceById } from "../../apps/witnessops-web/src/lib/buyer-services";

const scenarios = [
  { path: "/catalog", width: 1440, height: 1100 },
  { path: "/catalog", width: 768, height: 1024 },
  { path: "/catalog", width: 390, height: 844 },
  { path: "/catalog", width: 320, height: 740 },
  { path: "/pl/catalog", width: 1440, height: 1100 },
  { path: "/pl/catalog", width: 768, height: 1024 },
  { path: "/pl/catalog", width: 390, height: 844 },
  { path: "/pl/catalog", width: 320, height: 740 },
] as const;

const expectedServiceOrder = ["agent-tools-access-review", "external-exposure-assessment"] as const;

test("two-review catalogue routes remain responsive and usable", async ({ browser }) => {
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height } });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(scenario.path, { waitUntil: "networkidle" });
    expect(response?.status(), `${scenario.path} should return 200`).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();
    const serviceCards = page.locator("[data-buyer-service]");
    await expect(serviceCards).toHaveCount(2);
    const firstCardVisuals = await serviceCards.first().evaluate((card) => {
      const style = getComputedStyle(card);
      const primaryCta = card.querySelector<HTMLElement>("a");
      const primaryCtaStyle = primaryCta ? getComputedStyle(primaryCta) : null;
      return {
        background: style.backgroundColor,
        color: style.color,
        tokens: {
          background: style.getPropertyValue("--color-surface-bg").trim().toLowerCase(),
          card: style.getPropertyValue("--color-surface-card").trim().toLowerCase(),
          primary: style.getPropertyValue("--color-text-primary").trim().toLowerCase(),
          accent: style.getPropertyValue("--color-brand-accent").trim().toLowerCase(),
          inverse: style.getPropertyValue("--color-text-inverse").trim().toLowerCase(),
        },
        primaryCtaBackground: primaryCtaStyle?.backgroundColor ?? null,
        primaryCtaColor: primaryCtaStyle?.color ?? null,
      };
    });
    expect(firstCardVisuals.background).toBe("rgb(18, 19, 16)");
    expect(firstCardVisuals.color).toBe("rgb(245, 241, 232)");
    expect(firstCardVisuals.tokens).toEqual({ background: "#0b0c0b", card: "#121310", primary: "#f5f1e8", accent: "#b89b62", inverse: "#151510" });
    expect(firstCardVisuals.primaryCtaBackground).toBe("rgb(245, 241, 232)");
    expect(firstCardVisuals.primaryCtaColor).toBe("rgb(21, 21, 16)");
    expect(await serviceCards.evaluateAll((cards) => cards.map((card) => card.getAttribute("data-buyer-service")))).toEqual(expectedServiceOrder);
    expect(await serviceCards.evaluateAll((cards) => cards.map((card) => ({ price: card.getAttribute("data-price-contract"), timing: card.getAttribute("data-timing-contract") })))).toEqual(expectedServiceOrder.map(id => ({ price: buyerServiceById(id).commercialContract.price, timing: buyerServiceById(id).commercialContract.timing })));
    if (scenario.width >= 768) {
      const geometry = await serviceCards.last().evaluate(card => ({ card: card.getBoundingClientRect().width, grid: card.parentElement!.getBoundingClientRect().width }));
      expect(Math.abs(geometry.grid - geometry.card)).toBeLessThanOrEqual(2);
    }
    const polish = scenario.path.startsWith("/pl");
    const primaryOfferCard = serviceCards.first();
    await expect(primaryOfferCard).toContainText(polish ? "Przegląd narzędzi i dostępu agenta AI" : "AI Agent Tools & Access Review");
    await expect(primaryOfferCard).toContainText(polish ? "Od €2 500 · bez VAT" : "Starting at €2,500 · excluding VAT");
    await expect(primaryOfferCard).toContainText(polish ? "Cel: 10 dni roboczych po potwierdzeniu zakresu" : "Target: 10 working days after accepted scope, authority, payment, handling and required inputs are confirmed");
    await expect(primaryOfferCard).not.toContainText("Agent Risk & Control Review");
    await expect(primaryOfferCard).not.toContainText("From €1,500");

    const publicExposureCard = page.locator('[data-buyer-service="external-exposure-assessment"]');
    await expect(publicExposureCard).toContainText("External Attack Surface Review");
    await expect(publicExposureCard).toContainText(polish ? "€1 900 · bez VAT" : "€1,900 · excluding VAT");
    await expect(publicExposureCard).toContainText(polish ? "W ciągu 3 dni roboczych" : "Within 3 working days");
    await expect(page.locator("main")).not.toContainText(/Pilot|Pilotaż|Access Removal|Internet Footprint Review|Early Bird|€500/);

    for (const [index, id] of expectedServiceOrder.entries()) {
      const card = serviceCards.nth(index);
      const links = card.locator("a");
      const primary = links.first();
      const primaryHref = await primary.getAttribute("href");
      const requestPath = polish ? "/pl/review/request" : "/review/request";
      const request = new URL(primaryHref ?? "", "http://witnessops.test");
      expect(request.pathname).toBe(requestPath);
      if (id === "external-exposure-assessment") {
        expect(request.searchParams.get("productId")).toBe("OFFSEC-EXTERNAL-EXPOSURE");
        expect(request.searchParams.has("offerId")).toBe(false);
        await expect(primary).toHaveText(polish ? "Omów przegląd ekspozycji" : "Scope an external review");
        await expect(links).toHaveCount(3);
        await expect(links.nth(2)).toHaveAttribute("href", "/review/sample-cases/external-exposure-assessment");
      } else {
        expect(request.searchParams.get("offerId")).toBe("agent-tools-access-review");
        expect(request.searchParams.has("productId")).toBe(false);
        expect(request.searchParams.get("offer")).toBe(polish ? "Przegląd narzędzi i dostępu agenta AI" : "AI Agent Tools & Access Review");
        await expect(primary).toHaveText(polish ? "Omów przegląd agenta AI" : "Scope an AI review");
        await expect(links).toHaveCount(2);
        await expect(links.nth(1)).toHaveAttribute("href", "/catalog/workflows");
      }
    }
    await expect(page.locator('[data-one-pager], main a[href$=".pdf"]')).toHaveCount(0);
    await expect(page.locator('[data-buyer-service="professional-public-footprint-audit"], [data-buyer-service="one-server-security-check"], [data-buyer-service="automation-repair-handover"], [data-buyer-service="customer-security-review-sprint"]')).toHaveCount(0);
    await expect(page.locator('a[href*="buy.stripe.com"], a[href*="checkout.stripe.com"]')).toHaveCount(0);

    const viewport = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth, `${scenario.path} should not overflow`).toBeLessThanOrEqual(viewport.clientWidth + 1);
    const articleLinks = page.locator("main article a");
    expect(await articleLinks.count()).toBeGreaterThan(0);
    for (let index = 0; index < (await articleLinks.count()); index += 1) {
      const link = articleLinks.nth(index);
      const box = await link.boundingBox();
      expect(box?.height, `${scenario.path} article CTA ${index} height`).toBeGreaterThanOrEqual(44);
      expect((await link.textContent())?.trim().length ?? 0).toBeGreaterThan(0);
      await link.focus();
      const hasVisibleFocus = await link.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return style.outlineStyle !== "none" || style.boxShadow !== "none";
      });
      expect(hasVisibleFocus, `${scenario.path} article CTA ${index} focus indicator`).toBe(true);
    }
    const clippedCards = await page.locator("main article").evaluateAll((articles) => articles.filter((article) => {
      const box = article.getBoundingClientRect();
      return box.left < -1 || box.right > document.documentElement.clientWidth + 1;
    }).length);
    expect(clippedCards, `${scenario.path} should not clip offer cards`).toBe(0);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    await context.close();
  }
});

test("External Attack Surface Review pricing entry preserves sample and intake links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/pricing", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await page.getByRole("link", { name: "Compare scopes and prices" }).click();
  await page.locator('[data-buyer-service="external-exposure-assessment"] a[href="/catalog/offsec-external-exposure"]').click();
  const card = page.locator('[data-buyer-service-detail="external-exposure-assessment"]');
  await expect(card).toContainText("€1,900 · excluding VAT");
  await expect(card).toContainText("One focused retest within 30 days is included");
  await expect(card).toContainText("Payment is due in full before the delivery clock starts");
  await expect(card).toContainText(/payment alone does not authorise testing/i);
  await expect(card).toContainText("This is not a penetration test");
  await expect(card.locator('a[href="/review/sample-cases/external-exposure-assessment"]')).toHaveText("See a sample review →");
  const fitHref = await card.getByRole("link", { name: "Request this review" }).first().getAttribute("href");
  expect(new URL(fitHref ?? "", "http://witnessops.test").searchParams.get("productId")).toBe("OFFSEC-EXTERNAL-EXPOSURE");
  await expect(page.locator('a[href*="buy.stripe.com"], a[href*="checkout.stripe.com"]')).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
