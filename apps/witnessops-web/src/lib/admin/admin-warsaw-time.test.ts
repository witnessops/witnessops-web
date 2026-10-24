import assert from "node:assert/strict";
import test from "node:test";
import { formatWarsawClock, formatWarsawDateTime, isSameWarsawDay } from "./admin-warsaw-time";

test("Europe/Warsaw formatting stays stable across winter and summer offsets", () => {
  assert.equal(formatWarsawDateTime("2026-01-15T19:12:00.000Z"), "15 Jan 2026, 20:12");
  assert.equal(formatWarsawDateTime("2026-07-15T18:12:00.000Z"), "15 Jul 2026, 20:12");
  assert.equal(formatWarsawDateTime("2026-09-10T10:00:00Z"), "10 Sep 2026, 12:00");
  assert.equal(formatWarsawDateTime("2026-10-24T18:12:00.000Z"), "24 Oct 2026, 20:12");
  assert.equal(formatWarsawClock("2026-10-24T18:12:00.000Z"), "20:12");
  assert.equal(isSameWarsawDay("2026-10-24T18:12:00.000Z", new Date("2026-10-24T10:00:00.000Z")), true);
  assert.equal(isSameWarsawDay("2026-10-24T22:30:00.000Z", new Date("2026-10-24T10:00:00.000Z")), false);
});
