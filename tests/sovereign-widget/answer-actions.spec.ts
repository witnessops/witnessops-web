import { expect, generatedAnswer, test } from "./fixtures";
import type { Page } from "@playwright/test";

async function setup(page: Page, options: { clipboardFails?: boolean; share?: "success" | "cancel" | "denied"; locale?: "en" | "pl" } = {}) {
  await page.addInitScript((settings) => {
    const state = { copies: [] as string[], shares: [] as object[], spoken: [] as { text: string; lang: string }[], cancelled: 0, current: null as null | SpeechSynthesisUtterance };
    Object.assign(window, { answerActionsFixture: state });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => {
      if (settings.clipboardFails) throw new DOMException("Denied", "NotAllowedError");
      state.copies.push(text);
    } } });
    Object.defineProperty(navigator, "share", { configurable: true, value: settings.share ? async (data: object) => {
      state.shares.push(data);
      if (settings.share === "cancel") throw new DOMException("Cancelled", "AbortError");
      if (settings.share === "denied") throw new DOMException("Denied", "NotAllowedError");
    } : undefined });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    class Utterance { text: string; lang = ""; onstart: (() => void) | null = null; onend = null; onerror = null; constructor(text: string) { this.text = text; } }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: Utterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      getVoices: () => [],
      speak: (utterance: SpeechSynthesisUtterance) => { state.current = utterance; state.spoken.push({ text: utterance.text, lang: utterance.lang }); utterance.onstart?.(new Event("start") as SpeechSynthesisEvent); },
      cancel: () => { state.cancelled++; state.current = null; },
    } });
  }, options);
  await page.route("**/api/ask-witnessops", (route) => route.fulfill({ json: generatedAnswer("A bounded answer for this test.", {
    route: null, presented_sources: [{ source_id: "docs", public_label: "Published documentation", canonical_href: "https://witnessops.com/docs", href_class: "same_site" }],
  }) }));
  await page.goto(options.locale === "pl" ? "/pl" : "/");
  await page.getByRole("button", { name: options.locale === "pl" ? "Zapytaj Sovereign" : "Ask Sovereign", exact: true }).click();
}

const state = (page: Page) => page.evaluate(() => (window as unknown as { answerActionsFixture: { copies: string[]; shares: { text: string; url?: string }[]; spoken: { text: string; lang: string }[]; cancelled: number } }).answerActionsFixture);

test("copy contains only the selected answer, its label and sources, never the visitor draft", async ({ page }) => {
  await setup(page);
  await page.getByRole("textbox", { name: "Ask about the review", exact: true }).fill("My private question");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const answer = page.locator("[data-latest-answer]").last();
  await expect(answer).toContainText("A bounded answer for this test.");
  await page.getByRole("textbox", { name: "Ask about the review", exact: true }).fill("A private unsent draft");
  await answer.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(answer.locator("[data-answer-action-feedback]")).toHaveText("Copied");
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText("Copied");
  const copied = (await state(page)).copies[0];
  expect(copied).toContain("A bounded answer for this test.");
  expect(copied).toContain("AI-generated answer");
  expect(copied).toContain("https://witnessops.com/docs");
  expect(copied).not.toContain("private");
});

test("share opens the native chooser with selected text and no local URL", async ({ page }) => {
  await setup(page, { share: "success" });
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.locator("[data-answer-action-feedback]")).toHaveText("Share dialog completed");
  const result = await state(page);
  expect(result.shares).toHaveLength(1);
  expect(result.shares[0].text).toContain("Hi, I’m Sovereign");
  expect(result.shares[0].url).toBeUndefined();
  expect(result.copies).toHaveLength(0);
});

for (const mode of ["cancel", "denied"] as const) {
  test(`share ${mode} reports its state without copying or sending elsewhere`, async ({ page }) => {
    await setup(page, { share: mode });
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.locator("[data-answer-actions] [data-answer-action-feedback]")).toContainText(mode === "cancel" ? "Sharing cancelled" : "Sharing is unavailable");
    expect((await state(page)).copies).toHaveLength(0);
  });
}

test("unsupported native sharing copies text; denied clipboard provides selected manual text", async ({ page }) => {
  await setup(page, { clipboardFails: true });
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const manual = page.getByRole("textbox", { name: "Answer to copy", exact: true });
  await expect(manual).toBeVisible();
  await expect(manual).toBeFocused();
  expect(await manual.inputValue()).toContain("Hi, I’m Sovereign");
  await expect(manual).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Hide text", exact: true }).click();
  await expect(manual).toHaveCount(0);
});

test("unsupported native sharing falls back to copying the answer", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.locator("[data-answer-action-feedback]")).toHaveText("Answer copied. Paste it into the app you want to share with.");
  expect((await state(page)).copies).toHaveLength(1);
});

test("read aloud is opt-in, switches answers, stops on minimize, and preserves the draft", async ({ page }) => {
  await setup(page);
  expect((await state(page)).spoken).toHaveLength(0);
  await page.getByRole("button", { name: "Read aloud", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Ask about the review", exact: true }).fill("What is the scope?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.locator("[data-latest-answer]").getByRole("button", { name: "Read aloud", exact: true }).click();
  expect((await state(page)).spoken).toHaveLength(2);
  await expect(page.getByRole("button", { name: "Stop", exact: true })).toHaveCount(1);
  await page.getByRole("textbox", { name: "Ask about the review", exact: true }).fill("Keep this draft");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect.poll(async () => (await state(page)).cancelled).toBe(2);
  await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Ask about the review", exact: true })).toHaveValue("Keep this draft");
  await expect(page.getByRole("button", { name: "Stop", exact: true })).toHaveCount(0);
});

test("Polish controls fit a narrow screen, select Polish speech, and stop when booking opens", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await setup(page, { locale: "pl" });
  await page.getByRole("button", { name: "Odczytaj", exact: true }).click();
  expect((await state(page)).spoken[0].lang).toBe("pl-PL");
  const controls = page.locator("[data-answer-actions]");
  const box = await controls.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "Zatrzymaj", exact: true }).click();
  await expect(page.getByRole("button", { name: "Odczytaj", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("polish-answer-controls.png") });
  await page.getByRole("button", { name: "Odczytaj", exact: true }).click();
  // Switching tabs renders the booking flow but does not start a provider call.
  await page.route("**/api/sovereign-booking", (route) => route.fulfill({ status: 503, json: { error: "fixture_unavailable" } }));
  await page.getByRole("button", { name: "Rezerwacja", exact: true }).click();
  await expect.poll(async () => (await state(page)).cancelled).toBe(2);
});

test("speech engine errors restore Read aloud and report the unavailable voice", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Read aloud", exact: true }).click();
  await page.evaluate(() => {
    const fixture = (window as unknown as { answerActionsFixture: { current: SpeechSynthesisUtterance } }).answerActionsFixture;
    fixture.current.onerror?.(new Event("error") as SpeechSynthesisErrorEvent);
  });
  await expect(page.getByRole("button", { name: "Read aloud", exact: true })).toBeVisible();
  await expect(page.locator("[data-answer-action-feedback]")).toHaveText("Read aloud is unavailable in this browser.");
});
