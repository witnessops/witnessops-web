import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

// Reuse the app's pinned accessibility engine; this gate adds no dependency.
const axe = createRequire(path.resolve(__dirname, "../../apps/witnessops-web/package.json"))("axe-core") as { source: string };
const evidenceDir = path.resolve("artifacts/ui-proof/gate-one");
const commercialRoutes = [
  "/", "/pricing", "/reviews", "/reviews/agent-action-security-review", "/review/request",
  "/pl", "/pl/reviews", "/pl/reviews/agent-action-security-review", "/pl/review/request",
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { largestContentfulPaintMs: null as number | null, cumulativeLayoutShift: 0 };
    let shiftWindowStart = 0;
    let shiftWindowEnd = 0;
    let shiftWindowValue = 0;
    (window as unknown as { gateOneMetrics: typeof metrics }).gateOneMetrics = metrics;
    if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
      new PerformanceObserver(list => {
        metrics.largestContentfulPaintMs = list.getEntries().at(-1)?.startTime ?? null;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    }
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput: boolean; value: number }>) {
          if (entry.hadRecentInput) continue;
          if (entry.startTime - shiftWindowEnd < 1000 && entry.startTime - shiftWindowStart < 5000) {
            shiftWindowValue += entry.value;
          } else {
            shiftWindowStart = entry.startTime;
            shiftWindowValue = entry.value;
          }
          shiftWindowEnd = entry.startTime;
          metrics.cumulativeLayoutShift = Math.max(metrics.cumulativeLayoutShift, shiftWindowValue);
        }
      }).observe({ type: "layout-shift", buffered: true });
    }
  });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (!(["127.0.0.1", "localhost"].includes(url.hostname))) return route.abort();
    if (url.pathname === "/api/ask-witnessops") return route.fulfill({ status: 204 });
    if (route.request().method() !== "GET" && url.pathname.startsWith("/api/")) return route.abort();
    return route.continue();
  });
});

async function accessibilityViolations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const runtime = (globalThis as unknown as {
      axe: { run: (context: Document, options: object) => Promise<{ violations: Array<{ id: string; impact: string | null; nodes: Array<{ target: unknown[] }> }> }> };
    }).axe;
    const result = await runtime.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return result.violations.map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
  });
}

for (const width of [1440, 390, 320]) {
  test(`Gate 1 commercial pages are readable and accessible at ${width}px`, async ({ page }) => {
    test.setTimeout(240_000);
    await mkdir(evidenceDir, { recursive: true });
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const pageErrors: string[] = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    for (const route of commercialRoutes) {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), route).toBe(200);
      const main = page.getByRole("main");
      await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(main).toContainText("Agent Action Security Review");
      await expect(main).toContainText(/2[,\s\u00a0]?500/);
      await expect(main).not.toContainText(/External Attack Surface Review|€1[,\s]?900|€950|€550|10 working days|3 working days/);
      await expect(main.locator('a[href*="OFFSEC-EXTERNAL-EXPOSURE"]')).toHaveCount(0);
      await expect(main.locator('a[href*="/review/request"]:visible, form:visible').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), route).toBeLessThanOrEqual(1);
      const brokenImages = await page.locator("img").evaluateAll(images => images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.src));
      expect(brokenImages, `${route} broken images`).toEqual([]);
      expect(await accessibilityViolations(page), `${route} WCAG A/AA violations`).toEqual([]);
      const name = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        return {
          source: "Unthrottled local acceptance navigation; no baseline comparison or field-performance claim",
          ...(window as unknown as { gateOneMetrics: { largestContentfulPaintMs: number | null; cumulativeLayoutShift: number } }).gateOneMetrics,
          navigation: navigation ? { responseStartMs: navigation.responseStart, domContentLoadedMs: navigation.domContentLoadedEventEnd, loadMs: navigation.loadEventEnd } : null,
          resources: { count: resources.length, transferBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0), decodedBytes: resources.reduce((sum, resource) => sum + resource.decodedBodySize, 0) },
        };
      });
      await writeFile(path.join(evidenceDir, `${name}-${width}-metrics.json`), `${JSON.stringify(metrics, null, 2)}\n`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(evidenceDir, `${name}-${width}-viewport.png`) });
      await page.screenshot({ path: path.join(evidenceDir, `${name}-${width}.png`), fullPage: true });
    }
    expect(pageErrors).toEqual([]);
  });
}

