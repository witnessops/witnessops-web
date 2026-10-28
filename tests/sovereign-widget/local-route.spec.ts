import { expect, test } from "@playwright/test";

const unavailable = "AI is unavailable right now. Your question was not answered. Try again later or contact a person.";

// The fixture server in playwright.config.ts starts with OPENAI_API_KEY="".
// These requests reach the real local route; the other connection tests mock it.
test("the connected widget handles an unavailable real route without resending", async ({ page }) => {
  const requests: unknown[] = [];
  await page.route("**/api/ask-witnessops", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.continue();
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const question = "How do I get started with WitnessOps?";
  await dialog.getByRole("textbox").fill(question);

  const firstResponse = page.waitForResponse((response) => response.url().endsWith("/api/ask-witnessops") && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  const first = await firstResponse;
  expect(first.status()).toBe(200);
  expect((await first.json()).fallback_reason).toBe("ai_unavailable");
  await expect(dialog.locator("[data-retry]")).toBeVisible();
  await expect(dialog).toContainText(unavailable);
  await expect(dialog.locator("[data-answer-mode], [data-answer-sources]")).toHaveCount(0);
  expect(requests).toEqual([{ question, history: [], surface: "sovereign_widget" }]);

  const retryResponse = page.waitForResponse((response) => response.url().endsWith("/api/ask-witnessops") && response.request().method() === "POST");
  await dialog.locator("[data-retry]").click();
  const second = await retryResponse;
  expect(second.status()).toBe(200);
  expect((await second.json()).fallback_reason).toBe("ai_unavailable");
  await expect(dialog.locator("[data-retry]")).toBeVisible();
  expect(requests).toEqual([
    { question, history: [], surface: "sovereign_widget" },
    { question, history: [], surface: "sovereign_widget" },
  ]);
  await expect(dialog.locator("[data-ask-thread] ol li").filter({ hasText: question })).toHaveCount(1);
});

test("several real-route failures keep each question marked and retry only the latest", async ({ page }, testInfo) => {
  const requests: unknown[] = [];
  await page.route("**/api/ask-witnessops", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.continue();
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const turns = dialog.locator("[data-ask-thread] ol > li");
  const questions = ["What does the Agent Action Security Review cover?", "YO", "hi"];
  const responseFor = () => page.waitForResponse((response) => response.url().endsWith("/api/ask-witnessops") && response.request().method() === "POST");

  for (const [index, question] of questions.entries()) {
    await dialog.getByRole("textbox").fill(question);
    const response = responseFor();
    await dialog.getByRole("button", { name: "Send", exact: true }).click();
    const received = await response;
    expect(received.status()).toBe(200);
    expect((await received.json()).fallback_reason).toBe("ai_unavailable");
    await expect(turns).toHaveCount(1 + (index + 1) * 2);
    await expect(turns.nth(index * 2 + 1)).toContainText(question);
    await expect(turns.nth(index * 2 + 2)).toContainText(unavailable);
    await expect(dialog.locator("[data-retry]")).toHaveCount(1);
    expect(requests).toEqual(questions.slice(0, index + 1).map((item) => ({ question: item, history: [], surface: "sovereign_widget" })));
  }
  await expect(dialog.getByRole("checkbox", { name: "This conversation is not attached to contact" })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("three-failures.png"), animations: "disabled" });

  const retryResponse = responseFor();
  await dialog.locator("[data-retry]").click();
  const retried = await retryResponse;
  expect(retried.status()).toBe(200);
  expect((await retried.json()).fallback_reason).toBe("ai_unavailable");
  await expect(turns).toHaveCount(7);
  await expect(turns.nth(6)).toContainText(unavailable);
  await expect(dialog.locator("[data-retry]")).toHaveCount(1);
  expect(requests).toEqual([...questions, "hi"].map((question) => ({ question, history: [], surface: "sovereign_widget" })));
  await expect(dialog.locator("[data-answer-mode], [data-answer-sources]")).toHaveCount(0);
});
