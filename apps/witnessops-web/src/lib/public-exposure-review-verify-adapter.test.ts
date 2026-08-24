import assert from "node:assert/strict";
import test from "node:test";

import { PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS } from "@witnessops/proof/receipt";
import {
  PUBLIC_EXPOSURE_REVIEW_ADAPTER_ID,
  PUBLIC_EXPOSURE_REVIEW_INPUT_KIND,
  PUBLIC_EXPOSURE_REVIEW_TRUST_SNAPSHOT,
  hasPublicExposureReviewCompanionInput,
  verifyPublicExposureReviewReceipt,
} from "./public-exposure-review-verify-adapter";
import { makePublicExposureReviewReceipt } from "./public-exposure-review-verify-adapter.test-fixture";

function context(receipt: Record<string, unknown>): Record<string, unknown> {
  return receipt.verification_context as Record<string, unknown>;
}

test("valid profile remains indeterminate under the non-authorizing server trust snapshot", () => {
  const result = verifyPublicExposureReviewReceipt(
    makePublicExposureReviewReceipt(),
  );

  assert.equal(result.inputKind, PUBLIC_EXPOSURE_REVIEW_INPUT_KIND);
  assert.equal(result.adapter, PUBLIC_EXPOSURE_REVIEW_ADAPTER_ID);
  assert.equal(result.verdict, "indeterminate");
  assert.equal(result.scope, "receipt-only");
  assert.equal(result.artifactRevalidation, "not_performed");
  assert.equal(PUBLIC_EXPOSURE_REVIEW_TRUST_SNAPSHOT.policyStatus, "draft");
  assert.deepEqual(
    PUBLIC_EXPOSURE_REVIEW_TRUST_SNAPSHOT.allowedPublicKeyIds,
    [],
  );

  const requiredNotChecked = [
    "receipt_signature_cryptographic",
    "production_key_authorization",
    "request_record",
    "scope_authorization",
    "workflow_contract_complete",
    "verification_method_execution",
    "manifest_hash",
    "artifact_hashes",
    "evidence_support",
  ];
  for (const name of requiredNotChecked) {
    assert.equal(
      result.checks.find((item) => item.name === name)?.status,
      "not_checked",
      name,
    );
  }
  assert.ok(!result.checks.some((item) => item.name === "receipt_signature"));
  assert.equal(
    result.checks.find(
      (item) => item.name === "verification_method_definition",
    )?.status,
    "verified",
  );
  assert.equal(
    result.checks.find((item) => item.name === "verification_method")
      ?.compatibilityAliasFor,
    "verification_method_definition",
  );
});

test("treats receipt-declared scope as syntax only, not authorized workflow scope", () => {
  const receipt = makePublicExposureReviewReceipt();
  const scope = context(receipt).scope as Record<string, unknown>;
  scope.included = ["every internal, customer, and third-party system"];
  scope.criteria = [
    "authenticated exploitation, credential stuffing, and denial of service",
  ];
  scope.excluded = ["nothing"];

  const result = verifyPublicExposureReviewReceipt(receipt);

  assert.equal(result.verdict, "indeterminate");
  assert.equal(
    result.checks.find(
      (item) => item.name === "verification_context_syntax",
    )?.status,
    "verified",
  );
  assert.equal(
    result.checks.find((item) => item.name === "scope_authorization")?.status,
    "not_checked",
  );
  assert.ok(!result.checks.some((item) => item.name === "verification_context"));
  assert.doesNotMatch(result.summary, /matches .*workflow profile/i);
});

test("missing required claim returns invalid", () => {
  const receipt = makePublicExposureReviewReceipt();
  (receipt.claims as unknown[]).pop();

  const result = verifyPublicExposureReviewReceipt(receipt);

  assert.equal(result.verdict, "invalid");
  assert.equal(
    result.checks.find((item) => item.name === "receipt_claims")?.status,
    "unverified",
  );
  assert.ok(!result.checks.some((item) => item.status === "not_checked"));
});

test("missing required limitation returns invalid", () => {
  const receipt = makePublicExposureReviewReceipt();
  context(receipt).limitations = [
    ...PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS.slice(1),
  ];

  const result = verifyPublicExposureReviewReceipt(receipt);

  assert.equal(result.verdict, "invalid");
  assert.equal(
    result.checks.find((item) => item.name === "receipt_limitations")?.status,
    "unverified",
  );
});

test("well-formed signature mutation is not called invalid without trusted key material", () => {
  const receipt = makePublicExposureReviewReceipt();
  const signature = receipt.signature as Record<string, unknown>;
  signature.signature = `c${"b".repeat(127)}`;

  const result = verifyPublicExposureReviewReceipt(receipt);

  assert.equal(result.verdict, "indeterminate");
  assert.equal(
    result.checks.find((item) => item.name === "receipt_signature_syntax")
      ?.status,
    "verified",
  );
  assert.equal(
    result.checks.find(
      (item) => item.name === "receipt_signature_cryptographic",
    )?.status,
    "not_checked",
  );
});

test("detects bundled evidence and every caller-supplied trust companion class", () => {
  for (const key of [
    "evidence",
    "public_key",
    "key_registry",
    "trust_policy",
    "verifier_result",
  ]) {
    const receipt = makePublicExposureReviewReceipt();
    receipt[key] = { attacker_supplied: true };
    assert.equal(hasPublicExposureReviewCompanionInput(receipt), true, key);
  }
});
