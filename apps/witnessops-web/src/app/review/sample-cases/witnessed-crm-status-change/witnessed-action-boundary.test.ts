import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";

const page = readFileSync(resolve(import.meta.dirname, "page.tsx"), "utf8");
const replay = readFileSync(resolve(import.meta.dirname, "witnessed-action-replay.tsx"), "utf8");
const styles = readFileSync(resolve(import.meta.dirname, "witnessed-action.module.css"), "utf8");

test("public route is explicitly a recorded synthetic replay", () => {
  assert.match(page, /Recorded specimen\. Demo\. Synthetic data\. This is a replay of one completed run, not live computer use\./);
  assert.match(replay, /Recorded specimen — approving starts the replay\. No live system or record will be changed\./);
  assert.match(replay, /Approve scope and replay/);
  assert.match(replay, /Original run authority/);
  assert.match(replay, /Visitor replay consent/);
});

test("replay does not begin until visitor consent and cannot authorize execution", () => {
  assert.match(replay, /useState<Stage>\("authority"\)/);
  assert.match(replay, /onClick=\{approveReplay\}/);
  assert.match(replay, /setReplayConsentAt\(new Date\(\)\.toISOString\(\)\)/);
  assert.match(replay, /authorizes no execution or mutation/);
  assert.match(replay, /No live CRM record, credential, customer data, or model will be contacted/);
  assert.doesNotMatch(replay, /fetch\(/);
  assert.doesNotMatch(replay, /XMLHttpRequest/);
  assert.doesNotMatch(replay, /sendBeacon/);
});

test("evidence categories and receipt limitations remain visible", () => {
  for (const heading of ["Declared", "Observed", "Verified", "Unresolved"]) {
    assert.match(replay, new RegExp(`>${heading}<`));
  }
  assert.match(replay, /Unsigned demonstration receipt/);
  assert.match(replay, /Verify generated receipt bytes/);
  assert.match(replay, /The exact bytes prepared for download match the displayed digest\./);
  assert.match(replay, /does not authenticate the publisher or prove the underlying event independently/);
  assert.match(replay, /sha256sum \{filename\}/);
});

test("paid Agent Action Security Review CTA appears only inside the receipt stage", () => {
  const receiptStart = replay.indexOf('stage === "receipt"');
  const paidCta = replay.indexOf("{PRIMARY_OFFER.name.en}");
  assert.ok(receiptStart >= 0);
  assert.ok(paidCta > receiptStart);
  assert.equal(PRIMARY_OFFER.id, "bounded-workflow-review");
  assert.equal(PRIMARY_OFFER.name.en, "Agent Action Security Review");
  assert.match(
    replay,
    /`\$\{PRIMARY_OFFER\.requestRoute\}\?offerId=\$\{PRIMARY_OFFER\.id\}`/,
  );
  assert.doesNotMatch(replay, /productId=WORKFLOW-S/);
});

test("stage changes expose and announce the newly active heading", () => {
  assert.match(replay, /stageHeadingRef = useRef<HTMLHeadingElement>\(null\)/);
  assert.equal(
    replay.match(/ref=\{stageHeadingRef\} tabIndex=\{-1\}/g)?.length,
    4,
  );
  assert.match(replay, /heading\.focus\(\{ preventScroll: true \}\)/);
  assert.match(replay, /heading\.scrollIntoView\(\{/);
  assert.match(replay, /block: "nearest"/);
  assert.match(replay, /role="status"/);
  assert.match(replay, /aria-live="polite"/);
  assert.match(replay, /aria-current=\{item\.id === stage \? "step" : undefined\}/);
  assert.match(
    styles,
    /scroll-margin-top:\s*calc\(var\(--app-navbar-height\) \+ 1rem\)/,
  );
});

test("stage scrolling honors reduced-motion preferences", () => {
  assert.match(replay, /"\(prefers-reduced-motion: reduce\)"/);
  assert.match(replay, /behavior: prefersReducedMotion \? "auto" : "smooth"/);
});
