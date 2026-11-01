import { expect, test, type Page } from "./booking-fixtures";

async function begin(page: Page, widget = false, debug = false) {
  await page.goto((widget ? "/" : "/docs/assistant") + (debug ? "?bookingDebug=1" : ""));
  if (widget) await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
  await page.getByRole("button", { name: /Book a fit call/ }).click();
  await page.getByLabel("One agent or automation action").fill("An agent that approves demo refunds");
  await page.getByRole("button", { name: "Find available times", exact: true }).click();
  await expect(page.getByRole("group", { name: "Available times" }).getByRole("button").first()).toBeVisible();
}
async function choose(page: Page) {
  await page.getByRole("group", { name: "Available times" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Continue with this time", exact: true }).click();
}
async function review(page: Page) {
  await choose(page);
  await page.getByRole("button", { name: "Continue to demo email check", exact: true }).click();
  await page.getByLabel("Demo code", { exact: true }).fill("314159");
  await page.getByRole("button", { name: "Check demo code", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review your fit call" })).toBeVisible();
}

test("widget books only after confirmation, reschedules, cancels, and sends nothing", async ({ page }, testInfo) => {
  const mutations: string[] = [];
  page.on("request", (request) => { if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method())) mutations.push(request.url()); });
  await begin(page, true);
  await review(page);
  const original = await page.locator("[data-booking-summary]").innerText();
  await expect(page.getByText("Not booked yet", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Confirm demo booking", exact: true }).dblclick();
  await expect(page.getByRole("heading", { name: "Demo call booked", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("booking-confirmed-desktop.png") });
  const reference = await page.getByText(/Booking reference:/).innerText();
  await page.getByRole("button", { name: "Reschedule", exact: true }).click();
  await choose(page);
  await expect(page.getByRole("heading", { name: "Review your fit call" })).toBeVisible();
  await expect(page.locator("[data-booking-summary]")).not.toHaveText(original);
  await page.getByRole("button", { name: "Confirm demo booking", exact: true }).click();
  await expect(page.getByText(reference, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel booking", exact: true }).click();
  await page.getByRole("button", { name: "Keep booking", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Demo call booked", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel booking", exact: true }).click();
  await page.getByRole("button", { name: "Yes, cancel demo booking", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Demo booking cancelled", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Preview finished", exact: true })).toBeVisible();
  expect(mutations.length).toBeGreaterThan(0);
  expect(mutations.every((url) => new URL(url).pathname === "/api/sovereign-booking")).toBe(true);
});

for (const scenario of ["Make this slot unavailable", "Expire this confirmation"]) {
  test(`${scenario}: confirmation fails and alternatives remain available`, async ({ page }) => {
    await begin(page, false, true);
    await review(page);
    await page.getByText("Try a booking problem", { exact: true }).click();
    await page.getByRole("button", { name: scenario, exact: true }).click();
    await page.getByRole("button", { name: "Confirm demo booking", exact: true }).click();
    await expect(page.locator("[data-booking-preview]").getByRole("alert")).toContainText("nothing new was booked");
    await expect(page.getByRole("heading", { name: "Demo call booked", exact: true })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Available times" }).getByRole("button").first()).toBeVisible();
  });
}

test("changing preferences discards the old confirmation and requires the current email check", async ({ page }) => {
  await begin(page);
  await review(page);
  await page.getByRole("button", { name: "Change details", exact: true }).click();
  await page.getByLabel("One agent or automation action").fill("Changed topic: a demo deployment agent");
  await expect(page.getByRole("button", { name: "Confirm demo booking", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Find available times", exact: true }).click();
  await page.getByLabel("Your timezone").selectOption("America/New_York");
  await page.getByLabel("Time of day").selectOption("afternoon");
  await page.getByLabel("Time of day").selectOption("all");
  await choose(page);
  await page.getByLabel("Email", { exact: true }).fill("different@example.test");
  await page.getByRole("button", { name: "Continue to demo email check", exact: true }).click();
  await page.getByLabel("Demo code", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Check demo code", exact: true }).click();
  await expect(page.locator("[data-booking-preview]").getByRole("alert")).toContainText("Use the demo code");
  await page.getByLabel("Demo code", { exact: true }).fill("314159");
  await page.getByRole("button", { name: "Check demo code", exact: true }).click();
  await expect(page.locator("[data-booking-summary]")).toContainText("Changed topic");
  await expect(page.locator("[data-booking-summary]")).toContainText("America/New_York");
  await expect(page.locator("[data-booking-summary]")).toContainText("different@example.test");
  await page.getByRole("button", { name: "Confirm demo booking", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /Book a fit call/ }).click();
  await expect(page.getByLabel("One agent or automation action")).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Demo call booked", exact: true })).toHaveCount(0);
});

test("Polish mobile flow fits a narrow screen and is keyboard operable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/pl/docs/assistant");
  await page.getByRole("button", { name: /Umów rozmowę/ }).click();
  await page.getByLabel("Jedno działanie agenta lub automatyzacji").fill("Agent zatwierdzający próbne zwroty");
  await page.getByRole("button", { name: "Znajdź dostępne terminy", exact: true }).click();
  const slot = page.getByRole("group", { name: "Dostępne terminy" }).getByRole("button").first();
  await slot.focus(); await slot.press("Enter");
  await page.getByRole("button", { name: "Dalej z tym terminem", exact: true }).click();
  await page.getByRole("button", { name: "Przejdź do próbnego sprawdzenia emaila", exact: true }).click();
  await page.getByLabel("Kod demonstracyjny", { exact: true }).fill("314159");
  await page.getByRole("button", { name: "Sprawdź kod demonstracyjny", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sprawdź szczegóły rozmowy" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await page.screenshot({ path: testInfo.outputPath("booking-mobile-pl.png") });
  await page.getByRole("button", { name: "Potwierdź próbną rezerwację", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Próbna rozmowa zarezerwowana" })).toBeVisible();
});


test("Chat navigation preserves details but releases a prepared confirmation", async ({ page }) => {
  await begin(page, true);
  await review(page);
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  await expect(page.locator("[data-booking-preview]")).toHaveCount(0);
  await page.getByRole("button", { name: "Book a call", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Who is the call for?", exact: true })).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Demo Visitor");
  await expect(page.getByRole("button", { name: "Confirm demo booking", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Continue to demo email check", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review your fit call", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm demo booking", exact: true })).toBeEnabled();
});

test("a busy calendar reports the cause and recovers without changing the visitor's details", async ({ page }) => {
  let unavailable = true;
  await page.route("**/api/sovereign-booking", async (route) => {
    if (route.request().postDataJSON().action === "start" && unavailable) {
      await route.fulfill({ status: 429, json: { error: "preview_busy" } });
    } else await route.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
  await page.getByRole("button", { name: /Book a fit call/ }).click();
  const panel = page.locator("[data-booking-preview]");
  await expect(panel.getByRole("alert")).toHaveText("The demo is busy. Wait a moment, then try again.");
  await page.getByLabel("One agent or automation action").fill("An agent that approves demo refunds");
  await page.getByRole("button", { name: "Find available times", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry calendar", exact: true })).toBeVisible();
  await expect(panel).not.toContainText("No times match");
  unavailable = false;
  await page.getByRole("button", { name: "Retry calendar", exact: true }).click();
  await expect(page.getByRole("group", { name: "Available times" }).getByRole("button").first()).toBeVisible();
  await page.getByRole("button", { name: "Change details", exact: true }).click();
  await expect(page.getByLabel("One agent or automation action")).toHaveValue("An agent that approves demo refunds");
});
