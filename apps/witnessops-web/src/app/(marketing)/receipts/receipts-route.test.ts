import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("receipts route redirects to the public verifier", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(
    source,
    /permanentRedirect\(\"\/verify\"\)/,
    "Receipts route should redirect to the canonical verifier surface.",
  );
  assert.doesNotMatch(
    source,
    /permanentRedirect\(\"\/\"\)/,
    "Receipts route should not collapse receipt intent back to the homepage.",
  );
});
