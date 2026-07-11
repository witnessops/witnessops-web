import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAdminWizBrief } from "./admin-wiz-brief-model";

test("Wiz prioritizes boundaries over other queue signals", () => {
  const brief = buildAdminWizBrief({ total: 4, ready: 2, reconciliationPending: 1, divergent: 1 });
  assert.equal(brief.state, "boundary");
  assert.match(brief.detail, /will not infer/);
  assert.ok(brief.actionHref.includes("filter=divergent"));
});

test("Wiz recommends existing queue filters without mutating state", () => {
  const brief = buildAdminWizBrief({ total: 3, ready: 2, reconciliationPending: 0, divergent: 0 });
  assert.equal(brief.state, "recommending");
  assert.equal(brief.actionHref, "/admin/queue?filter=ready");
});

test("empty queues put Wiz in listening mode", () => {
  const brief = buildAdminWizBrief({ total: 0, ready: 0, reconciliationPending: 0, divergent: 0 });
  assert.equal(brief.state, "listening");
  assert.match(brief.detail, /Nothing is being executed automatically/);
});

test("Wiz presentation cannot mutate lifecycle or send outbound mail", () => {
  const source = readFileSync(new URL("./admin-wiz-brief.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fetch\(|sendVerificationEmail|method:\s*["']POST|transition|proof-run/);
  assert.match(source, /does not execute actions automatically/);
});

test("every Wiz action stays on the allowlisted Admin queue surface", () => {
  const cases = [
    { total: 4, ready: 1, reconciliationPending: 0, divergent: 1 },
    { total: 4, ready: 1, reconciliationPending: 1, divergent: 0 },
    { total: 4, ready: 1, reconciliationPending: 0, divergent: 0 },
    { total: 0, ready: 0, reconciliationPending: 0, divergent: 0 },
    { total: 1, ready: 0, reconciliationPending: 0, divergent: 0 },
  ];
  const allowed = new Set([
    "/admin/queue",
    "/admin/queue?filter=ready",
    "/admin/queue?filter=pending",
    "/admin/queue?filter=divergent",
  ]);
  for (const input of cases) assert.ok(allowed.has(buildAdminWizBrief(input).actionHref));
});
