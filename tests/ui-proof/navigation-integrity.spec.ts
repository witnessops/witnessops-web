import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "artifacts/ui-proof/navigation-integrity/screenshots",
);

const SAMPLE_PATH = "/review/sample-cases/ai-agent-action-proof-run";
const FOCUSABLE_SELECTOR = [
  "a[href]:visible",
  "button:not([disabled]):visible",
  "input:not([disabled]):visible",
  "textarea:not([disabled]):visible",
  "select:not([disabled]):visible",
  '[tabindex]:not([tabindex="-1"]):visible',
].join(", ");

const askWorkflowFitResponse = {
  schema: "witnessops.ask.assembled-answer.v1",
  status: "success",
  answer_mode: "deterministic_fallback",
  template: {
    template_id: "route.ai_agent_action.v1",
    body: "One bounded workflow can proceed to a non-secret fit check.",
    source_display: null,
  },
  route: {
    route_id: "route.fit-check",
    href: "/review/request",
  },
  commercial_fit: {
    schema: "witnessops.ask.commercial-fit.v1",
    result: "likely",
    intent: "workflow",
    offer_id: "bounded-workflow-review",
    source: "ask",
    offer: {
      name: "Agent Risk & Control Review",
      price_label: "From €1,500",
      unit_label: "One agentic or automated workflow",
    },
    matching_specimen_id: "ai-agent-action-proof-run",
  },
  presented_sources: [],
} as const;

async function saveEvidence(page: Page, filename: string) {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    animations: "disabled",
  });
}

async function expectPath(page: Page, expectedPath: string) {
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(expectedPath);
}

async function expectBelowStickyHeader(page: Page, selector: string) {
  const position = await page.locator(selector).evaluate((target) => {
    const nav = document.querySelector<HTMLElement>("nav.public-shell");
    if (!nav) throw new Error("Expected the public sticky navigation");

    const targetBox = target.getBoundingClientRect();
    const navBox = nav.getBoundingClientRect();
    return {
      targetTop: targetBox.top,
      targetBottom: targetBox.bottom,
      navBottom: navBox.bottom,
      viewportHeight: window.innerHeight,
    };
  });

  expect(position.targetTop, `${selector} clears the sticky header`).toBeGreaterThanOrEqual(
    position.navBottom + 8,
  );
  expect(position.targetTop, `${selector} starts inside the viewport`).toBeLessThan(
    position.viewportHeight,
  );
  expect(position.targetBottom, `${selector} has a rendered box`).toBeGreaterThan(
    position.targetTop,
  );
}

test("a real homepage fragment link lands below the sticky header", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.goto("/", { waitUntil: "networkidle" });
  const fragmentLink = page.locator(
    'nav.public-shell a[href="/#evidence-questions"]:visible',
  );
  await expect(fragmentLink).toHaveCount(1);
  await fragmentLink.click();

  await expect(page).toHaveURL(/\/#evidence-questions$/);
  await expect(page.locator("#evidence-questions")).toBeVisible();
  await page.waitForFunction(() => {
    const target = document.querySelector("#evidence-questions");
    const nav = document.querySelector("nav.public-shell");
    if (!target || !nav) return false;
    return target.getBoundingClientRect().top >= nav.getBoundingClientRect().bottom + 8;
  });
  await expectBelowStickyHeader(page, "#evidence-questions");
  await saveEvidence(page, "01-desktop-fragment-landing.png");

  await context.close();
});

test("route navigation and Back restore scroll without a second-frame snap", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.goto("/", { waitUntil: "networkidle" });
  const receiptLink = page
    .locator("#agent-action-receipt")
    .getByRole("link", { name: /Replay and verify the signed rotation/ });
  await receiptLink.scrollIntoViewIfNeeded();
  const expectedScrollY = await page.evaluate(() => window.scrollY);
  expect(expectedScrollY).toBeGreaterThan(0);

  await receiptLink.click();
  await expectPath(page, SAMPLE_PATH);
  await expect(page.locator("main h1")).toContainText(/The key leaked\./);

  await page.goBack({ waitUntil: "domcontentloaded" });
  await expectPath(page, "/");
  await page.waitForFunction(
    (expected) => Math.abs(window.scrollY - expected) <= 2,
    expectedScrollY,
  );

  const [firstFrame, secondFrame] = await page.evaluate(
    () =>
      new Promise<[number, number]>((resolve) => {
        window.requestAnimationFrame(() => {
          const first = window.scrollY;
          window.requestAnimationFrame(() => resolve([first, window.scrollY]));
        });
      }),
  );
  expect(Math.abs(firstFrame - expectedScrollY), "first restored frame").toBeLessThanOrEqual(2);
  expect(Math.abs(secondFrame - expectedScrollY), "second restored frame").toBeLessThanOrEqual(2);
  expect(Math.abs(secondFrame - firstFrame), "no second-frame snap").toBeLessThanOrEqual(1);

  await context.close();
});

