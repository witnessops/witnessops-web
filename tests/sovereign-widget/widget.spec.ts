import type { Locator, Page } from "@playwright/test";
import { expect, generatedAnswer, test, type AskRequest } from "./fixtures";

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error("Expected a visible widget control");
  return rect;
}

async function drag(page: Page, handle: Locator, dx: number, dy: number) {
  const start = await box(handle);
  const x = start.x + start.width / 2;
  const y = start.y + start.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 });
  await page.mouse.up();
}

test("dragging, keyboard movement, reset and conversation lifecycle", async ({ page }) => {
  const requests: AskRequest[] = [];
  await page.route("**/api/ask-witnessops", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: generatedAnswer("A mocked review answer for the widget lifecycle.") });
  });
  await page.goto("/");
  const pet = page.getByRole("button", { name: "Ask Sovereign", exact: true });
  await expect.poll(() => pet.evaluate((el) => (el.parentElement as HTMLElement).style.left)).not.toBe("");
  const initial = await box(pet);
  await drag(page, pet, -500, -250);
  await expect(pet).toHaveAttribute("aria-expanded", "false");
  expect((await box(pet)).x).toBeCloseTo(initial.x - 500, 0);
  await pet.press("ArrowLeft");
  expect((await box(pet)).x).toBeCloseTo(initial.x - 516, 0);
  await pet.press("Home");
  expect((await box(pet)).x).toBeCloseTo(initial.x, 0);
  await pet.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Ask Sovereign preview" });
  await expect(dialog).toBeVisible();
  const before = await box(dialog);
  await drag(page, dialog.getByRole("button", { name: "Move chat" }), -300, -100);
  expect((await box(dialog)).x).toBeCloseTo(before.x - 300, 0);
  expect((await box(dialog)).y).toBeCloseTo(before.y - 100, 0);
  await dialog.getByRole("button", { name: "Reset position" }).click();
  expect((await box(dialog)).x).toBeCloseTo(before.x, 0);

  await dialog.getByRole("button", { name: "What does the Agent Action Security Review cover?", exact: true }).click();
  await expect(dialog.getByText("AI-generated answer", { exact: true })).toBeVisible();
  await expect(dialog.getByText("A mocked review answer for the widget lifecycle.", { exact: true })).toBeVisible();
  await expect(dialog.locator("[data-ask-thread] ol li")).toHaveCount(3);
  const draft = dialog.getByRole("textbox", { name: "Ask about the review" });
  await draft.fill("Synthetic draft retained while minimized");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(pet).toBeFocused();
  await expect(page).toHaveURL("http://127.0.0.1:3012/");
  await pet.click();
  await expect(draft).toHaveValue("Synthetic draft retained while minimized");
  await expect(dialog.locator("[data-ask-thread] ol li")).toHaveCount(3);
  const first = dialog.getByRole("button", { name: "Move chat" });
  const last = dialog.getByRole("button", { name: "Send", exact: true });
  await last.press("Tab");
  await expect(first).toBeFocused();
  await first.press("Shift+Tab");
  await expect(last).toBeFocused();
  await last.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(pet).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  expect(requests).toEqual([{ question: "What does the Agent Action Security Review cover?", history: [], surface: "sovereign_widget" }]);
});

test("resize keeps the pet reachable and Polish contact stays on the current site", async ({ page }) => {
  await page.goto("/pl?sim=handoff");
  const pet = page.getByRole("button", { name: "Zapytaj Sovereign", exact: true });
  await expect.poll(() => pet.evaluate((el) => (el.parentElement as HTMLElement).style.left)).not.toBe("");
  await pet.click();
  const desktopDialog = page.getByRole("dialog");
  const desktopInput = await box(desktopDialog.getByRole("textbox", { name: "Zapytaj o przegląd" }));
  const desktopPanel = await box(desktopDialog);
  expect(desktopInput.y + desktopInput.height).toBeLessThan(desktopPanel.y + desktopPanel.height);
  await desktopDialog.getByRole("button", { name: "Zamknij", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  await expect.poll(async () => (await box(pet)).x + (await box(pet)).width).toBeLessThanOrEqual(304.5);
  await pet.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect((await box(dialog)).width).toBeCloseTo(320, 0);
  expect((await box(dialog)).height).toBeCloseTo(740, 0);
  const input = dialog.getByRole("textbox", { name: "Zapytaj o przegląd" });
  await input.fill("Synthetic question outside the published facts");
  await dialog.getByRole("button", { name: "Wyślij", exact: true }).click();
  await expect(dialog.getByRole("link", { name: "Przejdź do kontaktu" })).toHaveAttribute("href", "/pl/contact");
  expect((await box(input)).y + (await box(input)).height).toBeLessThanOrEqual(740);
  await dialog.getByRole("button", { name: "Zamknij", exact: true }).click();
  await expect(pet).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("touch dragging and cancellation do not open the chat or scroll the page", async ({ page, context }) => {
  await page.goto("/");
  const pet = page.getByRole("button", { name: "Ask Sovereign", exact: true });
  await expect.poll(() => pet.evaluate((el) => (el.parentElement as HTMLElement).style.left)).not.toBe("");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await box(pet)).x + (await box(pet)).width).toBeLessThanOrEqual(374.5);
  const initial = await box(pet);
  const touch = await context.newCDPSession(page);
  const start = { x: initial.x + initial.width / 2, y: initial.y + initial.height / 2, id: 1 };
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...start, x: start.x - 100, y: start.y - 250 }] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(pet).toHaveAttribute("aria-expanded", "false");
  expect((await box(pet)).x).toBeCloseTo(initial.x - 100, 0);
  expect((await box(pet)).y).toBeCloseTo(initial.y - 250, 0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const moved = await box(pet);
  const next = { x: moved.x + moved.width / 2, y: moved.y + moved.height / 2, id: 2 };
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [next] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...next, x: next.x - 40, y: next.y - 100 }] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  expect((await box(pet)).x).toBeCloseTo(moved.x, 0);
  expect((await box(pet)).y).toBeCloseTo(moved.y, 0);
  await page.getByRole("button", { name: "Reset position", exact: true }).click();
  expect((await box(pet)).x).toBeCloseTo(initial.x, 0);
  await pet.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("the mobile keyboard leaves conversation and composer usable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/pl?sim=handoff");
  await page.getByRole("button", { name: "Zapytaj Sovereign", exact: true }).click();
  const dialog = page.getByRole("dialog");
  // Model a keyboard changing the visual viewport without changing CSS media queries.
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, "height", { configurable: true, value: 320 });
    window.visualViewport?.dispatchEvent(new Event("resize"));
  });
  await expect.poll(async () => (await box(dialog)).height).toBeCloseTo(320, 0);
  const input = await box(dialog.getByRole("textbox", { name: "Zapytaj o przegląd" }));
  expect(input.y + input.height).toBeLessThanOrEqual(320);
  const thread = dialog.locator("[data-ask-thread]");
  expect(await thread.evaluate((el) => el.clientHeight - parseFloat(getComputedStyle(el).paddingBottom))).toBeGreaterThanOrEqual(64);
  await dialog.getByText("Podgląd, nic nie wysyła", { exact: true }).scrollIntoViewIfNeeded();
  await expect(dialog.getByText("Podgląd, nic nie wysyła", { exact: true })).toBeInViewport();
});

