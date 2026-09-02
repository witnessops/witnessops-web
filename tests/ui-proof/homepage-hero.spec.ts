import { expect, test, type Page } from "@playwright/test";
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
        expect(headlineMetrics.fontSize).toBeGreaterThanOrEqual(37);
        expect(headlineMetrics.fontSize).toBeLessThanOrEqual(43);
      } else {
        expect(headlineMetrics.fontSize).toBeGreaterThanOrEqual(40);
        expect(headlineMetrics.fontSize).toBeLessThanOrEqual(49);
        expect(headlineMetrics.lineCount).toBeLessThanOrEqual(4);
      }
      expect(headlineMetrics.lineHeightRatio).toBeGreaterThanOrEqual(0.94);
      expect(headlineMetrics.lineHeightRatio).toBeLessThanOrEqual(1.06);

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

test("English and Polish homepages share one action-security and receipt journey", async ({ browser }) => {
  for (const scenario of [
    {
      path: "/",
      width: 1440,
      height: 1100,
      primary:
        "/review/request?offerId=bounded-workflow-review&offer=Agent+Action+Security+Review",
      methodHeading: "Five questions. One consequential action.",
      receiptHeading: "Produce something another party can check.",
    },
    {
      path: "/",
      width: 390,
      height: 844,
      primary:
        "/review/request?offerId=bounded-workflow-review&offer=Agent+Action+Security+Review",
      methodHeading: "Five questions. One consequential action.",
      receiptHeading: "Produce something another party can check.",
    },
    {
      path: "/pl",
      width: 1440,
      height: 1100,
      primary:
        "/pl/review/request?offerId=bounded-workflow-review&offer=Agent+Action+Security+Review",
      methodHeading: "Pięć pytań. Jedno istotne działanie.",
      receiptHeading: "Przygotuj zapis, który inna osoba może sprawdzić.",
    },
    {
      path: "/pl",
      width: 390,
      height: 844,
      primary:
        "/pl/review/request?offerId=bounded-workflow-review&offer=Agent+Action+Security+Review",
      methodHeading: "Pięć pytań. Jedno istotne działanie.",
      receiptHeading: "Przygotuj zapis, który inna osoba może sprawdzić.",
    },
  ]) {
    const context = await browser.newContext({
      viewport: { width: scenario.width, height: scenario.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const response = await page.goto(scenario.path, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);

    await expect(page.locator('[data-ui-proof-id="homepage-hero"]')).toBeVisible();
    await expect(page.locator('[data-ui-proof-id="homepage-hero-primary-cta"]')).toHaveAttribute(
      "href",
      scenario.primary,
    );
    await expect(page.locator('[data-ui-proof-id="homepage-demo-cta"]')).toHaveAttribute(
      "href",
      "/review/sample-cases/ai-agent-action-proof-run",
    );
    await expect(page.locator('main[data-home-direction="agent-proof-offer"]')).toHaveCount(1);
    await expect(page.locator("#evidence-questions")).toContainText(scenario.methodHeading);
    await expect(page.locator("#agent-action-receipt")).toContainText(scenario.receiptHeading);
    const primaryOffer = page.locator("#agent-workflow-reconstruction");
    await expect(primaryOffer).toContainText(
      "Agent Action Security Review",
    );
    await expect(primaryOffer).toContainText(
      scenario.path === "/"
        ? "€2,500 fixed · excluding VAT"
        : "€2 500 — cena stała · bez VAT",
    );
    await expect(primaryOffer).toContainText(
      scenario.path === "/"
        ? "One consequential agent or automation action"
        : "Jedno istotne działanie agenta lub automatyzacji",
    );
    await expect(primaryOffer).toContainText(
      scenario.path === "/"
        ? "Non-secret fit check first"
        : "Najpierw wstępna ocena bez informacji poufnych",
    );
    await expect(primaryOffer).toContainText(
      scenario.path === "/"
        ? "Within 10 working days after evidence rules are agreed"
        : "W ciągu 10 dni roboczych po uzgodnieniu zasad dowodowych",
    );
    await expect(primaryOffer).not.toContainText("Agent Risk & Control Review");
    await expect(primaryOffer).not.toContainText("From €1,500");
    await expect(
      page.locator('#agent-workflow-reconstruction a[href="/catalog/workflows"]'),
    ).toHaveCount(1);
    await expect(page.locator('main a[href="/verify/skill"]')).toHaveCount(0);
    await expect(page.locator("main")).toContainText(/Authority → identity|Upoważnienie → tożsamość/);
    await expect(page.locator("main")).toContainText(/Permissions → tools|Uprawnienia → narzędzia/);
    await expect(page.locator("main")).toContainText(/Execution → evidence|Wykonanie → dowody/);
    await expect(page.locator('nav a[href="/verify/skill"]')).toHaveCount(0);
    await expect(page.locator('footer a[href="/verify/skill"]')).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/Aegis/);
    await expect(page.locator("main")).not.toContainText(/Pilot|Pilotaż/);
    await expect(page.locator("[data-public-contact-route]")).toHaveCount(1);

    const sectionIds = await page
      .locator("main > section[id]")
      .evaluateAll((sections) => sections.map((section) => section.id));
    expect(sectionIds).toEqual([
      "evidence-questions",
      "agent-action-receipt",
      "agent-workflow-reconstruction",
    ]);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await context.close();
  }
});

test("Ask WitnessOps keeps the paid-review proof path visible and controlled", async ({ browser }) => {
  for (const viewport of [
    { width: 1440, height: 936 },
    { width: 640, height: 844 },
    { width: 639, height: 844 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });

    try {
      const page = await context.newPage();
      const response = await page.goto("/", { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);

      const trigger = page.getByRole("button", { name: "Open Ask WitnessOps" });
      if (viewport.width < 640) {
        await expect(trigger).toHaveCount(0);
        await page.locator("[data-ask-trigger-guard]").evaluate((guard) => {
          window.scrollTo({
            top: guard.getBoundingClientRect().bottom + window.scrollY + 8,
            behavior: "auto",
          });
        });
      }
      await expect(trigger).toBeVisible();
      await trigger.click();

      const dialog = page.getByRole("dialog", { name: "ASK WITNESSOPS" });
      const prompt = page.getByLabel("Describe one non-secret action");
      await expect(dialog).toBeVisible();
      if (viewport.width < 640) {
        await expect(dialog).toBeFocused();
      } else {
        await expect(prompt).toBeFocused();
      }
      await expect(dialog.locator("[data-ask-composer]")).toHaveCount(1);

      if (viewport.width === 390) {
        const screenshotDir = path.join(UI_PROOF_OUTPUT_DIR, "screenshots");
        await mkdir(screenshotDir, { recursive: true });
        await page.screenshot({
          path: path.join(screenshotDir, "ask-witnessops-mobile-prompt.png"),
          fullPage: false,
        });
      }

      if (viewport.width < 640) {
        await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
        const dialogBox = await dialog.boundingBox();
        expect(dialogBox).not.toBeNull();
        expect(dialogBox?.x).toBe(0);
        expect(dialogBox?.y).toBe(0);
        expect(dialogBox?.width).toBe(viewport.width);
        expect(dialogBox?.height).toBe(viewport.height);
      } else {
        await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
      }

      await dialog.getByText("Agent changed production", { exact: true }).click();
      await expect(dialog.getByText("PUBLIC FIT SIGNAL", { exact: true })).toBeVisible();
      await expect(dialog.getByText("NO EVIDENCE REVIEWED", { exact: true })).toBeVisible();
      await expect(
        dialog.getByText("€2,500 fixed · excluding VAT · One consequential agent or automation action", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        dialog.getByText(
          "Non-secret fit check first · Within 10 working days after evidence rules are agreed",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(dialog).toContainText(
        "Fit signal only. No evidence was reviewed and no security, compliance, correctness, or action-outcome conclusion was made.",
      );
      await expect(dialog.locator("[data-ask-composer]")).toHaveCount(0);
      await expect(dialog.getByRole("button", { name: "Ask another action" })).toBeVisible();

      const cta = dialog.getByRole("button", { name: "Request scope for this action" });
      await expect(cta).toBeVisible();
      const ctaBox = await cta.boundingBox();
      const scrollRegionBox = await dialog
        .locator("[data-ask-scroll-region]")
        .boundingBox();
      expect(ctaBox).not.toBeNull();
      expect(scrollRegionBox).not.toBeNull();
      expect(ctaBox?.height).toBeGreaterThanOrEqual(44);
      expect((ctaBox?.y ?? 0) + (ctaBox?.height ?? 0)).toBeLessThanOrEqual(
        (scrollRegionBox?.y ?? 0) + (scrollRegionBox?.height ?? 0),
      );

      if (viewport.width === 390) {
        await page.screenshot({
          path: path.join(
            UI_PROOF_OUTPUT_DIR,
            "screenshots",
            "ask-witnessops-mobile-result.png",
          ),
          fullPage: false,
        });
      }

      await cta.click();
      await expect(dialog).toHaveAttribute("data-ask-state", "contact");
      await expect(dialog.getByLabel("Public fit signal")).toBeHidden();
      await expect(page.getByLabel("Work email")).toBeFocused();
      await expect(dialog.locator("[data-ask-contact-region]")).toBeVisible();
      const contactFontSize = await page.getByLabel("Work email").evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      );
      expect(contactFontSize).toBeGreaterThanOrEqual(16);

      if (viewport.width === 390) {
        await page.screenshot({
          path: path.join(
            UI_PROOF_OUTPUT_DIR,
            "screenshots",
            "ask-witnessops-mobile-contact.png",
          ),
          fullPage: false,
        });
      }

      await dialog.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    } finally {
      await context.close();
    }
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
      if (capture.width < 640 && capture.path !== "/") {
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
