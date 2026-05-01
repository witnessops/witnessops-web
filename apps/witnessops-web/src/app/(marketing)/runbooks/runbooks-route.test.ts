import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("runbooks route remains a hub runbooks redirect", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(
    source,
    /permanentRedirect\(getSurfaceUrl\(\"hub\", \"\/runbooks\"\)\)/,
    "Runbooks route should redirect to the canonical hub runbooks surface.",
  );
  assert.doesNotMatch(
    source,
    /ContactForm|SupportIntake|CtaButton|\/review\/request/,
    "Runbooks route should not become a local marketing or intake surface.",
  );
});
