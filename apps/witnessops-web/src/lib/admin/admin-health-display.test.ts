import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { formatWarsawClock, formatWarsawDateTime } from "./admin-warsaw-time";
import {
  ADMIN_HEALTH_SETTINGS_HREF,
  CHIP_COUNTED_INTEGRATION_IDS,
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
  assert.equal(withoutTime[0]?.evidence, "Decided by: payload reports connected but records no check time, so it is treated as configured.");
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
  assert.ok(cards.every((card) => card.evidence === "Decided by: payload reports connected but records no check time, so it is treated as configured."));
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

test("a newest partial receipt is configured, not failing", () => {
  const partial = deriveGmailHealth([receipt("partial", SUMMER), receipt("failed", WINTER)], NOW);
  assert.equal(partial.kind, "configured");
  assert.equal(partial.label, "Configured · not checked");
  assert.equal(partial.evidence, "Decided by: sync receipts (newest sync partial).");
  assert.equal(partial.checkAt, null);
  const cards = buildHealthCards({
    gmail: item("unknown"),
    mailDelivery: item("unknown"),
  }, [receipt("partial", SUMMER)], NOW);
  const gmail = cards.find((card) => card.title === "Gmail");
  assert.equal(gmail?.kind, "configured");
  assert.equal(gmail?.evidence, "Decided by: sync receipts (newest sync partial).");
  const chip = healthChip(cards);
  assert.notEqual(chip.kind, "failing");
  assert.doesNotMatch(chip.text, /failing/);
});

test("every Open Health href equals the settings route", () => {
  assert.equal(ADMIN_HEALTH_SETTINGS_HREF, "/admin/settings");
  const surfaces = [
    "../../components/admin/admin-console-shell.tsx",
    "../../components/admin/admin-inbox-sync.tsx",
    "../../components/admin/admin-page-error.tsx",
    "../../components/admin/admin-core-dashboard.tsx",
  ];
  for (const relative of surfaces) {
    const source = readFileSync(path.resolve(__dirname, relative), "utf8");
    assert.match(source, /href=\{ADMIN_HEALTH_SETTINGS_HREF\}/);
    assert.doesNotMatch(source, /["']\/admin\/system["']/);
  }
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

test("the health chip counts only Gmail and the receipt records", () => {
  assert.deepEqual([...CHIP_COUNTED_INTEGRATION_IDS], ["gmail", "receiptVerifier", "receiptArchive"]);
  const payload = {
    gmail: item("unknown"),
    drive: item("disconnected"),
    mailDelivery: item("disconnected"),
    receiptVerifier: item("connected", NOW.toISOString()),
    receiptArchive: item("connected", NOW.toISOString()),
    publicContactRoute: item("connected", NOW.toISOString()),
    publicFallbackMailbox: item("connected", NOW.toISOString()),
    securityDisclosureMailbox: item("connected", NOW.toISOString()),
  };
  const baselineCards = buildHealthCards(payload, [], NOW);
  const baseline = healthChip(baselineCards);
  assert.equal(baseline.text, "Health: not fully checked");
  assert.equal(baseline.kind, "not_checked");
  assert.equal(baseline.tone, "neutral");
  assert.equal(baselineCards.find((card) => card.key === "drive")?.kind, "not_set_up");

  const driveStates: Array<{ state: HealthPayloadState; kind: "failing" | "not_set_up" | "connected" }> = [
    { state: "degraded", kind: "failing" },
    { state: "disconnected", kind: "not_set_up" },
    { state: "connected", kind: "connected" },
  ];
  for (const drive of driveStates) {
    const cards = buildHealthCards({
      ...payload,
      drive: item(drive.state, drive.state === "connected" ? NOW.toISOString() : null),
    }, [], NOW);
    const chip = healthChip(cards);
    assert.equal(chip.text, baseline.text);
    assert.equal(chip.kind, baseline.kind);
    assert.equal(chip.tone, baseline.tone);
    assert.equal(cards.find((card) => card.key === "drive")?.kind, drive.kind);
  }

  const gmailFailing = [receipt("failed", WINTER, "synthetic-sync-failure-reason")];
  const withFailingDrive = healthChip(buildHealthCards({ ...payload, drive: item("degraded") }, gmailFailing, NOW));
  const withConnectedDrive = healthChip(buildHealthCards({ ...payload, drive: item("connected", NOW.toISOString()) }, gmailFailing, NOW));
  assert.equal(withFailingDrive.text, "Health: 1 failing");
  assert.equal(withFailingDrive.kind, "failing");
  assert.deepEqual(withFailingDrive, withConnectedDrive);

  const checked = healthChip([
    { key: "gmail", kind: "connected", checkAt: "2026-10-24T18:12:00.000Z" },
    { key: "receiptVerifier", kind: "connected", checkAt: "2026-10-24T18:12:00.000Z" },
    { key: "receiptArchive", kind: "connected", checkAt: "2026-10-24T17:00:00.000Z" },
    { key: "drive", kind: "failing", checkAt: null },
  ]);
  assert.equal(checked.text, "Health: all checked 20:12");
  assert.equal(checked.kind, "connected");
  assert.equal(checked.tone, "neutral");
});
