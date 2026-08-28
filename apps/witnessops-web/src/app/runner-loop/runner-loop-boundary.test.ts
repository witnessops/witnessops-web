import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("runner-loop remains a noindex operational diagram surface", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(source, /RUNNER LOOP DIAGRAM/);
  assert.match(source, /Standalone state machine diagram/);
  assert.match(source, /Canonical Path/);
  assert.match(source, /Runner Loop Specification/);
  assert.match(source, /System Invariant/);
  assert.match(source, /<main id="main-content" tabIndex=\{-1\}/);

  assert.doesNotMatch(source, /Request one proof run|Package one security workflow|ContactForm|SupportIntake|\/review\/request/);
  assert.doesNotMatch(source, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
});
