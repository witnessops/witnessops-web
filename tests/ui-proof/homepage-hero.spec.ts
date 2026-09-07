import { expect, test, type Page, type Route } from "@playwright/test";
import { access, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { checkHomepageHero, screenshotEmittedCheck } from "./checks";
import { homepageHeroScenarios, type HomepageHeroScenario } from "./scenarios";
import {
  scenarioStatus,
  UI_PROOF_OUTPUT_DIR,
  writeHomepageHeroReport,
  type CheckResult,
  type ScenarioResult,
} from "./report";
import { writeScreenshotGrid } from "./screenshot-grid";

test.describe.configure({ mode: "serial" });

// The public endpoint accepts both questions and anonymous feature counters.
// A counter must never be mistaken for an AI request or contain visitor text.
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

const askWorkflowFallback = {
  schema: "witnessops.ask.assembled-answer.v1",
  status: "success",
  answer_mode: "deterministic_fallback",
  template: {
    template_id: "route.ai_agent_action.v1",
    body: "One bounded workflow can proceed to a non-secret fit check.",
    source_display: null,
  },
  route: { route_id: "route.fit-check", href: "/review/request" },
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
  presented_sources: [],
} as const;

const generatedQuestionnaireAnswer = {
  schema: "witnessops.ask.generated-answer.v1",
  status: "success",
  answer_mode: "ai_assisted",
  model: "gpt-5.4-mini",
  template: {
    template_id: "ui-proof.generated-questionnaire",
    body: "We can prepare proposed answers and evidence references for one customer security questionnaire. Your team approves the final answers before submission.",
    source_display: null,
  },
  route: null,
  recommendation: {
    service_id: "customer-security-review-sprint",
    name: "Customer Security Review Sprint",
    price_label: "From €1,600 · excluding VAT",
    delivery_label: "Approximately three working days after scope, owners, required inputs and evidence access are confirmed",
    detail_href: "/customer-security-review",
    request_href: "/review/request?offerId=customer-security-review-sprint&offer=Customer+Security+Review+Sprint&source=ask",
  },
  commercial_fit: {
    ...askWorkflowFallback.commercial_fit,
    result: "unknown",
    intent: "other",
    offer_id: null,
    offer: null,
    matching_specimen_id: null,
  },
  presented_sources: [],
  authority_answer: {
    ...askWorkflowFallback,
    assembler_contract_id: "ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1",
    assembler_contract_version: 1,
    deterministic_replay_hash: "ui-proof-local-fixture",
    policy_decision: { template_id: askWorkflowFallback.template.template_id },
  },
} as const;

test("homepage hero mobile UI proof", async ({ browser }) => {
  await rm(UI_PROOF_OUTPUT_DIR, { recursive: true, force: true });
  const screenshotDir = path.join(UI_PROOF_OUTPUT_DIR, "screenshots");
  await mkdir(screenshotDir, { recursive: true });
  const results: ScenarioResult[] = [];

  for (const scenario of homepageHeroScenarios) {
    const context = await browser.newContext({
      viewport: scenario.viewport,
      deviceScaleFactor: scenario.deviceScaleFactor,
      colorScheme: scenario.colorScheme,
      reducedMotion: scenario.reducedMotion,
      isMobile: true,
      hasTouch: true,
    });

    try {
      const page = await context.newPage();
      await installClsObserver(page);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await applyContentVariant(page, scenario);
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
      await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
      await page.waitForTimeout(350);

      await expect(page.getByRole("button", { name: "Open Ask WitnessOps" })).toHaveCount(0);
      const headlineMetrics = await page
        .locator('[data-ui-proof-id="homepage-hero-headline"]')
        .evaluate((element) => {
          const style = getComputedStyle(element);
          const fontSize = Number.parseFloat(style.fontSize);
          const lineHeight = Number.parseFloat(style.lineHeight);
          return {
            fontSize,
            lineHeightRatio: lineHeight / fontSize,
            lineCount: Math.round(element.getBoundingClientRect().height / lineHeight),
          };
        });
      if (scenario.contentVariant === "long") {
        expect(headlineMetrics.fontSize).toBeGreaterThanOrEqual(35);
        expect(headlineMetrics.fontSize).toBeLessThanOrEqual(43);
      } else {
        expect(headlineMetrics.fontSize).toBeGreaterThanOrEqual(35);
        expect(headlineMetrics.fontSize).toBeLessThanOrEqual(49);
        expect(headlineMetrics.lineCount).toBeLessThanOrEqual(4);
      }
      expect(headlineMetrics.lineHeightRatio).toBeGreaterThanOrEqual(0.94);
      expect(headlineMetrics.lineHeightRatio).toBeLessThanOrEqual(1.09);

      const { checks, metrics } = await checkHomepageHero(
        page,
        scenario.severity,
        scenario.reducedMotion,
      );
      const absoluteScreenshotPath = path.join(screenshotDir, `${scenario.name}.png`);
      await page.screenshot({
        path: absoluteScreenshotPath,
        fullPage: false,
      });
      const screenshotPath = path.relative(process.cwd(), absoluteScreenshotPath);
      const screenshotExists = await fileExists(absoluteScreenshotPath);
      checks.push(screenshotEmittedCheck(screenshotExists, screenshotPath, scenario.severity));

      results.push({
        scenario,
        status: scenarioStatus(scenario, checks),
        checks,
        metrics,
        screenshotPath,
      });
    } catch (error) {
      const checks: CheckResult[] = [
        {
          name: "scenario completed",
          status: "fail",
          severity: scenario.severity,
          message: error instanceof Error ? error.message : String(error),
        },
      ];
      results.push({
        scenario,
        status: scenarioStatus(scenario, checks),
        checks,
        metrics: {},
        screenshotPath: null,
      });
    } finally {
      await context.close();
    }
  }

  await writeScreenshotGrid(
    browser,
    results,
    path.join(UI_PROOF_OUTPUT_DIR, "grid.png"),
  );
  await writeHomepageHeroReport(results);
  const reportPath = path.join(UI_PROOF_OUTPUT_DIR, "latest.json");
  await expect(fileExists(reportPath)).resolves.toBe(true);

  const criticalFailures = results.flatMap((result) =>
    result.checks
      .filter((check) => check.severity === "critical" && check.status === "fail")
      .map((check) => ({
        scenario: result.scenario.name,
        check: check.name,
        expected: check.expected,
        actual: check.actual,
        message: check.message,
      })),
  );

  expect(
    criticalFailures,
    JSON.stringify(criticalFailures, null, 2),
  ).toEqual([]);
});

test("English and Polish homepages share the security identity and neutral enquiry", async ({ browser }) => {
  for (const path of ["/", "/pl"]) {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      const response = await page.goto(path, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-ui-proof-id="homepage-hero-primary-cta"]')).toHaveAttribute("href", path === "/" ? "/review/request" : "/pl/review/request");
      await expect(page.locator('[data-ui-proof-id="homepage-sample-review-cta"]')).toHaveAttribute("href", "/catalog/workflows#sample-review");
      await expect(page.locator('main[data-home-direction="security-verification"]')).toHaveCount(1);
      await expect(page.locator("[data-review-finding]")).toContainText(/No system tested|Nie testowano systemu/);
      await expect(page.locator("main")).not.toContainText(/€250|€750|Meet Karol|Work directly with/);
      await expect(page.locator(`main a[href="${path === "/pl" ? "/pl" : ""}/catalog/automation-repair"]`)).toHaveCount(1);
      await expect(page.locator("#how-it-works")).toContainText(path === "/" ? "Agree the boundary" : "Uzgodnij zakres");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await context.close();
    }
  }
});

