import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("admin console layout remains noindex and admin-console only", () => {
  const source = readFileSync(resolve(__dirname, "layout.tsx"), "utf-8");
  const shellSource = readFileSync(resolve(__dirname, "../../../components/admin/admin-console-shell.tsx"), "utf-8");
  const combinedSource = `${source}\n${shellSource}`;

  assert.match(combinedSource, /robots:\s*{\s*index:\s*false,\s*follow:\s*false\s*}/);
  assert.match(combinedSource, /WitnessOps Admin Console/);
  assert.match(combinedSource, /AdminConsoleShell/);
  assert.match(combinedSource, /AdminSidebar/);
  assert.match(combinedSource, /AdminAlertBell/);
  assert.match(combinedSource, /aria-label=\"Admin navigation\"/);
  assert.match(combinedSource, /Authenticated/);

  assert.doesNotMatch(combinedSource, /ContactForm|SupportIntake|Request one proof run|Package one security workflow|\/review\/request/);
  assert.doesNotMatch(combinedSource, /verified compliance|certified compliance|audit-ready|guarantees compliance/i);
});
