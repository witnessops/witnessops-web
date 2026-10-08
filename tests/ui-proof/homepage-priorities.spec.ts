import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1159, height: 776 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 720, height: 800 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
]) {
  test("homepage clarity and Ask placement at " + viewport.width, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/ask-witnessops", route => route.fulfill({ status: 204 }));
    await page.goto("/");
    const hero = page.locator('[data-ui-proof-id="homepage-hero"]');
    const main = page.locator('main[data-home-direction="two-offer-v1"]');
    const trigger = page.getByRole("button", { name: "Ask WitnessOps" });
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
      "Understand what your agents can do and what your systems expose.",
    );
    await expect(main.locator("[data-home-offer]")).toHaveCount(2);
    await expect(main.locator('[data-home-offer="agent-tools-access"]')).toContainText("Starting at €2,500");
    await expect(main.locator('[data-home-offer="external-exposure"]')).toContainText("€1,900");
    await expect(main.getByRole("complementary", { name: "Free hostname check" })).toContainText("Not a review.");
    await expect(main.getByRole("link", { name: "Start a free check" })).toHaveAttribute("href", "/check");
    await expect(main.getByRole("link", { name: "Historical synthetic one-action example" })).toHaveAttribute(
      "href", "/review/sample-cases/ai-agent-action-proof-run",
    );
    await expect(main).toContainText("Not a complete specimen of the current AI Tools & Access Review.");
    await expect(main).not.toContainText(/Early Bird|Internet Footprint Review|€500|No\. 0042/);
    await expect(trigger).toBeVisible();
    await page.screenshot({ path: "artifacts/ui-proof/priorities/hero-" + viewport.width + ".png" });
    const aiLink = hero.getByRole("link", { name: "Scope an AI review" });
    const externalLink = hero.getByRole("link", { name: "Scope an external review" });
    await expect(aiLink).toHaveAttribute("href", /offerId=agent-tools-access-review/);
    await expect(externalLink).toHaveAttribute("href", /productId=OFFSEC-EXTERNAL-EXPOSURE/);
    await aiLink.focus();
    const collision = await page.locator('[data-focus-obscured="true"]').count();
    if (collision) await expect(trigger).toBeHidden();
    await aiLink.blur();
    await expect(trigger).toBeVisible();

    await hero.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().bottom + window.scrollY + 8));
    if (viewport.width >= 640) {
      await expect(trigger).toBeVisible();
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Ask WitnessOps" });
      await expect(dialog).toBeVisible();
      await expect(page.getByLabel("Ask WitnessOps question")).toBeFocused();
      await dialog.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    } else {
      await expect(trigger).toBeVisible();
    }

    const enquiry = main.locator("#enquiry");
    await enquiry.scrollIntoViewIfNeeded();
    await expect(enquiry).toContainText("non-secret description");
    await expect(enquiry.locator("form")).toHaveCount(0);
    await expect(enquiry.getByRole("link", { name: "Choose a review or ask about fit" })).toHaveAttribute("href", "/review/request");
    await page.screenshot({ path: "artifacts/ui-proof/priorities/enquiry-" + viewport.width + ".png" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    const docsEntry = page.getByRole("contentinfo").getByRole("link", { name: "Docs", exact: true });
    await expect(docsEntry).toBeVisible();
    await expect(docsEntry).toHaveAttribute("href", "/docs");
    await docsEntry.click();
    await expect(page).toHaveURL(/\/docs$/);
    await expect(page.getByRole("main")).toBeVisible();
  });
}

test("Polish homepage keeps localized two-offer boundaries, sample provenance and docs destination explicit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl");
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    await expect(page.locator(selector)).toHaveAttribute("content", /Przeglądy bezpieczeństwa agentów AI/);
  }
  const main = page.locator('main[data-home-direction="two-offer-v1"]');
  await expect(main.locator('[data-ui-proof-id="homepage-hero-body"]')).toContainText("materiały do sprawdzenia");
  await expect(main.locator('[data-home-offer="agent-tools-access"]')).toContainText("Od €2 500");
  await expect(main.locator('[data-home-offer="external-exposure"]')).toContainText("€1 900");
  await expect(main.getByRole("complementary", { name: "Bezpłatne sprawdzenie hosta" })).toContainText("To nie jest przegląd.");
  await expect(main).toContainText("To nie jest pełny przykład obecnego przeglądu");
  await expect(main.locator('a[href="/review/sample-cases/ai-agent-action-proof-run"]')).toHaveCount(1);
  const docsEntry = page.getByRole("contentinfo").getByRole("link", { name: "Dokumentacja", exact: true });
  await expect(docsEntry).toBeVisible();
  await expect(docsEntry).toHaveAttribute("href", "/pl/docs");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await docsEntry.click();
  await expect(page).toHaveURL(/\/pl\/docs$/);
  await expect(page.getByRole("main")).toBeVisible();
});
