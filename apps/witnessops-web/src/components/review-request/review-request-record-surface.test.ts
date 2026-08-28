import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const record = readFileSync(
  "src/components/review-request/review-request-record.tsx",
  "utf8",
);
const confirmed = readFileSync(
  "src/components/review-request/review-request-confirmed.tsx",
  "utf8",
);
const recordCss = readFileSync(
  "src/components/review-request/review-request-record.module.css",
  "utf8",
);
const widgetCss = readFileSync(
  "src/components/docs-assistant/docs-assistant-widget.module.css",
  "utf8",
);
const widget = readFileSync(
  "src/components/docs-assistant/docs-assistant-widget.tsx",
  "utf8",
);
const verificationShell = readFileSync(
  "src/components/shared/verification-light-shell.tsx",
  "utf8",
);
const handoff = readFileSync(
  "src/components/docs-assistant/docs-assistant-contact-handoff.tsx",
  "utf8",
);
const contactForm = readFileSync(
  "src/app/(marketing)/contact/contact-form.tsx",
  "utf8",
);
const standaloneVerificationForm = readFileSync(
  "src/app/verify-token/verify-token-form.tsx",
  "utf8",
);

test("request record states the bounded confirmation and its negative facts", () => {
  assert.match(record, /Mailbox confirmed/);
  assert.match(record, /Review started/);
  assert.match(record, /Customer evidence accepted/);
  assert.match(record, /not a proof receipt, verifier result, identity proof/);
  assert.match(record, /data-ui-proof-id="review-request-record"/);
  assert.match(record, /const titleId = useId\(\)/);
  assert.match(record, /aria-labelledby=\{titleId\}/);
  assert.match(record, /Clipboard blocked/);
  assert.match(record, /<textarea/);
  assert.match(record, /value=\{recordText\}/);
  assert.doesNotMatch(record, /From €1,500/);
  assert.doesNotMatch(record, /team (?:was |is )?notified/i);
});

test("direct confirmation-page visits do not claim a verified request", () => {
  assert.doesNotMatch(confirmed, /NEXT_PUBLIC_REVIEW_REQUEST_RECORD_UI_PROOF/);
  assert.match(confirmed, /This page alone proves nothing/);
  assert.match(confirmed, /No confirmed request record is present/);
  assert.match(confirmed, /readReviewRequestConfirmation/);
  assert.doesNotMatch(confirmed, /Your mailbox is verified/);
  assert.doesNotMatch(confirmed, /Request verified/);
});

test("Public Exposure Review confirmation preserves its start-work gates", () => {
  assert.match(confirmed, /public-exposure-review/);
  assert.match(confirmed, /payment, the SOW, written authority, required inputs/);
  assert.match(confirmed, /collection window/);
  assert.match(confirmed, /external-exposure-assessment/);
  assert.match(confirmed, /Public Exposure Review sample/);
});

test("both conversion paths derive the record from the parsed verification response", () => {
  assert.match(handoff, /buildReviewRequestConfirmation\(payload/);
  assert.match(handoff, /setEmail\(""\)/);
  assert.match(handoff, /setNote\(""\)/);
  assert.match(handoff, /setVerificationCode\(""\)/);
  assert.match(contactForm, /buildReviewRequestConfirmation\(payload/);
  assert.match(contactForm, /storeReviewRequestConfirmation\(window\.sessionStorage/);
  assert.match(contactForm, /router\.replace\(payload\.postVerifyPath\)/);
  assert.match(
    standaloneVerificationForm,
    /buildStandaloneReviewRequestConfirmation\(verified\)/,
  );
  assert.match(
    standaloneVerificationForm,
    /storeReviewRequestConfirmation\([\s\S]*window\.sessionStorage/,
  );
});

test("record controls preserve a minimum 44px target", () => {
  assert.match(recordCss, /\.copyButton\s*\{[^}]*min-height:\s*44px/s);
  assert.match(recordCss, /\.header\s*\{[^}]*min-height:\s*44px/s);
});

test("compact request record keeps its paper styles isolated from Ask chrome", () => {
  assert.match(recordCss, /--record-accent:\s*#b94716/);
  assert.match(handoff, /data-ask-contact-form/);
  assert.match(handoff, /data-ask-contact-heading/);
  assert.match(widgetCss, /\[data-ask-contact-form\]\s+textarea/);
  assert.doesNotMatch(widgetCss, /\.contactScrollRegion\s+h2/);
  assert.doesNotMatch(widgetCss, /\.contactScrollRegion\s+label/);
  assert.doesNotMatch(widgetCss, /\.contactScrollRegion\s+textarea/);
});

test("Ask contact handoff locks concurrent requests and restores focus", () => {
  assert.match(
    handoff,
    /const inFlightRef = useRef<"contact" \| "verification" \| null>\(null\)/,
  );
  assert.match(handoff, /if \(inFlightRef\.current !== null\) return/g);
  assert.match(handoff, /inFlightRef\.current = "contact"/);
  assert.match(handoff, /inFlightRef\.current = "verification"/);
  assert.match(handoff, /onBusyChange\?\.\(true\)/g);
  assert.match(handoff, /onBusyChange\?\.\(false\)/g);
  assert.match(handoff, /disabled=\{status === "sending" \|\| status === "verifying"\}/);
  assert.match(handoff, /confirmationHeadingRef\.current\?\.focus\(\)/);
  assert.match(widget, /contactLauncherRef\.current\?\.focus\(\)/);
  assert.match(widget, /restoreContactLauncherFocusRef\.current = true/);
  assert.match(widget, /if \(contactBusyRef\.current\) return/);
  assert.match(widget, /disabled=\{contactBusy\}/);
  assert.match(widget, /onBusyChange=\{handleContactBusyChange\}/g);
  assert.match(handoff, /ref=\{launcherRef\}/);
});

test("light confirmation shell uses contrast-safe controls and scoped paper colors", () => {
  assert.match(verificationShell, /trust:\s*"text-\[#2d777c\]"/);
  assert.match(verificationShell, /border border-\[#6f6a63\] bg-white/);
  assert.match(verificationShell, /focus:border-\[#b94716\]/);
  assert.match(verificationShell, /bg-\[#b94716\][^"]+text-\[#fafaf7\]/);
  assert.match(verificationShell, /accent:\s*"text-\[#b94716\]"/);
  assert.match(contactForm, /const lightButtonFocusClass/);
  assert.match(contactForm, /ring-offset-\[#f7f5f1\]/);
});
