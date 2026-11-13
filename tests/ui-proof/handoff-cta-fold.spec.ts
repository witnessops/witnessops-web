import { mkdirSync, writeFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

const viewports = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
] as const;

const targets = [
  { path: "/", selector: '[data-ui-proof-id="homepage-hero-primary-cta"]', label: "en-home" },
  { path: "/pl", selector: '[data-ui-proof-id="homepage-hero-primary-cta"]', label: "pl-home" },
  { path: "/reviews/agent-action-security-review", selector: '[data-ui-proof-id="offer-in-page-cta"]', label: "en-aasr" },
  { path: "/pl/reviews/agent-action-security-review", selector: '[data-ui-proof-id="offer-in-page-cta"]', label: "pl-aasr" },
] as const;

for (const viewport of viewports) {
  for (const target of targets) {
    test(`${target.label} in-page CTA sits inside ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(target.path, { waitUntil: "networkidle" });
      const box = await page.locator(target.selector).boundingBox();
      expect(box, target.label).not.toBeNull();
      const top = box?.y ?? 0;
      const bottom = top + (box?.height ?? 0);
      const clearance = viewport.height - bottom;
      const measurement = {
        label: target.label,
        path: target.path,
        width: viewport.width,
        height: viewport.height,
        y: Math.round(top),
        bottom: Math.round(bottom),
        clearance: Math.round(clearance),
      };
      mkdirSync("/opt/cursor/artifacts", { recursive: true });
      writeFileSync(
        `/opt/cursor/artifacts/cta-${target.label}-${viewport.width}.json`,
        `${JSON.stringify(measurement, null, 2)}\n`,
      );
      console.log(JSON.stringify(measurement));
      expect(top, JSON.stringify(measurement)).toBeGreaterThanOrEqual(0);
      expect(clearance, JSON.stringify(measurement)).toBeGreaterThanOrEqual(12);
    });
  }
}
