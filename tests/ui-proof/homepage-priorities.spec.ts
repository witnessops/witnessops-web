import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1159, height: 776 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 720, height: 800 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
]) {
  test(`homepage clarity and Ask placement at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/ask-witnessops", route => route.fulfill({ status: 204 }));
    await page.goto("/");
    const hero = page.locator('[data-ui-proof-id="homepage-hero"]');
    const trigger = page.getByRole("button", { name: "Ask WitnessOps" });
    await expect(hero).toContainText("Verify what is exposed, what changed, what acted, and what the evidence actually supports.");
    await expect(trigger).toBeVisible();
    await page.screenshot({ path: `artifacts/ui-proof/priorities/hero-${viewport.width}.png` });
    const example = page.getByRole("complementary", { name: "Example review finding" });
    await expect(example.locator("[data-hero-gap]")).toContainText("Approval not evidenced.");
    const sampleLink = hero.getByRole("link", { name: "See a sample finding" });
    await sampleLink.focus();
    // Keep the remaining hero action reachable beside the launcher.
    const collision = await page.locator('[data-focus-obscured="true"]').count();
    if (collision) await expect(trigger).toBeHidden();
    await sampleLink.blur();
    await expect(trigger).toBeVisible();

    await hero.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().bottom + window.scrollY + 8));
    if (viewport.width >= 640) {
      await expect(trigger).toBeVisible();
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "ASK WITNESSOPS" });
      await expect(dialog).toBeVisible();
      await expect(page.getByLabel("Ask WitnessOps question")).toBeFocused();
      await dialog.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    } else {
      await expect(trigger).toBeVisible();
    }

    const evidence = page.getByRole("article", { name: "Can an unauthenticated request reach an admin function?" });
    await evidence.scrollIntoViewIfNeeded();
    await expect(evidence).toContainText("not customer work");
    await page.screenshot({ path: `artifacts/ui-proof/priorities/case-collapsed-${viewport.width}.png` });
    await evidence.locator("summary").focus();
    await evidence.locator("summary").press("Enter");
    await expect(evidence).toContainText("No correction or retest is recorded");
    await expect(evidence.locator("details")).toHaveAttribute("open", "");
    await expect(evidence.getByRole("link")).toHaveAttribute("download", "");
    await page.screenshot({ path: `artifacts/ui-proof/priorities/case-${viewport.width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    const docsEntry = page.getByRole("contentinfo").getByRole("link", { name: "Docs", exact: true });
    await expect(docsEntry).toBeVisible();
    await expect(docsEntry).toHaveAttribute("href", "/docs");
    await docsEntry.click();
    await expect(page).toHaveURL(/\/docs$/);
    await expect(page.getByRole("main")).toBeVisible();
  });
}

test("Polish homepage keeps the own-system case and localized docs destination explicit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl");
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    await expect(page.locator(selector)).toHaveAttribute("content", /Znajdź luki w bezpieczeństwie swoich systemów/);
  }
  await expect(page.locator('[data-ui-proof-id="homepage-hero-body"]')).toContainText("Sprawdź, co jest wystawione, co się zmieniło, co zadziałało i co faktycznie potwierdzają dowody.");
  const docsEntry = page.getByRole("contentinfo").getByRole("link", { name: "Dokumentacja", exact: true });
  await expect(docsEntry).toBeVisible();
  await expect(docsEntry).toHaveAttribute("href", "/pl/docs");
  await expect(page.locator("article[aria-labelledby='own-system-case-heading']")).toContainText("nie realizacja dla klienta");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await docsEntry.click();
  await expect(page).toHaveURL(/\/pl\/docs$/);
  await expect(page.getByRole("main")).toBeVisible();
});
