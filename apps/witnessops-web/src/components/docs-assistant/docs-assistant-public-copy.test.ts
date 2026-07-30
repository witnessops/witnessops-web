import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(filename: string): string {
  return readFileSync(resolve(__dirname, filename), "utf-8");
}

const title = "ASK WITNESSOPS";
const subtitle = "Bounded proof guide";
const intro = "Ask a non-secret question";
const warning = "Do not paste secrets";
const footer = "Answers are based on public WitnessOps material";
const placeholder = "Ask a non-secret question...";

test("Ask WitnessOps surfaces carry the bounded public-copy contract", () => {
  for (const filename of [
    "docs-assistant-widget.tsx",
    "docs-assistant-page.tsx",
    "docs-assistant-inline.tsx",
  ]) {
    const content = source(filename);
    assert.match(content, new RegExp(title));
    assert.match(content, new RegExp(subtitle));
    assert.match(content, new RegExp(intro));
    assert.match(content, new RegExp(warning));
    assert.match(content, new RegExp(footer));
    assert.match(content, new RegExp(placeholder.replaceAll(".", "\\.")));
    assert.match(content, /fetchAskWitnessOps/);
    assert.doesNotMatch(content, /\/api\/docs-assistant\/ask/);
    assert.doesNotMatch(content, /Ask anything about WitnessOps/i);
  }

  const client = source("ask-witnessops-response.ts");
  assert.match(client, /\/api\/ask-witnessops/);
});

test("Ask WitnessOps offers the five buyer and proof quick prompts", () => {
  const content = source("docs-assistant-page.tsx");
  const prompts = [
    "What package fits a launch readiness review?",
    "What does a proof packet include?",
    "Can I send logs or screenshots?",
    "What is not included in workspace access?",
    "How do I request a fit check?",
  ];

  for (const prompt of prompts) {
    assert.ok(
      content.includes(prompt),
      `Missing quick prompt: ${prompt}`,
    );
  }
});

test("Ask WitnessOps loading copy reflects deterministic assembly", () => {
  const content = source("docs-assistant-loading-status.tsx");
  assert.match(content, /Assembling bounded public answer/);
  assert.doesNotMatch(content, /Searching docs/);
  assert.doesNotMatch(content, /Searching public WitnessOps material/);
});

test("Ask WitnessOps full page uses mobile document flow and desktop scrolling", () => {
  const content = source("docs-assistant-page.tsx");

  assert.match(content, /min-h-\[calc\(100vh-13rem\)\]/);
  assert.match(content, /md:h-\[calc\(100vh-13rem\)\]/);
  assert.match(
    content,
    /overflow-visible md:min-h-0 md:flex-1 md:overflow-y-auto/,
  );
  assert.match(
    content,
    /gap-4 px-4 py-6 text-center md:h-full md:gap-6 md:py-0/,
  );
  assert.doesNotMatch(
    content,
    /flex h-\[calc\(100vh-13rem\)\] flex-col/,
  );
  assert.doesNotMatch(
    content,
    /flex h-full flex-col items-center justify-center gap-6/,
  );
});
