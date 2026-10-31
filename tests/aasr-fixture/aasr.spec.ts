import { test, expect, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";

const workspace = "11000000-0000-4000-8000-000000000001";
const api = "/api/aasr-fixture";
async function participant(browser: Browser, baseURL: string, session: string) {
  const context = await browser.newContext({ baseURL });
  await context.addCookies([{ name: "aasr_test_session", value: session, url: baseURL }]);
  const page = await context.newPage();
  await page.goto("/");
  return { context, page };
}
async function act(page: Page, name: string, revision: number) {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByTestId("aasr-revision")).toHaveText(String(revision));
}
async function refresh(page: Page, revision: number) {
  await page.getByRole("button", { name: "Refresh status", exact: true }).click();
  await expect(page.getByTestId("aasr-revision")).toHaveText(String(revision));
}

async function capture(page: Page, info: TestInfo, name: string) {
  // WebKit full-page screenshots can retain a sticky header at the prior scroll
  // position after a command click. Capture the settled top viewport as well.
  await page.evaluate(async () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  const geometry = await page.evaluate(() => ({
    headerBottom: document.querySelector("header")!.getBoundingClientRect().bottom,
    titleTop: document.querySelector("h1")!.getBoundingClientRect().top,
    skipBottom: document.querySelector(".skip-link")!.getBoundingClientRect().bottom,
    scrollTop: window.scrollY,
  }));
  expect(geometry.scrollTop).toBe(0);
  expect(geometry.headerBottom).toBeLessThanOrEqual(geometry.titleTop);
  expect(geometry.skipBottom).toBeLessThanOrEqual(0);
  await page.screenshot({ path: info.outputPath(`${name}-viewport.png`) });
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}

test.beforeEach(async ({ request }) => {
  expect((await request.post("/__test/reset")).ok()).toBeTruthy();
});

test("native HTTP journey preserves separate participants, partial evidence and simulated delivery", async ({ browser, baseURL }, info) => {
  const contexts: BrowserContext[] = [];
  try {
    const owner = await participant(browser, baseURL!, "owner"), reviewer = await participant(browser, baseURL!, "reviewer");
    contexts.push(owner.context, reviewer.context);
    const viewport = info.project.use.viewport;
    if (viewport) { await owner.page.setViewportSize(viewport); await reviewer.page.setViewportSize(viewport); }
    const external: string[] = [];
    for (const { page } of [owner, reviewer]) page.on("request", request => { if (!request.url().startsWith(baseURL!)) external.push(request.url()); });
    await expect(owner.page.getByRole("heading", { name: "Synthetic engagement", exact: true })).toBeVisible();
    await expect(owner.page.getByRole("region", { name: "Recipient preview" })).toHaveCount(0);
    await expect(owner.page.getByRole("button", { name: "Record partial-evidence review", exact: true })).toHaveCount(0);
    await expect(owner.page.getByRole("region", { name: "Evidence provenance" })).toContainText("UNKNOWN");
    await act(owner.page, "Accept fixed scope", 1);
    await act(owner.page, "Submit pinned evidence", 2);
    await owner.page.reload();
    await expect(owner.page.getByTestId("aasr-revision")).toHaveText("2");
    await refresh(reviewer.page, 2);
    await act(reviewer.page, "Admit synthetic evidence", 3);
    await act(reviewer.page, "Record partial-evidence review", 4);
    await expect(reviewer.page.getByRole("region", { name: "Review report" })).toContainText("PARTIAL_EVIDENCE");
    await expect(reviewer.page.getByRole("button", { name: "Accept report", exact: true })).toHaveCount(0);
    await refresh(owner.page, 4);
    await act(owner.page, "Accept report", 5);
    await refresh(reviewer.page, 5);
    await act(reviewer.page, "Prepare recipient preview", 6);
    const preview = reviewer.page.getByRole("region", { name: "Recipient preview", exact: true });
    await expect(preview).toBeVisible();
    await expect(preview).toContainText("PARTIAL_EVIDENCE");
    await expect(preview).toContainText("No report has been sent.");
    await expect(preview).not.toContainText("declaredValue");
    await expect(preview).not.toContainText("rawBytes");
    await expect(preview.getByRole("link")).toHaveCount(0);
    await capture(reviewer.page, info, "aasr-recipient-preview");
    await act(reviewer.page, "Simulate delivery", 7);
    await refresh(owner.page, 7);
    await act(owner.page, "Close engagement", 8);
    await expect(owner.page.getByRole("heading", { name: "Engagement closed", exact: true })).toBeVisible();
    await expect(owner.page.getByText("DELIVERY SIMULATED · 0 external actions", { exact: true })).toBeVisible();
    await expect(owner.page.getByRole("button", { name: "Close engagement", exact: true })).toHaveCount(0);
    expect(await owner.page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await capture(owner.page, info, "aasr-closed");
    expect(external).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

test("stale controls refresh the authoritative revision without replaying an accepted action", async ({ browser, baseURL }) => {
  const first = await participant(browser, baseURL!, "owner"), second = await participant(browser, baseURL!, "owner");
  try {
    await expect(second.page.getByTestId("aasr-revision")).toHaveText("0");
    await act(first.page, "Accept fixed scope", 1);
    await second.page.getByRole("button", { name: "Accept fixed scope", exact: true }).click();
    await expect(second.page.getByRole("alert")).toBeVisible();
    await expect(second.page.getByTestId("aasr-revision")).toHaveText("1");
    await expect(second.page.getByRole("button", { name: "Accept fixed scope", exact: true })).toHaveCount(0);
  } finally { await first.context.close(); await second.context.close(); }
});

for (const session of ["viewer", "stranger"]) {
  test(`${session} cannot access the engagement or assert reviewer authority`, async ({ browser, baseURL }) => {
    const { context, page } = await participant(browser, baseURL!, session);
    try {
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("region", { name: "Engagement status" })).toHaveCount(0);
      const result = await context.request.post(api, { headers: { Origin: baseURL!, "X-WitnessOps-Workspace": workspace }, data: { command: "record_review", expectedRevision: 0, role: "reviewer" } });
      expect(result.ok()).toBeFalsy();
      expect(await result.text()).not.toContain("northstar-followup-agent");
    } finally { await context.close(); }
  });
}
