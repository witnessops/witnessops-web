import assert from "node:assert/strict";
import test from "node:test";

import { loadVerifyFixture } from "../../apps/witnessops-web/src/lib/verify-fixtures";
import { verifyReceiptPayload } from "../../apps/witnessops-web/src/lib/verify-adapter";

test("receipt-only verification accepts a canonical valid receipt fixture", () => {
  const fixture = loadVerifyFixture("pv-valid");
  assert.ok(fixture);
  const result = verifyReceiptPayload({ receipt: fixture.receiptInput });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.verdict, "valid");
    assert.equal(result.proofStageClaimed, "PV");
    assert.equal(result.scope, "receipt-only");
  }
});

test("receipt-only verification rejects unsupported staged inputs", () => {
  const fixture = loadVerifyFixture("unsupported-stage");
  assert.ok(fixture);
  const result = verifyReceiptPayload({ receipt: fixture.receiptInput });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failureClass, "FAILURE_INPUT_UNSUPPORTED");
  }
});
