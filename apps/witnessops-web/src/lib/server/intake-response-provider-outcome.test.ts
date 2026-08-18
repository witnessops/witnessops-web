import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { validateProviderEventSecret } from "./intake-response-provider-outcome";

const originalSecret = process.env.WITNESSOPS_PROVIDER_EVENT_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.WITNESSOPS_PROVIDER_EVENT_SECRET;
  } else {
    process.env.WITNESSOPS_PROVIDER_EVENT_SECRET = originalSecret;
  }
});

test("provider event secret compare accepts the exact configured secret", () => {
  process.env.WITNESSOPS_PROVIDER_EVENT_SECRET = "provider-secret";
  assert.equal(validateProviderEventSecret("provider-secret"), true);
});

test("provider event secret compare rejects a wrong or missing secret", () => {
  process.env.WITNESSOPS_PROVIDER_EVENT_SECRET = "provider-secret";
  assert.equal(validateProviderEventSecret("wrong-secret"), false);
  assert.equal(validateProviderEventSecret("provider-secre"), false);
  assert.equal(validateProviderEventSecret(null), false);
});
