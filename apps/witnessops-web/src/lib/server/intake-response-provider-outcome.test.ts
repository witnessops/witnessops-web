import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { validateResponseOutcomeSecret } from "./intake-response-provider-outcome";

const originalSecret = process.env.WITNESSOPS_RESPONSE_OUTCOME_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.WITNESSOPS_RESPONSE_OUTCOME_SECRET;
  } else {
    process.env.WITNESSOPS_RESPONSE_OUTCOME_SECRET = originalSecret;
  }
});

test("provider event secret compare accepts the exact configured secret", () => {
  process.env.WITNESSOPS_RESPONSE_OUTCOME_SECRET = "provider-secret";
  assert.equal(validateResponseOutcomeSecret("provider-secret"), true);
});

test("provider event secret compare rejects a wrong or missing secret", () => {
  process.env.WITNESSOPS_RESPONSE_OUTCOME_SECRET = "provider-secret";
  assert.equal(validateResponseOutcomeSecret("wrong-secret"), false);
  assert.equal(validateResponseOutcomeSecret("provider-secre"), false);
  assert.equal(validateResponseOutcomeSecret(null), false);
});
