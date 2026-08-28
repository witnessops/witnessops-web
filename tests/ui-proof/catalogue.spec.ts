import { expect, test } from "@playwright/test";

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

const expectedServiceOrder = [
  "customer-security-review-sprint",
  "bounded-workflow-review",
  "one-server-security-check",
  "external-exposure-assessment",
  "launch-readiness-check",
  "key-access-custody-review",
  "incident-readiness-review",
  "professional-public-footprint-audit",
] as const;

test("catalogue routes remain responsive and usable", async ({ browser }) => {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: { width: scenario.width, height: scenario.height },
    });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(scenario.path, { waitUntil: "networkidle" });
    expect(response?.status(), `${scenario.path} should return 200`).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();

    const serviceCards = page.locator("[data-buyer-service]");
    await expect(serviceCards).toHaveCount(8);
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
    expect(firstCardVisuals.background).toBe("rgb(13, 13, 12)");
    expect(firstCardVisuals.color).toBe("rgb(250, 250, 247)");
    expect(firstCardVisuals.tokens).toEqual({
      background: "#050505",
      card: "#0d0d0c",
      primary: "#fafaf7",
      accent: "#f27a3d",
      inverse: "#160b05",
    });
    expect(firstCardVisuals.primaryCtaBackground).toBe("rgb(242, 122, 61)");
    expect(firstCardVisuals.primaryCtaColor).toBe("rgb(22, 11, 5)");
    expect(
      await serviceCards.evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-buyer-service")),
      ),
    ).toEqual(expectedServiceOrder);
    expect(
      await serviceCards.evaluateAll((cards) =>
        cards.map((card) => ({
          price: card.getAttribute("data-price-contract"),
          timing: card.getAttribute("data-timing-contract"),
        })),
      ),
    ).toEqual([
      {
        price: "from_eur_1600_after_non_secret_fit_check",
        timing:
          "approx_three_working_days_after_scope_owners_inputs_and_evidence_access_confirmed",
      },
      { price: "from_eur_1500", timing: "confirmed_during_non_secret_fit_check" },
      {
        price: "eur_950_standard_after_fit_check",
        timing: "within_two_business_days_after_authorised_collection_window",
      },
      {
        price: "eur_1900_ex_vat_one_authorised_public_facing_system",
        timing:
          "three_working_days_after_payment_in_full_accepted_sow_written_authority_fixed_scope_required_inputs_and_approved_collection_window_confirmed",
      },
      {
        price: "eur_2500_to_7500",
        timing: "four_business_days_after_candidate_collection",
      },
      { price: "eur_3000_to_15000", timing: "confirmed_during_non_secret_fit_check" },
      { price: "eur_5000_to_25000", timing: "confirmed_during_non_secret_fit_check" },
      {
        price: "eur_4900_excluding_vat",
        timing:
          "seven_to_ten_working_days_after_consent_scope_and_public_source_protocol_confirmed",
      },
    ]);
    await expect(page.locator("main")).not.toContainText(/Pilot|Pilotaż|Access Removal/);

    for (let index = 0; index < 8; index += 1) {
      const card = serviceCards.nth(index);
      const links = card.locator("a");
      const primary = links.first();
      const primaryHref = await primary.getAttribute("href");
      const requestPath = scenario.path.startsWith("/pl")
        ? "/pl/review/request"
        : "/review/request";
      expect(primaryHref).toMatch(new RegExp(`^${requestPath}`));
      if (expectedServiceOrder[index] === "external-exposure-assessment") {
        expect(
          new URL(primaryHref ?? "", "http://witnessops.test").searchParams.get("productId"),
        ).toBe("OFFSEC-EXTERNAL-EXPOSURE");
      }
      await expect(primary).toHaveText(
        expectedServiceOrder[index] === "professional-public-footprint-audit"
          ? scenario.path.startsWith("/pl")
            ? "Zapytaj o audyt"
            : "Request this audit"
          : scenario.path.startsWith("/pl")
            ? "Rozpocznij przegląd"
            : "Start a review",
      );
      // CSR card has Start + Learn more + locale one-pager PDF.
      // Bounded workflow PL has Start only (no PL detail page).
      if (index === 0) {
        await expect(links).toHaveCount(3);
        await expect(links.nth(2)).toHaveAttribute(
          "href",
          scenario.path.startsWith("/pl")
            ? "/assets/one-pagers/csr-sprint-pl-a4.pdf"
            : "/assets/one-pagers/csr-sprint-en-a4.pdf",
        );
      } else if (scenario.path === "/pl/catalog" && index === 1) {
        await expect(links).toHaveCount(1);
      } else if (expectedServiceOrder[index] === "external-exposure-assessment") {
        await expect(links).toHaveCount(3);
        await expect(links.nth(2)).toHaveAttribute(
          "href",
          "/review/sample-cases/external-exposure-assessment",
        );
      } else {
        await expect(links).toHaveCount(2);
      }
    }

    const publicFootprintCard = page.locator(
      '[data-buyer-service="professional-public-footprint-audit"]',
    );
    await expect(publicFootprintCard).toContainText(
      scenario.path.startsWith("/pl") ? "Dostępny na zapytanie" : "Available by request",
    );
    await expect(publicFootprintCard).toContainText(
      scenario.path.startsWith("/pl") ? "4 900 EUR netto" : "€4,900 excluding VAT",
    );
    await expect(
      publicFootprintCard.locator('[data-service-availability="available_by_request"]'),
    ).toHaveCount(1);
    const publicFootprintRequestHref = await publicFootprintCard.locator("a").first().getAttribute("href");
    expect(publicFootprintRequestHref).toBe(
      scenario.path.startsWith("/pl") ? "/pl/review/request" : "/review/request",
    );
    await expect(
      page.locator('a[href*="buy.stripe.com"], a[href*="checkout.stripe.com"]'),
    ).toHaveCount(0);

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth, `${scenario.path} should not overflow`).toBeLessThanOrEqual(
      viewport.clientWidth + 1,
    );

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

    const clippedCards = await page.locator("main article").evaluateAll((articles) =>
      articles.filter((article) => {
        const box = article.getBoundingClientRect();
        return box.left < -1 || box.right > document.documentElement.clientWidth + 1;
      }).length,
    );
    expect(clippedCards, `${scenario.path} should not clip offer cards`).toBe(0);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    await context.close();
  }
});

test("Public Exposure Review pricing entry preserves sample and intake links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/pricing", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);

  const card = page.locator(
    '[data-pricing-service="external-exposure-assessment"]',
  );
  await expect(card).toContainText(
    "€1,900 ex VAT — one authorised public-facing system",
  );
  await expect(card).toContainText("One focused retest within 30 days is included");
  await expect(card).toContainText("Payment is due in full before the delivery clock starts");
  await expect(card).toContainText("payment alone does not authorise testing");
  await expect(
    card.locator('a[href="/review/sample-cases/external-exposure-assessment"]'),
  ).toHaveText("Inspect synthetic sample");

  const fitHref = await card
    .getByRole("link", { name: "Request the review" })
    .getAttribute("href");
  expect(
    new URL(fitHref ?? "", "http://witnessops.test").searchParams.get(
      "productId",
    ),
  ).toBe("OFFSEC-EXTERNAL-EXPOSURE");
  await expect(page.locator('a[href*="buy.stripe.com"], a[href*="checkout.stripe.com"]')).toHaveCount(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
