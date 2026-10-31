import { getWorkspaceAppUrl } from "../../apps/witnessops-web/src/lib/workspace-access";
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
  "summary:visible",
  '[tabindex]:not([tabindex="-1"]):visible',
].join(", ");

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

  await expect(page).toHaveURL(/\/review\/sample-cases$/);
  await expect(page.getByRole("heading", { name: "Sample work", exact: true })).toBeVisible();
  await saveEvidence(page, "01-desktop-sample-cases.png");

  await context.close();
});

test("the Polish homepage historical-action link opens the historical sample", async ({ page }) => {
  await page.goto("/pl", { waitUntil: "networkidle" });
  const sampleLink = page.locator('main a[data-ui-proof-id="homepage-sample-review-cta"]');
  await expect(sampleLink).toHaveAttribute("href", "/review/sample-cases/ai-agent-action-proof-run");
  await sampleLink.click();
  await expect(page).toHaveURL(/\/review\/sample-cases\/ai-agent-action-proof-run$/);
  await expect(page.locator("main")).toBeVisible();
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

test("the withdrawn agent tools detail stays on its URL as a 410 and does not start a new review", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  const response = await page.goto("/catalog/workflows", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(410);
  await expectPath(page, "/catalog/workflows");
  const main = page.locator("main");
  await expect(main.locator("h1")).toHaveText("This offer has been withdrawn");
  await expect(page.locator('[data-buyer-service-detail="agent-tools-access-review"]')).toHaveCount(0);
  await expect(page.locator('[data-buyer-service-detail="agent-action-security-review"]')).toHaveCount(0);
  await expect(main.getByRole("link", { name: "Request a scope and fixed quote", exact: true })).toHaveCount(0);
  await expect(main.locator('a[href*="/review/request"]')).toHaveCount(0);
  await expect(main.locator("form")).toHaveCount(0);
  await expect(main).not.toContainText("Agent Risk & Control Review");
  await expect(main).not.toContainText("From €1,500");
  await saveEvidence(page, "03-desktop-selected-offer-handoff.png");

  await context.close();
});

test("support sends paid-work buyers to the current agent review", async ({
  browser,
}) => {
  for (const scenario of [
    { path: "/support", prefix: "" },
    { path: "/pl/support", prefix: "/pl" },
  ]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    const response = await page.goto(scenario.path, { waitUntil: "networkidle" });
    expect(response?.status(), scenario.path).toBe(200);
    const main = page.locator("main");
    await expect(main).not.toContainText("AI Agent Tools & Access Review");
    await expect(main).not.toContainText("Przegląd narzędzi i dostępu agenta AI");
    await expect(main).not.toContainText(
      "Request an AI Agent Action Proof Run",
    );
    await expect(main).not.toContainText("Agent Risk & Control Review");
    await expect(main).not.toContainText("From €1,500");

    const agentLinks = main.locator(`a[href="${scenario.prefix}/reviews/agent-action-security-review"]`);
    expect(await agentLinks.count(), `${scenario.path} agent review`).toBeGreaterThanOrEqual(1);
    await expect(agentLinks.first()).toContainText("Agent Action Security Review");
    await expect(main.locator(`a[href="${scenario.prefix}/reviews/external-attack-surface-review"]`)).toHaveCount(0);
    await expect(main).not.toContainText("Request an external review");

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

for (const width of [390, 1440]) {
  test(`production keeps the unpublished Ask launcher and route closed at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    await page.goto("/docs", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Ask WitnessOps" })).toHaveCount(0);
    await expect(page.locator("#ask-witnessops-dialog")).toHaveCount(0);
    if (width < 1024) {
      await page.getByRole("button", { name: "Open primary navigation" }).click();
      await expect(page.locator("[data-mobile-assistant-link]")).toHaveCount(0);
      await page.getByRole("button", { name: "Close primary navigation" }).click();
    }
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

    const ask = await page.request.post("/api/ask-witnessops", {
      data: { question: "We're launching an AI agent.", history: [] },
    });
    expect(ask.status()).toBe(410);

    await context.close();
  });
}

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
    name: getWorkspaceAppUrl("/signup") ? "Sign up" : "Pricing",
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

  await expect(lastCta).toHaveAttribute("href", getWorkspaceAppUrl("/signup") || "/pricing");
  if (getWorkspaceAppUrl("/signup")) await expect(lastCta).toHaveAttribute("target", "_blank");
  else await expect(lastCta).not.toHaveAttribute("target", "_blank");
  await saveEvidence(page, "05-mobile-menu-signup.png");

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
  test(`support question box sends nothing while the assistant is unpublished at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let questions = 0;
    let tickets = 0;
    await page.route("**/api/support", async route => {
      tickets += 1;
      await route.abort();
    });
    await page.route("**/api/ask-witnessops", async route => {
      questions += 1;
      await route.abort();
    });
    await page.goto("/support", { waitUntil: "networkidle" });
    const panel = page.locator("section[aria-labelledby='support-ai-title']");
    await expect(panel).toContainText("The assistant on this page is not available. A question typed here is not sent.");
    await page.getByLabel("Your question", { exact: true }).fill("How do I authenticate the CLI?");
    await panel.getByRole("button", { name: "Check" }).click();
    await expect(panel.getByRole("alert")).toContainText("Chat is unavailable or busy.");
    await expect(page.getByRole("dialog", { name: "Ask WitnessOps" })).toHaveCount(0);
    await panel.getByRole("link", { name: "Prefer a person? Contact support" }).click();
    await expect(page).toHaveURL(/\/support#support-request$/);
    await page.locator("#si-email").fill("pilot@example.com");
    await page.getByRole("button", { name: "Still need help? Email support" }).click();
    await expect(page.locator("#si-desc")).toBeVisible();
    expect(questions).toBe(0);
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
  await expect(panel.locator("a")).toHaveCount(4);
  await expect(panel.locator('a[href="/review/sample-cases"]')).toContainText("Agent-action examples and their evidence limits.");
  for (const href of ["/docs/getting-started/results", "/research", "/chronicles"]) {
    await expect(panel.locator(`a[href="${href}"]`)).toHaveCount(0);
  }
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

test("grouped desktop navigation keeps final links reachable in short windows", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 400 });
  await page.goto("/");
  await page.getByRole("button", { name: "Resources", exact: true }).click();
  const panel = page.locator("#public-nav-group-2");
  await expect(panel).toBeVisible();
  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(400);

  await panel.hover();
  await page.mouse.wheel(0, 600);
  await expect(panel.locator("a")).toHaveCount(4);
  const finalLink = panel.locator("a").last();
  await expect(finalLink).toHaveAttribute("href", "/check");
  await expect(finalLink).toBeInViewport({ ratio: 1 });
  await finalLink.click();
  await expect(page).toHaveURL(/\/check$/);
  await expect(panel).toBeHidden();
});

test("grouped mobile navigation keeps product and resource links reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open primary navigation" }).click();
  const menu = page.locator("#witnessops-mobile-menu");
  for (const name of ["Product", "Reviews", "Resources"]) {
    await expect(menu.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  if (getWorkspaceAppUrl("/signup")) await expect(menu.getByRole("link", { name: "Sign up", exact: true })).toBeInViewport();
  else await expect(menu.getByRole("link", { name: "Sign up", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Pricing", exact: true })).toBeInViewport();
  await menu.getByRole("button", { name: "Product", exact: true }).click();
  await expect(menu.locator("#witnessops-mobile-menu-group-0").getByRole("link", { name: "Tool · not a review", exact: true })).toHaveCount(0);
  await menu.getByRole("button", { name: "Resources", exact: true }).click();
  const resourceLinks = menu.locator("#witnessops-mobile-menu-group-2");
  await expect(resourceLinks.locator("a")).toHaveCount(4);
  for (const href of ["/docs/getting-started/results", "/research", "/chronicles"]) {
    await expect(resourceLinks.locator(`a[href="${href}"]`)).toHaveCount(0);
  }
  await expect(resourceLinks.getByRole("link", { name: "Tool · not a review", exact: true })).toBeVisible();
  await menu.getByRole("link", { name: "Docs", exact: true }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole("button", { name: "Open primary navigation" })).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Resources footer keeps the supported links without Research in both languages", async ({ page }) => {
  for (const [pathname, label, verifyHref] of [
    ["/", "Resources", "/verify"],
    ["/pl", "Zasoby", "/pl/verify"],
  ]) {
    await page.goto(pathname);
    const resources = page.locator("#site-footer").getByRole("navigation", { name: label, exact: true });
    await expect(resources).toBeVisible();
    await expect(resources.locator('a[href="/research"]')).toHaveCount(0);
    await expect(resources.locator('a[href="/review/sample-cases"]')).toBeVisible();
    await expect(resources.locator(`a[href="${verifyHref}"]`)).toBeVisible();
  }
});
