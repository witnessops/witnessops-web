import { expect, generatedAnswer, test } from "../sovereign-widget/fixtures";

for (const locale of ["en", "pl"] as const) {
  for (const width of [1280, 390]) {
    test(`production ${locale} widget uses the API and ignores simulation flags at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      const sent: unknown[] = [];
      await page.route("**/api/ask-witnessops", async route => {
        sent.push(route.request().postDataJSON());
        await route.fulfill({ json: generatedAnswer("Synthetic production-browser answer.") });
      });
      await page.goto(`${locale === "pl" ? "/pl" : "/"}?sim=error&at=load`);
      await page.getByRole("button", { name: locale === "pl" ? "Zapytaj Sovereign" : "Ask Sovereign", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("OpenAI");
      await expect(dialog).not.toContainText(/Needs review|PL copy pending native review|Simulated|Symulacja|Preview, sends nothing/);
      await dialog.getByRole("textbox").fill("What does WitnessOps do?");
      await dialog.getByRole("button", { name: locale === "pl" ? "Wyślij" : "Send", exact: true }).click();
      await expect(dialog.getByText("Synthetic production-browser answer.", { exact: true })).toBeVisible();
      await expect(dialog.locator('[data-answer-mode="ai_assisted"]')).toBeVisible();
      expect(sent).toEqual([{ question: "What does WitnessOps do?", history: [], surface: "sovereign_widget" }]);
      await expect(dialog.getByRole("button", { name: /book|voice|microphone|rezerwuj|mikrofon/i })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `artifacts/ui-proof/production-chat/${locale}-${width}.png` });
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
