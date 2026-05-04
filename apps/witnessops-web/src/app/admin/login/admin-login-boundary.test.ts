import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("admin login remains noindex and admin-auth only", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
  const layout = readFileSync(resolve(__dirname, "layout.tsx"), "utf-8");

  assert.match(layout, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(layout, /WitnessOps Admin Login/);

  assert.match(page, /\"use client\"/);
  assert.match(page, /\/api\/admin\/oidc\/start/);
  assert.match(page, /\/api\/admin\/auth/);
  assert.match(page, /router\.push\(\"\/admin\"\)/);
  assert.match(page, /Sign In With Microsoft/);
  assert.match(page, /legacy key path retained temporarily/i);

  assert.doesNotMatch(page, /Request one proof run|Package one security workflow|ContactForm|SupportIntake|\/review\/request/);
  assert.doesNotMatch(page, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
});