test("clicking the dimmed page closes the chat and keeps the conversation", async ({ page }) => {
  await page.route("**/api/ask-witnessops", async (route) => {
    await route.fulfill({ json: generatedAnswer("A mocked review answer kept after click-away.") });
  });
  await page.goto("/");
  const pet = page.getByRole("button", { name: "Ask Sovereign", exact: true });
  await pet.click();
  const dialog = page.getByRole("dialog", { name: "Ask Sovereign preview" });
  await dialog.getByRole("button", { name: "What does the Agent Action Security Review cover?", exact: true }).click();
  await expect(dialog.getByText("A mocked review answer kept after click-away.", { exact: true })).toBeVisible();
  const draft = dialog.getByRole("textbox", { name: "Ask about the review" });
  await draft.fill("Kept after click-away");
  const panel = await box(dialog);
  await page.mouse.move(panel.x + 24, panel.y + panel.height - 24);
  await page.mouse.down();
  await page.mouse.move(24, 24, { steps: 4 });
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  await page.mouse.click(24, 24);
  await expect(dialog).not.toBeVisible();
  await expect(pet).toBeFocused();
  await expect(page).toHaveURL("http://127.0.0.1:3012/");
  await pet.click();
  await expect(draft).toHaveValue("Kept after click-away");
  await expect(dialog.getByText("A mocked review answer kept after click-away.", { exact: true })).toBeVisible();
});

test("a downward flick on the phone header closes the chat", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const pet = page.getByRole("button", { name: "Ask Sovereign", exact: true });
  await pet.click();
  const dialog = page.getByRole("dialog", { name: "Ask Sovereign preview" });
  const title = dialog.locator("#ask-sovereign-title");
  const start = await box(title);
  const x = start.x + 12;
  const y = start.y + start.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 140, { steps: 6 });
  await page.mouse.up();
  await expect(dialog).not.toBeVisible();
  await expect(pet).toBeFocused();
});

test("first opening does not later steal focus from a chosen control", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
  const reset = page.getByRole("dialog").getByRole("button", { name: "Reset position", exact: true });
  await reset.focus();
  // Deliberately span the preview's 260ms entrance-animation fallback.
  await page.waitForTimeout(400);
  await expect(reset).toBeFocused();
});

test("temporary keyboard resizing does not forget a dragged launcher position", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const pet = page.getByRole("button", { name: "Ask Sovereign", exact: true });
  await expect.poll(() => pet.evaluate((el) => (el.parentElement as HTMLElement).style.left)).not.toBe("");
  await drag(page, pet, -80, -60);
  const original = await box(pet);
  await pet.click();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, "height", { configurable: true, value: 320 });
    window.visualViewport?.dispatchEvent(new Event("resize"));
  });
  await expect.poll(async () => (await box(page.getByRole("dialog"))).height).toBeCloseTo(320, 0);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  // Keyboard may finish closing after the dialog has already closed.
  await page.evaluate(() => {
    Reflect.deleteProperty(window.visualViewport!, "height");
    window.visualViewport?.dispatchEvent(new Event("resize"));
  });
  await expect.poll(async () => (await box(pet)).y).toBeCloseTo(original.y, 0);
});

for (const height of [320, 430]) {
test(`keyboard users can reach the transcript option after a handoff at height ${height}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height });
  await page.goto("/?sim=handoff");
  await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill("Synthetic question outside the published facts");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog.getByRole("link", { name: "Continue to contact" })).toBeVisible();
  const optin = dialog.getByRole("checkbox", { name: "Include this transcript when I contact a person" });
  await optin.focus();
  // Let the thread's scrollend/fade handling settle before checking visibility.
  await page.waitForTimeout(400);
  const control = await box(optin);
  const thread = await box(dialog.locator("[data-ask-thread]"));
  expect(control.y).toBeGreaterThanOrEqual(thread.y);
  expect(control.y + control.height).toBeLessThanOrEqual(thread.y + thread.height);
  await expect(optin).toBeFocused();
});
}
