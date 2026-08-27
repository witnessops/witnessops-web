import assert from "node:assert/strict";
import test from "node:test";

import { verifyReceiptPayload } from "./verify-adapter";
import { makePublicExposureReviewReceipt } from "./public-exposure-review-verify-adapter.test-fixture";
import { JSON_AMBIGUITY_MAX_DEPTH } from "./json-ambiguity";
import { loadVerifyFixture } from "./verify-fixtures";

test("verify adapter fails closed on JSON nesting beyond the scanner limit", () => {
  const depth = JSON_AMBIGUITY_MAX_DEPTH + 1;
  const receipt = `${'{"nested":'.repeat(depth)}{"value":1,"value":2}${"}".repeat(depth)}`;
  assert.doesNotThrow(() => JSON.parse(receipt));

  const result = verifyReceiptPayload({ receipt });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failureClass, "FAILURE_INPUT_MALFORMED");
    assert.equal(
      result.message,
      "Receipt payload exceeds supported JSON parser limits.",
    );
  }
});

test("verify adapter keeps malformed JSON distinct from the scanner depth limit", () => {
  const result = verifyReceiptPayload({ receipt: '{"unterminated":' });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failureClass, "FAILURE_INPUT_MALFORMED");
    assert.equal(result.message, "Receipt payload is not valid JSON.");
  }
});

test("verify adapter preserves skipped receipt checks as visible not-checked results", () => {
  const fixture = loadVerifyFixture("pv-valid");
  assert.ok(fixture);
  const result = verifyReceiptPayload({ receipt: fixture.receiptInput });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const skipped = result.checks.filter((check) => check.status === "not_checked");
  assert.ok(skipped.length > 0);
  assert.ok(
    skipped.every((check) =>
      /not independently verified|not checked|not revalidated|unavailable/i.test(
        check.detail ?? "",
      ),
    ),
  );
});

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

test("verify adapter routes the exact Public Exposure Review profile and keeps it indeterminate", () => {
  const result = verifyReceiptPayload({
    receipt: makePublicExposureReviewReceipt(),
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.inputKind, "public-exposure-review-receipt");
    assert.equal(
      result.adapter,
      "witnessops.verify.public_exposure_review_receipt.v1",
    );
    assert.equal(result.verdict, "indeterminate");
    assert.equal(
      result.checks.find(
        (item) => item.name === "production_key_authorization",
      )?.status,
      "not_checked",
    );
  }
});

test("verify adapter rejects evidence bundled inside a Public Exposure Review receipt", () => {
  const receipt = makePublicExposureReviewReceipt();
  receipt.evidence = [{ artifact_id: "offsec_000000000000000000000000" }];

  const result = verifyReceiptPayload({ receipt });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failureClass, "FAILURE_INPUT_UNSUPPORTED");
    assert.match(result.message, /does not accept bundled evidence/i);
  }
});

test("verify adapter rejects a receipt-and-evidence wrapper as a bundle", () => {
  const result = verifyReceiptPayload({
    receipt: {
      receipt: makePublicExposureReviewReceipt(),
      evidence: [{ bytes: "attacker supplied" }],
    },
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failureClass, "FAILURE_INPUT_UNSUPPORTED");
    assert.equal(result.message, "proof bundles are not supported on /verify v1.");
  }
});

test("verify adapter rejects request-level keys, registry, policy, and verifier results", () => {
  for (const key of [
    "public_key",
    "registry",
    "policy",
    "verifier_result",
  ]) {
    const result = verifyReceiptPayload({
      receipt: makePublicExposureReviewReceipt(),
      [key]: { attacker_supplied: true },
    });

    assert.equal(result.ok, false, key);
    if (!result.ok) {
      assert.equal(result.failureClass, "FAILURE_INPUT_UNSUPPORTED", key);
      assert.match(result.message, /caller-supplied trust inputs/i);
    }
  }
});

test("verify adapter preserves legacy tolerance for unrelated request metadata", () => {
  const result = verifyReceiptPayload({
    receipt: makePublicExposureReviewReceipt(),
    requestId: "client-correlation-only",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.verdict, "indeterminate");
  }
});
