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

async function editorialReadingStyle(page: Page) {
  await page.goto("/articles/when-civilization-can-no-longer-understand-itself");
  await page.evaluate(() => document.fonts.ready);
  return page.locator("[data-editorial-article]").evaluate((article) => {
    const paragraph = article.querySelector("section p")!;
    const heading = article.querySelector("h2")!;
    const bodyStyle = getComputedStyle(paragraph);
    const headingStyle = getComputedStyle(heading);
    return {
      width: article.getBoundingClientRect().width,
      paragraphWidth: paragraph.getBoundingClientRect().width,
      font: bodyStyle.fontFamily,
      fontSize: bodyStyle.fontSize,
      lineHeight: bodyStyle.lineHeight,
      paragraphGap: bodyStyle.marginTop,
      headingSize: headingStyle.fontSize,
      headingLineHeight: headingStyle.lineHeight,
      headingAlign: headingStyle.textAlign,
    };
  });
}

async function expectChronicleReadingStyle(page: Page, reference: Awaited<ReturnType<typeof editorialReadingStyle>>) {
  const article = page.locator("[data-chronicle-article]");
  const paragraph = article.locator(".chronicle-prose p:not(.wo-mono-caps)").first();
  expect((await article.boundingBox())!.width).toBeCloseTo(reference.width, 1);
  expect((await paragraph.boundingBox())!.width).toBeCloseTo(reference.paragraphWidth, 1);
  await expect(paragraph).toHaveCSS("font-family", reference.font);
  await expect(paragraph).toHaveCSS("font-size", reference.fontSize);
  await expect(paragraph).toHaveCSS("line-height", reference.lineHeight);
  await expect(paragraph).toHaveCSS("margin-top", reference.paragraphGap);
  for (const heading of await article.locator(".chronicle-prose h2").all()) {
    await expect(heading).toHaveCSS("font-size", reference.headingSize);
    await expect(heading).toHaveCSS("line-height", reference.headingLineHeight);
    await expect(heading).toHaveCSS("text-align", reference.headingAlign);
  }
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

test("the homepage example link opens the example record and the header opens the sample library", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.goto("/", { waitUntil: "networkidle" });
  const exampleLink = page.locator(
    'main a[data-ui-proof-id="homepage-sample-review-cta"]',
  );
  await expect(exampleLink).toHaveCount(1);
  await exampleLink.click();
  await expect(page).toHaveURL(/\/reviews\/agent-action-security-review#example-record$/);
  await expect(page.locator("#example-record")).toBeInViewport();

  await page.getByRole("button", { name: "The review", exact: true }).click();
  await page.locator("#public-nav-group-review").getByRole("link", { name: /Examples/ }).click();
  await expect(page).toHaveURL(/\/review\/sample-cases$/);
  await expect(page.getByRole("heading", { name: "Examples", exact: true })).toBeVisible();
  await saveEvidence(page, "01-desktop-sample-cases.png");

  await context.close();
});

test("the Polish homepage example link opens the English example record", async ({ page }) => {
  await page.goto("/pl", { waitUntil: "networkidle" });
  const sampleLink = page.locator('main a[data-ui-proof-id="homepage-sample-review-cta"]');
  await expect(sampleLink).toHaveAttribute("href", "/reviews/agent-action-security-review#example-record");
  await sampleLink.click();
  await expect(page).toHaveURL(/\/reviews\/agent-action-security-review#example-record$/);
  await expect(page.locator("#example-record")).toBeVisible();
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
    .getByRole("link", { name: "Examples", exact: true });
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
    .getByRole("link", { name: "Examples", exact: true });
  await receiptLink.click();
  await expectPath(page, "/review/sample-cases");
  await page.locator(`main a[href="${SAMPLE_PATH}"]`).first().click();

  await expectPath(page, SAMPLE_PATH);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /^API key rotation: authority, execution and evidence\.$/,
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
  test(`production keeps the retired launcher absent and admits the chat route at ${width}px`, async ({ browser }) => {
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
      data: "{", headers: { "content-type": "application/json" },
    });
    expect(ask.status()).toBe(400);

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

  await page.goto("/reviews/agent-action-security-review", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open primary navigation" }).click();
  const menu = page.locator("#witnessops-mobile-menu");
  // Flat menu (Design 2026-11-13, bundle B): request + login, links, then the language switch last. Dark only: no theme control.
  const cta = menu.getByRole("link", { name: "Request a break test", exact: true });
  const lastLink = menu.locator("[data-mobile-language-link]");
  await expect(menu).toHaveAttribute("aria-hidden", "false");
  await expect(page.getByRole("button", { name: "Ask WitnessOps" })).toBeHidden();
  await expect(cta).toBeInViewport();
  await expect(menu.getByRole("link", { name: "Pricing", exact: true })).toHaveCount(0);
  await expect(menu.locator("[data-theme-toggle], [data-theme-choice]")).toHaveCount(0);

  await menu.hover();
  await page.mouse.wheel(0, 1000);
  await lastLink.scrollIntoViewIfNeeded();
  await expect(lastLink).toBeInViewport();
  const box = await lastLink.boundingBox();
  expect(box, "the final mobile link has a rendered box").not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(320);
  const centerIsClear = await lastLink.evaluate((link) => {
    const rect = link.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return hit === link || (hit instanceof Node && link.contains(hit));
  });
  expect(centerIsClear, "the final mobile link is not covered by a floating layer").toBe(true);
  await expect(lastLink).toHaveAttribute("href", "/pl/reviews/agent-action-security-review");
  if (getWorkspaceAppUrl("/signup")) await expect(menu.locator("[data-mobile-login]")).toHaveCount(1);
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

test("Polish docs landing makes the service guide easy to find", async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pl/docs");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dokumentacja WitnessOps");
    await expect(page.getByText("Utworzenie konta jest bezpłatne i nie wymaga karty.", { exact: false })).toBeVisible();
    const guide = page.getByRole("link", { name: "Poznaj usługę", exact: true });
    await expect(guide).toHaveAttribute("href", "/pl/docs/understand-the-service");
    await guide.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zrozum usługę");
    await expect(page.locator("main")).toContainText("aktywnie testuje jedno istotne działanie");
    await expect(page.locator("main")).toContainText("upoważnienie przed zmianą");
    await expect(page.locator("main")).not.toContainText(/Nie wykonujemy (?:tego|badanego) działania|Nie wykonujemy go/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("Polish docs drawer has localized controls and retains keyboard behavior", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl/docs/understand-the-service", { waitUntil: "networkidle" });
  await expect(page.getByRole("navigation", { name: "Skróty dokumentacji" })).toBeVisible();
  const trigger = page.getByRole("button", { name: "Przeglądaj dokumentację" });
  await expect(trigger).toHaveText("Przeglądaj dokumentację");
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Nawigacja" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Zamknij nawigację" })).toBeFocused();
  const filter = drawer.getByRole("textbox", { name: "Filtruj nawigację dokumentacji" });
  await expect(filter).toHaveAttribute("placeholder", "/ szukaj…");
  await filter.fill("Zrozum usługę");
  await expect(drawer.getByRole("link", { name: /Zrozum usługę/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
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

test("grouped desktop navigation opens current destinations", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary navigation", exact: true });
  await expect(nav.getByRole("link", { name: "Docs", exact: true }).filter({ visible: true })).toHaveAttribute("href", "/docs");
  await nav.getByRole("button", { name: "The review", exact: true }).click();
  const panel = page.locator("#public-nav-group-review");
  for (const [name, href] of [
    ["Agent Action Security Review", "/reviews/agent-action-security-review"],
    ["How it works", "/how-it-works"],
    ["Examples", "/review/sample-cases"],
    ["Request a break test", "/review/request"],
  ]) {
    await expect(panel.getByRole("link", { name: new RegExp(name) })).toHaveAttribute("href", href);
  }
  for (const href of ["/check", "/early-access", "/about", "/pricing", "/verify"]) {
    await expect(nav.locator(`a[href="${href}"]`)).toHaveCount(0);
  }
  await panel.getByRole("link", { name: /Examples/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/review\/sample-cases$/);
});

test("grouped desktop navigation fits a short window", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 400 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary navigation", exact: true });
  for (const name of ["The review", "Explore"]) {
    await expect(nav.getByRole("button", { name, exact: true })).toBeInViewport({ ratio: 1 });
  }
  await expect(nav.getByRole("link", { name: "Docs", exact: true }).filter({ visible: true })).toBeInViewport({ ratio: 1 });
  await expect(nav.locator("[data-public-primary-cta]")).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("grouped mobile navigation keeps every destination reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open primary navigation" }).click();
  const menu = page.locator("#witnessops-mobile-menu");
  await expect(menu.getByRole("link", { name: "Pricing", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Docs", exact: true })).toBeVisible();
  await menu.getByRole("button", { name: "The review", exact: true }).click();
  for (const name of ["Agent Action Security Review", "How it works", "Examples"]) {
    await expect(menu.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
  await menu.getByRole("link", { name: /How it works/ }).click();
  await expect(page).toHaveURL(/\/how-it-works$/);
  await expect(page.getByRole("button", { name: "Open primary navigation" })).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("footer keeps the review and company links without Research in both languages", async ({ page }) => {
  for (const [pathname, reviewLabel, companyLabel, docsHref, otherDocsHref] of [
    ["/", "The review", "Company", "/docs", "/pl/docs"],
    ["/pl", "Przegląd", "Firma", "/pl/docs", "/docs"],
  ]) {
    await page.goto(pathname);
    const footer = page.locator("#site-footer");
    const review = footer.getByRole("navigation", { name: reviewLabel, exact: true });
    const company = footer.getByRole("navigation", { name: companyLabel, exact: true });
    await expect(review).toBeVisible();
    await expect(company).toBeVisible();
    await expect(footer.locator('a[href="/research"]')).toHaveCount(0);
    await expect(review.locator('a[href="/review/sample-cases"]')).toBeVisible();
    await expect(company.locator(`a[href="${docsHref}"]`)).toBeVisible();
    await expect(footer.locator(`a[href="${otherDocsHref}"]`)).toHaveCount(0);
    await expect(footer.locator('a[href*="x.com"], a[href*="twitter.com"]')).toHaveCount(0);
    await expect(footer.locator("[data-theme-choice], [data-theme-toggle]")).toHaveCount(0);
    for (const href of ["/verify", "/pl/verify", "/pricing", "/about", "/docs/assistant", "/media-kit", "/check", "/early-access"]) {
      await expect(footer.locator(`a[href="${href}"]`)).toHaveCount(0);
    }
  }
});
for (const width of [320, 390, 1440]) {
  test(`Chronicles headings and records fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const reference = await editorialReadingStyle(page);
    await page.goto("/chronicles/003-the-meeting-nobody-authorized");
    await page.evaluate(() => document.fonts.ready);
    await expectChronicleReadingStyle(page, reference);

    await expect(page.locator("[data-chronicle-dateline]")).toHaveCSS("text-transform", "none");
    const prose = page.locator(".chronicle-prose");
    const bounds = await prose.boundingBox();
    expect(bounds).not.toBeNull();
    const headings = prose.locator("h2");
    expect(await headings.count()).toBeGreaterThan(0);
    for (const heading of await headings.all()) {
      const box = await heading.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.abs(box!.x - bounds!.x)).toBeLessThan(1);
    }

    expect(await prose.locator(".chronicle-record-divider").count()).toBeGreaterThan(0);
    const records = prose.locator("pre");
    for (const record of await records.all()) {
      expect(await record.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await expect(record).not.toContainText("────────");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("chronicles index links chapter 005", async ({ page }) => {
  await page.goto("/chronicles");
  await expect(page.getByRole("link", { name: "The Dashboard That Never Was", exact: true })).toHaveAttribute(
    "href",
    "/chronicles/005-the-dashboard-that-never-was",
  );
});

for (const width of [320, 390, 1440]) {
  test(`Chapter 005 fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const reference = await editorialReadingStyle(page);
    await page.goto("/chronicles/005-the-dashboard-that-never-was");
    await page.evaluate(() => document.fonts.ready);
    await expectChronicleReadingStyle(page, reference);

    await expect(page.locator("[data-chronicle-dateline]")).toHaveText("13 November 2026");
    await expect(page.locator("[data-chronicle-dateline]")).toHaveCSS("text-transform", "none");
    await expect(page.getByRole("heading", { level: 1, name: "The Dashboard That Never Was", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Chapter 004", exact: true })).toHaveAttribute(
      "href",
      "/chronicles/004-the-agent-who-scheduled-a-meeting-with-himself",
    );
    await expect(page.getByRole("link", { name: "All chronicles", exact: true })).toHaveAttribute("href", "/chronicles");

    const prose = page.locator(".chronicle-prose");
    const bounds = await prose.boundingBox();
    expect(bounds).not.toBeNull();
    const headings = prose.locator("h2");
    expect(await headings.count()).toBe(8);
    for (const heading of await headings.all()) {
      const box = await heading.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.abs(box!.x - bounds!.x)).toBeLessThan(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
