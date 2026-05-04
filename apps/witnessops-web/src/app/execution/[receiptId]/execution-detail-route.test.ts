import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("execution detail route redirects to proof-backed security systems", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(
    source,
    /permanentRedirect\(\"\/proof-backed-security-systems\"\)/,
    "Execution detail route should redirect to the canonical proof-backed security systems page.",
  );
  assert.doesNotMatch(
    source,
    /ContactForm|SupportIntake|\/review\/request|Request one proof run|Package one security workflow/,
    "Execution detail route should not become a local intake or package request surface.",
  );
});
