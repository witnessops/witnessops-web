import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(filename: string): string {
  return readFileSync(resolve(__dirname, filename), "utf-8");
}

const title = "ASK WITNESSOPS";
const subtitle = "Bounded proof guide";
const workflowIntro =
  /Describe one consequential agent(?:ic or automated)? workflow/;
const warning = "Do not paste secrets";
const providerDisclosure =
  /Eligible questions may be\s+(?:sent to\s+)?OpenAI\s+with.*store: false.*provider\s+retention\s+may\s+still\s+apply/s;
const placeholder =
  "Example: An agent rotates a compromised key.";

test("Ask WitnessOps surfaces carry the bounded public-copy contract", () => {
  for (const filename of [
    "docs-assistant-widget.tsx",
    "docs-assistant-page.tsx",
    "docs-assistant-inline.tsx",
  ]) {
    const content = source(filename);
    assert.match(content, new RegExp(title));
    assert.match(content, new RegExp(subtitle));
    assert.match(content, workflowIntro);
    assert.match(content, new RegExp(warning));
    assert.match(content, providerDisclosure);
    assert.doesNotMatch(content, /provider storage disabled/);
    assert.match(content, new RegExp(placeholder.replaceAll(".", "\\.")));
    assert.match(content, /Check fit/);
    assert.match(content, /fetchAskWitnessOps/);
    assert.match(content, /AskWitnessOpsCommercialFitCard/);
    assert.doesNotMatch(content, /\/api\/docs-assistant\/ask/);
    assert.doesNotMatch(content, /Ask anything about WitnessOps/i);
  }

  const client = source("ask-witnessops-response.ts");
  assert.match(client, /\/api\/ask-witnessops/);
});

test("Ask WitnessOps offers buyer-oriented workflow, scope, and price prompts", () => {
  const page = source("docs-assistant-page.tsx");
  const prompts = [
    "An AI agent rotates compromised production keys. How can we prove authorization and revocation?",
    "What is included in the Agent Risk & Control Review?",
    "How much does one workflow review cost?",
    "How should one consequential agent workflow be bounded?",
    "Can I send logs or screenshots?",
  ];

  for (const prompt of prompts) {
    assert.ok(
      page.includes(prompt),
      `Missing quick prompt: ${prompt}`,
    );
  }

  const widget = source("docs-assistant-widget.tsx");
  assert.match(widget, /Agent changed production/);
  assert.match(widget, /Approval or authority gap/);
  assert.match(widget, /Review scope and price/);
  assert.match(widget, /how much does it cost\?/);
  assert.match(widget, /offerId=bounded-workflow-review&source=ask/);
});

