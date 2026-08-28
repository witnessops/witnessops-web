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

  assert.match(widget, />Ask WitnessOps<\/span>/);
  assert.match(widget, />\s*AI\s*<\/span>/);
  assert.match(widget, /ASK WITNESSOPS/);
  assert.match(widget, /Describe one consequential agent workflow\./);
  assert.match(widget, /Review scope and price/);
  assert.match(widget, /Check fit/);
  assert.match(widget, /offerId=bounded-workflow-review&source=ask/);
  assert.match(
    widget,
    /Eligible questions may be\s+sent to OpenAI\s+with.*store: false.*provider\s+retention\s+may\s+still\s+apply/s,
  );
  assert.doesNotMatch(widget, /provider storage disabled/);
  assert.match(
    widget,
    /Example: An agent rotates a compromised key\./,
  );
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
