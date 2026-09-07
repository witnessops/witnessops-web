import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(__dirname, "../..");
const baselineRoot = __dirname;

const addedOfferRoutes = ["/catalog/automation-repair", "/pl/catalog/automation-repair"] as const;

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

  const manifest = actual as { staticRoutes: { page: string; regex: string; namedRegex: string; routeKeys: object }[] };
  const additions = manifest.staticRoutes.filter(route => addedOfferRoutes.some(path => path === route.page));
  assert.deepEqual(additions.map(route => route.page), [...addedOfferRoutes]);
  for (const route of additions) {
    const pattern = `^${route.page.replace("automation-repair", "automation\\-repair")}(?:/)?$`;
    assert.deepEqual(route, { page: route.page, regex: pattern, routeKeys: {}, namedRegex: pattern });
  }
  assert.deepEqual({ ...manifest, staticRoutes: manifest.staticRoutes.filter(route => !addedOfferRoutes.some(path => path === route.page)) }, expected);
});

test("app-paths-manifest matches the frozen baseline", () => {
  const actual = loadJson(
    resolve(repoRoot, "apps/witnessops-web/.next/server/app-paths-manifest.json"),
  );
  const expected = loadJson(
    resolve(baselineRoot, "app-paths-manifest.baseline.json"),
  );

  const manifest = { ...(actual as Record<string, string>) };
  for (const route of ["/(marketing)/catalog/automation-repair/page", "/pl/catalog/automation-repair/page"]) {
    assert.equal(manifest[route], `app${route}.js`);
    delete manifest[route];
  }
  assert.deepEqual(manifest, expected);
});
