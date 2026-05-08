import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("docs assistant page is a noindex disabled skeleton with no input surface", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(source, /WitnessOps Docs Assistant is not enabled yet\./);
  assert.match(source, /This page is a disabled skeleton/);
  assert.match(source, /does not answer questions/);
  assert.match(source, /retrieve sources/);
  assert.match(source, /call a model/);
  assert.match(source, /verify proof bundles/);
  assert.match(source, /inspect\s+customer data/);
  assert.match(source, /href="\/verify"/);

  assert.doesNotMatch(source, /<form\b/i);
  assert.doesNotMatch(source, /<input\b/i);
  assert.doesNotMatch(source, /submit/i);
  assert.doesNotMatch(source, /Request one proof run|Package one security workflow|Ask the docs/i);
});
