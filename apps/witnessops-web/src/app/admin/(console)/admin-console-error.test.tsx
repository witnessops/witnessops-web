import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminConsoleErrorView } from "./error";

const LIST_PAGES = [
  "inbox/page.tsx",
  "customers/page.tsx",
  "deliveries/page.tsx",
  "proof-runs/page.tsx",
  "receipts/page.tsx",
  "review-requests/page.tsx",
];

test("a thrown read renders the errored copy via the console error boundary", () => {
  for (const page of LIST_PAGES) {
    const source = readFileSync(resolve(__dirname, page), "utf8");
    assert.match(source, /await /);
    assert.doesNotMatch(source, /\bcatch\s*\(/);
  }

  const boundary = readFileSync(resolve(__dirname, "error.tsx"), "utf8");
  assert.match(boundary, /AdminConsoleErrorView/);
  assert.match(boundary, /startTransition\(\(\) => \{\s*router\.refresh\(\);\s*reset\(\);\s*\}\)/);

  const thrown = Object.assign(new Error("synthetic list read failed"), { status: 500 });
  const html = renderToStaticMarkup(createElement(AdminConsoleErrorView, {
    pathname: "/admin/receipts",
    error: thrown,
    occurredAt: "2026-10-24T18:12:00.000Z",
    onRetry() {},
  }));
  assert.match(html, /role="alert"/);
  assert.match(html, /Could not load receipts/);
  assert.match(html, /The request failed, so this list may not be empty\. Nothing was changed\./);
  assert.match(html, />Retry</);
  assert.match(html, /href="\/admin\/settings"/);
  assert.match(html, />Open Health</);
  assert.match(html, /Status 500/);
  assert.doesNotMatch(html, /No receipts yet|No records yet/);

  const unknown = renderToStaticMarkup(createElement(AdminConsoleErrorView, {
    pathname: "/admin/settings",
    error: new Error("synthetic list read failed"),
    occurredAt: "2026-10-24T18:12:00.000Z",
    onRetry() {},
  }));
  assert.match(unknown, /Could not load this page/);
  assert.doesNotMatch(unknown, /Status \d/);
});
