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

async function expectWithdrawnShell(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "networkidle" });
  expect(response?.status(), path).toBe(410);
  await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
  const main = page.locator("main");
  const polish = path.startsWith("/pl/");
  await expect(main.locator("h1")).toHaveText(
    polish ? "Ta oferta została wycofana" : "This offer has been withdrawn",
  );
  const prefix = polish ? "/pl" : "";
  await expect(main.locator(`a[href="${prefix}/reviews/agent-action-security-review"]`)).toHaveCount(1);
  await expect(main.locator(`a[href="${prefix}/reviews/external-attack-surface-review"]`)).toHaveCount(0);
  await expect(main.locator('a[href*="/review/request"]')).toHaveCount(0);
  await expect(main.locator("form")).toHaveCount(0);
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

test("historical customer review sample points to the current review without reopening intake", async ({ page }) => {
  const response = await page.goto("/review/sample-cases/customer-security-review-sprint", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const main = page.locator('[data-page="csr-sample"]');
  await expect(main.locator('[data-historical-offer="withdrawn"]')).toContainText("Historical sample, offer withdrawn");
  await expect(main.getByRole("link", { name: "See the Agent Action Security Review", exact: true })).toHaveCount(2);
  await expect(main.locator('a[href="/reviews/agent-action-security-review"]')).toHaveCount(2);
  await expect(main.locator('a[href^="/review/request"]')).toHaveCount(0);
  await expect(main.locator("form")).toHaveCount(0);
  await expect(main).not.toContainText("Ask about this review");
});

test("External Attack Surface Review synthetic sample is buyer-safe and responsive", async ({ browser }) => {
  const expectedFiles = [
    "README.md",
    "external-exposure-assessment.md",
    "exposure-map.json",
    "findings.json",
    "evidence-register.json",
    "handover-agenda.md",
    "focused-retest-result.md",
    "synthetic-rehearsal-checklist.md",
    "synthetic-timesheet.md",
    "CLAIM_BOUNDARY.md",
    "evidence-manifest.json",
    "verifier-result.json",
    "MANIFEST.sha256",
  ];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(
      "/review/sample-cases/external-exposure-assessment",
      { waitUntil: "networkidle" },
    );
    expect(response?.status()).toBe(200);
    const main = page.locator(
      '[data-page="external-exposure-assessment-sample"]',
    );
    await expect(main.locator("h1")).toHaveText("External Attack Surface Review");
    await expect(main).toContainText("This is not a penetration test");
    await expect(main).toContainText(
      "Synthetic worked example, not customer evidence.",
    );
    await expect(main).toContainText(
      "Neither result proves that observations are complete",
    );
    await expect(main).not.toContainText("assessment of WitnessOps");

    for (const file of expectedFiles) {
      await expect(
        main.locator(`a[href="/samples/offsec-external-exposure/${file}"]`),
      ).toHaveCount(1);
    }

    await expect(main.locator('a[href*="productId=OFFSEC-EXTERNAL-EXPOSURE"]')).toHaveCount(0);
    await expect(main.locator('a[href^="/review/request"]')).toHaveCount(0);
    const notice = main.getByRole("link", { name: "Read the availability notice", exact: true });
    await expect(notice).toHaveAttribute("href", "/reviews/external-attack-surface-review");
    expect((await notice.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    await context.close();
  }
});

test("Polish custody detail stays on its historical URL as a 410 without starting another review", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const main = await expectWithdrawnShell(page, "/pl/catalog/offsec-custody-ops");
  await expect(main).toContainText("WitnessOps nie oferuje już tego przeglądu.");
  await expect(main).not.toContainText("Custody / Wallet-Ops Review");
  await expect(main.locator('a[href*="OFFSEC-EXTERNAL-EXPOSURE"]')).toHaveCount(0);
});
