import assert from "node:assert/strict";
import test from "node:test";

import {
  verifyCheckStatusLabel,
  verifyResultLimitationsCopy,
} from "./verification-result";

test("incomplete result copy does not describe the current outcome as valid", () => {
  const copy = verifyResultLimitationsCopy("indeterminate");
  assert.match(copy, /Incomplete means receipt-scoped checks ran/);
  assert.match(copy, /not a valid result/);
  assert.doesNotMatch(copy, /^A valid result confirms/);
});

test("valid result copy keeps the existing valid-result boundary sentence", () => {
  assert.match(
    verifyResultLimitationsCopy("valid"),
    /^A valid result confirms the checks named in the receipt/,
  );
});

test("indeterminate check passes are labeled receipt-scoped, not Passed", () => {
  assert.equal(
    verifyCheckStatusLabel("verified", "indeterminate"),
    "Receipt-scoped",
  );
  assert.equal(verifyCheckStatusLabel("verified", "valid"), "Passed");
  assert.equal(verifyCheckStatusLabel("unverified", "indeterminate"), "Failed");
  assert.equal(
    verifyCheckStatusLabel("not_checked", "indeterminate"),
    "Not checked",
  );
  assert.notEqual(
    verifyCheckStatusLabel("not_checked", "indeterminate"),
    verifyCheckStatusLabel("not_applicable", "indeterminate"),
  );
});
