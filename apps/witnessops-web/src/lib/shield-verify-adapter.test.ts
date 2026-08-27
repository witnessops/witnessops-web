import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  LEGACY_OFFSEC_SHIELD_RECEIPT_SCHEMA,
  LEGACY_RUN_RECEIPT_SCHEMA_ID,
  LOCAL_SERVER_AUDIT_ADAPTER_ID,
  LOCAL_SERVER_AUDIT_INPUT_KIND,
  LOCAL_SERVER_AUDIT_RECEIPT_SCHEMA,
  isLocalServerAuditReceipt,
  isOffsecShieldReceipt,
  verifyLocalServerAuditReceipt,
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

test("isLocalServerAuditReceipt recognizes primary WitnessOps schema", () => {
  const doc = loadFixture("local-server-audit-valid.json");
  assert.equal(doc.schema, LOCAL_SERVER_AUDIT_RECEIPT_SCHEMA);
  assert.equal(isLocalServerAuditReceipt(doc), true);
  assert.equal(isOffsecShieldReceipt(doc), true);
});

test("isLocalServerAuditReceipt recognizes legacy offsecshield schema (dual-read)", () => {
  const doc = loadFixture("offsec-shield-valid.json");
  assert.equal(doc.schema, LEGACY_OFFSEC_SHIELD_RECEIPT_SCHEMA);
  assert.equal(isLocalServerAuditReceipt(doc), true);
});

test("isLocalServerAuditReceipt recognizes the exact legacy schema_id-only marker", () => {
  const doc = loadFixture("offsec-shield-valid.json");
  delete doc.schema;
  doc.schema_id = LEGACY_RUN_RECEIPT_SCHEMA_ID;
  assert.equal(isLocalServerAuditReceipt(doc), true);
  assert.equal(verifyLocalServerAuditReceipt(doc).verdict, "indeterminate");
});

test("isLocalServerAuditReceipt rejects near-match and conflicting schema markers", () => {
  assert.equal(
    isLocalServerAuditReceipt({
      schema_id: `${LEGACY_RUN_RECEIPT_SCHEMA_ID}.attacker`,
    }),
    false,
  );
  assert.equal(
    isLocalServerAuditReceipt({
      schema: "unknown.receipt.v1",
      schema_id: LEGACY_RUN_RECEIPT_SCHEMA_ID,
    }),
    false,
  );
});

test("verifyLocalServerAuditReceipt passes primary sample structurally", () => {
  const doc = loadFixture("local-server-audit-valid.json");
  const result = verifyLocalServerAuditReceipt(doc);
  assert.equal(result.ok, true);
  assert.equal(result.inputKind, LOCAL_SERVER_AUDIT_INPUT_KIND);
  assert.equal(result.adapter, LOCAL_SERVER_AUDIT_ADAPTER_ID);
  assert.equal(result.verdict, "indeterminate");
  assert.equal(result.proofStageClaimed, "unknown");
  assert.equal(result.artifactRevalidation, "not_possible");
  assert.match(result.summary, /Local server audit/i);
  assert.doesNotMatch(result.summary, /^OffSec Shield/i);
  assert.equal(
    result.checks.find((check) => check.name === "SHIELD_OFFLINE_BYTES")?.status,
    "not_applicable",
  );
});

test("verifyLocalServerAuditReceipt dual-reads legacy offsecshield fixture", () => {
  const doc = loadFixture("offsec-shield-valid.json");
  const result = verifyLocalServerAuditReceipt(doc);
  assert.equal(result.ok, true);
  assert.equal(result.inputKind, LOCAL_SERVER_AUDIT_INPUT_KIND);
  assert.equal(result.adapter, LOCAL_SERVER_AUDIT_ADAPTER_ID);
  assert.equal(result.verdict, "indeterminate");
});

test("verifyLocalServerAuditReceipt fails authority binding mismatch (primary)", () => {
  const doc = loadFixture("local-server-audit-bad-binding.json");
  const result = verifyLocalServerAuditReceipt(doc);
  assert.equal(result.verdict, "invalid");
  assert.ok(
    result.checks.some(
      (c) => c.name === "SHIELD_AUTHORITY_HASH_BINDING" && c.status === "unverified",
    ),
  );
});

test("verifyLocalServerAuditReceipt fails authority binding mismatch (legacy)", () => {
  const doc = loadFixture("offsec-shield-bad-binding.json");
  const result = verifyLocalServerAuditReceipt(doc);
  assert.equal(result.verdict, "invalid");
  assert.ok(
    result.checks.some(
      (c) => c.name === "SHIELD_AUTHORITY_HASH_BINDING" && c.status === "unverified",
    ),
  );
});

test("verifyLocalServerAuditReceipt rejects duplicate artifact paths before binding", () => {
  const doc = loadFixture("local-server-audit-valid.json");
  const artifacts = doc.artifacts;
  assert.ok(Array.isArray(artifacts));
  const authority = artifacts.find(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      (item as Record<string, unknown>).path === "evidence/authority.json",
  );
  assert.ok(authority);
  artifacts.push({
    ...(authority as Record<string, unknown>),
    sha256: "f".repeat(64),
  });

  const result = verifyLocalServerAuditReceipt(doc);
  assert.equal(result.verdict, "invalid");
  assert.equal(
    result.checks.find((check) => check.name === "SHIELD_ARTIFACTS")?.status,
    "unverified",
  );
  assert.equal(
    result.checks.find(
      (check) => check.name === "SHIELD_AUTHORITY_HASH_BINDING",
    )?.status,
    "unverified",
  );
});

test("duplicate artifact path cannot bind when only one duplicate has a hash", () => {
  const doc = loadFixture("local-server-audit-valid.json");
  const artifacts = doc.artifacts;
  assert.ok(Array.isArray(artifacts));
  artifacts.push({ path: "evidence/authority.json" });

  const result = verifyLocalServerAuditReceipt(doc);
  assert.equal(result.verdict, "invalid");
  assert.equal(
    result.checks.find(
      (check) => check.name === "SHIELD_AUTHORITY_HASH_BINDING",
    )?.status,
    "unverified",
  );
});

test("deprecated verifyOffsecShieldReceipt alias still works on legacy fixture", () => {
  const doc = loadFixture("offsec-shield-valid.json");
  const result = verifyOffsecShieldReceipt(doc);
  assert.equal(result.inputKind, LOCAL_SERVER_AUDIT_INPUT_KIND);
  assert.equal(result.verdict, "indeterminate");
});
