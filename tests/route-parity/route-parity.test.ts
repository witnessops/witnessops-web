import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(__dirname, "../..");
const baselineRoot = __dirname;

const addedOfferRoutes = ["/catalog/automation-repair", "/check", "/pl/catalog/automation-repair", "/proofpack", "/research", "/research/reading-a-public-exposure-snapshot"] as const;

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
  assert.deepEqual({ ...manifest, headers: manifest.headers.filter(header => !["/proofpack", "/check"].includes(header.source)), staticRoutes: manifest.staticRoutes.filter(route => !addedOfferRoutes.some(path => path === route.page)) }, expected);
});

test("app-paths-manifest matches the frozen baseline", () => {
  const actual = loadJson(
    resolve(repoRoot, "apps/witnessops-web/.next/server/app-paths-manifest.json"),
  );
  const expected = loadJson(
    resolve(baselineRoot, "app-paths-manifest.baseline.json"),
  );

  const manifest = { ...(actual as Record<string, string>) };
  for (const route of ["/(marketing)/catalog/automation-repair/page", "/pl/catalog/automation-repair/page", "/proofpack/page", "/check/page", "/api/external-exposure/route", "/research/page", "/research/reading-a-public-exposure-snapshot/page"]) {
    assert.equal(manifest[route], `app${route}.js`);
    delete manifest[route];
  }
  assert.deepEqual(manifest, expected);
});