test("Ask WitnessOps presents the paid commercial-fit contract", () => {
  const card = source("ask-witnessops-commercial-fit-card.tsx");
  const response = source("ask-witnessops-response.ts");

  assert.match(card, /Commercial fit/);
  assert.match(card, /Request scope for this workflow/);
  assert.match(card, /offer\.price_label/);
  assert.match(card, /Fit signal only/);
  assert.match(card, /Public Workflow labels are request-shape references/);
  assert.match(response, /From €1,500/);
  assert.match(response, /offerId=bounded-workflow-review&source=ask/);
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
  assert.match(content, /!suppressFloatingTrigger/);
  assert.match(content, /new IntersectionObserver/);
  assert.match(content, /document\.querySelector\("\[data-ask-trigger-guard\]"\)/);
  assert.match(content, /footer\[data-brand-footer\]/);
  assert.match(content, /aria-controls="ask-witnessops-dialog"/);
  assert.match(content, /triggerRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(content, /aria-label=\{open \?/);
});

test("Ask WitnessOps does not cover the dedicated review request form", () => {
  const content = source("docs-assistant-widget.tsx");

  assert.match(content, /HIDDEN_WIDGET_PATHS/);
  assert.match(content, /"\/review\/request"/);
});

test("Ask WitnessOps yields the floating layer while the mobile navigation is open", () => {
  const styles = source("docs-assistant-widget.module.css");
  const mobileNavbar = source("../shared/mobile-navbar-menu.tsx");

  assert.match(mobileNavbar, /data-mobile-nav-open/);
  assert.match(
    styles,
    /:global\(html\[data-mobile-nav-open="true"\]\) \.trigger\s*\{\s*display: none;/,
  );
});

test("Ask WitnessOps resets across route changes and closes before same-site navigation", () => {
  const widget = source("docs-assistant-widget.tsx");
  const routeCta = source("ask-witnessops-route-cta.tsx");
  const fitCard = source("ask-witnessops-commercial-fit-card.tsx");

  assert.match(widget, /previousPathnameRef\.current === pathname/);
  assert.match(widget, /previousPathnameRef\.current = pathname;\s*resetAskState\(\)/);
  assert.match(widget, /requestGenerationRef\.current \+= 1/);
  assert.match(widget, /setQuestion\(""\)/);
  assert.match(widget, /setAnswer\(null\)/);
  assert.match(widget, /setContactMode\(false\)/);
  assert.match(widget, /onClickCapture=\{handleDialogLinkCapture\}/);
  assert.match(widget, /destination\.origin === window\.location\.origin/);
  assert.match(widget, /href="\/privacy"/);
  assert.match(routeCta, /if \(href\.startsWith\("\/"\)\)/);
  assert.match(
    fitCard,
    /SPECIMEN_HREF\s*=\s*"\/review\/sample-cases\/ai-agent-action-proof-run"/,
  );
});

test("Ask WitnessOps provides a non-blocking verified contact handoff", () => {
  const widget = source("docs-assistant-widget.tsx");
  const contact = source("docs-assistant-contact-handoff.tsx");

  assert.match(widget, /<DocsAssistantContactHandoff/);
  assert.match(widget, /\{contactMode && \(/);
  assert.match(widget, /\{!contactMode && answer && !hasPaidScopeCta && \(/);
  assert.match(widget, /\{!contactMode && !answer && \(/);
  assert.match(widget, /expanded=\{false\}/);
  assert.match(widget, /\s+expanded\s+/);
  assert.match(
    widget,
    /onRequestScope=\{\(\) => handleContactModeChange\(true\)\}/,
  );
  assert.match(widget, /commercialFit=\{answer\?\.answer\?\.commercial_fit\}/);
  assert.match(widget, /onExpandedChange=\{handleContactModeChange\}/);
  assert.match(widget, /onBusyChange=\{handleContactBusyChange\}/);
  assert.match(contact, /Request a scoped review/);
  assert.match(contact, /Request scope for this workflow/);
  assert.match(contact, /Work email/);
  assert.match(contact, /Workflow summary or request/);
  assert.match(contact, /required=\{offerRequiresSummary\}/);
  assert.match(contact, /Add a short, non-secret workflow summary/);
  assert.match(contact, /\/api\/contact/);
  assert.match(contact, /\/api\/verify-token/);
  assert.match(contact, /Mailbox confirmation starts a fit-and-scope reply only/);
  assert.match(contact, /No review begins here/);
  assert.match(contact, /Do not include secrets/);
});

test("Ask WitnessOps uses a full-viewport mobile surface at the shared breakpoint", () => {
  const content = source("docs-assistant-widget.tsx");
  const styles = source("docs-assistant-widget.module.css");

  assert.match(content, /MOBILE_WIDGET_MEDIA_QUERY = "\(max-width: 39\.999rem\)"/);
  assert.match(content, /styles\.dialog/);
  assert.match(styles, /height:\s*var\(--ask-ai-mobile-height\)/);
  assert.match(styles, /@media \(min-width: 40rem\)/);
  assert.match(styles, /height:\s*min\(760px, calc\(100dvh - 3rem\)\)/);
  assert.match(styles, /width:\s*min\(520px, calc\(100vw - 3rem\)\)/);
  assert.match(styles, /env\(safe-area-inset-top\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(content, /window\.visualViewport/);
  assert.match(content, /--ask-ai-keyboard-cushion/);
  assert.match(content, /acquireBodyScrollLock\(\)/);
  assert.match(styles, /min-height:\s*44px|height:\s*44px/);
  assert.doesNotMatch(styles, /max-width:\s*390px/);
});

test("Ask WitnessOps mobile surface is modal without stealing desktop interaction", () => {
  const content = source("docs-assistant-widget.tsx");

  assert.match(content, /aria-modal=\{mobileModal\}/);
  assert.match(content, /if \(!mobileModal \|\| event\.key !== "Tab"\) return/);
  assert.match(content, /\(event\.shiftKey \? last : first\)\.focus\(\)/);
  assert.match(content, /event\.shiftKey && active === first/);
  assert.match(content, /!event\.shiftKey && active === last/);
  assert.match(content, /sibling\.inert = true/);
  assert.match(content, /sibling\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(content, /element\.inert = inert/);
  assert.match(content, /element\.setAttribute\("aria-hidden", ariaHidden\)/);
  assert.match(
    content,
    /if \(!open \|\| !widgetVisible \|\| !mobileModal\) return;\s*\n\s*return acquireBodyScrollLock\(\)/,
  );
  assert.match(content, /\[mobileModal, open, widgetVisible\]/);
  assert.match(content, /const previousFocus = previousFocusRef\.current/);
  assert.match(content, /previousFocus\?\.isConnected/);
  assert.match(content, /triggerRef\.current\?\.focus\(\)/);
});

test("Ask WitnessOps uses the proof-object and bounded fit-signal visual contract", () => {
  const content = source("docs-assistant-widget.tsx");
  const styles = source("docs-assistant-widget.module.css");
  const fitCard = source("ask-witnessops-commercial-fit-card.tsx");

  assert.match(content, /docs-assistant-widget\.module\.css/);
  assert.match(content, /PUBLIC FIT SIGNAL/);
  assert.match(content, /NO EVIDENCE REVIEWED/);
  assert.match(content, /PUBLIC GUIDE UNAVAILABLE/);
  assert.match(content, /NO FIT CLAIM/);
  assert.match(content, /data-ask-state/);
  assert.match(content, /aria-label="Describe one non-secret workflow"/);
  assert.match(styles, /--proof-bg:\s*var\(--color-surface-bg\)/);
  assert.match(styles, /--proof-accent:\s*var\(--color-brand-accent\)/);
  assert.match(styles, /--receipt-paper:\s*#f3f0e9/);
  assert.match(styles, /--receipt-sheet:\s*#fcfaf5/);
  assert.match(styles, /--receipt-accent-text:\s*#b94716/);
  assert.match(styles, /border:\s*1px solid var\(--proof-muted\)/);
  assert.match(
    styles,
    /\[data-ask-contact-form\] textarea\s*\{[\s\S]*?border-color:\s*var\(--proof-muted\)/,
  );
  assert.match(
    styles,
    /\[data-ask-contact-form\] textarea:focus\s*\{[\s\S]*?border-color:\s*var\(--proof-accent\)/,
  );
  assert.match(styles, /border-left:\s*2px solid var\(--proof-accent\)/);
  assert.match(styles, /white-space:\s*pre-line/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(styles, /linear-gradient|radial-gradient/);
  assert.doesNotMatch(
    fitCard,
    /border-brand-accent\/45 bg-brand-accent/,
    "The fit card must not tint receipt paper behind its small accent label.",
  );
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
  assert.match(content, /ref=\{conversationRef\}/);
  assert.match(content, /window\.matchMedia\("\(min-width: 48rem\)"\)\.matches/);
  assert.match(content, /prefers-reduced-motion: reduce/);
  assert.match(content, /conversation\.scrollTo\(\{/);
  assert.match(content, /top: conversation\.scrollHeight/);
  assert.match(content, /behavior: reduceMotion \? "auto" : "smooth"/);
  assert.doesNotMatch(content, /scrollIntoView/);
  assert.match(
    content,
    /className="sr-only" aria-live="polite" aria-atomic="true"/,
  );
  assert.match(content, /\{latestAssistantAnnouncement\}/);
  assert.doesNotMatch(
    content,
    /ref=\{conversationRef\}[\s\S]{0,180}aria-live=/,
  );
});
