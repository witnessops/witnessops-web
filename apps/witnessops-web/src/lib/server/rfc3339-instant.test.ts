import test from "node:test";
import assert from "node:assert/strict";

import { compareRfc3339Instants, laterRfc3339 } from "./rfc3339-instant";

test("RFC3339 timestamps are ordered as instants across timezone offsets", () => {
  const olderButTextuallyLater = "2026-08-13T10:00:00+02:00";
  const newer = "2026-08-13T09:30:00Z";

  assert.equal(compareRfc3339Instants(olderButTextuallyLater, newer), -1);
  assert.equal(laterRfc3339(olderButTextuallyLater, newer), newer);
});

test("equivalent RFC3339 offset timestamps compare equally", () => {
  assert.equal(
    compareRfc3339Instants(
      "2026-08-13T10:00:00+02:00",
      "2026-08-13T08:00:00Z",
    ),
    0,
  );
});

test("invalid timestamps fail closed", () => {
  assert.throws(
    () => compareRfc3339Instants("not-a-time", "2026-08-13T08:00:00Z"),
    /valid RFC3339 timestamp/,
  );
});