test("the homepage receipt promise lands on the named signed-rotation specimen", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.goto("/", { waitUntil: "networkidle" });
  const receiptLink = page
    .locator("#agent-action-receipt")
    .getByRole("link", { name: /Replay and verify the signed rotation/ });
  await receiptLink.click();

  await expectPath(page, SAMPLE_PATH);
  await expect(page.locator("main h1")).toContainText(
    /The key leaked\.\s+The agent rotated it\./,
  );
  await expect(page.getByText("Published sample — not live customer evidence")).toBeVisible();
  await expect(page.locator('[data-ui-proof-id="api-key-rotation-demo"]')).toBeVisible();
  await saveEvidence(page, "02-desktop-receipt-landing.png");

  await context.close();
});

test("a selected offer survives the click handoff into the request form", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.goto("/catalog/workflows", { waitUntil: "networkidle" });
  const selectedOfferCta = page
    .locator('[data-buyer-service-detail="bounded-workflow-review"]')
    .getByRole("link", { name: "Start a non-secret fit check" })
    .first();
  await selectedOfferCta.click();

  await expectPath(page, "/review/request");
  const destination = new URL(page.url());
  expect(destination.searchParams.get("offerId")).toBe("bounded-workflow-review");
  expect(destination.searchParams.get("offer")).toBe("Agent Risk & Control Review");
  await expect(page.getByText("Selected offer: Agent Risk & Control Review")).toBeVisible();
  await expect(page.locator('main form input[name="intent"]')).toHaveValue(
    "bounded-workflow-review",
  );
  await saveEvidence(page, "03-desktop-selected-offer-handoff.png");

  await context.close();
});

test("Polish docs keep the logo local and switch EN stubs to a live docs route", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const polishStubPath = "/pl/docs/understand-the-service";

  await page.goto(polishStubPath, { waitUntil: "networkidle" });
  const polishLogo = page.getByRole("link", {
    name: "WitnessOps — strona główna",
    exact: true,
  });
  await expect(polishLogo).toHaveAttribute("href", "/pl");
  await polishLogo.click();
  await expectPath(page, "/pl");
  await expect(page.locator('main[data-page="home"]')).toBeVisible();

  await page.goto(polishStubPath, { waitUntil: "networkidle" });
  const notFoundResponses: string[] = [];
  page.on("response", (response) => {
    if (response.status() === 404) notFoundResponses.push(response.url());
  });
  const englishSwitch = page.getByRole("link", { name: "EN", exact: true });
  await expect(englishSwitch).toHaveAttribute("href", "/docs");
  await englishSwitch.click();
  await expectPath(page, "/docs");
  await expect(page.locator("main h1").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(notFoundResponses, "the EN language switch must not traverse a 404").toEqual([]);

  await context.close();
});

test("mobile Ask reaches a scrollable fit-check destination without a stale overlay", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  let askRequests = 0;

  await page.route("**/api/ask-witnessops", async (route) => {
    askRequests += 1;
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({
      question: "What is included in the Agent Risk & Control Review?",
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "X-Ask-Receipt-Id": "ui-proof-navigation-integrity",
        "X-Ask-Receipt-Status": "ephemeral",
      },
      body: JSON.stringify(askWorkflowFitResponse),
    });
  });

  await page.goto("/catalog", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open primary navigation" }).click();
  await page.locator("[data-mobile-assistant-link]").click();
  await expectPath(page, "/docs/assistant");

  await page
    .getByRole("button", {
      name: "What is included in the Agent Risk & Control Review?",
    })
    .click();
  const fitCheckCta = page.locator('[data-ask-primary-cta="true"], [data-ask-primary-cta]');
  await expect(fitCheckCta).toBeVisible();
  await fitCheckCta.click();

  await expectPath(page, "/review/request");
  const destination = new URL(page.url());
  expect(destination.searchParams.get("offerId")).toBe("bounded-workflow-review");
  expect(destination.searchParams.get("source")).toBe("ask");
  expect(destination.searchParams.get("result")).toBe("likely");
  await expect(page.getByText("Selected offer: Agent Risk & Control Review")).toBeVisible();
  await expect(page.locator("#ask-witnessops-dialog")).toHaveCount(0);
  await expect(page.locator("#witnessops-mobile-menu")).toHaveAttribute(
    "aria-hidden",
    "true",
  );

  const scrollState = await page.evaluate(() => ({
    bodyInlineOverflow: document.body.style.overflow,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }));
  expect(scrollState.bodyInlineOverflow).not.toBe("hidden");
  expect(scrollState.bodyOverflowY).not.toBe("hidden");
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.viewportHeight);
  await saveEvidence(page, "04-mobile-ask-fit-check-destination.png");

  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  expect(askRequests).toBe(1);

  await context.close();
});