// Desktop retains a non-modal widget. Mobile uses the dedicated page.
async function openAskSurface(page: Page, width: number) {
  await page.goto(width >= 1024 ? "/catalog" : "/docs/assistant", { waitUntil: "networkidle" });
  if (width >= 1024) {
    await page.getByRole("button", { name: "Open Ask WitnessOps" }).click();
    return page.getByRole("dialog", { name: "ASK WITNESSOPS" });
  }
  await expect(page.getByRole("button", { name: "Open Ask WitnessOps" })).toHaveCount(0);
  return page.locator("main");
}

test("Ask WitnessOps keeps the fallback paid-review path visible and controlled", async ({ browser }) => {
  for (const width of [1440, 640, 639, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 936 }, reducedMotion: "reduce" });
    try {
      const page = await context.newPage();
      const submitted: unknown[] = [];
      await page.route("**/api/ask-witnessops", async route => {
        if (await fulfillAskTelemetry(route)) return;
        submitted.push(route.request().postDataJSON());
        await route.fulfill({ status: submitted.length === 1 ? 503 : 200,
          contentType: "application/json", body: JSON.stringify(submitted.length === 1 ? { error: "Unavailable" } : askWorkflowFallback) });
      });
      const surface = await openAskSurface(page, width);
      const question = "What does an Agent Action Security Review cover, and what do we receive?";
      const prompt = surface.getByLabel("Ask WitnessOps question");
      await expect(surface.getByRole("button", { name: "Ask AI", exact: true })).toBeDisabled();
      await surface.getByRole("button", { name: /^What does an agent review cover\?/ }).click();
      await expect(surface.getByRole("alert")).toContainText("Your question is still here");
      await expect(prompt).toHaveValue(question);
      await expect(surface.getByRole("button", { name: "Request a follow-up", exact: true })).toBeVisible();
      await surface.getByRole("button", { name: "Retry question", exact: true }).click();
      const fit = surface.getByRole("region", { name: "Commercial fit", exact: true });
      await expect(fit).toContainText("€2,500 fixed · excluding VAT");
      await expect(fit).toContainText("Within 10 working days after evidence rules are agreed");
      await expect(fit).toContainText("No evidence was reviewed");
      expect(submitted).toEqual([{ question, history: [] }, { question, history: [] }]);
      await expect(prompt).toHaveValue("");
      await expect(prompt).toHaveAttribute("placeholder", "Ask a follow-up…");
      const cta = fit.getByRole("button", { name: "Request scope for this action" });
      await cta.scrollIntoViewIfNeeded();
      expect((await cta.boundingBox())?.height).toBeGreaterThanOrEqual(40);
      await cta.click();
      await expect(surface.getByLabel("Work email")).toBeFocused();
      await expect(surface.locator("[data-ask-contact-region]")).toBeVisible();
      expect(await surface.getByLabel("Work email").evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      await surface.getByRole("button", { name: "Back", exact: true }).click();
      await expect(fit).toBeVisible();
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
      if (width >= 1024) {
        await page.keyboard.press("Escape");
        await expect(surface).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Open Ask WitnessOps" })).toBeFocused();
      }
    } finally { await context.close(); }
  }
});

