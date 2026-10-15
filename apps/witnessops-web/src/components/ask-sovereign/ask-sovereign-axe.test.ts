import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import axe from "axe-core";
import puppeteer from "puppeteer-core";

function chromeBinary(): string | null {
  for (const candidate of ["google-chrome", "google-chrome-stable", "chromium"]) {
    try {
      return execFileSync("which", [candidate], { encoding: "utf8" }).trim();
    } catch {
      continue;
    }
  }
  return null;
}

const pages = [
  { name: "en-desktop", path: "/docs/assistant", width: 1440, height: 900 },
  { name: "en-mobile", path: "/docs/assistant", width: 390, height: 844 },
  { name: "pl-desktop", path: "/pl/docs/assistant", width: 1440, height: 900 },
  { name: "pl-mobile", path: "/pl/docs/assistant", width: 390, height: 844 },
] as const;

test("axe audits Ask Sovereign in English and Polish at desktop and mobile", async (t) => {
  const chrome = chromeBinary();
  if (!chrome) {
    t.skip("Chrome is not available for the axe audit");
    return;
  }
  let marker = false;
  try {
    const response = await fetch("http://127.0.0.1:3001/docs/assistant");
    marker = response.ok && (await response.text()).includes("data-sovereign-preview");
  } catch {
    marker = false;
  }
  if (!marker) {
    t.skip("Ask Sovereign preview is not being served on 127.0.0.1:3001");
    return;
  }

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const report: Array<{ name: string; violations: Array<{ id: string; impact: string | null; help: string }> }> = [];
  try {
    for (const target of pages) {
      const page = await browser.newPage();
      await page.setViewport({ width: target.width, height: target.height, deviceScaleFactor: 1 });
      await page.goto(`http://127.0.0.1:3001${target.path}`, { waitUntil: "networkidle0", timeout: 30000 });
      await page.addScriptTag({ content: axe.source });
      const result = await page.evaluate(async () => {
        const axeRuntime = (globalThis as unknown as { axe: { run: () => Promise<{ violations: Array<{ id: string; impact: string | null; help: string; nodes: unknown[] }> }> } }).axe;
        const ran = await axeRuntime.run({ include: ["[data-sovereign-preview]"] });
        return ran.violations.map((item) => ({ id: item.id, impact: item.impact, help: item.help, nodes: item.nodes.length }));
      });
      report.push({ name: target.name, violations: result });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(report, null, 2));
  const blocking = report.flatMap((entry) =>
    entry.violations.filter((item) => item.impact === "serious" || item.impact === "critical").map((item) => `${entry.name} ${item.impact} ${item.id}`),
  );
  assert.deepEqual(blocking, []);
});
