import { expect, test } from "@playwright/test";

const scenarios = [
  { path: "/pl/library", width: 1440, height: 1100, moreRouteColumns: 2 },
  { path: "/pl/library", width: 768, height: 1024, moreRouteColumns: 2 },
  { path: "/pl/library", width: 390, height: 844, moreRouteColumns: 1 },
] as const;

const expectedDestinations = {
  "/pl/library": [
    "/pl/catalog",
    "/pl/customer-security-review",
    "/pl/verify",
    "/pl/why-witnessops",
    "/pl/docs",
    "/pl/customer-security-review",
    "/pl/review/request",
    "/pl/catalog",
    "/review/sample-cases",
    "/review/sample-cases/ai-agent-action-proof-run",
    "/review/sample-cases/sbom-cisa-2026-minimum-elements",
    "/pl/verify",
    "/docs/how-it-works/verification",
    "/docs",
  ],
} as const;

const skillSlugs = [
  "governed-agent-verifier",
  "receipt-first-verifier",
  "claim-boundary-copy",
  "governed-recon",
  "evidence-capture-and-chain",
  "proof-run-handover",
  "key-custody-hygiene",
  "decision-fabric-validator",
  "mcp-tool-hygiene",
  "offboarding-evidence",
  "sample-case-authoring",
] as const;

test("English Skill Library resolves all exact-byte first-party routes", async ({ browser }) => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto("/library", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("main h1")).toHaveText("All Skills Library");
    const skillCards = page.locator('main section[aria-label="First-party skills"] a');
    await expect(skillCards).toHaveCount(11);
    expect(await skillCards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))))
      .toEqual(skillSlugs.map((slug) => `/library/${slug}`));
    for (let index = 0; index < 11; index += 1) {
      expect((await skillCards.nth(index).boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  for (const slug of skillSlugs) {
    const response = await page.goto(`/library/${slug}`, { waitUntil: "domcontentloaded" });
    expect(response?.status(), slug).toBe(200);
    const version = slug === "governed-agent-verifier" ? "1.0.1" : "1.0.0";
    await expect(page.getByRole("link", { name: "Check this exact version" })).toHaveAttribute(
      "href",
      new RegExp(`^/verify/skill\\?skill=${slug}&version=${version.replaceAll(".", "\\.")}&sha256=[a-f0-9]{64}$`),
    );
    await expect(page.getByRole("link", { name: "Download SKILL.md" })).toHaveAttribute(
      "href",
      slug === "governed-agent-verifier"
        ? `/library/${slug}/versions/${version}/download`
        : `/library/${slug}/download`,
    );
  }
  const missing = await page.goto("/library/not-a-public-skill", { waitUntil: "domcontentloaded" });
  expect(missing?.status()).toBe(404);
  await context.close();
});

test("Polish Library route remains responsive, discoverable, and bounded", async ({ browser }) => {
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

    const moreRouteCards = page.locator(
      'main > div > section[aria-labelledby="library-more-heading"] > div > section',
    );
    await expect(moreRouteCards).toHaveCount(4);
    const sectionBoxes = await moreRouteCards.evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { x: Math.round(box.x), y: Math.round(box.y), right: Math.round(box.right), height: Math.round(box.height) };
      }),
    );
    const columnPositions = [...new Set(sectionBoxes.map((box) => box.x))];
    expect(columnPositions, `${scenario.path} more-route grid columns`).toHaveLength(
      scenario.moreRouteColumns,
    );
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
