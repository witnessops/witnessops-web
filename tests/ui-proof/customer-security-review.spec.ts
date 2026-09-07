import { expect, test } from "@playwright/test";

const scenarios = [
  { path: "/customer-security-review", width: 1440, height: 1100 },
  { path: "/customer-security-review", width: 768, height: 1024 },
  { path: "/customer-security-review", width: 390, height: 844 },
  { path: "/pl/customer-security-review", width: 1440, height: 1100 },
  { path: "/pl/customer-security-review", width: 768, height: 1024 },
  { path: "/pl/customer-security-review", width: 390, height: 844 },
] as const;

test("Customer Security Review pages remain responsive and usable", async ({ browser }) => {
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

    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll, `${scenario.path} should not overflow`).toBeLessThanOrEqual(
      widths.client + 1,
    );

    const heroCta = page.locator("main header a").first();
    const ctaBox = await heroCta.boundingBox();
    expect(ctaBox?.height, `${scenario.path} hero CTA height`).toBeGreaterThanOrEqual(44);
    expect((await heroCta.textContent())?.trim().length ?? 0).toBeGreaterThan(0);
    await heroCta.focus();
    const focusVisible = await heroCta.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    });
    expect(focusVisible, `${scenario.path} hero CTA focus indicator`).toBe(true);

    const clippedSections = await page.locator("main header, main section").evaluateAll((nodes) =>
      nodes.filter((node) => {
        const box = node.getBoundingClientRect();
        return box.left < -1 || box.right > document.documentElement.clientWidth + 1;
      }).length,
    );
    expect(clippedSections, `${scenario.path} should not clip page sections`).toBe(0);

    const expectedRequestPath = scenario.path.startsWith("/pl/")
      ? "/pl/review/request"
      : "/review/request";
    const expectedRequestHref = `${expectedRequestPath}?offerId=customer-security-review-sprint&offer=Customer+Security+Review+Sprint`;
    await expect(heroCta).toHaveAttribute("href", expectedRequestHref);
    const requestLinks = page.locator(`main a[href="${expectedRequestHref}"]`);
    expect(await requestLinks.count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator('footer a[href^="mailto:engage@mail.witnessops.com"]')).toBeVisible();
    if (scenario.path === "/customer-security-review" && scenario.width === 390) {
      await page.locator("main summary").filter({ hasText: "Example and technical details" }).click();
      const tableScroller = page.getByLabel("Synthetic example response table");
      await expect(tableScroller).toHaveAttribute("tabindex", "0");
      const scrollMetrics = await tableScroller.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(scrollMetrics.scrollWidth).toBeGreaterThan(scrollMetrics.clientWidth);
      await tableScroller.focus();
      await expect(tableScroller).toBeFocused();
    }
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    await context.close();
  }
});
