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
  route: { route_id: "route.fit-check", href: `${agentRequest.pathname}${agentRequest.search}` },
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
  expect(askWorkflowFitResponse.route.href).toBe(askWorkflowFitResponse.recommendation.request_href);
  expect(agentRequest.searchParams.get("source")).toBe("ask");
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

test("the homepage sample-work link opens the sample library", async ({
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

  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "All Skills Library", exact: true })).toBeVisible();
  await saveEvidence(page, "01-desktop-sample-library.png");

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
    .locator("footer")
    .getByRole("link", { name: "Sample work", exact: true });
  await receiptLink.scrollIntoViewIfNeeded();
  const expectedScrollY = await page.evaluate(() => window.scrollY);
  expect(expectedScrollY).toBeGreaterThan(0);

  await receiptLink.click();
  await expectPath(page, "/review/sample-cases");
  await expect(page.locator("main h1")).toBeVisible();

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
    .locator("footer")
    .getByRole("link", { name: "Sample work", exact: true });
  await receiptLink.click();
  await expectPath(page, "/review/sample-cases");
  await page.locator(`main a[href="${SAMPLE_PATH}"]`).first().click();

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

test("Polish docs keep the logo local and link to a live English docs route", async ({
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
  const englishSwitch = page.getByRole("link", { name: "Otwórz dokumentację techniczną (EN)", exact: true });
  await expect(englishSwitch).toHaveAttribute("href", "https://witnessops.com/docs");
  // Exercise the canonical link against this candidate without navigating production.
  const localDocs = new URL("/docs", page.url()).href;
  await page.route("https://witnessops.com/docs", route => route.fulfill({ status: 302, headers: { location: localDocs } }));
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
  await expect(page.locator("[data-mobile-assistant-link]")).toHaveCount(0);
  await page.getByRole("button", { name: "Close primary navigation" }).click();
  await page.getByRole("button", { name: "Ask WitnessOps" }).click();

  await page.getByRole("textbox", { name: "Ask WitnessOps question" }).fill("We're launching an AI agent.");
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  const fit = page.getByRole("region", { name: "Suggested service", exact: true });
  await expect(fit).toContainText("€2,500 fixed · excluding VAT");
  await expect(fit).toContainText("Within 10 working days after evidence rules are agreed");
  await expect(page.locator("#ask-witnessops-dialog")).toContainText("NO EVIDENCE REVIEWED");
  await expect(fit).toContainText("A person confirms fit, scope, price and availability before work begins.");
  await expect(page.getByLabel("Ask WitnessOps question")).toBeVisible();
  await expect(page.getByLabel("Ask WitnessOps question")).toHaveAttribute("placeholder", "Ask a follow-up…");
  await page.getByRole("button", { name: "Prepare my request", exact: true }).click();

  await expectPath(page, "/catalog");
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
  const source = page.locator("#ask-witnessops-dialog").getByRole("link", { name: "Agent Action Security Review", exact: true });
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
    name: "Free check",
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

  await expect(lastCta).toHaveAttribute("href", "/check");
  // The compact menu keeps account navigation in the same tab.
  await expect(lastCta).not.toHaveAttribute("target", "_blank");
  await saveEvidence(page, "05-mobile-menu-signup.png");

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
  const triggerBox = await drawerTrigger.boundingBox();
  const articleBox = await page.locator("main").boundingBox();
  expect(triggerBox!.y + triggerBox!.height).toBeLessThan(articleBox!.y);
  await expect(page.locator("#docs-menu-slot")).toContainText("Browse docs");
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

for (const width of [1440, 390]) {
  test(`support starts AI chat without submitting a ticket at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let questions = 0;
    let tickets = 0;
    await page.route("**/api/support", async route => {
      tickets += 1;
      await route.abort();
    });
    await page.route("**/api/ask-witnessops", async route => {
      if (await fulfillAskTelemetry(route)) return;
      questions += 1;
      expect(route.request().postDataJSON()).toEqual({ question: "How do I authenticate the CLI?", history: [] });
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Unavailable" }) });
    });
    await page.goto("/support", { waitUntil: "networkidle" });
    expect(questions).toBe(0);
    await page.getByLabel("Your question", { exact: true }).fill("How do I authenticate the CLI?");
    await page.getByRole("button", { name: "Start AI chat" }).click();
    const dialog = page.getByRole("dialog", { name: "Ask WitnessOps" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Retry question" })).toBeEnabled();
    await dialog.getByRole("link", { name: "Support help", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/support#support-request$/);
    await page.locator("#si-email").fill("pilot@example.com");
    await page.getByRole("button", { name: "Still need help? Email support" }).click();
    await expect(page.locator("#si-desc")).toBeVisible();
    expect(questions).toBe(1);
    expect(tickets).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("grouped desktop navigation supports keyboard, dismissal and document navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const resources = page.getByRole("button", { name: "Resources", exact: true });
  await resources.focus();
  await page.keyboard.press("ArrowDown");
  const panel = page.locator("#public-nav-group-2");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: /^Docs/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(resources).toBeFocused();
  await resources.click();
  await page.mouse.click(30, 700);
  await expect(panel).toBeHidden();
  await resources.click();
  await panel.getByRole("link", { name: /^Docs/ }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(panel).toBeHidden();
});

test("grouped mobile navigation keeps product and resource links reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open primary navigation" }).click();
  const menu = page.locator("#witnessops-mobile-menu");
  for (const name of ["Product", "Expert help", "Resources"]) {
    await expect(menu.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(menu.getByRole("link", { name: "Free check", exact: true })).toBeInViewport();
  await expect(menu.getByRole("link", { name: "Pricing", exact: true })).toBeInViewport();
  await menu.getByRole("button", { name: "Product", exact: true }).click();
  await expect(menu.locator("#witnessops-mobile-menu-group-0").getByRole("link", { name: "Free check", exact: true })).toBeVisible();
  await menu.getByRole("button", { name: "Resources", exact: true }).click();
  await expect(menu.locator("#witnessops-mobile-menu-group-0").getByRole("link", { name: "Free check", exact: true })).toBeHidden();
  await menu.getByRole("link", { name: "Docs", exact: true }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole("button", { name: "Open primary navigation" })).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
