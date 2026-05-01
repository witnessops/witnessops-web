import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("status route remains a redirect to the canonical status surface", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(
    source,
    /permanentRedirect\(getSurfaceUrl\(\"status\"\)\)/,
    "Status route should redirect to the canonical status surface.",
  );
  assert.doesNotMatch(
    source,
    /ContactForm|SupportIntake|CtaButton|\/review\/request|Request one proof run/,
    "Status route should not become a local marketing, support, or intake surface.",
  );
});
