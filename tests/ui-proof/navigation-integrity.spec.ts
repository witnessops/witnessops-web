import { BUYER_SERVICES, buyerServiceRequestHref } from "../../apps/witnessops-web/src/lib/buyer-services";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page, type Route } from "@playwright/test";

const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "artifacts/ui-proof/navigation-integrity/screenshots",
);

const SAMPLE_PATH = "/review/sample-cases/ai-agent-action-proof-run";
const PRIMARY_REQUEST_PATH =
  "/review/request?offerId=bounded-workflow-review&offer=Agent+Action+Security+Review";
const FOCUSABLE_SELECTOR = [
  "a[href]:visible",
  "button:not([disabled]):visible",
  "input:not([disabled]):visible",
  "textarea:not([disabled]):visible",
  "select:not([disabled]):visible",
  "summary:visible",
  '[tabindex]:not([tabindex="-1"]):visible',
].join(", ");

const askWorkflowAuthority = {
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
      name: "Agent Action Security Review",
      price_label: "€2,500 fixed · excluding VAT",
      unit_label: "One consequential agent or automation action",
      fit_check_label: "Non-secret fit check first",
      delivery_label: "Within 10 working days after evidence rules are agreed",
    },
    matching_specimen_id: "ai-agent-action-proof-run",
  },
  presented_sources: [{
    source_id: "service.bounded-workflow-review",
    public_label: "Agent Action Security Review",
    canonical_href: "https://witnessops.com/catalog/workflows",
    href_class: "same_site",
  }],
} as const;

const agentService = BUYER_SERVICES.find(service => service.id === "bounded-workflow-review")!;
const agentRequest = new URL(buyerServiceRequestHref("en", agentService), "https://witnessops.com");
agentRequest.searchParams.set("source", "ask");
const askWorkflowFitResponse = {
  ...askWorkflowAuthority,
  schema: "witnessops.ask.generated-answer.v1",
  answer_mode: "ai_assisted",
  model: "gpt-5.4-mini",
  template: { template_id: "answer.public_ai.v1", body: "A review can examine the controls for the agent you are launching. No evidence was reviewed in this chat.", source_display: null },
  authority_answer: {
    ...askWorkflowAuthority,
    assembler_contract_id: "ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1",
    assembler_contract_version: 1,
    deterministic_replay_hash: "ui-proof-local-fixture",
    policy_decision: { template_id: askWorkflowAuthority.template.template_id },
  },
  recommendation: {
    service_id: agentService.id,
    name: agentService.name.en,
    price_label: agentService.price.en,
    delivery_label: agentService.timing.en,
    detail_href: agentService.detailHref.en,
    request_href: `${agentRequest.pathname}${agentRequest.search}`,
  },
} as const;

async function fulfillAskTelemetry(route: Route): Promise<boolean> {
  if (route.request().headers()["x-witnessops-event"] !== "1") return false;
  const payload = route.request().postDataJSON();
  expect(route.request().method()).toBe("POST");
  expect(Object.keys(payload)).toEqual(["telemetry"]);
  expect(Object.keys(payload.telemetry).every((key) =>
    ["event", "surface", "service_id", "outcome", "feedback"].includes(key),
  )).toBe(true);
  expect(["opened", "answered", "offer_selected", "contact_started", "mailbox_confirmed", "feedback"])
    .toContain(payload.telemetry.event);
  await route.fulfill({ status: 204 });
  return true;
}

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

