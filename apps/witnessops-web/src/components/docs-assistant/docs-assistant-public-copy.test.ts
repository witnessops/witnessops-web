import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { PRIMARY_OFFER } from "@/lib/commercial-truth";

function source(filename: string): string {
  return readFileSync(resolve(__dirname, filename), "utf-8");
}

const title = "ASK WITNESSOPS";
const subtitle = "Questions about scope, evidence or pricing";
const questionIntro = /Ask about security reviews, verification or workflow repair/;
const warning = "Do not paste secrets";
const providerDisclosure =
  /Eligible questions and recent conversation are sent to OpenAI with.*store: false.*provider retention may still apply/s;
const placeholder =
  "Example: Leads stopped reaching our CRM.";

test("Ask WitnessOps surfaces describe AI questions within the public-input boundary", () => {
  for (const filename of [
    "docs-assistant-widget.tsx",
    "docs-assistant-page.tsx",
    "docs-assistant-inline.tsx",
  ]) {
    const content = source(filename);
    assert.match(content, new RegExp(title));
    assert.match(content, new RegExp(subtitle));
    assert.match(content, questionIntro);
    assert.match(content, new RegExp(warning));
    assert.match(content, /AskAiDisclosure/);
    assert.match(source("ask-ai-disclosure.tsx"), providerDisclosure);
    assert.doesNotMatch(content, /provider storage disabled/);
    assert.match(content, new RegExp(placeholder.replaceAll(".", "\\.")));
    assert.match(content, /Ask AI/);
    assert.match(content, /aria-label="Ask WitnessOps question"/);
    assert.match(content, /maxLength=\{2_000\}/);
    assert.match(content, /fetchAskWitnessOps/);
    assert.match(content, /AskWitnessOpsCommercialFitCard/);
    assert.doesNotMatch(content, /\/api\/docs-assistant\/ask/);
    assert.doesNotMatch(content, /Ask anything about WitnessOps/i);
  }

  const client = source("ask-witnessops-response.ts");
  assert.match(client, /\/api\/ask-witnessops/);
});

test("Ask WitnessOps offers page-aware buyer prompts and follow-ups", () => {
  const prompts = source("ask-conversation.ts");
  for (const text of ["What does an agent review cover?", "How do you check a result?", "Can you review one server?", "Can you diagnose a broken workflow?", "What do I get?", "Price and timing", "Is this right for us?"]) {
    assert.ok(prompts.includes(text), `Missing buyer prompt: ${text}`);
  }
  assert.match(source("docs-assistant-widget.tsx"), /askGuidedQuestions\(pageService\)/);
  assert.match(source("docs-assistant-page.tsx"), /askGuidedQuestions\(\)/);
});

