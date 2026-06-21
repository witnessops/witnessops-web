import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  isOffsecShieldReceipt,
  verifyOffsecShieldReceipt,
} from "./shield-verify-adapter";

function loadFixture(name: string): Record<string, unknown> {
  const candidates = [
    resolve(__dirname, "../../fixtures/verify", name),
    resolve(process.cwd(), "fixtures/verify", name),
  ];
  for (const filePath of candidates) {
    try {
      return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  throw new Error(`missing fixture ${name}`);
}

test("isOffsecShieldReceipt recognizes sample receipt", () => {
  const doc = loadFixture("offsec-shield-valid.json");
  assert.equal(isOffsecShieldReceipt(doc), true);
});

test("verifyOffsecShieldReceipt passes valid sample structurally", () => {
  const doc = loadFixture("offsec-shield-valid.json");
  const result = verifyOffsecShieldReceipt(doc);
  assert.equal(result.ok, true);
  assert.equal(result.inputKind, "offsec-shield-receipt");
  assert.equal(result.verdict, "valid");
  assert.equal(result.proofStageClaimed, "unknown");
  assert.equal(result.artifactRevalidation, "not_possible");
});

test("verifyOffsecShieldReceipt fails authority binding mismatch", () => {
  const doc = loadFixture("offsec-shield-bad-binding.json");
  const result = verifyOffsecShieldReceipt(doc);
  assert.equal(result.verdict, "invalid");
  assert.ok(
    result.checks.some(
      (c) => c.name === "SHIELD_AUTHORITY_HASH_BINDING" && c.status === "unverified",
    ),
  );
});