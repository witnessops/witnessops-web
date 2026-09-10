import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 390, height: 667 },
  { width: 430, height: 932 },
];

test.beforeEach(async ({ page, baseURL }) => {
  const localOrigin = new URL(baseURL!).origin;
  // Visual checks never send a question, model request, or external telemetry.
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/ask-witnessops") {
      await route.fulfill({ status: 204 });
    } else if (url.origin !== localOrigin && ["http:", "https:"].includes(url.protocol)) {
      await route.abort();
    } else {
      await route.continue();
    }
  });
});

async function expectSharedCopy(page: Page) {
  await expect(page.locator('[data-ui-proof-id="homepage-hero-headline"]')).toHaveText(
    "Find security gaps in your AI and automation.",
  );
  await expect(page.locator('[data-ui-proof-id="homepage-hero-body"]')).toHaveText(
    "For product and operations teams whose AI and automations change records, move money or control access. Understand the risks, inspect the evidence and decide what to fix.",
  );
  const primary = page.locator('[data-ui-proof-id="homepage-hero-primary-cta"]');
  await expect(primary).toHaveText("Scope a review");
  await expect(primary).toHaveAttribute("href", "/review/request");
  await expect(page.locator('[data-ui-proof-id="homepage-sample-review-cta"]')).toHaveAttribute(
    "href", "/catalog/workflows#sample-review",
  );
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
}

async function runningAnimations(figure: Locator) {
  return figure.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.playState === "running" || animation.pending).length);
}

async function expectReadableLabels(figure: Locator) {
  const problems = await figure.evaluate(root => {
    const figureBox = root.getBoundingClientRect();
    return Array.from(root.querySelectorAll("*"))
      .filter(element => element.childElementCount === 0
        && Boolean(element.textContent?.trim())
        && !["TITLE", "STYLE", "SCRIPT"].includes(element.tagName.toUpperCase())
        && !element.closest('[aria-hidden="true"]'))
      .flatMap(element => {
        const style = getComputedStyle(element);
        const elementBox = element.getBoundingClientRect();
        if (style.display === "none" || style.visibility === "hidden" || elementBox.width === 0) return [];
        const range = document.createRange();
        range.selectNodeContents(element);
        const textBox = range.getBoundingClientRect();
        const label = element.textContent!.trim();
        const findings: string[] = [];
        if (Number.parseFloat(style.fontSize) < 11) findings.push(`${label}: font smaller than 11px`);
        if (textBox.width <= 0 || textBox.height <= 0) findings.push(`${label}: no rendered text box`);
        if (textBox.left < figureBox.left - 2 || textBox.right > figureBox.right + 2) {
          findings.push(`${label}: text extends outside the figure`);
        }
        if (textBox.left < -1 || textBox.right > document.documentElement.clientWidth + 1) {
          findings.push(`${label}: text extends outside the viewport`);
        }
        return findings;
      });
  });
  expect(problems).toEqual([]);
}

async function expectEnglishFinding(figure: Locator) {
  await expect(figure).toContainText(/refund\s*€4,800/i);
  await expect(figure).toContainText(/Approval before refund/i);
  await expect(figure).toContainText(/Refund recorded/i);
  await expect(figure).toContainText(/Fictional example/i);
  await expect(figure).toContainText(/No (?:actual )?system tested/i);
  const finding = figure.getByText(/Approval not evidenced\.?/, { exact: true });
  await expect(finding).toBeVisible();
  const opacity = await finding.evaluate(element => {
    let opacity = 1;
    let current: Element | null = element;
    while (current) {
      opacity *= Number.parseFloat(getComputedStyle(current).opacity);
      current = current.parentElement;
    }
    return opacity;
  });
  expect(opacity).toBeGreaterThanOrEqual(0.99);
}

