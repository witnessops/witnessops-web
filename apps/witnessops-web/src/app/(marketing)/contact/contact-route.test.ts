import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("contact route remains a redirect into the package request lane", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(
    source,
    /permanentRedirect\(\"\/review\/request\"\)/,
    "Contact route should redirect to the canonical package request lane.",
  );
  assert.doesNotMatch(
    source,
    /ContactForm|SupportIntake|fetch\(\"\/api\/review\/request\"/,
    "Contact route should not become a separate intake surface.",
  );
});
