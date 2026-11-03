import { expect, test } from "../sovereign-widget/fixtures";

// Uses the real local API with the provider disabled by the acceptance command.
// No canned answer can hide stale server-side catalogue behavior in this test.
for (const width of [1280, 390]) {
  test(`Polish chat uses current catalogue facts through the real API at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    // Isolate visitor rate-limit budgets across the desktop/mobile conversations.
    await page.route("**/api/ask-witnessops", (route) => route.continue({
      headers: { ...route.request().headers(), "x-forwarded-for": width === 1280 ? "203.0.113.220" : "203.0.113.221" },
    }));
    await page.goto("/pl");
    await page.getByRole("button", { name: "Zapytaj Sovereign", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const questions = [
      { text: "Jakie macie oferty?", expected: /Aktualnie oferujemy jeden płatny przegląd: Agent Action Security Review/, recommend: true },
      { text: "Ile kosztuje?", expected: /2[\s,]500/, recommend: true },
      { text: "A ile to trwa?", expected: /Termin realizacji według podpisanego SOW/, recommend: true },
      { text: "Czy oferujecie One Server Security Check?", expected: /nie jest już dostępna dla nowych zleceń/, recommend: false },
      { text: "Co obejmuje Agent Action Security Review?", expected: /mapę działania, ustalenia ze źródłami/, recommend: true },
    ];
    for (const question of questions) {
      await dialog.getByRole("textbox").fill(question.text);
      const response = page.waitForResponse((response) => response.url().endsWith("/api/ask-witnessops") && response.request().method() === "POST");
      await dialog.getByRole("button", { name: "Wyślij", exact: true }).click();
      const received = await response;
      expect(received.status()).toBe(200);
      expect(received.request().postDataJSON().locale).toBe("pl");
      const answer = await received.json();
      expect(answer.answer_mode).toBe("deterministic_fallback");
      expect(answer.template.template_id).toBe("answer.public_catalogue.v1");
      expect(answer.template.body).toMatch(question.expected);
      expect(answer.template.body).not.toMatch(/One Server|Customer Security|Workflow [SML]|dwa dni|10 dni/);
      expect(answer.recommendation?.service_id ?? null).toBe(question.recommend ? "agent-action-security-review" : null);
      await expect(dialog.locator("[data-latest-answer]").last()).toContainText(question.expected);
      await expect(dialog.locator("[data-retry]")).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`polish-current-offer-${width}.png`) });
  });
}
