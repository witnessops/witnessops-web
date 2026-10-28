import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { runBuyerPathIntakeProbes } from "../../scripts/smoke-buyer-path";

const evidenceDir = path.resolve("artifacts/ui-proof/buyer-path");

async function shot(page: Page, name: string) {
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({
    path: path.join(evidenceDir, `${name}.png`),
    fullPage: false,
  });
}

test("catalogue and pricing open the agent request path and withdrawn routes stay closed", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto("/catalog", { waitUntil: "networkidle" });
  await expect(page.locator("main")).toContainText("Agent Action Security Review");
  await expect(page.locator("main")).not.toContainText("Private Pilot");
  await expect(page.locator("main")).not.toContainText("€950");
  await page.locator("[data-buyer-service='agent-action-security-review']").getByRole("link", { name: "Request an agent review", exact: true }).click();
  await expect(page).toHaveURL(/\/review\/request\?offerId=agent-action-security-review(?:&|$)/);
  await expect(page.locator('main form input[name="intent"]')).toHaveValue(
    "agent-action-security-review",
  );
  await expect(page.locator("main form")).toBeVisible();
  await shot(page, "catalogue-agent-action-request");

  await page.goto("/pricing", { waitUntil: "networkidle" });
  await page.locator("[data-buyer-service='agent-action-security-review']").getByRole("link", { name: "Request an agent review", exact: true }).click();
  await expect(page).toHaveURL(/offerId=agent-action-security-review/);
  expect(new URL(page.url()).searchParams.get("productId")).toBeNull();
  await shot(page, "pricing-agent-action-request");

  for (const withdrawn of [
    "/catalog/workflows",
    "/catalog/automation-repair",
    "/customer-security-review",
  ]) {
    const response = await page.goto(withdrawn, { waitUntil: "networkidle" });
    expect(response?.status(), withdrawn).toBe(410);
    const main = page.locator("main");
    await expect(main.locator("h1")).toHaveText("This offer has been withdrawn");
    await expect(main).toContainText("WitnessOps no longer offers this review.");
    await expect(main.locator('a[href="/reviews/agent-action-security-review"]')).toHaveCount(1);
    await expect(main.locator('a[href="/reviews/external-attack-surface-review"]')).toHaveCount(0);
    await expect(main.locator('a[href*="/review/request"]')).toHaveCount(0);
    await expect(main.locator("form")).toHaveCount(0);
    if (withdrawn === "/catalog/automation-repair") {
      await shot(page, "withdrawn-automation-repair");
    }
  }

  const historical = await page.goto("/catalog/professional-public-footprint-audit", {
    waitUntil: "networkidle",
  });
  expect(historical?.status()).toBe(200);
  const historicalMain = page.locator("main");
  await expect(historicalMain).toContainText("This review is not offered for new engagements.");
  await expect(historicalMain.locator('a[href*="/review/request"]')).toHaveCount(0);
  await expect(historicalMain.locator("form")).toHaveCount(0);

  await page.goto("/review/request?offerId=agent-tools-access-review&productId=OFFSEC-EXTERNAL-EXPOSURE", {
    waitUntil: "networkidle",
  });
  await expect(page.locator("main h1")).toContainText("This link does not start a new review");
  await expect(page.locator("main form")).toHaveCount(0);
  await shot(page, "conflicting-request-closed");

  await page.goto("/review/request", { waitUntil: "networkidle" });
  await expect(page.locator("main select")).toHaveCount(0);
  await expect(page.locator('main form input[name="intent"]')).toHaveValue("agent-action-security-review");
  await expect(page.locator("main")).not.toContainText("Private Pilot");
  await shot(page, "agent-review-request");

  await page.goto("/check", { waitUntil: "networkidle" });
  await expect(page.locator("main h1")).toContainText("Check your public exposure.");
  await expect(page.getByRole("button", { name: "Run free check" })).toBeVisible();
  await shot(page, "free-hostname-check");

  const intake = await runBuyerPathIntakeProbes(baseURL ?? "http://127.0.0.1:3001");
  const failed = intake.filter((result) => !result.ok);
  expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
});