test("the shared sample-review link lands below the sticky header", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.goto("/", { waitUntil: "networkidle" });
  const fragmentLink = page.locator(
    'main a[data-ui-proof-id="homepage-sample-review-cta"]',
  );
  await expect(fragmentLink).toHaveCount(1);
  await fragmentLink.click();

  await expect(page).toHaveURL(/\/catalog\/workflows#sample-review$/);
  await expect(page.locator("#sample-review")).toBeVisible();
  await page.waitForFunction(() => {
    const target = document.querySelector("#sample-review");
    const nav = document.querySelector("nav.public-shell");
    if (!target || !nav) return false;
    return target.getBoundingClientRect().top >= nav.getBoundingClientRect().bottom + 8;
  });
  await expectBelowStickyHeader(page, "#sample-review");
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
    .locator("main")
    .getByRole("link", { name: "Explore the verification demo", exact: true });
  await receiptLink.scrollIntoViewIfNeeded();
  const expectedScrollY = await page.evaluate(() => window.scrollY);
  expect(expectedScrollY).toBeGreaterThan(0);

  await receiptLink.click();
  await expectPath(page, SAMPLE_PATH);
  await expect(page.locator("main h1")).toContainText(/See a key rotation, step by step\./);

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
    .locator("main")
    .getByRole("link", { name: "Explore the verification demo", exact: true });
  await receiptLink.click();

  await expectPath(page, SAMPLE_PATH);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /^See a key rotation, step by step\.$/,
    }),
  ).toBeVisible();
  await expect(page.getByText("Synthetic demo", { exact: true })).toBeVisible();
  await expect(page.getByText("No live systems", { exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("Published sample, not live customer evidence");
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
    .getByRole("link", { name: "Scope this review", exact: true })
    .first();
  await selectedOfferCta.click();

  await expectPath(page, "/review/request");
  const destination = new URL(page.url());
  expect(destination.searchParams.get("offerId")).toBe("bounded-workflow-review");
  expect(destination.searchParams.get("offer")).toBe("Agent Action Security Review");
  await expect(page.locator("main").getByText("Agent Action Security Review", { exact: true }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText("€2,500 fixed · excluding VAT");
  await expect(page.locator("main")).toContainText(
    "Within 10 working days after evidence rules are agreed",
  );
  await expect(page.locator("main")).not.toContainText("Agent Risk & Control Review");
  await expect(page.locator("main")).not.toContainText("From €1,500");
  await expect(page.locator('main form input[name="intent"]')).toHaveValue(
    "bounded-workflow-review",
  );
  await saveEvidence(page, "03-desktop-selected-offer-handoff.png");

  await context.close();
});

test("support sends paid-work buyers to the canonical action security review", async ({
  browser,
}) => {
  for (const scenario of [
    { path: "/support", requestPath: PRIMARY_REQUEST_PATH },
    {
      path: "/pl/support",
      requestPath: `/pl${PRIMARY_REQUEST_PATH}`,
    },
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    const response = await page.goto(scenario.path, { waitUntil: "networkidle" });
    expect(response?.status(), scenario.path).toBe(200);
    const main = page.locator("main");
    await expect(main).toContainText("Agent Action Security Review");
    await expect(main).not.toContainText(
      "Request an AI Agent Action Proof Run",
    );
    await expect(main).not.toContainText("Agent Risk & Control Review");
    await expect(main).not.toContainText("From €1,500");

    const offerLinks = main.locator(`a[href="${scenario.requestPath}"]`);
    expect(await offerLinks.count(), scenario.path).toBeGreaterThanOrEqual(1);
    await expect(offerLinks.first()).toContainText(
      "Agent Action Security Review",
    );

    await context.close();
  }
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
  const polishLogo = page.locator("nav.public-shell").getByRole("link", {
    name: "WitnessOps: strona główna",
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

test("mobile Ask offers a human reply and source navigation without a stale overlay", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  let askRequests = 0;

  await page.route("**/api/ask-witnessops", async (route) => {
    if (await fulfillAskTelemetry(route)) return;
    askRequests += 1;
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({
      question: "We're launching an AI agent.",
      history: [],
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
      name: "We're launching an AI agent",
    })
    .click();
  const fit = page.getByRole("region", { name: "Suggested service", exact: true });
  await expect(fit).toContainText("€2,500 fixed · excluding VAT");
  await expect(fit).toContainText("Within 10 working days after evidence rules are agreed");
  await expect(page.locator("main")).toContainText("No evidence was reviewed");
  await expect(fit).toContainText("A person confirms fit, scope, price and availability before work begins.");
  await expect(page.getByLabel("Ask WitnessOps question")).toBeVisible();
  await expect(page.getByLabel("Ask WitnessOps question")).toHaveAttribute("placeholder", "Ask a follow-up…");
  await page.getByRole("button", { name: "Prepare my request", exact: true }).click();

  await expectPath(page, "/docs/assistant");
  const contact = page.locator("[data-ask-contact-region]");
  await expect(contact.getByRole("heading", { name: "Prepare my request" })).toBeVisible();
  await expect(contact).toContainText("Agent Action Security Review");
  await expect(contact.getByLabel("Work email")).toBeFocused();
  await expect(contact.getByRole("checkbox", { name: "Use this editable draft as my request summary." })).toBeChecked();
  await expect(contact.getByLabel(/^Draft request/)).toHaveValue("We're launching an AI agent.");
  await expect(contact.getByRole("button", { name: "Send confirmation code" })).toBeDisabled();
  await expect(contact).toContainText("No mailing list or review booking");
  await contact.getByRole("button", { name: "Back", exact: true }).click();

  // Sources are directly visible beside the answer, not hidden in a disclosure.
  const source = page.locator("main").getByRole("link", { name: "Agent Action Security Review", exact: true });
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute("href", "/catalog/workflows");
  await source.click();
  await expectPath(page, "/catalog/workflows");
  await expect(page.locator("#ask-witnessops-dialog")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await page.locator('[data-buyer-service-detail="bounded-workflow-review"]')
    .getByRole("link", { name: "Scope this review", exact: true }).first().click();

  await expectPath(page, "/review/request");
  const destination = new URL(page.url());
  expect(destination.searchParams.get("offerId")).toBe("bounded-workflow-review");
  expect(destination.searchParams.get("offer")).toBe("Agent Action Security Review");
  await expect(page.locator("main").getByText("Agent Action Security Review", { exact: true }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText("€2,500 fixed · excluding VAT");
  await expect(page.locator("main")).toContainText(
    "Within 10 working days after evidence rules are agreed",
  );
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
  const lastCta = menu.getByRole("link", {
    name: "Scope a review",
    exact: true,
  });
  await expect(menu).toHaveAttribute("aria-hidden", "false");
  await expect(page.getByRole("button", { name: "Ask WitnessOps" })).toBeHidden();

  await menu.hover();
  await page.mouse.wheel(0, 1000);
  await lastCta.scrollIntoViewIfNeeded();
  await expect(lastCta).toBeInViewport();
  const ctaBox = await lastCta.boundingBox();
  expect(ctaBox, "the final mobile CTA has a rendered box").not.toBeNull();
  expect(ctaBox!.y).toBeGreaterThanOrEqual(0);
  expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(320);
  const ctaCenterIsClear = await lastCta.evaluate((cta) => {
    const box = cta.getBoundingClientRect();
    const hit = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    return hit === cta || (hit instanceof Node && cta.contains(hit));
  });
  expect(ctaCenterIsClear, "the final mobile CTA is not covered by a floating layer").toBe(true);

  await lastCta.click();
  await expectPath(page, "/review/request");
  expect(new URL(page.url()).search).toBe("");
  await expect(page.locator("main h1")).toHaveText("Tell us what you need reviewed");
  await expect(page.locator('main form input[name="intent"]')).toHaveValue("review");
  await saveEvidence(page, "05-mobile-menu-cta-destination.png");

  await context.close();
});

test("desktop Ask is non-modal and Escape restores its trigger", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 936 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.route("**/api/ask-witnessops", async route => { expect(await fulfillAskTelemetry(route)).toBe(true); });
  await page.goto("/catalog", { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: "Ask WitnessOps" });
  await trigger.click();
  const dialog = page.locator("#ask-witnessops-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "false");
  await expect(dialog.getByLabel("Ask WitnessOps question")).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.locator("summary").filter({ hasText: "About this AI" }).click();
  await dialog.getByRole("link", { name: "Privacy", exact: true }).click();
  await expectPath(page, "/privacy");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
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
  await page.keyboard.press("Control+k");
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
