import { expect, test } from "@playwright/test";

const scenarios = [
  { path: "/catalog", width: 1440, height: 1100 },
  { path: "/catalog", width: 768, height: 1024 },
  { path: "/catalog", width: 390, height: 844 },
  { path: "/pl/catalog", width: 1440, height: 1100 },
  { path: "/pl/catalog", width: 768, height: 1024 },
  { path: "/pl/catalog", width: 390, height: 844 },
] as const;

const expectedServiceOrder = [
  "customer-security-review-sprint",
  "bounded-workflow-review",
  "one-server-security-check",
  "launch-readiness-check",
  "key-access-custody-review",
  "incident-readiness-review",
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
    await expect(serviceCards).toHaveCount(6);
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
        price: "eur_2500_to_7500",
        timing: "four_business_days_after_candidate_collection",
      },
      { price: "eur_3000_to_15000", timing: "confirmed_during_non_secret_fit_check" },
      { price: "eur_5000_to_25000", timing: "confirmed_during_non_secret_fit_check" },
    ]);
    await expect(page.locator("main")).not.toContainText(/Pilot|Pilotaż|Access Removal/);

    for (let index = 0; index < 6; index += 1) {
      const card = serviceCards.nth(index);
      const links = card.locator("a");
      const primary = links.first();
      await expect(primary).toHaveAttribute(
        "href",
        scenario.path.startsWith("/pl") ? "/pl/review/request" : "/review/request",
      );
      await expect(primary).toHaveText(
        scenario.path.startsWith("/pl") ? "Rozpocznij przegląd" : "Start a review",
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
      } else {
        await expect(links).toHaveCount(2);
      }
    }

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