test("Gate 1 commercial metadata, structured data, sitemap and local links agree", async ({ page, request }) => {
  test.setTimeout(120_000);
  const localLinks = new Set<string>();
  for (const route of commercialRoutes) {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/WitnessOps/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S.{30}/);
    const canonicalPath = route.endsWith("/review/request") ? route.replace("/review/request", "/contact") : route;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://witnessops.com${canonicalPath === "/" ? "" : canonicalPath}`);
    for (const href of await page.locator("nav a[href], main a[href], footer a[href]").evaluateAll(links => links.map(link => link.getAttribute("href") ?? ""))) {
      if (href.startsWith("/") && !href.startsWith("//")) localLinks.add(href.split("#")[0]);
    }
    if (route === "/") {
      const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
      const services = jsonLd.map(value => JSON.parse(value) as { "@type"?: string; itemListElement?: Array<{ item: { name: string; offers: { price: string | number; priceCurrency: string; valueAddedTaxIncluded: boolean } } }> }).find(value => value["@type"] === "ItemList");
      expect(services?.itemListElement).toHaveLength(1);
      expect(services?.itemListElement?.[0].item.name).toBe("Agent Action Security Review");
      expect(Number(services?.itemListElement?.[0].item.offers.price)).toBe(2500);
      expect(services?.itemListElement?.[0].item.offers).toMatchObject({ priceCurrency: "EUR", valueAddedTaxIncluded: false });
    }
  }
  for (const href of localLinks) {
    const response = await request.get(href);
    expect(response.status(), `internal link ${href}`).toBeLessThan(400);
  }
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("https://witnessops.com/reviews/agent-action-security-review");
  expect(xml).not.toContain("/reviews/external-attack-surface-review");
  expect(xml).not.toContain("/catalog/workflows");
});

test("Gate 1 retired sales links explain withdrawal and preserved utility routes remain available", async ({ page, request }) => {
  for (const prefix of ["", "/pl"]) {
    for (const suffix of ["/reviews/external-attack-surface-review", "/catalog/offsec-external-exposure"]) {
      const response = await page.goto(`${prefix}${suffix}`, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      const main = page.getByRole("main");
      await expect(main).toHaveAttribute("data-offer-status", "parked");
      await expect(main).toContainText(prefix ? "To nie jest Agent Action Security Review" : "This is not the Agent Action Security Review");
      await expect(main).not.toContainText(/1[,\s\u00a0]?900/);
      await expect(main.locator('form, a[href*="/review/request"]')).toHaveCount(0);
    }
    for (const suffix of ["/customer-security-review", "/catalog/offsec-local-audit", "/catalog/automation-repair"]) {
      const response = await page.goto(`${prefix}${suffix}`, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(410);
      await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toHaveText(prefix ? "Ta oferta została wycofana" : "This offer has been withdrawn");
      await expect(page.getByRole("main").locator('form, a[href*="/review/request"]')).toHaveCount(0);
    }
    for (const suffix of ["/support", "/privacy", "/security", "/terms", "/verify"]) {
      const response = await request.get(`${prefix}${suffix}`);
      expect(response.status(), `preserved ${prefix}${suffix}`).toBe(200);
    }
  }
});

for (const width of [1440, 320]) {
  test(`Gate 1 primary enquiry is keyboard reachable with visible focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.locator("a.skip-link");
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    const cta = page.locator('main a[href*="/review/request"]').first();
    for (let step = 0; step < 30 && !(await cta.evaluate(element => element === document.activeElement)); step += 1) await page.keyboard.press("Tab");
    await expect(cta).toBeFocused();
    expect(await cta.evaluate(element => {
      const style = getComputedStyle(element);
      return (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
    }), "visible keyboard focus").toBe(true);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/review\/request(?:\?|$)/);
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.locator("main select")).toHaveCount(0);
    await expect(page.locator('main input[name="intent"]')).toHaveValue("agent-action-security-review");
  });
}
