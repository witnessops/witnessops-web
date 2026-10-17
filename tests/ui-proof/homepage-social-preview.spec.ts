import { expect, test } from "@playwright/test";

const IMAGE_PATH = "/og/witnessops-home-editorial-a-2026-10.png";
const IMAGE_URL = `https://witnessops.com${IMAGE_PATH}`;

test("homepages publish the canonical WitnessOps Editorial A preview", async ({ page, request }) => {
  for (const path of ["/", "/pl"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", IMAGE_URL);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", IMAGE_URL);
  }

  await page.goto("/");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Proof other people can check. | WitnessOps",
  );
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    "content",
    "WitnessOps reviews AI agents and internet-facing systems, with written findings, supporting evidence and clear limits.",
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");

  const asset = await request.get(IMAGE_PATH);
  expect(asset.status()).toBe(200);
  expect(asset.headers()["content-type"]).toMatch(/^image\/png/);
  const bytes = await asset.body();
  expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);

  const previous = await request.get("/og/home", { maxRedirects: 0 });
  expect(previous.status()).toBe(308);
  expect(previous.headers().location).toContain(IMAGE_PATH);
});
