import { expect, test, type Locator } from "./booking-fixtures";
import { generatedAnswer } from "./fixtures";

const sizes = [{ width: 1280, height: 720 }, { width: 360, height: 640 }];

async function insideViewport(control: Locator) {
  await expect(control).toBeInViewport({ ratio: 1 });
  await expect(control).toBeVisible();
}

for (const viewport of sizes) {
  test(`chat and booking keep separate reading positions at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/ask-witnessops", (route) => route.fulfill({ json: generatedAnswer(
      "A fictional agent review examines permissions, approval and execution evidence. ".repeat(12),
    ) }));
    await page.goto("/");
    await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "What does WitnessOps do?", exact: true }).click();
    await expect(dialog.getByRole("textbox")).toBeEnabled();
    const chat = dialog.locator("[data-ask-thread]");
    await chat.evaluate((node) => { node.scrollTop = 180; });
    const chatTop = await chat.evaluate((node) => node.scrollTop);
    expect(chatTop).toBeGreaterThan(100);
    const pageTop = await page.evaluate(() => window.scrollY);

    await dialog.getByRole("button", { name: "Book a call", exact: true }).click();
    await dialog.getByRole("button", { name: "Use demo example", exact: true }).click();
    await dialog.getByRole("button", { name: "More times", exact: true }).click();
    const booking = dialog.locator("[data-booking-scroll]");
    await booking.evaluate((node) => { node.scrollTop = 350; });
    const bookingTop = await booking.evaluate((node) => node.scrollTop);
    expect(bookingTop).toBeGreaterThan(100);
    await dialog.getByRole("button", { name: "Chat", exact: true }).click();
    await expect(dialog.getByRole("textbox")).toBeFocused();
    await expect.poll(() => chat.evaluate((node) => node.scrollTop)).toBeCloseTo(chatTop, 0);

    await dialog.getByRole("button", { name: "Book a call", exact: true }).click();
    await expect(dialog.getByRole("group", { name: "Available times" }).getByRole("button").first()).toBeEnabled();
    await expect.poll(() => booking.evaluate((node) => node.scrollTop)).toBeCloseTo(bookingTop, 0);
    await booking.hover();
    await page.mouse.wheel(0, 240);
    await expect.poll(() => booking.evaluate((node) => node.scrollTop)).toBeGreaterThan(bookingTop);
    expect(await page.evaluate(() => window.scrollY)).toBe(pageTop);
    await dialog.getByRole("button", { name: "Chat", exact: true }).click();
    await expect.poll(() => chat.evaluate((node) => node.scrollTop)).toBeCloseTo(chatTop, 0);
  });

  test(`booking actions stay visible through all steps at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Book a call", exact: true }).click();
    const pane = dialog.locator("[data-booking-scroll]");
    const bar = dialog.locator("[data-booking-actions]");
    await insideViewport(bar.getByRole("button", { name: "Find available times", exact: true }));
    await dialog.getByLabel("One agent or automation action").fill("An agent approving fictional refunds");
    await bar.getByRole("button", { name: "Find available times", exact: true }).click();
    await insideViewport(bar.getByRole("button", { name: "Continue with this time", exact: true }));
    await dialog.getByRole("group", { name: "Available times" }).getByRole("button").first().click();
    await dialog.getByRole("button", { name: "More times", exact: true }).click();
    await pane.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    await insideViewport(bar.getByRole("button", { name: "Continue with this time", exact: true }));
    await bar.getByRole("button", { name: "Continue with this time", exact: true }).click();
    await insideViewport(bar.getByRole("button", { name: "Continue to demo email check", exact: true }));
    // The external submit button must still use native form validation.
    await dialog.getByLabel("Email", { exact: true }).fill("invalid-email");
    await bar.getByRole("button", { name: "Continue to demo email check", exact: true }).click();
    await expect(dialog.getByLabel("Email", { exact: true })).toBeFocused();
    await dialog.getByLabel("Email", { exact: true }).fill("visitor@example.test");
    await bar.getByRole("button", { name: "Continue to demo email check", exact: true }).click();
    await insideViewport(bar.getByRole("button", { name: "Check demo code", exact: true }));
    await dialog.getByLabel("Demo code", { exact: true }).fill("314159");
    await bar.getByRole("button", { name: "Check demo code", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Voice", exact: true })).toHaveCount(0);
    await expect(dialog.getByText("Try a booking problem", { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Back to questions", exact: true })).toHaveCount(0);
    const confirm = bar.getByRole("button", { name: "Confirm demo booking", exact: true });
    await insideViewport(confirm);
    await expect(dialog.getByRole("heading", { name: "Review your fit call", exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`review-actions-${viewport.width}.png`), animations: "disabled" });
    await pane.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    await insideViewport(confirm);
    const footerBox = await bar.boundingBox();
    const contentBox = await pane.boundingBox();
    expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(footerBox!.y + 1);
    if (viewport.width === 360) {
      await page.setViewportSize({ width: 360, height: 430 });
      await insideViewport(confirm);
      await page.setViewportSize(viewport);
    }
    await confirm.click();
    await insideViewport(bar.getByRole("button", { name: "Finish preview", exact: true }));
    await expect(dialog.getByRole("heading", { name: "Demo call booked", exact: true })).toBeVisible();
    await bar.getByRole("button", { name: "Finish preview", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "Preview finished", exact: true })).toBeVisible();
    await insideViewport(bar.getByRole("button", { name: "View demo booking", exact: true }));
  });
}
