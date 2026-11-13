import { expect, test } from "@playwright/test";

const chapters = [
  "001-the-unauthorized-feline",
  "002-sir-whiskers-opens-a-pull-request",
  "003-the-meeting-nobody-authorized",
  "004-the-agent-who-scheduled-a-meeting-with-himself",
  "005-the-dashboard-that-never-was",
  "2040-the-scope-escalation",
];

for (const width of [390, 1440]) {
  test(`Chronicle illustrations load in their reading layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const slug of chapters) {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      expect((await page.goto(`/chronicles/${slug}`))?.status()).toBe(200);
      const hero = page.locator("[data-editorial-hero]");
      await expect(hero.locator("img")).toHaveAttribute("alt", /^Illustrative artwork:/);
      const bounds = (await hero.boundingBox())!;
      expect(bounds.width).toBeLessThanOrEqual(1200);
      expect(bounds.width / bounds.height).toBeCloseTo(width === 390 ? 16 / 9 : 16 / 5, 1);
      const figures = page.locator("[data-chronicle-illustration]");
      await expect(figures).toHaveCount(4);
      for (const image of await page.locator("[data-editorial-hero] img, [data-chronicle-illustration] img").all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    }
  });
}

test("Chronicles index keeps the five chapters and links the illustrated future receipt separately", async ({ page }) => {
  await page.goto("/chronicles");
  await expect(page.locator("main ol img")).toHaveCount(5);
  await expect(page.locator("main ol a")).toHaveCount(5);
  const futureReceipts = page.getByRole("region", { name: "Receipts from the Future" });
  await expect(futureReceipts.locator("img")).toHaveCount(1);
  await expect(futureReceipts.getByRole("link", { name: "The Scope Escalation" })).toHaveAttribute("href", "/chronicles/2040-the-scope-escalation");
});
