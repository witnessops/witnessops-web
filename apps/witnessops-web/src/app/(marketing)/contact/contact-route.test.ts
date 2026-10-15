import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("contact is the canonical request page and does not redirect", () => {
  const contact = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
  const request = readFileSync(
    resolve(__dirname, "../../review/request/page.tsx"),
    "utf-8",
  );
  const polishContact = readFileSync(
    resolve(__dirname, "../../pl/contact/page.tsx"),
    "utf-8",
  );
  const polishRequest = readFileSync(
    resolve(__dirname, "../../pl/review/request/page.tsx"),
    "utf-8",
  );

  assert.doesNotMatch(contact, /permanentRedirect|redirect\(/);
  assert.match(contact, /review\/request\/page/);
  assert.match(request, /languageAlternates\("\/contact"/);
  assert.match(request, /en: "\/contact"/);
  assert.match(request, /pl: "\/pl\/contact"/);
  assert.doesNotMatch(request, /permanentRedirect\("\/review\/request"\)/);
  assert.doesNotMatch(polishContact, /permanentRedirect|redirect\(/);
  assert.match(polishRequest, /languageAlternates\("\/pl\/contact"/);
});
