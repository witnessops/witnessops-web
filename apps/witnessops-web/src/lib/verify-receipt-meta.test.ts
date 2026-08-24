import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { extractReceiptMeta } from "./verify-receipt-meta";
import { makePublicExposureReviewReceipt } from "./public-exposure-review-verify-adapter.test-fixture";

test("extractReceiptMeta reads id and created_at from PV fixture", () => {
  const input = readFileSync(
    resolve(__dirname, "../../fixtures/verify/pv-valid.json"),
    "utf-8",
  );
  const meta = extractReceiptMeta(input);
  assert.equal(meta.receiptId, "rcpt_pv_001");
  assert.equal(meta.createdAt, "2026-03-16T12:34:56Z");
});

test("extractReceiptMeta tolerates nested receipt wrapper", () => {
  const meta = extractReceiptMeta(
    JSON.stringify({
      receipt: {
        receipt_id: "rcpt_nested",
        created_at: "2026-01-01T00:00:00Z",
        issuer: { id: "issuer-1" },
      },
    }),
  );
  assert.equal(meta.receiptId, "rcpt_nested");
  assert.equal(meta.issuer, "issuer-1");
  assert.equal(meta.createdAt, "2026-01-01T00:00:00Z");
});

test("extractReceiptMeta returns empty object on garbage", () => {
  assert.deepEqual(extractReceiptMeta("not-json"), {});
});

test("extractReceiptMeta projects canonical Public Exposure Review context fields", () => {
  const receipt = makePublicExposureReviewReceipt();
  const meta = extractReceiptMeta(JSON.stringify(receipt));

  assert.equal(meta.receiptId, "pr_per_0123456789abcdef01234567");
  assert.equal(meta.issuer, undefined);
  assert.equal(meta.createdAt, "2026-08-24T10:06:00Z");
  assert.equal(
    meta.subject,
    "urn:witnessops:public-exposure-review:pr_per_0123456789abcdef01234567",
  );
});
