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

test("English and Polish homepages share one agent-risk and receipt journey", async ({ browser }) => {
  for (const scenario of [
    {
      path: "/",
      width: 1440,
      height: 1100,
      primary:
        "/review/request?offerId=bounded-workflow-review&offer=Agent+Risk+%26+Control+Review",
      methodHeading: "Five questions. One bounded workflow.",
      receiptHeading: "Produce something another party can check.",
    },
    {
      path: "/",
      width: 390,
      height: 844,
      primary:
        "/review/request?offerId=bounded-workflow-review&offer=Agent+Risk+%26+Control+Review",
      methodHeading: "Five questions. One bounded workflow.",
      receiptHeading: "Produce something another party can check.",
    },
    {
      path: "/pl",
      width: 1440,
      height: 1100,
      primary:
        "/pl/review/request?offerId=bounded-workflow-review&offer=Agent+Risk+%26+Control+Review",
      methodHeading: "Pięć pytań. Jeden ograniczony workflow.",
      receiptHeading: "Przygotuj zapis, który inna osoba może sprawdzić.",
    },
    {
      path: "/pl",
      width: 390,
      height: 844,
      primary:
        "/pl/review/request?offerId=bounded-workflow-review&offer=Agent+Risk+%26+Control+Review",
      methodHeading: "Pięć pytań. Jeden ograniczony workflow.",
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
    await expect(page.locator("#agent-risk-control")).toContainText(
      "Agent Risk & Control Review",
    );
    await expect(page.locator('#agent-risk-control a[href="/catalog/workflows"]')).toHaveCount(1);
    await expect(page.locator('main a[href="/verify/skill"]')).toHaveCount(1);
    await expect(page.locator("main")).toContainText(/Check the agent before it acts|Sprawdź agenta przed działaniem/);
    await expect(page.locator("main")).toContainText(/See one bounded action|Zobacz jedno ograniczone działanie/);
    await expect(page.locator("main")).toContainText(/Inspect what happened|Sprawdź, co się wydarzyło/);
    await expect(page.locator("main")).toContainText(/Bring the real workflow|Przynieś prawdziwy workflow/);
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
      "agent-risk-control",
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
      await expect(trigger).toBeVisible();
      await trigger.click();

      const dialog = page.getByRole("dialog", { name: "ASK WITNESSOPS" });
      const prompt = page.getByLabel("Describe one non-secret workflow");
      await expect(dialog).toBeVisible();
      await expect(prompt).toBeFocused();

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
      await expect(dialog.getByText("From €1,500 · One agentic or automated workflow", { exact: true })).toBeVisible();
      await expect(dialog).toContainText(
        "Fit signal only. No evidence was reviewed and no security, compliance, correctness, or action-outcome conclusion was made.",
      );

      const cta = dialog.getByRole("button", { name: "Request scope for this workflow" });
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
        "Proof operations need visible, verifiable evidence across every handoff, exception, and approval boundary";
    });
  await page
    .locator('[data-ui-proof-id="homepage-hero-body"]')
    .first()
    .evaluate((element) => {
      element.textContent =
        "Stress-copy variant: every AI-assisted workflow needs a durable public-facing proof surface that remains readable on narrow mobile screens, even when copy expands during localization, policy review, or launch-day edits.";
    });
}

async function fileExists(filePath: string): Promise<boolean> {
  return access(filePath)
    .then(() => true)
    .catch(() => false);
}