test("the final CTA remains reachable in a short landscape mobile menu", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 740, height: 320 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.goto("/catalog", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open primary navigation" }).click();
  const menu = page.locator("#witnessops-mobile-menu");
  const lastCta = menu.getByRole("link", { name: "Start a review", exact: true });
  await expect(menu).toHaveAttribute("aria-hidden", "false");

  await menu.hover();
  await page.mouse.wheel(0, 1000);
  await lastCta.scrollIntoViewIfNeeded();
  await expect(lastCta).toBeInViewport();
  const ctaBox = await lastCta.boundingBox();
  expect(ctaBox, "the final mobile CTA has a rendered box").not.toBeNull();
  expect(ctaBox!.top).toBeGreaterThanOrEqual(0);
  expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(320);

  await lastCta.click();
  await expectPath(page, "/review/request");
  await expect(page.locator("main h1")).toContainText("Tell us what you need reviewed");
  await saveEvidence(page, "05-mobile-menu-cta-destination.png");

  await context.close();
});

test("the mobile Ask overlay contains focus and Escape restores its trigger", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator("#evidence-questions").scrollIntoViewIfNeeded();
  const trigger = page.getByRole("button", { name: "Open Ask WitnessOps" });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.locator("#ask-witnessops-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  const focusable = dialog.locator(FOCUSABLE_SELECTOR);
  expect(await focusable.count()).toBeGreaterThan(1);
  const first = focusable.first();
  const last = focusable.last();

  await first.focus();
  await expect(first).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");

  await trigger.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Privacy", exact: true }).click();
  await expectPath(page, "/privacy");
  await expect(dialog).toHaveCount(0);
  const privacyScrollState = await page.evaluate(() => ({
    inlineOverflow: document.body.style.overflow,
    computedOverflowY: getComputedStyle(document.body).overflowY,
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }));
  expect(privacyScrollState.inlineOverflow).not.toBe("hidden");
  expect(privacyScrollState.computedOverflowY).not.toBe("hidden");
  expect(privacyScrollState.scrollHeight).toBeGreaterThan(
    privacyScrollState.viewportHeight,
  );
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

  await context.close();
});

test("the docs drawer and search preserve stacked focus and scroll locks", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.goto("/docs", { waitUntil: "networkidle" });
  const initialBodyOverflow = await page.evaluate(() => document.body.style.overflow);
  const drawerTrigger = page.getByRole("button", {
    name: "Open documentation menu",
  });
  await drawerTrigger.focus();
  await drawerTrigger.click();

  const drawer = page.locator("#witnessops-docs-mobile-drawer");
  await expect(drawer).toBeVisible();
  await expect(page.getByRole("button", { name: "Close navigation" })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  const drawerFocusable = drawer.locator(FOCUSABLE_SELECTOR);
  expect(await drawerFocusable.count()).toBeGreaterThan(1);
  const drawerFirst = drawerFocusable.first();
  const drawerLast = drawerFocusable.last();
  await drawerFirst.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(drawerLast).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(drawerFirst).toBeFocused();

  await drawerLast.focus();
  await page.keyboard.press("Control+K");
  const searchDialog = page.getByRole("dialog", { name: "Search documentation" });
  await expect(searchDialog).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search docs input" })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  await page.keyboard.press("Escape");
  await expect(searchDialog).toHaveCount(0);
  await expect(drawer).toBeVisible();
  await expect(drawerLast).toBeFocused();
  expect(
    await page.evaluate(() => document.body.style.overflow),
    "closing search must retain the drawer's scroll lock",
  ).toBe("hidden");

  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(drawerTrigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    initialBodyOverflow,
  );

  await context.close();
});
