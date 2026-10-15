import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve(__dirname, "not-found.tsx"), "utf8");

test("custom 404 names only the two current reviews and the contact page", () => {
  assert.match(source, /Page not found/);
  assert.match(source, /Nie znaleziono strony/);
  assert.match(source, /href: "\/catalog#agent-action-security-review"/);
  assert.match(source, /href: "\/catalog\/offsec-external-exposure"/);
  assert.match(source, /href: "\/contact"/);
  assert.match(source, /href: "\/pl\/catalog#agent-action-security-review"/);
  assert.match(source, /href: "\/pl\/catalog\/offsec-external-exposure"/);
  assert.match(source, /href: "\/pl\/contact"/);
  assert.match(source, /Agent Action Security Review/);
  assert.match(source, /External Attack Surface Review/);
  assert.doesNotMatch(source, /€|\$|Karol|Stef/i);
});
