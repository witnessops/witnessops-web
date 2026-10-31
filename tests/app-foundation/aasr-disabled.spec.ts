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
