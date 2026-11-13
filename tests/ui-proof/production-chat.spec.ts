import { expect, generatedAnswer, test } from "../sovereign-widget/fixtures";

for (const locale of ["en", "pl"] as const) {
  for (const width of [1280, 390]) {
    test(`production ${locale} homepage has no Ask Sovereign widget at ${width}`, async ({ page }) => {
      // The widget was removed from public pages (Design 2026-11-13); /docs/assistant stays.
      await page.setViewportSize({ width, height: 844 });
      let calls = 0;
      await page.route("**/api/ask-witnessops", async route => {
        calls++;
        await route.fulfill({ json: generatedAnswer("unexpected") });
      });
      expect((await page.goto(locale === "pl" ? "/pl" : "/"))?.status()).toBe(200);
      await expect(page.getByRole("button", { name: locale === "pl" ? "Zapytaj Sovereign" : "Ask Sovereign", exact: true })).toHaveCount(0);
      await expect(page.locator("[data-shellbit-state]")).toHaveCount(0);
      await expect(page.locator('a[href$="/docs/assistant"]')).toHaveCount(0);
      expect(calls).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    });
  }
  test(`production ${locale} assistant page uses the API and retains honest retry`, async ({ page }) => {
    let calls = 0;
    await page.route("**/api/ask-witnessops", async route => {
      calls++;
      await route.fulfill(calls === 1 ? { status: 503, json: { error: "fixture unavailable" } } : { json: generatedAnswer("Synthetic recovery answer.") });
    });
    await page.goto(`${locale === "pl" ? "/pl" : ""}/docs/assistant?sim=typing`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("main")).toContainText("OpenAI");
    await page.getByRole("textbox").fill("What does WitnessOps do?");
    await page.getByRole("button", { name: locale === "pl" ? "Wyślij" : "Send", exact: true }).click();
    await expect(page.locator('[data-retry]')).toBeVisible();
    await page.locator('[data-retry]').click();
    await expect(page.getByText("Synthetic recovery answer.", { exact: true })).toBeVisible();
    expect(calls).toBe(2);
    await expect(page.getByText("What does WitnessOps do?", { exact: true })).toHaveCount(1);
  });
}

test("the production HTTP handler validates input instead of returning Gone", async ({ request }) => {
  // Malformed input cannot reach any provider, even if the test server is misconfigured.
  const response = await request.post("/api/ask-witnessops", { data: "{", headers: { "content-type": "application/json" } });
  expect(response.status()).toBe(400);
  expect(response.headers()["cache-control"]).toBe("no-store");
});
