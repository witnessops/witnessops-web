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
const conversation = readFileSync(resolve(__dirname, "../components/docs-assistant/ask-conversation.ts"), "utf-8");
const disclosure = readFileSync(resolve(__dirname, "../components/docs-assistant/ask-ai-disclosure.tsx"), "utf-8");

test("English public shell mounts the compact Ask WitnessOps launcher", () => {
  assert.match(rootLayout, /import\s+{\s*DocsAssistantWidget\s*}/);
  assert.match(rootLayout, /<DocsAssistantWidget\s*\/>/);
  assert.doesNotMatch(docsPage, /DocsAssistantInline/);

  assert.match(widget, />Ask WitnessOps<\/span>/);
  assert.match(widget, />\s*AI\s*<\/span>/);
  assert.match(widget, /ASK WITNESSOPS/);
  assert.match(widget, /Tell me what happened/);
  assert.match(widget, /I’ll help you find the right next step/);
  assert.match(widget, /Tell me what happened/);
  assert.match(widget, /askGuidedQuestions\(pageService\)/);
  assert.match(conversation, /An automation stopped working/);
  assert.match(conversation, /launching an AI agent/);
  assert.match(widget, /Ask AI/);
  assert.match(widget, /aria-label="Ask WitnessOps question"/);
  // Canonical offer destinations are exercised by ask-witnessops-response.test;
  // this shell test checks that the owning recommendation component is mounted.
  assert.match(widget, /AskWitnessOpsCommercialFitCard/);
  assert.match(
    disclosure,
    /Eligible questions and recent conversation are sent to OpenAI with.*store: false.*provider\s+retention\s+may\s+still\s+apply/s,
  );
  assert.match(widget, /AskAiDisclosure/);
  assert.doesNotMatch(widget, /provider storage disabled/);
  assert.match(
    widget,
    /Example: Leads stopped reaching our CRM\./,
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

test("External check mounts Ask while the local proofpack shell stays isolated", () => {
  assert.ok(rootLayout.includes('localWorkspace === "external-check" && <DocsAssistantWidget />'));
});
