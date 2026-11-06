import assert from "node:assert/strict";
import test from "node:test";
import { warsawSlots, warsawWallToUtc } from "./warsaw-time";

test("Europe/Warsaw wall times survive winter, summer, and both DST transitions", () => {
  assert.equal(warsawWallToUtc(2026, 1, 15, 9, 0), "2026-01-15T08:00:00.000Z");
  assert.equal(warsawWallToUtc(2026, 7, 15, 9, 0), "2026-07-15T07:00:00.000Z");
  assert.equal(warsawWallToUtc(2026, 3, 29, 9, 0), "2026-03-29T07:00:00.000Z");
  assert.equal(warsawWallToUtc(2026, 10, 25, 9, 0), "2026-10-25T08:00:00.000Z");
  assert.equal(warsawWallToUtc(2026, 3, 29, 2, 30), null);
  assert.equal(warsawWallToUtc(2026, 10, 25, 2, 30), null);
});

test("offered slots are weekday Europe/Warsaw hours with lead time, not UTC hours", () => {
  const slots = warsawSlots(Date.parse("2026-11-06T08:00:00.000Z"));
  assert.equal(slots.some((slot) => slot.id === "waw-20261106-0900"), false);
  assert.equal(slots.some((slot) => slot.id === "waw-20261106-1200"), false);
  assert.equal(slots[0]?.id, "waw-20261106-1500");
  assert.equal(slots[0]?.start, "2026-11-06T14:00:00.000Z");
  assert.equal(slots.some((slot) => slot.id.startsWith("waw-20261107-") || slot.id.startsWith("waw-20261108-")), false);
  assert.equal(slots.some((slot) => slot.id === "waw-20261109-0900"), true);
  assert.equal(slots.find((slot) => slot.id === "waw-20261109-0900")?.start, "2026-11-09T08:00:00.000Z");
});
