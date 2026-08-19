import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

test("docs home stays small: start paths, browse hubs, limits — not a long matrix", () => {
  assert.match(page, /Documentation/);
  assert.match(page, /Check a receipt first/);
  assert.match(page, /Try an example/);
  assert.match(page, /A valid result confirms the checks named in that receipt/);
  assert.match(page, /Buyer path/);
  assert.match(page, /Verify a receipt/);
  assert.match(page, /href="\/verify"/);
  assert.match(page, /Start a review/);
  assert.match(page, /Browse by area/);
  assert.match(page, /do not claim complete runtime truth/);

  // Fixed: verify CTA must not point only at long verification docs as primary.
  assert.doesNotMatch(
    page,
    /label="Verify a receipt"[\s\S]{0,80}how-it-works\/verification/,
  );

  // Keep the page free of the old multi-matrix tutorial layout.
  assert.doesNotMatch(page, /Page contract/);
  assert.doesNotMatch(page, /Next page handoff/);
  assert.doesNotMatch(page, /Core concepts/);
  assert.doesNotMatch(page, /Security education and response/);
  assert.doesNotMatch(page, /entryPaths/);
});
