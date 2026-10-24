import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(name: string): string {
  return readFileSync(path.join(__dirname, name), "utf8");
}

test("dashboard enquiries empty state is one sentence and a text link", () => {
  const dashboard = source("admin-core-dashboard.tsx");
  assert.match(dashboard, /No open enquiries need qualification\. Check Inbox for new requests\./);
  assert.match(dashboard, /<Link href="\/admin\/inbox">Open Inbox<\/Link>/);
  assert.doesNotMatch(dashboard, /AdminRecordEmpty|recordEmpty|rowAction/);
});

test("sync history can be scrolled from the keyboard", () => {
  const history = source("admin-sync-history.tsx");
  assert.match(history, /role="region"/);
  assert.match(history, /aria-label="Sync history"/);
  assert.match(history, /tabIndex=\{0\}/);
});

test("the sidebar health chip exposes its text", () => {
  const sidebar = source("admin-sidebar.tsx");
  assert.match(sidebar, /title=\{health\.text\}/);
  assert.match(sidebar, /className=\{styles\.visuallyHidden\}>\{health\.text\}/);
});

test("the Started sparkline uses the admin accent", () => {
  const grid = source("admin-overview-grid.tsx");
  assert.match(grid, /<span className=\{styles\.sparklineLabel\}>Started<\/span>[\s\S]*?color="var\(--admin-accent\)"/);
  assert.doesNotMatch(grid, /--color-brand-accent/);
});
