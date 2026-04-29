import type { Page } from "@playwright/test";
import type { CheckResult, Metrics } from "./report";
import type { ReducedMotion, ScenarioSeverity } from "./scenarios";

const uiProofSelector = (id: string) => `[data-ui-proof-id="${id}"]`;

export async function checkHomepageHero(
  page: Page,
  severity: ScenarioSeverity,
  reducedMotion: ReducedMotion,
): Promise<{ checks: CheckResult[]; metrics: Metrics }> {
  const checks: CheckResult[] = [];
  checks.push(await selectorExists(page, "homepage-hero", severity));
  checks.push(await selectorExists(page, "homepage-hero-underlay", severity));
  checks.push(await selectorExists(page, "homepage-hero-headline", severity));
  checks.push(await selectorExists(page, "homepage-hero-body", severity));
  checks.push(await selectorExists(page, "homepage-hero-primary-cta", severity));
  checks.push(
    await selectorVisible(page, "homepage-hero-headline", "headline visible", severity),
  );
  checks.push(await selectorVisible(page, "homepage-hero-body", "body visible", severity));
  checks.push(
    await selectorVisible(
      page,
      "homepage-hero-primary-cta",
      "primary CTA visible",
      severity,
    ),
  );

  const ctaBox = await page
    .locator(uiProofSelector("homepage-hero-primary-cta"))
    .first()
    .boundingBox()
    .catch(() => null);
  checks.push({
    name: "primary CTA width >= 44 CSS px",
    status: ctaBox && ctaBox.width >= 44 ? "pass" : "fail",
    severity,
    expected: ">= 44",
    actual: ctaBox?.width ?? null,
  });
  checks.push({
    name: "primary CTA height >= 44 CSS px",
    status: ctaBox && ctaBox.height >= 44 ? "pass" : "fail",
    severity,
    expected: ">= 44",
    actual: ctaBox?.height ?? null,
  });

  const scrollMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  checks.push({
    name: "no horizontal scroll",
    status:
      scrollMetrics.scrollWidth <= scrollMetrics.clientWidth + 1 ? "pass" : "fail",
    severity,
    expected: "scrollWidth <= clientWidth + 1",
    actual: `${scrollMetrics.scrollWidth}/${scrollMetrics.clientWidth}`,
  });

  const pointerEvents = await page
    .locator(uiProofSelector("homepage-hero-underlay"))
    .first()
    .evaluate((element) => window.getComputedStyle(element).pointerEvents)
    .catch(() => null);
  checks.push({
    name: "underlay pointer-events is none",
    status: pointerEvents === "none" ? "pass" : "fail",
    severity,
    expected: "none",
    actual: pointerEvents,
  });

  const activeAnimationCount = await activeHeroAnimationCount(page);
  checks.push({
    name: "reduced-motion animation risk absent",
    status:
      reducedMotion === "reduce"
        ? activeAnimationCount === 0
          ? "pass"
          : "fail"
        : "pass",
    severity,
    expected:
      reducedMotion === "reduce"
        ? "0 active CSS animations inside homepage hero"
        : "not applicable unless reduced motion is active",
    actual: activeAnimationCount,
  });

  const cls = await page
    .evaluate(() =>
      Number((window as unknown as { __uiProofCls?: number }).__uiProofCls ?? 0),
    )
    .catch(() => 0);
  checks.push({
    name: "CLS under 0.1",
    status: cls < 0.1 ? "pass" : "fail",
    severity,
    expected: "< 0.1",
    actual: Number(cls.toFixed(4)),
  });

  return {
    checks,
    metrics: {
      cls: Number(cls.toFixed(4)),
      ctaWidth: ctaBox ? Number(ctaBox.width.toFixed(2)) : undefined,
      ctaHeight: ctaBox ? Number(ctaBox.height.toFixed(2)) : undefined,
      scrollWidth: scrollMetrics.scrollWidth,
      clientWidth: scrollMetrics.clientWidth,
      activeAnimationCount,
    },
  };
}

export function screenshotEmittedCheck(
  emitted: boolean,
  screenshotPath: string,
  severity: ScenarioSeverity,
): CheckResult {
  return {
    name: "scenario screenshot emitted",
    status: emitted ? "pass" : "fail",
    severity,
    expected: "screenshot file exists",
    actual: emitted ? screenshotPath : null,
  };
}

async function selectorExists(
  page: Page,
  id: string,
  severity: ScenarioSeverity,
): Promise<CheckResult> {
  const count = await page.locator(uiProofSelector(id)).count();
  return {
    name: `${id} exists`,
    status: count > 0 ? "pass" : "fail",
    severity,
    expected: ">= 1",
    actual: count,
  };
}

async function selectorVisible(
  page: Page,
  id: string,
  label: string,
  severity: ScenarioSeverity,
): Promise<CheckResult> {
  const locator = page.locator(uiProofSelector(id)).first();
  const exists = (await locator.count()) > 0;
  const visible = exists ? await locator.isVisible() : false;
  return {
    name: label,
    status: visible ? "pass" : "fail",
    severity,
    expected: "visible",
    actual: visible,
  };
}

async function activeHeroAnimationCount(page: Page): Promise<number> {
  return page
    .locator(uiProofSelector("homepage-hero"))
    .first()
    .evaluate((hero) => {
      const parseDurationMs = (value: string): number => {
        const trimmed = value.trim();
        if (trimmed.endsWith("ms")) {
          return Number.parseFloat(trimmed) || 0;
        }
        if (trimmed.endsWith("s")) {
          return (Number.parseFloat(trimmed) || 0) * 1000;
        }
        return Number.parseFloat(trimmed) || 0;
      };

      return Array.from(hero.querySelectorAll("*")).filter((element) => {
        const style = window.getComputedStyle(element);
        const names = style.animationName.split(",").map((name) => name.trim());
        const durations = style.animationDuration
          .split(",")
          .map((duration) => parseDurationMs(duration));
        const playStates = style.animationPlayState
          .split(",")
          .map((state) => state.trim());
        return names.some((name, index) => {
          const duration = durations[index] ?? durations[0] ?? 0;
          const playState = playStates[index] ?? playStates[0] ?? "running";
          return name !== "none" && duration > 0 && playState !== "paused";
        });
      }).length;
    })
    .catch(() => Number.NaN);
}