test("Ask generated follow-ups retain bounded context and share only an approved summary", async ({ browser }) => {
  const firstQuestion = "We need help with a customer's security questionnaire. What would you deliver?";
  const followUpQuestion = "What should we prepare for Customer Security Review Sprint, without sharing secrets here?";
  const followUpAnswer = { ...generatedQuestionnaireAnswer, template: { ...generatedQuestionnaireAnswer.template,
    body: "Prepare one questionnaire, the product scope, a named answer owner and references to existing policies. Agree a safe way to share evidence before the review starts." } };
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 936 }, reducedMotion: "reduce" });
    try {
      const page = await context.newPage();
      const submitted: unknown[] = [];
      let contact: { email: string; intent: string; scope: string } | undefined;
      await page.route("**/api/ask-witnessops", async route => {
        if (await fulfillAskTelemetry(route)) return;
        submitted.push(route.request().postDataJSON());
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(submitted.length === 2 ? followUpAnswer : generatedQuestionnaireAnswer) });
      });
      await page.route("**/api/contact", async route => {
        contact = route.request().postDataJSON();
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ issuanceId: "ui_proof_no_email_sent", email: "buyer@company.example", expiresAt: "2099-01-01T00:00:00Z" }) });
      });
      const surface = await openAskSurface(page, width);
      const composer = surface.getByLabel("Ask WitnessOps question");
      await composer.fill(firstQuestion);
      await surface.getByRole("button", { name: "Ask AI", exact: true }).click();
      await expect(surface).toContainText(generatedQuestionnaireAnswer.template.body);
      await expect(surface).toContainText(/AI.generated answer/i);
      const recommendation = surface.getByRole("region", { name: "Suggested service" });
      await expect(recommendation).toContainText("Customer Security Review Sprint");
      await expect(recommendation).toContainText("From €1,600 · excluding VAT");
      await expect(recommendation).toContainText(generatedQuestionnaireAnswer.recommendation.delivery_label);
      await expect(recommendation.getByRole("link", { name: "See scope" })).toHaveAttribute("href", "/customer-security-review");
      await expect(surface.getByRole("region", { name: "Commercial fit", exact: true })).toHaveCount(0);
      await surface.getByRole("button", { name: "What should we prepare?", exact: true }).click();
      await expect(surface).toContainText(followUpAnswer.template.body);
      expect(submitted).toEqual([{ question: firstQuestion, history: [] }, {
        question: followUpQuestion, history: [{ role: "user", content: firstQuestion },
          { role: "assistant", content: `${generatedQuestionnaireAnswer.template.body}\nSuggested service: Customer Security Review Sprint` }] }]);
      const disclosure = surface.locator("summary").filter({ hasText: "About this AI" });
      await disclosure.click();
      await expect(surface).toContainText("Model: gpt-5.4-mini");
      await expect(surface).toContainText("provider retention may still apply");
      await expect(surface.getByRole("link", { name: "Privacy", exact: true })).toBeVisible();
      await disclosure.click();
      await recommendation.getByRole("button", { name: "Discuss this service" }).click();
      await expect(surface.getByLabel("Work email")).toBeFocused();
      const share = surface.getByRole("checkbox", { name: "Use my questions as the request summary." });
      const summary = surface.getByLabel(/^Request summary/);
      await expect(share).not.toBeChecked();
      await expect(summary).toHaveValue("");
      await summary.fill("One questionnaire for one product.");
      await share.check();
      await expect(summary).toHaveValue(`${firstQuestion}\n\n${followUpQuestion}`);
      await summary.fill("Help us scope one non-secret customer questionnaire.");
      await share.uncheck();
      await expect(summary).toHaveValue("One questionnaire for one product.");
      if (width < 1024) await share.check();
      await expect(surface).toContainText("AI answers are not shared");
      await expect(surface).toContainText("No mailing list or review booking");
      await surface.getByLabel("Work email").fill("buyer@company.example");
      await surface.getByRole("button", { name: "Send confirmation code" }).click();
      await expect(surface.getByLabel("Email code", { exact: true })).toBeFocused();
      expect(contact?.intent).toBe("ask-ai-contact");
      expect(contact?.scope).toContain("Offer: customer-security-review-sprint");
      expect(contact?.scope).toContain(width < 1024 ? "Visitor-approved question: Help us scope one non-secret customer questionnaire." : "Visitor note: One questionnaire for one product.");
      expect(contact?.scope).toContain(width < 1024 ? "Question sharing: visitor opted in" : "Question sharing: not requested");
      for (const excluded of [firstQuestion, followUpQuestion, generatedQuestionnaireAnswer.template.body, followUpAnswer.template.body]) expect(contact?.scope).not.toContain(excluded);
      await surface.getByRole("button", { name: "Back", exact: true }).click();
      await surface.getByRole("button", { name: "Start over", exact: true }).click();
      await expect(surface).not.toContainText(followUpAnswer.template.body);
      await composer.fill(firstQuestion);
      await surface.getByRole("button", { name: "Ask AI", exact: true }).click();
      await expect(surface).toContainText(generatedQuestionnaireAnswer.template.body);
      expect(submitted[2]).toEqual({ question: firstQuestion, history: [] });
      expect(submitted).toHaveLength(3);
    } finally { await context.close(); }
  }
});

