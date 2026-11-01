import assert from "node:assert/strict";
import test from "node:test";
import { DemoBookingCalendar, DemoBookingError, DEMO_HOLD_MS, formatDemoSlot, slotPeriod, type BookingDraft } from "./demo-booking-calendar";

const details: BookingDraft = { topic: "Agent approves demo refunds", stage: "planned", name: "Demo Visitor", email: "visitor@example.test", timezone: "Europe/Warsaw" };
function fixture() {
  let now = Date.parse("2026-10-23T08:00:00Z");
  return { calendar: new DemoBookingCalendar(() => now), advance: (ms: number) => { now += ms; } };
}
function error(code: string) { return (value: unknown) => value instanceof DemoBookingError && value.code === code; }

test("a hold is not a booking, and only its immutable details are confirmed once", () => {
  const { calendar } = fixture();
  const slot = calendar.available()[0]!;
  const changed = { ...details };
  const hold = calendar.prepare(slot.id, changed);
  changed.topic = "Different topic";
  hold.details.name = "Changed outside calendar";
  assert.ok(!calendar.available().some((item) => item.id === slot.id));
  const booked = calendar.confirm(hold.id);
  assert.equal(booked.details.topic, details.topic);
  assert.equal(booked.details.name, details.name);
  assert.deepEqual(calendar.confirm(hold.id), booked);
});

test("changing preferences releases the old authorization", () => {
  const { calendar } = fixture();
  const slot = calendar.available()[0]!;
  const hold = calendar.prepare(slot.id, details);
  calendar.release(hold.id);
  assert.throws(() => calendar.confirm(hold.id), error("expired"));
  assert.ok(calendar.available().some((item) => item.id === slot.id));
});

test("concurrent holds, expiry, and last-moment conflicts reject obsolete confirmations", () => {
  const { calendar, advance } = fixture();
  const slot = calendar.available()[0]!;
  const first = calendar.prepare(slot.id, details);
  assert.throws(() => calendar.prepare(slot.id, details), error("unavailable"));
  advance(DEMO_HOLD_MS + 1);
  const second = calendar.prepare(slot.id, details);
  assert.throws(() => calendar.confirm(first.id), error("expired"));
  calendar.simulateConflict(slot.id);
  assert.throws(() => calendar.confirm(second.id), error("unavailable"));
});

test("rescheduling preserves the original on failure and replaces it only after confirmation", () => {
  const { calendar } = fixture();
  const original = calendar.confirm(calendar.prepare(calendar.available()[0]!.id, details).id);
  const replacement = calendar.prepare(calendar.available()[0]!.id, details, original.reference);
  calendar.simulateConflict(replacement.slot.id);
  assert.throws(() => calendar.confirm(replacement.id), error("unavailable"));
  assert.ok(!calendar.available().some((slot) => slot.id === original.slot.id));
  const retry = calendar.prepare(calendar.available()[0]!.id, details, original.reference);
  const moved = calendar.confirm(retry.id);
  assert.equal(moved.reference, original.reference);
  assert.equal(moved.revision, 2);
  assert.ok(calendar.available().some((slot) => slot.id === original.slot.id));
  assert.deepEqual(calendar.confirm(retry.id), moved);
});

test("cancellation releases capacity and stale retries never resurrect a meeting", () => {
  const { calendar } = fixture();
  const hold = calendar.prepare(calendar.available()[0]!.id, details);
  const booking = calendar.confirm(hold.id);
  const reschedule = calendar.prepare(calendar.available()[0]!.id, details, booking.reference);
  const cancelled = calendar.cancel(booking.reference);
  assert.equal(cancelled.status, "cancelled");
  assert.deepEqual(calendar.cancel(booking.reference), cancelled);
  assert.equal(calendar.confirm(hold.id).status, "cancelled");
  assert.throws(() => calendar.confirm(reschedule.id), error("expired"));
  assert.ok(calendar.available().some((slot) => slot.id === booking.slot.id));
});

test("calendar is rolling, future-only, isolated, and uses 20-minute UTC instants", () => {
  const { calendar } = fixture();
  const other = fixture().calendar;
  const available = calendar.available();
  assert.ok(available.length >= 3);
  for (const slot of available) {
    assert.ok(Date.parse(slot.start) > Date.parse("2026-10-23T08:00:00Z"));
    assert.equal(Date.parse(slot.end) - Date.parse(slot.start), 20 * 60_000);
    assert.ok(![0, 6].includes(new Date(slot.start).getUTCDay()));
  }
  calendar.confirm(calendar.prepare(available[0]!.id, details).id);
  assert.ok(other.available().some((slot) => slot.id === available[0]!.id));
});

test("timezone display respects daylight-saving transitions and localized periods", () => {
  const before = { id: "before", start: "2026-10-23T09:00:00Z", end: "2026-10-23T09:20:00Z" };
  const after = { id: "after", start: "2026-10-26T09:00:00Z", end: "2026-10-26T09:20:00Z" };
  assert.match(formatDemoSlot(before, "Europe/Warsaw", "en"), /11:00.*GMT\+2/);
  assert.match(formatDemoSlot(after, "Europe/Warsaw", "en"), /10:00.*GMT\+1/);
  assert.equal(slotPeriod(before, "Europe/Warsaw"), "morning");
  assert.equal(slotPeriod(before, "Asia/Singapore"), "afternoon");
});

test("invalid identities, agendas and timezones cannot prepare confirmation", () => {
  const { calendar } = fixture();
  const slot = calendar.available()[0]!;
  for (const patch of [{ name: "" }, { email: "broken" }, { topic: " " }, { timezone: "not-a-zone" }]) {
    assert.throws(() => calendar.prepare(slot.id, { ...details, ...patch }), error("invalid"));
  }
  assert.throws(() => calendar.prepare("invented-time", details), error("unavailable"));
});
