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

test("Ask WitnessOps loading copy stays provider-neutral", () => {
  const content = source("docs-assistant-loading-status.tsx");
  assert.match(content, /Checking public WitnessOps material/);
  assert.doesNotMatch(content, /Searching docs/);
  assert.doesNotMatch(content, /Calling OpenAI/);
});

test("Ask WitnessOps client surfaces contain no OpenAI credential contract", () => {
  for (const filename of [
    "ask-witnessops-response.ts",
    "docs-assistant-widget.tsx",
    "docs-assistant-page.tsx",
    "docs-assistant-inline.tsx",
  ]) {
    const content = source(filename);
    assert.doesNotMatch(content, /OPENAI_API_KEY/);
    assert.doesNotMatch(content, /NEXT_PUBLIC_OPENAI/);
  }
});

test("Ask WitnessOps hides its trigger while the dialog owns the floating space", () => {
  const content = source("docs-assistant-widget.tsx");

  assert.match(content, /shouldShowDocsAssistantTrigger\(open\)/);
  assert.match(content, /aria-controls="ask-witnessops-dialog"/);
  assert.match(content, /triggerRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(content, /aria-label=\{open \?/);
});

test("Ask WitnessOps provides a non-blocking verified contact handoff", () => {
  const widget = source("docs-assistant-widget.tsx");
  const contact = source("docs-assistant-contact-handoff.tsx");

  assert.match(widget, /<DocsAssistantContactHandoff/);
  assert.match(widget, /onExpandedChange=\{setContactMode\}/);
  assert.match(contact, /Leave contact details/);
  assert.match(contact, /Work email/);
  assert.match(contact, /Note or request/);
  assert.match(contact, /\/api\/contact/);
  assert.match(contact, /\/api\/verify-token/);
  assert.match(contact, /Follow-up is asynchronous/);
  assert.match(contact, /No review begins here/);
  assert.match(contact, /Do not include secrets/);
});

test("Ask WitnessOps uses a full-viewport mobile surface at the shared breakpoint", () => {
  const content = source("docs-assistant-widget.tsx");

  assert.match(content, /MOBILE_WIDGET_MEDIA_QUERY = "\(max-width: 39\.999rem\)"/);
  assert.match(content, /h-\[var\(--ask-ai-mobile-height\)\] w-full max-w-none/);
  assert.match(content, /sm:h-\[min\(560px,calc\(100vh-8rem\)\)\]/);
  assert.match(content, /sm:max-w-\[390px\]/);
  assert.match(content, /env\(safe-area-inset-top\)/);
  assert.match(content, /env\(safe-area-inset-bottom\)/);
  assert.match(content, /window\.visualViewport/);
  assert.match(content, /--ask-ai-keyboard-cushion/);
  assert.match(content, /document\.body\.style\.overflow = "hidden"/);
  assert.match(content, /document\.body\.style\.overflow = previousOverflow/);
  assert.doesNotMatch(content, /max-\[420px\]:max-w-none/);
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
