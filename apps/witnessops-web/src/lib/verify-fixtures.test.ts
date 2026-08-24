import assert from "node:assert/strict";
import test from "node:test";

import { verifyReceiptPayload } from "./verify-adapter";
import { listVerifyFixtures } from "./verify-fixtures";

test("fixture expectations match the public verification adapter", () => {
  for (const fixture of listVerifyFixtures()) {
    const result = verifyReceiptPayload({ receipt: fixture.receiptInput });

    if (fixture.expected.kind === "failure") {
      assert.equal(result.ok, false, fixture.id);
      if (!result.ok) {
        assert.equal(
          result.failureClass,
          fixture.expected.failureClass,
          fixture.id,
        );
      }
      continue;
    }

    assert.equal(result.ok, true, fixture.id);
    if (result.ok) {
      assert.equal(result.verdict, fixture.expected.verdict, fixture.id);
    }
  }
});
