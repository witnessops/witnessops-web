import { test, expect } from "@playwright/test";

test("synthetic AASR page and API are absent with the fixture flag off", async ({ request }) => {
  const page = await request.get("/aasr-fixture");
  expect(page.status()).toBe(404);
  expect(await page.text()).not.toContain("northstar-followup-agent");
  const response = await request.get("/api/aasr-fixture");
  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.text()).not.toContain("SYN-AASR-001");
});

test("unknown API paths never fall through to the product shell", async ({ request }) => {
  const response = await request.get("/api/wops-route-does-not-exist");

  expect(response.status()).toBe(404);
  const body = await response.text();
  expect(body).not.toContain("Opening your workspace");
  expect(body).not.toContain('class="product-app"');
});
