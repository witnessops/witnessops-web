import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("admin console layout remains noindex and admin-console only", () => {
  const source = readFileSync(resolve(__dirname, "layout.tsx"), "utf-8");

  assert.match(source, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(source, /WitnessOps Admin Console/);
  assert.match(source, /AdminSidebar/);
  assert.match(source, /AdminAlertBell/);
  assert.match(source, /aria-label=\"Admin navigation\"/);
  assert.match(source, /Authenticated/);

  assert.doesNotMatch(source, /ContactForm|SupportIntake|Request one proof run|\/review\/request/);
  assert.doesNotMatch(source, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
});
