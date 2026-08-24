import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS,
  PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS,
  PUBLIC_EXPOSURE_REVIEW_VERIFICATION_METHOD,
  validatePublicExposureReviewReceipt,
} from "./public-exposure-review";

function makeReceipt(): Record<string, unknown> {
  const proofRunId = "pr_per_0123456789abcdef01234567";
  return {
    receipt_version: "witnessops.receipt.v0",
    receipt_profile: "witnessops.verification_context.v1",
    workflow_class: "public_exposure_review",
    proof_run_id: proofRunId,
    verification_context: {
      subject: {
        type: "public_facing_system",
        reference: `urn:witnessops:public-exposure-review:${proofRunId}`,
      },
      scope: {
        included: ["one authorised public-facing system"],
        criteria: ["unauthenticated outside-in review"],
        excluded: ["penetration testing and proof of compromise"],
        observation_window: {
          started_at: "2026-08-24T09:00:00Z",
          ended_at: "2026-08-24T10:00:00Z",
        },
      },
      verification_method: structuredClone(
        PUBLIC_EXPOSURE_REVIEW_VERIFICATION_METHOD,
      ),
      timestamps: {
        performed_at: "2026-08-24T10:05:00Z",
        issued_at: "2026-08-24T10:06:00Z",
        expires_at: null,
      },
      limitations: [
        ...PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS,
        "independent_evidence_verification_not_performed",
      ],
    },
    result: {
      outcome: "inconclusive",
      failure_states: [
        "independent_evidence_verification_not_performed",
        "production_trust_not_evaluated",
      ],
    },
    claims: [...PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS]
      .sort()
      .map((claim, index) => ({
        claim,
        status: "passed",
        evidence_refs: [`offsec_${index.toString(16).repeat(24)}`],
      })),
    manifest_hash: `sha256:${"a".repeat(64)}`,
    signature: {
      algorithm: "ed25519",
      public_key_id: "witnessops_production_key_001",
      encoding: "hex",
      signature: "b".repeat(128),
    },
  };
}

function context(receipt: Record<string, unknown>): Record<string, unknown> {
  return receipt.verification_context as Record<string, unknown>;
}

test("validates canonical proof-engine alphabetically sorted claim output", () => {
  const result = validatePublicExposureReviewReceipt(makeReceipt());

  assert.equal(result.valid, true);
  assert.ok(result.checks.every((item) => item.status === "pass"));
  assert.equal(
    result.checks.find(
      (item) => item.name === "verification_context_syntax",
    )?.status,
    "pass",
  );
  assert.ok(!result.checks.some((item) => item.name === "verification_context"));
});

test("rejects a missing required claim", () => {
  const receipt = makeReceipt();
  (receipt.claims as unknown[]).pop();

  const result = validatePublicExposureReviewReceipt(receipt);

  assert.equal(result.valid, false);
  assert.equal(
    result.checks.find((item) => item.name === "receipt_claims")?.status,
    "fail",
  );
});

test("rejects a missing fixed limitation", () => {
  const receipt = makeReceipt();
  context(receipt).limitations = [
    ...PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS.slice(1),
  ];

  const result = validatePublicExposureReviewReceipt(receipt);

  assert.equal(result.valid, false);
  assert.equal(
    result.checks.find((item) => item.name === "receipt_limitations")?.status,
    "fail",
  );
});

test("rejects method text drift even when the method id and version match", () => {
  const receipt = makeReceipt();
  const method = context(receipt).verification_method as Record<string, unknown>;
  method.procedure = ["perform a generic external scan"];

  const result = validatePublicExposureReviewReceipt(receipt);

  assert.equal(result.valid, false);
  assert.equal(
    result.checks.find((item) => item.name === "verification_method")?.status,
    "fail",
  );
});

test("rejects contradictory receipt chronology", () => {
  const receipt = makeReceipt();
  const timestamps = context(receipt).timestamps as Record<string, unknown>;
  timestamps.performed_at = "2026-08-24T08:59:59Z";

  const result = validatePublicExposureReviewReceipt(receipt);

  assert.equal(result.valid, false);
  assert.equal(
    result.checks.find((item) => item.name === "receipt_chronology")?.status,
    "fail",
  );
});

test("rejects calendar-invalid timestamps that Date.parse would normalize", () => {
  const receipt = makeReceipt();
  const scope = context(receipt).scope as Record<string, unknown>;
  const window = scope.observation_window as Record<string, unknown>;
  window.started_at = "2026-02-31T09:00:00Z";

  const result = validatePublicExposureReviewReceipt(receipt);

  assert.equal(result.valid, false);
  assert.equal(
    result.checks.find((item) => item.name === "receipt_chronology")?.status,
    "fail",
  );
});

test("accepts a changed but still well-formed signature as syntax only", () => {
  const receipt = makeReceipt();
  const signature = receipt.signature as Record<string, unknown>;
  signature.signature = `c${"b".repeat(127)}`;

  const result = validatePublicExposureReviewReceipt(receipt);

  assert.equal(result.valid, true);
  assert.equal(
    result.checks.find((item) => item.name === "receipt_signature_syntax")
      ?.status,
    "pass",
  );
});

test("rejects human labels where canonical manifest artifact IDs are required", () => {
  const receipt = makeReceipt();
  const firstClaim = (receipt.claims as Array<Record<string, unknown>>)[0];
  firstClaim.evidence_refs = ["E-001"];

  const result = validatePublicExposureReviewReceipt(receipt);

  assert.equal(result.valid, false);
  assert.equal(
    result.checks.find((item) => item.name === "receipt_claims")?.status,
    "fail",
  );
});

test("rejects caller-supplied trust material as an unsupported envelope field", () => {
  const receipt = makeReceipt();
  receipt.key_registry = { registry_status: "active" };

  const result = validatePublicExposureReviewReceipt(receipt);

  assert.equal(result.valid, false);
  assert.equal(
    result.checks.find((item) => item.name === "receipt_schema")?.status,
    "fail",
  );
});
