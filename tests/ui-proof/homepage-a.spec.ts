import { expect, test } from "@playwright/test";

const offerId = "agent-action-security-review";
const locales = [
  {
    locale: "en", prefix: "", name: "AI Agent Red Teaming", searchLanguage: /AI Agent Security Testing/i,
    headline: "AI Agent Red Teaming for agents that take real-world actions.",
    primary: "Request a security assessment", example: "View an example record",
    price: /€2,500/, authority: /written authori[sz]ation|written authority/i,
  },
  {
    locale: "pl", prefix: "/pl", name: "Red teaming agentów AI", searchLanguage: /testy bezpieczeństwa agentów AI/i,
    headline: "Red teaming agentów AI, które mogą zmieniać dane, pieniądze lub dostęp.",
    primary: "Zapytaj o ocenę bezpieczeństwa", example: "Zobacz przykładową dokumentację",
    price: /(?:€2[\s\u00a0]500|2[\s\u00a0]500[\s\u00a0]?(?:€|EUR))/, authority: /pisemn(?:ej|ego|e|ą) (?:zgod|upoważnieni)/i,
  },
] as const;

for (const language of locales) {
  for (const [width, height] of [[390, 844], [1440, 900]] as const) {
    test(`buyer journey in ${language.locale} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      const home = language.prefix || "/";
      const service = language.prefix + "/reviews/" + offerId;
      const enquiry = language.prefix + "/review/request";
      expect((await page.goto(home))?.status()).toBe(200);
      const hero = page.locator('[data-ui-proof-id="homepage-hero"]');
      await expect(hero.getByRole("heading", { level: 1 })).toHaveAccessibleName(language.headline);
      await expect(hero).toContainText(language.price);
      await expect(page.locator("main")).toContainText(language.authority);
      await expect(page.locator("[data-agent-action-specimen]")).toHaveCount(0);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", language.searchLanguage);
      const primary = hero.getByRole("link", { name: language.primary, exact: true });
      await expect(primary).toBeInViewport({ ratio: 1 });
      expect((await primary.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      const example = hero.getByRole("link", { name: language.example, exact: true });
      await expect(example).toHaveAttribute("href", service + "#example-record");
      const nav = page.locator("nav.public-shell");
      if (width < 1024) {
        const toggle = page.locator('button[aria-controls="witnessops-mobile-menu"]');
        await toggle.click();
        await expect(page.locator("#witnessops-mobile-menu").getByRole("link", { name: language.primary, exact: true }).filter({ visible: true })).toHaveAttribute("href", enquiry);
        await page.keyboard.press("Escape");
      } else {
        await expect(nav.locator("[data-public-primary-cta]").filter({ visible: true })).toHaveAccessibleName(language.primary);
      }
      const footer = page.getByRole("contentinfo");
      await expect(footer.getByRole("link", { name: language.primary, exact: true })).toHaveAttribute("href", enquiry + "?offerId=" + offerId);
      await expect(page.locator("#enquiry form")).toBeVisible();
      await expect(page.locator("main section")).toHaveCount(5);
      await expect(page.getByRole("button", { name: "Ask Sovereign", exact: true })).toHaveCount(0);
      await expect(page.locator("main")).not.toContainText(/€1,900|Starting at €2,500|FIRST 10|No\. 0042/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`home-${language.locale}-${width}.png`), fullPage: true });

      await example.click();
      await expect(page).toHaveURL(url => url.pathname === service && url.hash === "#example-record");
      const specimen = page.locator("#example-record[data-agent-action-specimen]");
      await expect(specimen.getByRole("heading", { level: 2 })).toBeVisible();
      await expect(specimen).toContainText("refund.issue");
      await expect(specimen.locator('[data-finding-slot="unfilled"]')).toBeVisible();
      await expect(page.locator("main h1")).toHaveText(language.name);
      const serviceCta = page.locator('[data-ui-proof-id="offer-in-page-cta"]');
      await expect(serviceCta).toHaveAccessibleName(language.primary);
      await serviceCta.click();
      await expect(page).toHaveURL(url => url.pathname === enquiry && url.searchParams.get("offerId") === offerId);
      const form = page.locator("main form");
      await expect(form.locator('input[name="intent"]')).toHaveValue(offerId);
      await expect(form.getByRole("button", { name: language.primary, exact: true })).toBeVisible();
      for (const field of ["email", "workflow", "approvalBoundary", "decisionTiming"]) {
        await expect(form.locator("#" + field)).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      // Previously issued links retain their identifier and old methodology label.
      await page.goto(enquiry + "?offerId=" + offerId + "&offer=Agent+Action+Security+Review");
      await expect(page.locator("main")).toContainText(language.name);
      await expect(form.locator('input[name="intent"]')).toHaveValue(offerId);
      await page.goto(home);
      await primary.click();
      await expect(page).toHaveURL(url => url.pathname === enquiry && url.searchParams.get("offerId") === offerId);
      expect(errors).toEqual([]);
    });
  }
}

test("retired /pricing and /reviews permanently redirect to the agent review", async ({ request }) => {
  for (const from of ["/pricing", "/reviews"]) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status(), from).toBe(308);
    expect(response.headers().location, from).toMatch(/\/reviews\/agent-action-security-review$/);
  }
});
