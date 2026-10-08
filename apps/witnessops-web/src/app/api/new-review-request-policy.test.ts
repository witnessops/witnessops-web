import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST as reviewPost } from "./review/request/route";
import { POST as engagePost } from "./engage/route";
import { POST as contactPost } from "./contact/route";
import { _resetAllStores } from "@witnessops/config/rate-limit";

afterEach(() => _resetAllStores());

// Always invalid email: even a policy regression must stop at validation, never delivery.
function request(path: string, body: Record<string, unknown>) {
  return new Request(`https://local.test${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Real-IP": "203.0.113.77" },
    body: JSON.stringify({ name: "Synthetic Buyer", email: "not-an-email", scope: "A non-secret fit question for an agreed review.", ...body }),
  });
}

for (const [path, handler] of [["/api/review/request", reviewPost], ["/api/engage", engagePost], ["/api/contact", contactPost]] as const) {
  for (const [label, body] of [
    ["retired intent", { intent: "bounded-workflow-review" }],
    ["unknown intent", { intent: "invented-offer" }],
    ["alias stripped by schema", { intent: "review", productId: "OFFSEC-LOCAL-AUDIT" }],
    ["stale landing fallback", { intent: "review", scope: "Request: fit\nEnquiry path: Early Bird — Internet Footprint Review" }],
    ["conflicting serialised identity", { intent: "agent-tools-access-review", scope: "Selected product / intent: OFFSEC-EXTERNAL-EXPOSURE" }],
  ] as const) {
    test(`${path} rejects ${label} before issuance`, async () => {
      const response = await handler(request(path, body));
      assert.equal(response.status, 400);
      const result = await response.json();
      assert.equal(result.code, "NEW_REVIEW_SELECTION_REQUIRED");
      assert.equal(result.field, "intent");
      assert.equal(result.issuanceId, undefined);
    });
  }
  for (const intent of ["agent-tools-access-review", "OFFSEC-EXTERNAL-EXPOSURE", "review", "ask-ai-contact"]) {
    test(`${path} ${intent} reaches ordinary validation without issuance`, async () => {
      const response = await handler(request(path, { intent }));
      assert.equal(response.status, 400);
      const result = await response.json();
      assert.notEqual(result.code, "NEW_REVIEW_SELECTION_REQUIRED");
      assert.equal(result.issuanceId, undefined);
    });
  }
}
