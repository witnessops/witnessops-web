import { expect, test as base, type Response } from "@playwright/test";

// Browser-context disposal does not reliably send pagehide beacons. Retire only
// sessions created by this test so the real demo's 16-session limit stays intact.
export const test = base.extend<{ bookingCleanup: void }>({
  bookingCleanup: [async ({ page, context }, use) => {
    const tokens = new Set<string>();
    const reads: Promise<void>[] = [];
    const observe = (response: Response) => {
      if (new URL(response.url()).pathname !== "/api/sovereign-booking" || !response.ok()) return;
      if (response.request().postDataJSON()?.action !== "start") return;
      reads.push(response.json().then((data) => { if (/^[a-f0-9]{64}$/.test(data.token)) tokens.add(data.token); }));
    };
    page.on("response", observe);
    try { await use(); }
    finally {
      await Promise.all(reads);
      page.off("response", observe);
      for (const token of tokens) {
        const response = await context.request.post("/api/sovereign-booking", {
          headers: { origin: "http://127.0.0.1:3012" }, data: { action: "end", token },
        });
        expect([200, 401]).toContain(response.status());
      }
    }
  }, { auto: true }],
});
export { expect };
export type { Page, Locator } from "@playwright/test";
