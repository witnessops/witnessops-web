import { expect, test } from "@playwright/test";

const SAMPLE_PATH = "/review/sample-cases/ai-agent-action-proof-run";
const VERIFIER_PATH = "/samples/api-key-rotation/v1/verify.mjs";
const REVIEW_HREF =
  "/review/request?offerId=bounded-workflow-review&offer=Agent+Workflow+Reconstruction";

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
      name: "A synthetic key was flagged. The authorized rotation tool handled it.",
    }),
  ).toBeVisible();
  await expect(page.getByText("VALID SYNTHETIC SPECIMEN", { exact: true })).toBeVisible();
  await expect(page.getByText(/that an AI agent caused or authorized the tool calls/)).toBeVisible();
  await expect(page.getByText(/real-world actor or approver identity/)).toBeVisible();
  await expect(page.getByText(/execution of the declared hard-stop conditions/)).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Agent Workflow Reconstruction — €2,500 fixed.",
    }),
  ).toBeVisible();
  await expect(page.getByText(/Bring one consequential workflow\./)).toBeVisible();
  await expect(page.getByText(/separates what was authorised, executed, observed, and still unresolved/)).toBeVisible();
  await expect(page.getByText(/Entry begins with a non-secret fit check/)).toBeVisible();
  await expect(
    page.getByText(/delivery is within 10 working days after evidence rules are agreed/),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Agent Risk & Control Review");
  await expect(page.locator("main")).not.toContainText("From €1,500");
  await expect(page.getByRole("link", { name: /Request a non-secret fit check/ })).toHaveAttribute(
    "href",
    REVIEW_HREF,
  );

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

  const pendingTypography = await page
    .locator('ol[aria-label="Signed rotation event replay"] li')
    .first()
    .evaluate((row) => {
      const elements = [
        row.children.item(0),
        row.children.item(1),
        row.children.item(2)?.children.item(0),
      ].filter((element): element is Element => element instanceof Element);
      return elements.map((element) => {
        const style = getComputedStyle(element);
        return { fontSize: Number.parseFloat(style.fontSize), color: style.color };
      });
    });
  expect(pendingTypography).toHaveLength(3);
  for (const style of pendingTypography) {
    expect(style.fontSize).toBeGreaterThanOrEqual(12);
    expect(style.color).toBe("rgb(152, 163, 155)");
  }

  const replayButton = page.locator('button[aria-describedby="rotation-replay-boundary"]');
  await expect(replayButton).toHaveText(/ACKNOWLEDGE SCOPE & REPLAY/);
  await replayButton.click();
  await expect(replayButton).toHaveText(/REPLAY SIGNED RUN AGAIN/);
  await expect(replayButton).toBeFocused();
  await expect(
    page.getByText("Replay complete: 6 of 6 signed events shown.", { exact: true }),
  ).toHaveText("Replay complete: 6 of 6 signed events shown.");

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

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    await context.close();
  });
}
