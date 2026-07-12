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

test("English public shell does not mount Ask WitnessOps", () => {
  assert.doesNotMatch(rootLayout, /DocsAssistantWidget/);
  assert.doesNotMatch(docsPage, /DocsAssistantInline/);
});

test("dedicated Ask WitnessOps route remains available for separate gating", () => {
  assert.match(dedicatedAskPage, /<DocsAssistantPage\s*\/>/);
});
