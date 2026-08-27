import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(import.meta.dirname, "page.tsx"), "utf8");
const replay = readFileSync(resolve(import.meta.dirname, "witnessed-action-replay.tsx"), "utf8");

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

test("paid CTA appears only inside the receipt stage", () => {
  const receiptStart = replay.indexOf('stage === "receipt"');
  const paidCta = replay.indexOf("Agent Risk &amp; Control Review");
  assert.ok(receiptStart >= 0);
  assert.ok(paidCta > receiptStart);
  assert.match(replay, /\/review\/request\?offerId=bounded-workflow-review/);
  assert.doesNotMatch(replay, /productId=WORKFLOW-S/);
});
