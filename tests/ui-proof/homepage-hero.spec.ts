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
import { HOMEPAGE_SYNTHETIC_PREVIEW } from "../../apps/witnessops-web/src/components/marketing/homepage-synthetic-preview";

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

test("English and Polish homepages share one service-led buyer journey", async ({ browser }) => {
  const expectedOrder = [
    "customer-security-review-sprint",
    "bounded-workflow-review",
    "one-server-security-check",
    "launch-readiness-check",
    "key-access-custody-review",
    "incident-readiness-review",
  ];

  for (const scenario of [
    {
      path: "/",
      width: 1440,
      height: 1100,
      primary: "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE&offer=External+Exposure+Assessment",
    },
    {
      path: "/",
      width: 390,
      height: 844,
      primary: "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE&offer=External+Exposure+Assessment",
    },
    {
      path: "/pl",
      width: 1440,
      height: 1100,
      primary: "/pl/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE&offer=Ocena+ekspozycji+zewn%C4%99trznej",
    },
    {
      path: "/pl",
      width: 390,
      height: 844,
      primary: "/pl/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE&offer=Ocena+ekspozycji+zewn%C4%99trznej",
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
    const serviceCards = page.locator("[data-home-service]");
    await expect(serviceCards).toHaveCount(6);
    expect(
      await serviceCards.evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-home-service")),
      ),
    ).toEqual(expectedOrder);
    await expect(page.locator("main")).not.toContainText(/Pilot|Pilotaż/);
    await expect(page.locator('[data-home-service="external-exposure-assessment"]')).toHaveCount(0);
    await expect(page.locator("[data-public-contact-route]")).toHaveCount(1);

    const syntheticPreview = page.locator(
      `[data-home-synthetic-preview="${HOMEPAGE_SYNTHETIC_PREVIEW.findingId}"]`,
    );
    await expect(syntheticPreview).toBeVisible();
    await expect(
      syntheticPreview.locator(
        `[data-home-evidence="${HOMEPAGE_SYNTHETIC_PREVIEW.evidenceId}"]`,
      ),
    ).toBeVisible();
    await expect(
      syntheticPreview.locator('[data-home-sample-action="finding-preview"]'),
    ).toHaveCount(1);

    if (scenario.width === 1440) {
      const servicesTop = await page
        .locator("#home-services-heading")
        .evaluate((heading) => heading.closest("section")?.getBoundingClientRect().top ?? Infinity);
      expect(servicesTop).toBeLessThan(scenario.height);
    }

    const headings = await page.locator("main h2").allTextContents();
    const normalized = headings.map((heading) => heading.trim());
    const offersIndex = normalized.findIndex((heading) =>
      /Need a different review|Potrzebujesz innego przeglądu/.test(
        heading,
      ),
    );
    const howIndex = normalized.findIndex((heading) =>
      /How it works|Jak to działa/.test(heading),
    );
    const whyIndex = normalized.findIndex((heading) =>
      /Why WitnessOps|Dlaczego WitnessOps/.test(heading),
    );
    expect(offersIndex).toBeGreaterThanOrEqual(0);
    expect(howIndex).toBeGreaterThan(offersIndex);
    expect(whyIndex).toBeGreaterThan(howIndex);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await context.close();
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
