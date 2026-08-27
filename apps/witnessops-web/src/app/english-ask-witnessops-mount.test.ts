import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const rootLayout = readFileSync(resolve(__dirname, "layout.tsx"), "utf-8");
const docsPage = readFileSync(resolve(__dirname, "docs/page.tsx"), "utf-8");
const dedicatedAskPage = readFileSync(
  resolve(__dirname, "docs/assistant/page.tsx"),
  "utf-8",
);
const widget = readFileSync(
  resolve(__dirname, "../components/docs-assistant/docs-assistant-widget.tsx"),
  "utf-8",
);

test("English public shell mounts the compact Ask WitnessOps launcher", () => {
  assert.match(rootLayout, /import\s+{\s*DocsAssistantWidget\s*}/);
  assert.match(rootLayout, /<DocsAssistantWidget\s*\/>/);
  assert.doesNotMatch(docsPage, /DocsAssistantInline/);

  assert.match(widget, />Ask AI<\/span>/);
  assert.match(widget, /ASK WITNESSOPS/);
  assert.match(widget, /What can I help you with\?/);
  assert.match(widget, /Answers are based on public WitnessOps material/);
  assert.match(widget, /Ask a non-secret question about proof packets/);
});

test("Ask WitnessOps launcher stays off dedicated and non-buyer surfaces", () => {
  for (const path of [
    '"/docs/assistant"',
    '"/pl"',
    '"/admin"',
    '"/assessment"',
    '"/design"',
    '"/runner-loop"',
  ]) {
    assert.ok(widget.includes(path), `Missing hidden path: ${path}`);
  }
});

test("dedicated Ask WitnessOps route remains available for separate gating", () => {
  assert.match(dedicatedAskPage, /<DocsAssistantPage\s*\/>/);
});
