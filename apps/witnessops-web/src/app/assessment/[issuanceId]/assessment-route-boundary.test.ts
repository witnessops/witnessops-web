import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("assessment route remains noindex, private, and claimant-session gated", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(source, /export const dynamic = \"force-dynamic\"/);
  assert.match(source, /getIssuanceById\(issuanceId\)/);
  assert.match(source, /record\.email !== email/);
  assert.match(source, /verifyClaimantSessionCookie/);
  assert.match(source, /CLAIMANT_SESSION_COOKIE_NAME/);
  assert.match(source, /notFound\(\)/);
  assert.match(source, /Explicit scope approval is required before governed recon starts/);
  assert.match(source, /This page is session-private/);
  assert.match(source, /Do not share the URL/);

  assert.doesNotMatch(source, /ContactForm|SupportIntake|Request one proof run|\/review\/request/);
  assert.doesNotMatch(source, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
});
