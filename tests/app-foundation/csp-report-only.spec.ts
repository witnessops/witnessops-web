import { expect, test, type Page, type Response } from "@playwright/test";

async function headerValues(response: { headersArray(): { name: string; value: string }[] | Promise<{ name: string; value: string }[]> }, name: string) {
  const headers = await response.headersArray();
  return headers.filter((header) => header.name.toLowerCase() === name).map((header) => header.value);
}

function directive(policy: string, name: string) {
  const found = policy.split(";").map((part) => part.trim()).find((part) => part === name || part.startsWith(`${name} `));
  expect(found, policy).toBeTruthy();
  return found ?? "";
}

async function violations(page: Page) {
  return page.evaluate(() => (window as Window & { __witnessopsCspViolations?: string[] }).__witnessopsCspViolations ?? []);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as Window & { __witnessopsCspViolations?: string[] };
    target.__witnessopsCspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      target.__witnessopsCspViolations?.push([event.disposition, event.effectiveDirective, event.blockedURI].join(" "));
    });
  });
});

test("signed-out pages keep the enforced CSP, one Referrer-Policy, and zero report-only violations", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/workspace") return route.fulfill({ status: 401, json: { error: "Authentication required" } });
    if (path === "/api/feedback") return route.fulfill({ json: [] });
    if (path === "/api/events") return route.fulfill({ json: { recorded: true } });
    return route.fulfill({ status: 404, json: { error: "Unexpected " + path } });
  });
  const nonces: string[] = [];
  for (const path of ["/", "/assets"]) {
    const response = await page.goto(path);
    expect(response).toBeTruthy();
    const document = response as Response;
    expect(await headerValues(document, "referrer-policy")).toEqual(["no-referrer"]);
    const enforced = await headerValues(document, "content-security-policy");
    expect(enforced).toHaveLength(1);
    expect(enforced[0]).toContain("script-src 'self' 'unsafe-inline'");
    expect(enforced[0]).toContain("img-src 'self' data: blob: https:");
    expect(enforced[0]).toContain("form-action 'self' https://api.workos.com");
    expect(enforced[0]).not.toContain("strict-dynamic");
    const reportOnly = await headerValues(document, "content-security-policy-report-only");
    expect(reportOnly).toHaveLength(1);
    const script = directive(reportOnly[0] ?? "", "script-src");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("unsafe-inline");
    expect(directive(reportOnly[0] ?? "", "img-src")).toBe("img-src 'self'");
    const nonce = script.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();
    nonces.push(nonce ?? "");
    await expect(page.getByRole("heading", { name: "Open WitnessOps", exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const scriptNonces = await page.locator("script").evaluateAll((nodes) => nodes.map((node) => (node as HTMLScriptElement).nonce).filter(Boolean));
    expect(scriptNonces.length).toBeGreaterThan(0);
    expect(new Set(scriptNonces)).toEqual(new Set([nonce]));
    expect(await violations(page)).toEqual([]);
  }
  expect(nonces[0]).not.toEqual(nonces[1]);
});

test("public security.txt and the bypassed share page stay outside the report-only policy", async ({ page }) => {
  const security = await page.goto("/.well-known/security.txt");
  expect(security?.status()).toBe(200);
  expect(await security?.text()).toContain("Contact: mailto:security@witnessops.com");
  expect(await headerValues(security as Response, "content-security-policy-report-only")).toEqual([]);
  expect(await headerValues(security as Response, "referrer-policy")).toEqual(["no-referrer"]);

  await page.route("**/api/shared-report", async (route) => route.fulfill({ status: 404, json: { error: "Unavailable" } }));
  const share = await page.goto("/s");
  expect(share?.status()).toBe(200);
  expect(await headerValues(share as Response, "content-security-policy-report-only")).toEqual([]);
  expect(await headerValues(share as Response, "referrer-policy")).toEqual(["no-referrer"]);
  await expect(page.getByText("This shared report is unavailable, expired or revoked.")).toBeVisible();
});

test("real workspace API response carries one Referrer-Policy", async ({ request }) => {
  const response = await request.get("/api/workspace");
  expect(await headerValues(response, "referrer-policy")).toEqual(["no-referrer"]);
  const reportOnly = await headerValues(response, "content-security-policy-report-only");
  expect(reportOnly.length).toBeGreaterThan(0);
  const script = directive(reportOnly[0] ?? "", "script-src");
  expect(script).not.toContain("unsafe-inline");
  expect(script).toContain("'nonce-");
});
