import { expect, test } from "@playwright/test";

const scenarios = [
  { path: "/library", width: 1440, height: 1100, columns: 3 },
  { path: "/library", width: 768, height: 1024, columns: 2 },
  { path: "/library", width: 390, height: 844, columns: 1 },
  { path: "/pl/library", width: 1440, height: 1100, columns: 3 },
  { path: "/pl/library", width: 768, height: 1024, columns: 2 },
  { path: "/pl/library", width: 390, height: 844, columns: 1 },
] as const;

const expectedDestinations = {
  "/library": [
    "/catalog",
    "/review/request",
    "/customer-security-review",
    "/why-witnessops",
    "/docs/getting-started/proof-run-buyer-path",
    "/review/sample-cases/ai-agent-action-proof-run",
    "/review/sample-report",
    "/review/sample-cases",
    "/catalog/workflows",
    "/catalog/offsec",
    "/verify",
    "/docs/how-it-works/verification",
    "/docs",
  ],
  "/pl/library": [
    "/pl/catalog",
    "/pl/review/request",
    "/pl/customer-security-review",
    "/pl/why-witnessops",
    "/pl/docs",
    "/pl/customer-security-review",
    "/pl/verify",
    "/pl/catalog",
    "/pl/verify",
    "/pl/docs",
  ],
} as const;

test("Library routes remain responsive, discoverable, and bounded", async ({ browser }) => {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: { width: scenario.width, height: scenario.height },
    });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(scenario.path, { waitUntil: "networkidle" });
    expect(response?.status(), `${scenario.path} should return 200`).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth, `${scenario.path} should not overflow`).toBeLessThanOrEqual(
      viewport.clientWidth + 1,
    );

    const sections = page.locator("main section");
    await expect(sections).toHaveCount(6);
    const sectionBoxes = await sections.evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { x: Math.round(box.x), y: Math.round(box.y), right: Math.round(box.right), height: Math.round(box.height) };
      }),
    );
    const columnPositions = [...new Set(sectionBoxes.map((box) => box.x))];
    expect(columnPositions, `${scenario.path} grid columns`).toHaveLength(scenario.columns);
    expect(sectionBoxes.filter((box) => box.x < -1 || box.right > scenario.width + 1)).toEqual([]);

    const rows = sectionBoxes.reduce<Map<number, typeof sectionBoxes>>((result, box) => {
      result.set(box.y, [...(result.get(box.y) ?? []), box]);
      return result;
    }, new Map());
    for (const row of rows.values()) {
      const heights = row.map((box) => box.height);
      expect(Math.max(...heights) - Math.min(...heights), `${scenario.path} equal-height row`).toBeLessThanOrEqual(1);
    }

    const links = page.locator("main section a");
    const destinations = await links.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href")),
    );
    expect(destinations).toEqual([...expectedDestinations[scenario.path]]);
    for (let index = 0; index < (await links.count()); index += 1) {
      const link = links.nth(index);
      expect((await link.textContent())?.trim().length ?? 0).toBeGreaterThan(0);
      const box = await link.boundingBox();
      expect(box?.height, `${scenario.path} resource target ${index}`).toBeGreaterThanOrEqual(44);
      await link.focus();
      const focusVisible = await link.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.outlineStyle !== "none" || style.boxShadow !== "none";
      });
      expect(focusVisible, `${scenario.path} resource focus ${index}`).toBe(true);
    }

    const boundary = scenario.path.startsWith("/pl/")
      ? "Nie są materiałem klienta ani certyfikacją zgodności."
      : "Each example is not a live customer artifact.";
    await expect(page.locator("main")).toContainText(boundary);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    await context.close();
  }
});
