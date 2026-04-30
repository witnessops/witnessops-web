import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  digestToken,
  generateRawToken,
  tokenDigestMatches,
} from "./token-crypto";

const originalSecret = process.env.WITNESSOPS_TOKEN_SIGNING_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.WITNESSOPS_TOKEN_SIGNING_SECRET;
  } else {
    process.env.WITNESSOPS_TOKEN_SIGNING_SECRET = originalSecret;
  }
});

test("generateRawToken emits a human-readable verification code", () => {
  process.env.WITNESSOPS_TOKEN_SIGNING_SECRET = "test-secret";

  const token = generateRawToken();

  assert.match(token, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
});

test("tokenDigestMatches accepts typed code variants", () => {
  process.env.WITNESSOPS_TOKEN_SIGNING_SECRET = "test-secret";

  const token = "ABCD-EFGH-JKLM";
  const digest = digestToken(token);

  assert.equal(tokenDigestMatches("abcd efgh jklm", digest), true);
  assert.equal(tokenDigestMatches("ABCDEFGHJKLM", digest), true);
  assert.equal(tokenDigestMatches("ABCD-EFGH-JKLA", digest), false);
});
