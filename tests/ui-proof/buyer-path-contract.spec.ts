import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { runBuyerPathIntakeProbes } from "../../scripts/smoke-buyer-path";

const evidenceDir = "/opt/cursor/artifacts/buyer-path";

async function shot(page: Page, name: string) {
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({
    path: path.join(evidenceDir, `${name}.png`),
    fullPage: false,
  });
}

test("catalogue and pricing open the two public request paths and withdrawn routes stay closed", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto("/catalog", { waitUntil: "networkidle" });
  await expect(page.locator("main")).toContainText("Two focused security reviews.");
  await expect(page.locator("main")).not.toContainText("Private Pilot");
  await expect(page.locator("main")).not.toContainText("€950");
  await page.getByRole("link", { name: "Scope an AI review", exact: true }).click();
  await expect(page).toHaveURL(/\/review\/request\?offerId=agent-action-security-review(?:&|$)/);
  await expect(page.locator('main form input[name="intent"]')).toHaveValue(
    "agent-action-security-review",
  );
  await expect(page.locator("main form")).toBeVisible();
  await shot(page, "catalogue-agent-action-request");

  await page.goto("/catalog", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Scope an external review", exact: true }).click();
  await expect(page).toHaveURL(/\/review\/request\?productId=OFFSEC-EXTERNAL-EXPOSURE(?:&|$)/);
  await expect(page.locator('main form input[name="intent"]')).toHaveValue(
    "OFFSEC-EXTERNAL-EXPOSURE",
  );
  await shot(page, "catalogue-external-request");

  await page.goto("/pricing", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Scope an AI review", exact: true }).click();
  await expect(page).toHaveURL(/offerId=agent-action-security-review/);
  expect(new URL(page.url()).searchParams.get("productId")).toBeNull();
  await shot(page, "pricing-agent-action-request");

  await page.goto("/pricing", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Scope an external review", exact: true }).click();
  await expect(page).toHaveURL(/productId=OFFSEC-EXTERNAL-EXPOSURE/);
  expect(new URL(page.url()).searchParams.get("offerId")).toBeNull();
  await shot(page, "pricing-external-request");

  await page.goto("/catalog/workflows", { waitUntil: "networkidle" });
  const workflows = page.locator("main");
  await expect(workflows).toContainText("AI Agent Tools & Access Review");
  await expect(workflows).toContainText("Starting at €2,500 · excluding VAT");
  await expect(workflows).toContainText("This review is not offered for new engagements.");
  await expect(workflows.locator('a[href*="offerId=agent-action-security-review"]')).toHaveCount(0);
  await expect(workflows.locator('a[href*="/review/request"]')).toHaveCount(0);
  await expect(workflows.locator("form")).toHaveCount(0);
  await shot(page, "historical-workflows");

  for (const withdrawn of [
    "/catalog/automation-repair",
    "/customer-security-review",
    "/catalog/professional-public-footprint-audit",
  ]) {
    await page.goto(withdrawn, { waitUntil: "networkidle" });
    const main = page.locator("main");
    await expect(main).toContainText("This review is not offered for new engagements.");
    await expect(main.locator('a[href*="/review/request"]')).toHaveCount(0);
    await expect(main.locator("form")).toHaveCount(0);
    if (withdrawn === "/catalog/automation-repair") {
      await shot(page, "withdrawn-automation-repair");
    }
  }

  await page.goto("/review/request?offerId=agent-tools-access-review&productId=OFFSEC-EXTERNAL-EXPOSURE", {
    waitUntil: "networkidle",
  });
  await expect(page.locator("main h1")).toContainText("This link does not start a new review");
  await expect(page.locator("main form")).toHaveCount(0);
  await shot(page, "conflicting-request-closed");

  await page.goto("/review/request", { waitUntil: "networkidle" });
  const options = page.locator("main select option");
  await expect(options).toHaveCount(2);
  await expect(options.nth(0)).toHaveAttribute("value", "agent-action-security-review");
  await expect(options.nth(1)).toHaveAttribute("value", "OFFSEC-EXTERNAL-EXPOSURE");
  await expect(page.locator("main")).not.toContainText("Private Pilot");
  await shot(page, "chooser-two-offers");

  await page.goto("/check", { waitUntil: "networkidle" });
  await expect(page.locator("main h1")).toContainText("Check your public exposure.");
  await expect(page.getByRole("button", { name: "Run free check" })).toBeVisible();
  await shot(page, "free-hostname-check");

  const intake = await runBuyerPathIntakeProbes(baseURL ?? "http://127.0.0.1:3001");
  const failed = intake.filter((result) => !result.ok);
  expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
});
