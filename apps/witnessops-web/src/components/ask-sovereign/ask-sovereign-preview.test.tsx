import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AskSovereignPreview } from "./ask-sovereign-preview";

test("Ask Sovereign preview makes no fetch or XHR and stores nothing", () => {
  const source = readFileSync(resolve(__dirname, "ask-sovereign-preview.tsx"), "utf8");
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB/);
  const html = renderToStaticMarkup(createElement(AskSovereignPreview));
  assert.match(html, /Ask Sovereign/);
  assert.match(html, /Simulated response · preview|Hello\. I can answer from the two published reviews/);
  assert.match(html, /Include this transcript when I contact a person/);
  assert.match(html, /This choice is not sent and is not stored/);
  for (const topic of ["Retention", "Data location", "AI provider", "AI disclosure", "Legal clauses"]) {
    assert.match(html, new RegExp(`${topic}.*Needs review`));
  }
  assert.match(html, /€2,500 excl\. VAT/);
  assert.match(html, /€1,900 excl\. VAT/);
  assert.doesNotMatch(html, /openai|gpt-|api\/ask/i);
});
