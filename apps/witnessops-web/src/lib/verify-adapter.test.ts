import assert from "node:assert/strict";
import test from "node:test";

import { verifyReceiptPayload } from "./verify-adapter";

test("verify adapter does not forward verifier exception text", () => {
  const receipt: Record<string, unknown> = {
    schema_version: "1.0.0",
    proof_stage: "PV",
    receipt_id: "rcpt_throw_001",
  };
  Object.defineProperty(receipt, "integrity", {
    enumerable: true,
    get() {
      throw new Error("SECRET_PATH /tmp/operator-custody");
    },
  });

  const result = verifyReceiptPayload({ receipt });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failureClass, "FAILURE_INPUT_MALFORMED");
    assert.equal(result.message, "receipt verification failed to execute.");
    assert.doesNotMatch(result.message, /SECRET_PATH|operator-custody|\/tmp\//);
  }
});
