import assert from "node:assert/strict";
import test from "node:test";
import { formatWarsawClock, formatWarsawDateTime } from "./admin-warsaw-time";
import {
  DRIVE_COUNTS_TOWARD_HEALTH_CHIP,
  buildHealthCards,
  deriveGmailHealth,
  displayKindForPayload,
  healthChip,
  type HealthPayloadItem,
  type HealthPayloadState,
  type SyncReceiptSnapshot,
} from "./admin-health-display";

const WINTER = "2026-01-15T19:12:00.000Z";
const SUMMER = "2026-07-15T18:12:00.000Z";
const NOW = new Date("2026-10-24T18:12:00.000Z");

function item(state: HealthPayloadState, lastSuccessfulCheck: string | null = null): HealthPayloadItem {
  return { state, lastSuccessfulCheck, lastError: null, detail: "synthetic detail kept as body text" };
}

function receipt(status: SyncReceiptSnapshot["status"], completedAt = WINTER, error = ""): SyncReceiptSnapshot {
  return {
    status,
    startedAt: completedAt,
    completedAt,
    failures: error ? [{ error }] : [],
  };
}

test("Warsaw formatter is DST-safe in winter and summer", () => {
  assert.equal(formatWarsawDateTime(WINTER), "15 Jan 2026, 20:12");
  assert.equal(formatWarsawDateTime(SUMMER), "15 Jul 2026, 20:12");
  assert.equal(formatWarsawClock(WINTER), "20:12");
  assert.equal(formatWarsawDateTime("not-a-time"), null);
});

test("every raw health status maps to a display state and green requires a check time", () => {
  const states: HealthPayloadState[] = ["connected", "degraded", "disconnected", "unknown"];
  for (const state of states) {
    const kind = displayKindForPayload({ state, realCheckAt: null, configuredWhenUnknown: false });
    assert.notEqual(kind, "connected");
  }
  assert.equal(displayKindForPayload({ state: "disconnected", realCheckAt: null, configuredWhenUnknown: false }), "not_set_up");
  assert.equal(displayKindForPayload({ state: "degraded", realCheckAt: null, configuredWhenUnknown: false }), "failing");
  assert.equal(displayKindForPayload({ state: "unknown", realCheckAt: null, configuredWhenUnknown: false }), "not_checked");
  assert.equal(displayKindForPayload({ state: "unknown", realCheckAt: null, configuredWhenUnknown: true }), "configured");
  assert.equal(displayKindForPayload({ state: "connected", realCheckAt: WINTER, configuredWhenUnknown: false }), "connected");
  assert.equal(displayKindForPayload({ state: "connected", realCheckAt: null, configuredWhenUnknown: false }), "configured");
  assert.equal(displayKindForPayload({ state: "connected", realCheckAt: "", configuredWhenUnknown: false }), "configured");
});

test("a fixture check time connects, and removing the time configures", () => {
  const withTime = buildHealthCards({
    fixture: item("connected", WINTER),
  }, [], NOW);
  assert.equal(withTime[0]?.kind, "connected");
  assert.equal(withTime[0]?.label, "Connected · checked 15 Jan, 20:12");

  const withoutTime = buildHealthCards({
    fixture: item("connected", null),
  }, [], NOW);
  assert.equal(withoutTime[0]?.kind, "configured");
  assert.equal(withoutTime[0]?.label, "Configured · not checked");
});

test("hard-coded connected cards stay configured even when the payload stamps a time", () => {
  const cards = buildHealthCards({
    receiptVerifier: item("connected", NOW.toISOString()),
    receiptArchive: item("connected", NOW.toISOString()),
    publicContactRoute: item("connected", NOW.toISOString()),
    publicFallbackMailbox: item("connected", NOW.toISOString()),
    securityDisclosureMailbox: item("connected", NOW.toISOString()),
  }, [], NOW);
  assert.deepEqual(cards.map((card) => card.kind), ["configured", "configured", "configured", "configured", "configured"]);
  assert.ok(cards.every((card) => card.label === "Configured · not checked"));
});

test("Gmail derivation uses sync receipts and never invents a time", () => {
  const failed = Array.from({ length: 5 }, () => receipt("failed", WINTER, "synthetic-sync-failure-reason"));
  const allFailed = deriveGmailHealth(failed, NOW);
  assert.equal(allFailed.kind, "failing");
  assert.equal(allFailed.label, "Failing · 5 of last 5 syncs failed");
  assert.match(allFailed.evidence, /5 of 5 failed/);
  assert.match(allFailed.evidence, /15 Jan 2026, 20:12/);

  const succeeded = deriveGmailHealth([receipt("completed", SUMMER)], NOW);
  assert.equal(succeeded.kind, "connected");
  assert.equal(succeeded.label, "Connected · checked 15 Jul, 20:12");

  const none = deriveGmailHealth([], NOW);
  assert.equal(none.kind, "configured");
  assert.equal(none.label, "Configured · not checked");

  const noTime = deriveGmailHealth([receipt("completed", "")], NOW);
  assert.equal(noTime.kind, "configured");
  assert.equal(noTime.checkAt, null);
});

test("health cards sort problems first and keep the body text", () => {
  const cards = buildHealthCards({
    receiptVerifier: item("connected", NOW.toISOString()),
    drive: item("disconnected"),
    gmail: item("unknown"),
    mailDelivery: item("unknown"),
  }, [receipt("failed", WINTER, "synthetic-sync-failure-reason")], NOW);
  assert.deepEqual(cards.map((card) => card.title), ["Gmail", "Google Drive", "Receipt verifier", "Mail delivery"]);
  assert.deepEqual(cards.map((card) => card.kind), ["failing", "not_set_up", "configured", "configured"]);
  assert.ok(cards.every((card) => card.detail === "synthetic detail kept as body text"));
});

test("chip and sidebar tooltip follow worst state, and Drive counts", () => {
  assert.equal(DRIVE_COUNTS_TOWARD_HEALTH_CHIP, true);
  const cards = buildHealthCards({
    gmail: item("unknown"),
    drive: item("disconnected"),
    mailDelivery: item("unknown"),
    receiptVerifier: item("connected", NOW.toISOString()),
  }, [receipt("failed", "", "synthetic-sync-failure-reason")], NOW);
  const chip = healthChip(cards);
  assert.equal(chip.text, "Health: 1 failing, 1 not set up");
  assert.equal(chip.kind, "failing");
  assert.equal(chip.tone, "rose");

  const withoutDrive = healthChip(cards, false);
  assert.equal(withoutDrive.text, "Health: 1 failing");

  const configuredOnly = buildHealthCards({
    mailDelivery: item("unknown"),
    receiptVerifier: item("connected", NOW.toISOString()),
  }, [], NOW);
  assert.equal(healthChip(configuredOnly).text, "Health: not fully checked");

  const notSetUpOnly = buildHealthCards({
    drive: item("disconnected"),
    mailDelivery: item("disconnected"),
  }, [], NOW);
  assert.equal(healthChip(notSetUpOnly).text, "Health: 2 not set up");

  const checked = buildHealthCards({
    fixture: item("connected", "2026-10-24T18:12:00.000Z"),
  }, [], NOW);
  assert.equal(healthChip(checked).text, "Health: all checked 20:12");
});
