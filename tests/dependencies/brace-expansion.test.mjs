import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const rootRequire = createRequire(new URL("../../package.json", import.meta.url));
const eslintRequire = createRequire(rootRequire.resolve("eslint/package.json"));
const minimatch = eslintRequire("minimatch");

test("ESLint brace expansion preserves ordinary source-file globs", () => {
  assert.deepEqual(minimatch.braceExpand("src/{app,lib}/**/*.{ts,tsx}"), [
    "src/app/**/*.ts",
    "src/app/**/*.tsx",
    "src/lib/**/*.ts",
    "src/lib/**/*.tsx",
  ]);
});

test("ESLint brace expansion bounds repeated malformed-brace repairs", () => {
  // Exceed the fixed default rewrite budget without relying on wall-clock timing.
  const pattern = `{a}${"}".repeat(1001)},z}`;
  assert.deepEqual(minimatch.braceExpand(pattern), [pattern]);
});
