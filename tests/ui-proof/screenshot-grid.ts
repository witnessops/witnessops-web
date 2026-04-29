import type { Browser } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ScenarioResult } from "./report";

export async function writeScreenshotGrid(
  browser: Browser,
  results: ScenarioResult[],
  outputPath: string,
): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const cards = await Promise.all(
    results.map(async (result) => {
      const imageSrc = result.screenshotPath
        ? await screenshotDataUri(path.resolve(process.cwd(), result.screenshotPath))
        : null;
      const failedChecks = result.checks.filter((check) => check.status === "fail");
      return `
        <article class="card">
          <header>
            <p class="scenario">${escapeHtml(result.scenario.name)}</p>
            <p class="status status-${escapeHtml(result.status)}">${escapeHtml(result.status)}</p>
          </header>
          <dl>
            <div><dt>Viewport</dt><dd>${result.scenario.viewport.width}x${result.scenario.viewport.height}</dd></div>
            <div><dt>DPR</dt><dd>${result.scenario.deviceScaleFactor}</dd></div>
            <div><dt>Theme</dt><dd>${escapeHtml(result.scenario.colorScheme)}</dd></div>
            <div><dt>Motion</dt><dd>${escapeHtml(result.scenario.reducedMotion)}</dd></div>
          </dl>
          ${
            imageSrc
              ? `<img src="${imageSrc}" alt="Screenshot for ${escapeHtml(result.scenario.name)}" />`
              : `<div class="missing">Screenshot missing</div>`
          }
          ${
            failedChecks.length > 0
              ? `<ul>${failedChecks
                  .map((check) => `<li>${escapeHtml(check.name)}</li>`)
                  .join("")}</ul>`
              : `<p class="passed">All semantic checks passed.</p>`
          }
        </article>
      `;
    }),
  );

  const context = await browser.newContext({
    viewport: {
      width: 1280,
      height: Math.max(900, 520 * Math.ceil(results.length / 2) + 180),
    },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.setContent(
    `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Homepage Hero UI Proof Grid</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 32px;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #070707;
            color: #f7f7f7;
          }
          h1 {
            margin: 0 0 24px;
            font-size: 28px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
          }
          .card {
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 16px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.04);
          }
          header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 12px;
          }
          .scenario {
            margin: 0;
            font-weight: 700;
          }
          .status {
            margin: 0;
            padding: 4px 10px;
            border-radius: 999px;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.08em;
          }
          .status-pass {
            background: rgba(79, 209, 197, 0.16);
          }
          .status-warn {
            background: rgba(251, 191, 36, 0.18);
          }
          .status-fail {
            background: rgba(248, 113, 113, 0.2);
          }
          dl {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
            margin: 0 0 12px;
          }
          dt {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.56);
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          dd {
            margin: 2px 0 0;
            font-size: 13px;
          }
          img {
            display: block;
            width: 100%;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.12);
          }
          ul {
            margin: 12px 0 0;
            padding-left: 20px;
            color: #fecaca;
            font-size: 13px;
          }
          .passed {
            margin: 12px 0 0;
            color: rgba(255, 255, 255, 0.72);
            font-size: 13px;
          }
          .missing {
            display: grid;
            min-height: 260px;
            place-items: center;
            border-radius: 12px;
            border: 1px dashed rgba(255, 255, 255, 0.24);
            color: rgba(255, 255, 255, 0.58);
          }
        </style>
      </head>
      <body>
        <h1>Homepage Hero UI Proof</h1>
        <main class="grid">${cards.join("\n")}</main>
      </body>
    </html>`,
    { waitUntil: "load" },
  );
  await page.locator("body").screenshot({ path: outputPath });
  await context.close();
}

async function screenshotDataUri(absolutePath: string): Promise<string> {
  const image = await readFile(absolutePath);
  return `data:image/png;base64,${image.toString("base64")}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}
