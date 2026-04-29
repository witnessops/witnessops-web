import { expect, test, type BrowserContext, type Page } from "@playwright/test";
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
      await installAssetDelay(context, scenario);
      const page = await context.newPage();
      await installClsObserver(page);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await applyContentVariant(page, scenario);
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
      await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
      await page.waitForTimeout(scenario.assetMode === "delayed" ? 1_400 : 350);

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

async function installAssetDelay(
  context: BrowserContext,
  scenario: HomepageHeroScenario,
): Promise<void> {
  if (scenario.assetMode !== "delayed") {
    return;
  }
  await context.route(/.*(asset-foundry|_next\/image).*/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    await route.continue();
  });
}

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
