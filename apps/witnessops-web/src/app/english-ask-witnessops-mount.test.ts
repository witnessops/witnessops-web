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

test("Ask WitnessOps widget is quarantined and unmounted", () => {
  assert.match(widget, /DOCS_ASSISTANT_WIDGET_QUARANTINED = true/);
  assert.match(rootLayout, /DOCS_ASSISTANT_WIDGET_QUARANTINED \? null : <DocsAssistantWidget \/>/);
  assert.match(rootLayout, /localWorkspace === "external-check" && \(DOCS_ASSISTANT_WIDGET_QUARANTINED \? null : <DocsAssistantWidget \/>\)/);
  assert.match(widget, /aria-label="Ask WitnessOps"/);
  assert.match(widget, /Ask WitnessOps/);
  assert.match(conversation, /An automation stopped working/);
  assert.match(disclosure, /store: false/);
});

test("English public shell mounts the compact Ask WitnessOps launcher", { skip: "quarantined: the public site keeps one assistant" }, () => {
  assert.match(rootLayout, /import\s+{\s*DocsAssistantWidget\s*}/);
  assert.match(rootLayout, /<DocsAssistantWidget\s*\/>/);
  assert.doesNotMatch(docsPage, /DocsAssistantInline/);

  assert.match(widget, />Ask<\/span>/);
  assert.match(widget, /aria-label="Ask WitnessOps"/);
  assert.match(widget, /Ask WitnessOps/);
  assert.match(widget, /Try a product question/);
  assert.match(widget, /AI product guide/);
  assert.match(widget, /Try a product question/);
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
    /Ask a product question/,
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
  assert.match(dedicatedAskPage, /<AskSovereignPreview\s*\/>/);
});

test("External check mounts Ask while the local proofpack shell stays isolated", { skip: "quarantined: the public site keeps one assistant" }, () => {
  assert.ok(rootLayout.includes('localWorkspace === "external-check" && <DocsAssistantWidget />'));
});
