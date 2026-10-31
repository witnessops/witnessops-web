import { expect, test, type Page } from "@playwright/test";

const withdrawnOffers = [
  "/catalog/workflows",
  "/catalog/automation-repair",
  "/catalog/professional-public-footprint-audit",
  "/pl/catalog/professional-public-footprint-audit",
  "/catalog/offsec-local-audit",
  "/catalog/offsec-launch-ready",
  "/catalog/offsec-custody-ops",
  "/catalog/offsec-incident-ready",
  "/pl/catalog/offsec-local-audit",
  "/pl/catalog/offsec-launch-ready",
  "/pl/catalog/offsec-custody-ops",
  "/pl/catalog/offsec-incident-ready",
  "/pl/catalog/automation-repair",
] as const;

const externalReviewRedirects = [
  {
    path: "/catalog/offsec-external-exposure",
    destination: "/reviews/external-attack-surface-review",
    title: "External Attack Surface Review is no longer available",
    differentService: "This is not the Agent Action Security Review.",
    reviewHref: "/reviews/agent-action-security-review",
    reviewLink: "See the Agent Action Security Review",
  },
  {
    path: "/pl/catalog/offsec-external-exposure",
    destination: "/pl/reviews/external-attack-surface-review",
    title: "External Attack Surface Review nie jest już dostępny",
    differentService: "To nie jest Agent Action Security Review.",
    reviewHref: "/pl/reviews/agent-action-security-review",
    reviewLink: "Zobacz Agent Action Security Review",
  },
] as const;

async function expectWithdrawnShell(page: Page, path: string, sample = false) {
  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response?.status(), path).toBe(410);
  await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
  const main = page.locator("main");
  const polish = path.toLowerCase().startsWith("/pl/");
  await expect(main.locator("h1")).toHaveText(
    sample
      ? (polish ? "Ten przykład został wycofany" : "This sample has been retired")
      : (polish ? "Ta oferta została wycofana" : "This offer has been withdrawn"),
  );
  const prefix = polish ? "/pl" : "";
  await expect(main.locator(`a[href="${prefix}/reviews/agent-action-security-review"]`)).toHaveCount(1);
  await expect(main.locator(`a[href="${prefix}/reviews/external-attack-surface-review"]`)).toHaveCount(0);
  await expect(main.locator('a[href*="/review/request"]')).toHaveCount(0);
  await expect(main.locator("form")).toHaveCount(0);
  if (sample) {
    await expect(main.locator('a[href="/review/sample-cases"]')).toHaveCount(1);
    await expect(main).not.toContainText(/This offer has been withdrawn|Ta oferta została wycofana/);
  }
  return main;
}

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

