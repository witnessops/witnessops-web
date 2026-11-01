import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { formatPolishVerificationExpiry } from "./verification-expiry-format";

test("Polish expiry displays the correct Warsaw date and time in summer and winter", () => {
  assert.equal(formatPolishVerificationExpiry("2026-07-14T22:00:00.000Z"), "15 lipca 2026, 00:00:00 (czas w Polsce, UTC+02:00)");
  assert.equal(formatPolishVerificationExpiry("2026-01-14T22:00:00.000Z"), "14 stycznia 2026, 23:00:00 (czas w Polsce, UTC+01:00)");
});

test("invalid or timezone-free expiry is not presented as a definite time", () => {
  for (const value of [null, "", "not-a-date", "2026-07-14T22:00:00", "2026-99-14T22:00:00Z", "2026-02-30T22:00:00Z", "2026-07-14T24:00:00Z"]) {
    assert.equal(formatPolishVerificationExpiry(value), null);
  }
});

test("repeated autumn hour and fractional expiry retain their exact instant", () => {
  assert.equal(formatPolishVerificationExpiry("2026-10-25T00:30:12Z"), "25 października 2026, 02:30:12 (czas w Polsce, UTC+02:00)");
  assert.equal(formatPolishVerificationExpiry("2026-10-25T01:30:12Z"), "25 października 2026, 02:30:12 (czas w Polsce, UTC+01:00)");
  assert.equal(formatPolishVerificationExpiry("2026-10-25T01:30:12.123Z"), "25 października 2026, 02:30:12,123 (czas w Polsce, UTC+01:00)");
});

test("unavailable international time formatting returns the unknown-time fallback", () => {
  const formatter = mock.method(Intl, "DateTimeFormat", () => { throw new Error("unavailable"); });
  try {
    assert.equal(formatPolishVerificationExpiry("2026-07-14T22:00:00Z"), null);
  } finally {
    formatter.mock.restore();
  }
});
