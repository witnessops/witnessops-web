import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("operators route remains a hub redirect", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(
    source,
    /permanentRedirect\(getSurfaceUrl\(\"hub\"\)\)/,
    "Operators route should redirect to the canonical hub surface.",
  );
  assert.doesNotMatch(
    source,
    /ContactForm|SupportIntake|CtaButton|\/review\/request/,
    "Operators route should not become a local marketing or intake surface.",
  );
});