test("current review puts its price and fit-check CTA before long detail on narrow screens", async ({ browser }) => {
  for (const locale of ["en", "pl"] as const) {
    const path = `${locale === "pl" ? "/pl" : ""}/reviews/agent-action-security-review`;
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      const response = await page.goto(path, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      const main = page.locator('[data-buyer-service-detail="agent-action-security-review"]');
      await expect(main.locator("h1")).toHaveText("Agent Action Security Review");
      const commercial = main.getByRole("complementary");
      await expect(commercial).toContainText(locale === "en" ? "€2,500\u00a0excl.\u00a0VAT" : "€2\u00a0500\u00a0bez\u00a0VAT");
      const cta = commercial.getByRole("link");
      const target = new URL((await cta.getAttribute("href")) ?? "", "http://witnessops.test");
      expect(target.pathname).toBe(`${locale === "pl" ? "/pl" : ""}/review/request`);
      expect(target.searchParams.get("offerId")).toBe("agent-action-security-review");
      await expect(main).toContainText(locale === "en" ? "effective permissions" : "efektywne uprawnienia");
      await expect(main).toContainText(locale === "en" ? "Explicit unknowns" : "Jawne niewiadome");
      await expect(main).not.toContainText(/€1,900|separate quote|10 working days/);
      await expect(main.getByRole("link", { name: /historical synthetic|Historyczny syntetyczny/ })).toHaveAttribute("href", "/review/sample-cases/ai-agent-action-proof-run");
      if (width < 768) {
        const ctaBox = await cta.boundingBox();
        const firstDetail = await main.getByRole("heading", { name: locale === "en" ? "What you receive" : "Co otrzymasz", exact: true }).boundingBox();
        expect(ctaBox!.y + ctaBox!.height).toBeLessThan(firstDetail!.y);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(1);
      await cta.focus();
      expect(await cta.evaluate(element => {
        const style = getComputedStyle(element);
        return style.outlineStyle !== "none" || style.boxShadow !== "none";
      })).toBe(true);
      await context.close();
    }
  }
});

test("withdrawn offer details answer 410 inside the site shell on their own URL", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const path of withdrawnOffers) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const page = await context.newPage();
      const main = await expectWithdrawnShell(page, path);
      await expect(main).not.toContainText(/Request a scope|Start with a short description/);
      if (path.includes("professional-public-footprint-audit")) {
        await expect(main).not.toContainText(/Available by request|Dostępny na zapytanie|€4,900|4 900 EUR|7–10/);
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} ${viewport.name}`).toBeLessThanOrEqual(1);
      await context.close();
    }
  }
});

test("case variants of withdrawn OffSec catalogue URLs answer 410 in EN and PL", async ({ page }) => {
  test.setTimeout(90_000);
  for (const slug of [
    "OFFSEC-LOCAL-AUDIT",
    "OFFSEC-LAUNCH-READY",
    "OFFSEC-CUSTODY-OPS",
    "OFFSEC-INCIDENT-READY",
  ]) {
    for (const prefix of ["/catalog", "/PL/CATALOG"] as const) {
      const path = `${prefix}/${slug}`;
      await expectWithdrawnShell(page, path);
    }
  }
});

test("External Attack Surface Review catalogue URLs land on the review page with its request path", async ({ browser }) => {
  for (const offer of externalReviewRedirects) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const page = await context.newPage();
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      const response = await page.goto(offer.path, { waitUntil: "networkidle" });
      expect(response?.status(), `${offer.path} ${viewport.name}`).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${offer.destination.replaceAll("/", "\\/")}$`));
      const main = page.locator("main");
      await expect(main).toHaveAttribute("data-offer-status", "parked");
      await expect(main.locator("h1")).toHaveText(offer.title);
      await expect(main).toContainText(offer.differentService);
      await expect(main).not.toContainText("€1,900");
      await expect(main).not.toContainText("€1\u00A0900");
      await expect(main.locator('[data-one-pager], a[href$=".pdf"]')).toHaveCount(0);
      await expect(main.locator("form")).toHaveCount(0);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        new RegExp(`${offer.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| WitnessOps`),
      );
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
        "href",
        /\/reviews\/external-attack-surface-review$/,
      );
      await expect(page.locator('link[rel="alternate"][hreflang="pl"]')).toHaveAttribute(
        "href",
        /\/pl\/reviews\/external-attack-surface-review$/,
      );

      const requestLink = main.getByRole("link", { name: offer.reviewLink, exact: true });
      await expect(requestLink).toHaveAttribute("href", offer.reviewHref);
      expect(new URL((await requestLink.getAttribute("href")) ?? "", "http://witnessops.test").searchParams.get("productId")).toBeNull();
      expect((await requestLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      expect(pageErrors).toEqual([]);
      await context.close();
    }
  }
});

test("Customer Security Review Sprint is withdrawn in both languages", async ({ page }) => {
  for (const path of ["/customer-security-review", "/pl/customer-security-review"] as const) {
    const main = await expectWithdrawnShell(page, path);
    await expect(main).not.toContainText(/From €1,600|Od 7 000 zł/);
    await expect(main.locator('[data-one-pager], a[href$=".pdf"]')).toHaveCount(0);
  }
});

test("retired sample pages answer 410 in EN and PL, including case variants", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const slug of [
    "external-exposure-assessment",
    "access-removed-proof",
    "sbom-cisa-2026-minimum-elements",
    "local-server-security-review",
    "launch-readiness-review",
    "custody-wallet-ops-review",
    "incident-readiness-review",
    "customer-security-review-sprint",
  ]) {
    for (const prefix of ["/review/sample-cases", "/pl/review/sample-cases"]) {
      const canonical = `${prefix}/${slug}`;
      for (const path of [canonical, canonical.toUpperCase()]) {
        const main = await expectWithdrawnShell(page, path, true);
        await expect(main.locator('a[href*="/samples/"], a[href$=".proofpack"]')).toHaveCount(0);
        await expect(main).not.toContainText(/Download|Synthetic worked example|Historical sample, offer withdrawn/);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, path).toBeLessThanOrEqual(1);
      }
      const response = await page.request.head(canonical);
      expect(response.status(), canonical).toBe(410);
      expect(response.headers()["x-robots-tag"], canonical).toBe("noindex");
    }
  }
});

test("Polish custody detail stays on its historical URL as a 410 without starting another review", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const main = await expectWithdrawnShell(page, "/pl/catalog/offsec-custody-ops");
  await expect(main).toContainText("WitnessOps nie oferuje już tego przeglądu.");
  await expect(main).not.toContainText("Custody / Wallet-Ops Review");
  await expect(main.locator('a[href*="OFFSEC-EXTERNAL-EXPOSURE"]')).toHaveCount(0);
});
