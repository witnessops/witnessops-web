import test from "node:test";
import assert from "node:assert/strict";

import { resolveVerificationPageRequest } from "./verification-page-request";

test("verification page prefers a bounded opaque context", () => {
  assert.deepEqual(
    resolveVerificationPageRequest({ context: "a".repeat(32) }),
    { context: "a".repeat(32) },
  );
});

test("verification page keeps unexpired legacy issuance/email links usable", () => {
  assert.deepEqual(
    resolveVerificationPageRequest({
      issuanceId: "iss_legacy",
      email: "Buyer@Example.com",
    }),
    { issuanceId: "iss_legacy", email: "buyer@example.com" },
  );
});

test("verification page rejects incomplete or unbounded legacy parameters", () => {
  assert.equal(resolveVerificationPageRequest({ issuanceId: "iss_legacy" }), null);
  assert.equal(
    resolveVerificationPageRequest({
      issuanceId: "x".repeat(241),
      email: "buyer@example.com",
    }),
    null,
  );
});
