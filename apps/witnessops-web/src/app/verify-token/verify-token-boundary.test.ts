import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("mailbox verification page preserves noindex and proof-run boundary copy", () => {
  const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

  assert.match(source, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(source, /WitnessOps mailbox verification/i);
  assert.match(source, /This confirms mailbox access only/);
  assert.match(source, /does not start a proof run/);
  assert.match(source, /accept customer evidence/);
  assert.match(source, /confirm scope/);
  assert.match(source, /approve evidence handling/);

  assert.doesNotMatch(source, /Request one proof run|Package one security workflow|ContactForm|SupportIntake/);
  assert.doesNotMatch(source, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
});
