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
    await expect(hero).toContainText("For product and operations teams");
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

    const evidence = page.getByRole("article", { name: "Can a request without credentials reach an admin function?" });
    await evidence.scrollIntoViewIfNeeded();
    await expect(evidence).toContainText("not a client engagement");
    await page.screenshot({ path: `artifacts/ui-proof/priorities/case-collapsed-${viewport.width}.png` });
    await evidence.locator("summary").focus();
    await evidence.locator("summary").press("Enter");
    await expect(evidence).toContainText("No correction or retest is recorded");
    await expect(evidence.locator("details")).toHaveAttribute("open", "");
    await expect(evidence.getByRole("link")).toHaveAttribute("download", "");
    await page.screenshot({ path: `artifacts/ui-proof/priorities/case-${viewport.width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    const askEntry = page.getByRole("link", { name: "Ask WitnessOps AI", exact: true });
    await expect(askEntry).toHaveAttribute("href", "/docs/assistant");
    await askEntry.click();
    await expect(page).toHaveURL(/\/docs\/assistant$/);
    await expect(page.getByLabel("Ask WitnessOps question")).toBeVisible();
  });
}

test("Polish homepage keeps the own-system case and English AI destination explicit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl");
  await expect(page.locator('[data-ui-proof-id="homepage-hero-body"]')).toContainText("Dla zespołów produktowych i operacyjnych");
  await expect(page.getByRole("link", { name: "Zapytaj WitnessOps AI (EN)" })).toHaveAttribute("href", "/docs/assistant");
  await expect(page.locator("article[aria-labelledby='own-system-case-heading']")).toContainText("nie realizacja dla klienta");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