test("Ask WitnessOps retains the answer text when a suggested review is shown", () => {
  const widget = source("docs-assistant-widget.tsx");
  const page = source("docs-assistant-page.tsx");
  const inline = source("docs-assistant-inline.tsx");

  assert.match(widget, /<p className=\{styles\.answerCopy\}>\{answer\.content\}<\/p>\s*\{answer\.answer && \(\s*<AskWitnessOpsCommercialFitCard/);
  assert.doesNotMatch(widget, /!hasPaidScopeCta\s*&&\s*\(\s*<p className=\{styles\.answerCopy\}/);
  assert.match(page, /\{msg\.content\}\s*<\/p>\s*\{msg\.answer && \(/);
  assert.match(inline, /\{askWitnessOpsAnswerText\(response\)\}\s*<\/p>\s*<AskWitnessOpsCommercialFitCard/);
  assert.match(widget, /Questions about scope, evidence or pricing\?/);
  assert.match(widget, /Ask a follow-up/);
  assert.match(widget, /Start over/);
});

test("generated recommendations have a distinct review card and canonical navigation", () => {
  const card = source("ask-witnessops-commercial-fit-card.tsx");

  assert.match(card, /answer\.schema === "witnessops\.ask\.generated-answer\.v1"/);
  assert.match(card, /if \(!recommendation\) return null/);
  assert.match(card, /aria-label="Suggested service"/);
  assert.match(card, /recommendation\.name/);
  assert.match(card, /recommendation\.price_label/);
  assert.match(card, /recommendation\.delivery_label/);
  assert.match(card, /Discuss this service/);
  assert.match(card, /href=\{recommendation\.request_href\}/);
  assert.match(card, /href=\{recommendation\.detail_href\}/);
  assert.match(card, /We confirm fit, scope and price before work begins/);
});

test("Ask WitnessOps presents the paid commercial-fit contract", () => {
  const card = source("ask-witnessops-commercial-fit-card.tsx");
  const response = source("ask-witnessops-response.ts");

  assert.match(card, /Commercial fit/);
  assert.match(card, /Request scope for this action/);
  assert.match(card, /offer\.price_label/);
  assert.match(card, /offer\.unit_label/);
  assert.match(card, /offer\.fit_check_label/);
  assert.match(card, /offer\.delivery_label/);
  assert.match(card, /Fit signal only/);
  assert.match(card, /Public Workflow labels are request-shape references/);
  assert.match(response, /import \{ PRIMARY_OFFER \}/);
  assert.match(response, /offerId=\$\{PRIMARY_OFFER\.id\}&source=ask/);
  assert.doesNotMatch(response, /Agent Risk & Control Review|From €1,500/);

  assert.equal(PRIMARY_OFFER.name.en, "Agent Action Security Review");
  assert.equal(PRIMARY_OFFER.price.en, "€2,500 fixed · excluding VAT");
  assert.equal(
    PRIMARY_OFFER.unit.en,
    "One consequential agent or automation action",
  );
  assert.equal(PRIMARY_OFFER.fitCheck.en, "Non-secret fit check first");
  assert.equal(
    PRIMARY_OFFER.timing.en,
    "Within 10 working days after evidence rules are agreed",
  );
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
  assert.match(content, /"\/review\/sample-cases\/ai-agent-action-proof-run"/);
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

test("Ask WitnessOps cleans up after the client link handler while retaining temporary conversation", () => {
  const widget = source("docs-assistant-widget.tsx");
  const routeCta = source("ask-witnessops-route-cta.tsx");
  const fitCard = source("ask-witnessops-commercial-fit-card.tsx");

  assert.match(widget, /previousPathnameRef\.current === pathname/);
  assert.match(widget, /previousPathnameRef\.current = pathname;\s*closeAskPanel\(\)/);
  assert.match(widget, /requestGenerationRef\.current \+= 1/);
  assert.match(widget, /setQuestion\(""\)/);
  assert.match(widget, /setAnswer\(null\)/);
  assert.match(widget, /setContactMode\(false\)/);
  assert.match(widget, /onClick=\{handleDialogLinkClick\}/);
  assert.doesNotMatch(widget, /onClickCapture=/);
  const linkHandler = widget.slice(widget.indexOf("function handleDialogLinkClick"), widget.indexOf("function handleContactModeChange"));
  assert.doesNotMatch(linkHandler, /if\s*\([^)]*event\.defaultPrevented/);
  assert.match(linkHandler, /event\.metaKey/);
  assert.match(linkHandler, /event\.ctrlKey/);
  assert.match(linkHandler, /link\.target === "_blank"/);
  assert.match(linkHandler, /link\.hasAttribute\("download"\)/);
  assert.match(widget, /destination\.origin === window\.location\.origin/);
  assert.match(source("ask-ai-disclosure.tsx"), /href="\/privacy"/);
  assert.match(widget, /useSyncExternalStore/);
  assert.match(widget, /clearAskConversation\(\)/);
  assert.match(routeCta, /if \(href\.startsWith\("\/"\)\)/);
  assert.match(
    fitCard,
    /SPECIMEN_HREF\s*=\s*"\/review\/sample-cases\/ai-agent-action-proof-run"/,
  );
});

test("Ask WitnessOps keeps a human handoff available alongside the composer and after failure", () => {
  const widget = source("docs-assistant-widget.tsx");
  const contact = source("docs-assistant-contact-handoff.tsx");
  assert.match(widget, /\{!contactMode && \(/);
  assert.doesNotMatch(widget, /!contactMode && !answer/);
  assert.match(widget, /Request a follow-up/);
  assert.match(widget, /Retry question/);
  assert.match(widget, /\s+expanded\s+/);
  assert.match(widget, /proposedBrief=\{proposedBrief\}/);
  assert.match(widget, /onRequestScope=\{\(\) => handleContactModeChange\(true\)\}/);
  assert.match(widget, /commercialFit=\{answer\?\.answer\?\.commercial_fit\}/);
  assert.match(widget, /onExpandedChange=\{handleContactModeChange\}/);
  assert.match(widget, /onBusyChange=\{handleContactBusyChange\}/);
  assert.match(widget, /data\.status === "success" && data\.commercial_fit\.result !== "blocked"\s*\? trimmed\s*: undefined/);
  assert.match(contact, /Work email/);
  assert.match(contact, /Use my questions as the request summary/);
  assert.match(contact, /\[includeQuestion, setIncludeQuestion\] = useState\(false\)/);
  assert.match(contact, /AI answers are not shared/);
  assert.match(contact, /\/api\/contact/);
  assert.match(contact, /\/api\/verify-token/);
  assert.match(contact, /No mailing list or review booking/);
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

test("Ask WitnessOps keeps answer, unavailable, and evidence-boundary states distinct", () => {
  const content = source("docs-assistant-widget.tsx");
  const styles = source("docs-assistant-widget.module.css");
  const fitCard = source("ask-witnessops-commercial-fit-card.tsx");

  assert.match(content, /docs-assistant-widget\.module\.css/);
  assert.match(content, /askWitnessOpsModeLabel\(answer.answer\)/);
  assert.match(content, /NO EVIDENCE REVIEWED/);
  assert.match(content, /PUBLIC GUIDE UNAVAILABLE/);
  assert.match(content, /NO FIT CLAIM/);
  assert.match(content, /data-ask-state/);
  assert.match(content, /aria-label="Ask WitnessOps question"/);
  assert.match(styles, /--proof-bg:\s*var\(--color-surface-bg\)/);
  assert.match(styles, /--proof-accent:\s*var\(--color-brand-accent\)/);
  assert.match(styles, /--receipt-paper:\s*#151512/);
  assert.match(styles, /--receipt-sheet:\s*#1b1b17/);
  assert.match(styles, /--receipt-accent-text:\s*#df874d/);
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
    "The fit card must not tint the answer surface behind its small accent label.",
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