async function expectRefinedStructure(figure: Locator, width: number) {
  const panel = figure.locator("[data-hero-finding]");
  await expect(panel).toHaveCount(1);
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/Approval not evidenced\.?|Brak dowodu zatwierdzenia/);
  await expect(panel.locator("dt")).toHaveCount(2);
  const point = figure.locator("[data-hero-gap-point]:visible");
  await expect(point).toHaveCount(1);
  await expect(point).toBeVisible();
  await expect(point).toHaveCSS("fill", "none");
  await expect(point).toHaveCSS("opacity", "1");
  await expect(figure.getByText(/^(?:REFUND\s*€4,800|ZWROT\s*4 800 €)$/i)).toBeVisible();
  const context = figure.locator("[data-hero-context]");
  await expect(context).toHaveCount(1);
  if (width <= 700) {
    await expect(context).toBeHidden();
  } else {
    await expect(context).toBeVisible();
    await expect(context).toContainText("Customer request");
    await expect(context).toContainText("Refund tool");
  }
}

async function capture(locator: Locator, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  // Freeze settled evidence at the final frame, including previously offscreen layers.
  await locator.screenshot({ path, animations: name.endsWith("settled") ? "disabled" : "allow" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const viewport of viewports) {
  test(`Gap is the default hero and stays readable at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const figure = page.locator("[data-hero-gap]");
    await expect(figure).toHaveCount(1);
    await expect(figure).toBeVisible();
    const durations = await figure.evaluate(element => element.getAnimations({ subtree: true })
      .filter(animation => animation instanceof CSSAnimation)
      .map(animation => animation.effect!.getComputedTiming().endTime));
    expect(durations.length).toBeGreaterThan(0);
    for (const duration of durations) expect(Number(duration)).toBeLessThan(2_800);
    await expect.poll(() => runningAnimations(figure), { timeout: 2_800, intervals: [100] }).toBe(0);
    await expectSharedCopy(page);
    await expectEnglishFinding(figure);
    await expectRefinedStructure(figure, viewport.width);
    await expectReadableLabels(figure);
    await expectNoOverflow(page);

    const mobile = viewport.width <= 700;
    await expect(figure.locator(`[data-hero-trace="${mobile ? "vertical" : "horizontal"}"]`)).toBeVisible();
    await expect(figure.locator(`[data-hero-trace="${mobile ? "horizontal" : "vertical"}"]`)).toBeHidden();
    const primary = page.locator('[data-ui-proof-id="homepage-hero-primary-cta"]');
    const sample = page.locator('[data-ui-proof-id="homepage-sample-review-cta"]');
    const measurements = {
      primary: await primary.boundingBox(),
      figure: await figure.boundingBox(),
      sample: await sample.boundingBox(),
      checkpoint: await figure.locator("[data-hero-gap-point]:visible").boundingBox(),
    };
    if (mobile) {
      expect(measurements.primary!.y + measurements.primary!.height).toBeLessThan(viewport.height);
      expect(measurements.figure!.y).toBeLessThan(500);
      expect(measurements.figure!.y - measurements.primary!.y - measurements.primary!.height).toBeLessThanOrEqual(33);
      expect(measurements.checkpoint!.y).toBeLessThan(viewport.height);
      expect(measurements.sample!.y).toBeGreaterThanOrEqual(measurements.figure!.y + measurements.figure!.height);
      await expect(page.locator('[data-ui-proof-id="homepage-hero-mobile-body"]')).toBeVisible();
      await expect(page.locator('[data-ui-proof-id="homepage-hero-body"]')).toBeHidden();
      await expect(page.getByText("Permissions", { exact: true }).first()).toBeHidden();
      for (const row of await figure.locator("dl > div").all()) {
        const term = await row.locator("dt").boundingBox();
        const description = await row.locator("dd").boundingBox();
        expect(description!.y).toBeGreaterThanOrEqual(term!.y + term!.height);
      }
      await expect(figure.locator("[data-hero-finding]")).toHaveCSS("border-left-width", "0px");
    }
    // A single DOM sequence, with no duplicated responsive links or CSS ordering.
    const readingOrder = await page.locator('[data-ui-proof-id="homepage-hero"] header').evaluate(root => {
      const sequence = [
        '[data-ui-proof-id="homepage-hero-headline"]',
        '[data-ui-proof-id="homepage-hero-primary-cta"]',
        '[data-hero-gap]',
        '[data-ui-proof-id="homepage-sample-review-cta"]',
      ].map(selector => root.querySelector(selector)!);
      return sequence.slice(1).every((node, index) => Boolean(sequence[index].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    expect(readingOrder).toBe(true);
    await expect(sample).toHaveCount(1);
    expect(measurements.sample!.height).toBeGreaterThanOrEqual(44);
    if (mobile) {
      const trigger = page.getByRole("button", { name: "Ask WitnessOps", exact: true });
      await expect(trigger).toBeVisible();
      // Reserve horizontal clearance independent of scroll position, including
      // when each value/link crosses the launcher's fixed vertical position.
      const launcher = await trigger.boundingBox();
      for (const element of [figure.getByText("Approval not evidenced.", { exact: true }), ...await figure.locator("dt, dd").all(), sample]) {
        const bounds = await element.boundingBox();
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(launcher!.x - 8);
      }
      expect(await figure.locator("[data-hero-finding]").evaluate(e => e.getBoundingClientRect().height)).toBeLessThan(165);
    }
    await testInfo.attach("viewport-measurements", { body: JSON.stringify(measurements), contentType: "application/json" });
    const name = `gap-polish-${viewport.width}x${viewport.height}`;
    await page.screenshot({ path: testInfo.outputPath(`${name}-first-viewport.png`), animations: "allow" });
    const hero = page.locator('[data-ui-proof-id="homepage-hero"]');
    await capture(hero, testInfo, `${name}-hero-settled`);
    await capture(figure, testInfo, `${name}-visual-settled`);
    if (viewport.width === 1440 || (viewport.width === 390 && viewport.height === 844)) {
      // Scrub only existing CSS animations; create no synthetic effects.
      const paused = await figure.evaluate(element => {
        const animations = element.getAnimations({ subtree: true })
          .filter(animation => animation instanceof CSSAnimation);
        for (const animation of animations) {
          animation.pause();
          animation.currentTime = 1_400;
        }
        return animations.length;
      });
      expect(paused).toBeGreaterThan(0);
      await capture(figure, testInfo, `${name}-visual-motion-1400ms`);
    }
    expect(errors).toEqual([]);
  });
}

test("Polish homepage keeps its localized copy and Gap labels readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pl", { waitUntil: "networkidle" });
  const figure = page.locator("[data-hero-gap]");
  await expect(figure).toHaveCount(1);
  await expect(figure).toBeVisible();
  await expect(figure).toContainText(/4[\s,.]?800/);
  await expect(figure).toContainText(/zatwierdzen/i);
  await expect(page.locator('[data-ui-proof-id="homepage-hero-headline"]'))
    .toHaveText("Znajdź luki w bezpieczeństwie AI i automatyzacji.");
  await expect(page.locator('[data-ui-proof-id="homepage-hero-primary-cta"]'))
    .toHaveAttribute("href", "/pl/review/request");
  await expectRefinedStructure(figure, 390);
  await expectReadableLabels(figure);
  await expectNoOverflow(page);
});

test("reduced motion immediately shows the final finding without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const figure = page.locator("[data-hero-gap]");
  await expect(figure).toBeVisible();
  expect(await runningAnimations(figure)).toBe(0);
  await expectEnglishFinding(figure);
  await expectRefinedStructure(figure, 390);
  const policyBox = await figure.locator("[data-hero-policy]").boundingBox();
  const pointBox = await figure.locator("[data-hero-gap-point]:visible").boundingBox();
  expect(policyBox!.x).toBeGreaterThan(pointBox!.x + pointBox!.width);
  expect(policyBox!.y).toBeGreaterThan(pointBox!.y);
  expect(policyBox!.y + policyBox!.height).toBeLessThan(pointBox!.y + pointBox!.height);
  await expectReadableLabels(figure);
  await expectNoOverflow(page);
});

test("homepage has no concept controls and preserves keyboard access to both CTAs", async ({ page, browserName }) => {
  for (const route of ["/", "/?hero=inspection", "/?hero=proofpack"]) {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.locator("[data-hero-gap]")).toHaveCount(1);
    await expect(page.locator("[data-hero-concept]")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Local hero concepts" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Replay animation", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Compare concepts", exact: true })).toHaveCount(0);
    await expectSharedCopy(page);
  }
  const primary = page.locator('[data-ui-proof-id="homepage-hero-primary-cta"]');
  const sample = page.locator('[data-ui-proof-id="homepage-sample-review-cta"]');
  await primary.focus();
  await expect(primary).toBeFocused();
  // This macOS WebKit uses Option-Tab to include links, including in a plain HTML fixture.
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(sample).toBeFocused();
});
