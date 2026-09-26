import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(__dirname, "../..");
const baselineRoot = __dirname;

const addedOfferRoutes = ["/catalog/automation-repair", "/check", "/early-access", "/pl/catalog/automation-repair", "/proofpack", "/research", "/research/reading-a-public-exposure-snapshot", "/review/sample-cases/wops-0001"] as const;

function loadJson(path: string) {
  return JSON.parse(readFileSync(path, "utf-8")) as unknown;
}

test("routes-manifest matches the frozen baseline", () => {
  const actual = loadJson(
    resolve(repoRoot, "apps/witnessops-web/.next/routes-manifest.json"),
  );
  const expected = loadJson(
    resolve(baselineRoot, "routes-manifest.baseline.json"),
  );

  const manifest = actual as { staticRoutes: { page: string; regex: string; namedRegex: string; routeKeys: object }[]; headers: {source:string; headers:{key:string;value:string}[];regex:string}[] };
  const additions = manifest.staticRoutes.filter(route => addedOfferRoutes.some(path => path === route.page));
  assert.deepEqual(additions.map(route => route.page), [...addedOfferRoutes]);
  for (const route of additions) {
    const pattern = `^${route.page.replaceAll("-", "\\-")}(?:/)?$`;
    assert.deepEqual(route, { page: route.page, regex: pattern, routeKeys: {}, namedRegex: pattern });
  }
  const proofpackHeaders = manifest.headers.filter(header => header.source === "/proofpack");
  assert.equal(proofpackHeaders.length, 1);
  assert.deepEqual(proofpackHeaders[0], {
    source: "/proofpack", regex: "^/proofpack(?:/)?$", headers: [
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "no-store" },
    ],
  });
  const checkHeaders = manifest.headers.filter(header => header.source === "/check");
  assert.deepEqual(checkHeaders, [{
    source: "/check", regex: "^/check(?:/)?$", headers: [
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "no-store" },
    ],
  }]);
  const analyticsSources = ["/", "/:section(pricing|privacy|terms|security|media-kit|why|support|review|docs|articles|research|services|catalog|library|why-witnessops)/:path*"];
  const analyticsHeaders = manifest.headers.filter(header => analyticsSources.includes(header.source));
  assert.equal(analyticsHeaders.length, 2);
  const baseCsp = manifest.headers.find(header => header.source === "/:path*")!.headers.find(header => header.key === "Content-Security-Policy")!.value;
  for (const header of analyticsHeaders) {
    assert.deepEqual(header.headers, [{ key: "Content-Security-Policy", value: baseCsp.replace("script-src 'self'", "script-src 'self' https://static.cloudflareinsights.com/beacon.min.js").replace("connect-src 'self'", "connect-src 'self' https://cloudflareinsights.com/cdn-cgi/rum") }]);
    for (const excluded of ["/admin", "/api/admin/workos/callback", "/check", "/proofpack", "/package/private", "/assessment/private", "/verify-token"]) assert.equal(new RegExp(header.regex).test(excluded), false);
  }
  assert.deepEqual({ ...manifest, headers: manifest.headers.filter(header => !["/proofpack", "/check", ...analyticsSources].includes(header.source)), staticRoutes: manifest.staticRoutes.filter(route => !addedOfferRoutes.some(path => path === route.page)) }, expected);
});

test("app-paths-manifest matches the frozen baseline", () => {
  const actual = loadJson(
    resolve(repoRoot, "apps/witnessops-web/.next/server/app-paths-manifest.json"),
  );
  const expected = loadJson(
    resolve(baselineRoot, "app-paths-manifest.baseline.json"),
  );

  const manifest = { ...(actual as Record<string, string>) };
  for (const route of ["/(marketing)/catalog/automation-repair/page", "/pl/catalog/automation-repair/page", "/proofpack/page", "/check/page", "/early-access/page", "/api/external-exposure/route", "/research/page", "/research/reading-a-public-exposure-snapshot/page", "/review/sample-cases/wops-0001/page"]) {
    assert.equal(manifest[route], `app${route}.js`);
    delete manifest[route];
  }
  assert.deepEqual(manifest, expected);
});
