import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(__dirname, "../..");
const baselineRoot = __dirname;

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

  assert.deepEqual(actual, expected);
});

test("app-paths-manifest matches the frozen baseline", () => {
  const actual = loadJson(
    resolve(repoRoot, "apps/witnessops-web/.next/server/app-paths-manifest.json"),
  );
  const expected = loadJson(
    resolve(baselineRoot, "app-paths-manifest.baseline.json"),
  );

  assert.deepEqual(actual, expected);
});
