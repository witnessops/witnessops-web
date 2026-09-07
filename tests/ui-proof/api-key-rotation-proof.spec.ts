import { expect, test } from "@playwright/test";

const SAMPLE_PATH = "/review/sample-cases/ai-agent-action-proof-run";
const VERIFIER_PATH = "/samples/api-key-rotation/v1/verify.mjs";
const REVIEW_HREF =
  "/review/request?offerId=bounded-workflow-review&offer=Agent+Action+Security+Review";

test("the proof page enforces its bounded claim, offer, metadata, and replay contract", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.goto(SAMPLE_PATH, { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "See a key rotation, step by step.",
    }),
  ).toBeVisible();
  await expect(page.getByText("VALID SYNTHETIC SPECIMEN", { exact: true })).toBeVisible();
  const replayButton = page.locator('button[aria-describedby="rotation-replay-boundary"]');
  const initialReplayBox = await replayButton.boundingBox();
  expect(initialReplayBox).not.toBeNull();
  expect(initialReplayBox!.y + initialReplayBox!.height).toBeLessThan(1000);
  await expect(replayButton).toHaveText("Play example");
  await replayButton.click();
  await expect(replayButton).toHaveText("Replay example");
  await expect(replayButton).toBeFocused();
  await expect(page.getByText("Replay complete: 6 of 6 signed events shown.", { exact: true }))
    .toHaveText("Replay complete: 6 of 6 signed events shown.");

  await page.getByText("Full verification limits", { exact: true }).click();
  await expect(page.getByText(/that an AI agent caused or authorized the tool calls/)).toBeVisible();
  await expect(page.getByText(/real-world actor or approver identity/)).toBeVisible();
  await expect(page.getByText(/execution of the declared hard-stop conditions/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Want your own agent action reviewed?" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Agent Action Security Review");
  await expect(page.locator("main")).toContainText("€2,500 fixed · excluding VAT");
  await expect(page.locator("main")).toContainText("One consequential agent or automation action. Prioritised fixes.");
  await expect(page.locator("main")).toContainText("Non-secret fit check first.");
  await expect(page.locator("main")).toContainText("Within 10 working days after evidence rules are agreed");
  await expect(page.locator("main")).not.toContainText("Agent Risk & Control Review");
  await expect(page.locator("main")).not.toContainText("From €1,500");
  await expect(page.locator("main").getByRole("link", { name: "Check fit", exact: true }))
    .toHaveAttribute("href", REVIEW_HREF);

  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    `https://witnessops.com${SAMPLE_PATH}`,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://witnessops.com/og/home",
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    "https://witnessops.com/og/home",
  );
  await expect(page.locator("#ask-witnessops-dialog")).toHaveCount(0);
  await expect(page.locator('[aria-controls="ask-witnessops-dialog"]')).toHaveCount(0);

  const stepControls = page.locator('ol[aria-label="Signed rotation event replay"] button');
  await expect(stepControls).toHaveCount(6);
  for (const button of await stepControls.all()) {
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await stepControls.first().click();
  await expect(page.locator("#rotation-event-detail")).toContainText("Replacement credential created");
  await page.getByText("Evidence for this step", { exact: true }).click();
  await expect(page.locator("#rotation-event-detail")).toContainText("forbidden credential-value fields");

  await context.close();
});

test("altered verifier bytes fail before execution with no unverified fallback", async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  let verifierRequestCount = 0;

  await page.route(
    (url) => url.pathname === VERIFIER_PATH && url.searchParams.has("sha256"),
    async (route) => {
      verifierRequestCount += 1;
      const response = await route.fetch();
      const body = await response.text();
      await route.fulfill({
        response,
        body: `globalThis.__witnessopsTamperedVerifierExecuted = true;\n${body}`,
      });
    },
  );

  await page.goto(SAMPLE_PATH, { waitUntil: "networkidle" });

  await expect(page.getByText("VERIFIER UNAVAILABLE", { exact: true })).toBeVisible();
  await expect(page.getByText(/PUBLIC_VERIFIER_INTEGRITY_OR_LOAD_FAILURE/)).toBeVisible();
  await expect(page.getByText("VALID SYNTHETIC SPECIMEN", { exact: true })).toHaveCount(0);
  expect(verifierRequestCount).toBe(1);
  expect(
    await page.evaluate(
      () =>
        (globalThis as typeof globalThis & {
          __witnessopsTamperedVerifierExecuted?: boolean;
        }).__witnessopsTamperedVerifierExecuted,
    ),
  ).toBeUndefined();

  await context.close();
});

for (const viewport of [
  { width: 1440, height: 1000, label: "desktop" },
  { width: 390, height: 844, label: "mobile" },
] as const) {
  test(`the repaired proof surface has no horizontal overflow on ${viewport.label}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(SAMPLE_PATH, { waitUntil: "networkidle" });
    await expect(page.getByText("VALID SYNTHETIC SPECIMEN", { exact: true })).toBeVisible();

    const replayBox = await page.locator('button[aria-describedby="rotation-replay-boundary"]').boundingBox();
    expect(replayBox).not.toBeNull();
    expect(replayBox!.y + replayBox!.height).toBeLessThan(viewport.height);

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    await context.close();
  });
}
