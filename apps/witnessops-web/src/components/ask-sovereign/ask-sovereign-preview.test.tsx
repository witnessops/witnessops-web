import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AskSovereignPreview } from "./ask-sovereign-preview";

test("Ask Sovereign preview makes no fetch or XHR and stores nothing but the pause flag", () => {
  const files = ["ask-sovereign-preview.tsx", "sovereign-sprite.tsx", "ask-sovereign-answers.ts", "sovereign-playback.ts", "preview-triggers.ts"];
  const source = files.map((file) => readFileSync(resolve(__dirname, file), "utf8")).join("\n");
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|\/api\/ask-witnessops/);
  assert.match(source, /wo-sovereign-paused/);
  assert.match(source, /sessionStorage\.setItem\(PAUSE_KEY/);
  assert.doesNotMatch(source, /sessionStorage\.setItem\(\s*"/);
  const html = renderToStaticMarkup(createElement(AskSovereignPreview));
  assert.match(html, /Ask Sovereign/);
  assert.match(html, /Hello\. I can answer from the two published reviews/);
  assert.match(html, /Include this transcript when I contact a person/);
  assert.match(html, /This choice is not sent and is not stored/);
  assert.match(html, /Pause animation/);
  assert.match(html, /role="status"/);
  for (const topic of ["Retention", "Data location", "AI provider", "AI disclosure", "Legal clauses"]) {
    assert.match(html, new RegExp(`${topic}.*Needs review`));
  }
  assert.match(html, /€2,500 excl\. VAT/);
  assert.match(html, /€1,900 excl\. VAT/);
  assert.match(source, /Simulated response · preview/);
  assert.match(source, /Podgląd: odpowiedź symulowana/);
  assert.match(source, /PL copy pending native review/);
  assert.match(source, /NEXT_PUBLIC_WO_PREVIEW === "1"/);
  assert.match(source, /Unavailable/);
  assert.match(source, /Asystent niedostępny/);
  assert.doesNotMatch(html, /openai|gpt-|api\/ask/i);
});

test("the answering sprite is a pixelated steps animation at 94 by 102", () => {
  const css = readFileSync(resolve(__dirname, "ask-sovereign-preview.module.css"), "utf8");
  assert.match(css, /width:\s*94px/);
  assert.match(css, /height:\s*102px/);
  assert.match(css, /image-rendering:\s*pixelated/);
  assert.match(css, /steps\(4\)/);
  assert.match(css, /border-radius:\s*8px/);
  assert.match(css, /border-radius:\s*0/);
  assert.doesNotMatch(css, /filter:/);
});