test("public visual review gallery is emitted for mobile and desktop judgment", async ({ browser }) => {
  const screenshotDir = path.join(UI_PROOF_OUTPUT_DIR, "screenshots");
  await mkdir(screenshotDir, { recursive: true });

  const pageCaptures = [
    { name: "homepage-desktop-1440", path: "/", width: 1440, height: 1100 },
    { name: "homepage-mobile-390", path: "/", width: 390, height: 844 },
    { name: "request-en-mobile-390", path: "/review/request?offerId=bounded-workflow-review&offer=Agent+Action+Security+Review", width: 390, height: 844 },
    { name: "request-pl-mobile-390", path: "/pl/review/request?offerId=bounded-workflow-review&offer=Agent+Action+Security+Review", width: 390, height: 844 },
    { name: "request-desktop-1440", path: "/review/request?offerId=bounded-workflow-review&offer=Agent+Action+Security+Review", width: 1440, height: 1100 },
    { name: "catalog-mobile-390", path: "/catalog", width: 390, height: 844 },
    { name: "catalog-desktop-1440", path: "/catalog", width: 1440, height: 1100 },
    { name: "workflow-offer-mobile-390", path: "/catalog/workflows", width: 390, height: 844 },
    { name: "workflow-offer-desktop-1440", path: "/catalog/workflows", width: 1440, height: 1100 },
    { name: "legacy-workflow-s-mobile-390", path: "/catalog/workflow-s", width: 390, height: 844 },
    { name: "legacy-workflow-s-desktop-1440", path: "/catalog/workflow-s", width: 1440, height: 1100 },
  ] as const;

  for (const capture of pageCaptures) {
    const context = await browser.newContext({
      viewport: { width: capture.width, height: capture.height },
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      const response = await page.goto(capture.path, { waitUntil: "networkidle" });
      expect(response?.status(), capture.path).toBe(200);
      if (capture.path === "/catalog/workflow-s") {
        expect(new URL(page.url()).pathname).toBe("/catalog/workflows");
      }
      await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
      const screenshotPath = path.join(screenshotDir, `${capture.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      await expect(fileExists(screenshotPath)).resolves.toBe(true);
      if (capture.width < 1024) {
        await expect(page.getByRole("button", { name: "Open Ask WitnessOps" })).toHaveCount(0);
      }
    } finally {
      await context.close();
    }
  }

  for (const capture of [
    { name: "footer-mobile-390", width: 390, height: 844 },
    { name: "footer-desktop-1440", width: 1440, height: 1100 },
  ] as const) {
    const context = await browser.newContext({
      viewport: { width: capture.width, height: capture.height },
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
      const footer = page.locator("footer");
      await footer.scrollIntoViewIfNeeded();
      if (capture.width < 640) {
        await expect(page.getByRole("button", { name: "Open Ask WitnessOps" })).toHaveCount(0);
      }
      const screenshotPath = path.join(screenshotDir, `${capture.name}.png`);
      await footer.screenshot({ path: screenshotPath });
      await expect(fileExists(screenshotPath)).resolves.toBe(true);
    } finally {
      await context.close();
    }
  }

  const menuContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  try {
    const page = await menuContext.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    const menuToggle = page.locator(
      'button[aria-controls="witnessops-mobile-menu"]',
    );
    await menuToggle.click();
    await expect(menuToggle).toHaveAttribute("aria-expanded", "true");
    const mobileMenu = page.locator("#witnessops-mobile-menu");
    await expect(mobileMenu.getByRole("link", { name: "Ask WitnessOps" })).toHaveAttribute(
      "href",
      "/docs/assistant",
    );
    await mobileMenu.evaluate(async (menu) => {
      await Promise.all(menu.getAnimations().map((animation) => animation.finished));
    });
    const screenshotPath = path.join(screenshotDir, "mobile-menu-open-390.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await expect(fileExists(screenshotPath)).resolves.toBe(true);
  } finally {
    await menuContext.close();
  }
});

async function installClsObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as unknown as {
      __uiProofCls?: number;
      __uiProofClsUnsupported?: boolean;
    };
    target.__uiProofCls = 0;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & {
            value?: number;
            hadRecentInput?: boolean;
          };
          if (!layoutShift.hadRecentInput) {
            target.__uiProofCls =
              (target.__uiProofCls ?? 0) + (layoutShift.value ?? 0);
          }
        }
      });
      observer.observe({ type: "layout-shift", buffered: true });
    } catch {
      target.__uiProofClsUnsupported = true;
    }
  });
}

async function applyContentVariant(
  page: Page,
  scenario: HomepageHeroScenario,
): Promise<void> {
  if (scenario.contentVariant !== "long") {
    return;
  }
  await page
    .locator('[data-ui-proof-id="homepage-hero-headline"]')
    .first()
    .evaluate((element) => {
      element.textContent =
        "Review one consequential agent action before it receives production authority";
      element.setAttribute("data-copy-length", "long");
    });
  await page
    .locator('[data-ui-proof-id="homepage-hero-body"]')
    .first()
    .evaluate((element) => {
      element.textContent =
        "Stress-copy variant: identify who can authorize the action, which identity executes it, what systems and tools it can reach, what constrains its blast radius, and what can be demonstrated afterward.";
    });
}

async function fileExists(filePath: string): Promise<boolean> {
  return access(filePath)
    .then(() => true)
    .catch(() => false);
}
