import {
  isPublicExposureReviewReceiptCandidate,
  validatePublicExposureReviewReceipt,
} from "@witnessops/proof/receipt";
import type {
  VerifyCheckView,
  VerifySuccessResponse,
} from "@/lib/verify-contract";

export const PUBLIC_EXPOSURE_REVIEW_ADAPTER_ID =
  "witnessops.verify.public_exposure_review_receipt.v1" as const;
export const PUBLIC_EXPOSURE_REVIEW_INPUT_KIND =
  "public-exposure-review-receipt" as const;

/**
 * Server-owned trust posture for this compatibility slice.
 *
 * It is intentionally non-authorizing: the production policy and registry are
 * still draft and no production signing key is allowlisted. Request input can
 * never replace this snapshot.
 */
export const PUBLIC_EXPOSURE_REVIEW_TRUST_SNAPSHOT = Object.freeze({
  policyId: "public_exposure_review.production_signing.v1",
  policyStatus: "draft",
  registryStatus: "draft",
  allowedPublicKeyIds: Object.freeze([] as string[]),
});

export const PUBLIC_EXPOSURE_REVIEW_UNSUPPORTED_COMPANION_KEYS = [
  "artifact",
  "artifacts",
  "bundle",
  "bundle_id",
  "bundleId",
  "evidence",
  "evidence_manifest",
  "files",
  "key",
  "keys",
  "key_registry",
  "manifest",
  "policy",
  "proofs",
  "public_key",
  "public_keys",
  "receipts",
  "registry",
  "trust_policy",
  "verification_result",
  "verifier_result",
] as const;

export function hasPublicExposureReviewCompanionInput(
  value: Record<string, unknown>,
): boolean {
  return PUBLIC_EXPOSURE_REVIEW_UNSUPPORTED_COMPANION_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(value, key),
  );
}

function notChecked(name: string, detail: string): VerifyCheckView {
  return { name, status: "not_checked", detail };
}

export function verifyPublicExposureReviewReceipt(
  receipt: Record<string, unknown>,
): VerifySuccessResponse {
  const validation = validatePublicExposureReviewReceipt(receipt);
  const checks: VerifyCheckView[] = validation.checks.flatMap((item) => {
    const view: VerifyCheckView = {
      name: item.name,
      status: item.status === "pass" ? "verified" : "unverified",
      detail: item.detail,
    };
    if (item.name !== "verification_method") return [view];

    return [
      { ...view, name: "verification_method_definition" },
      {
        ...view,
        compatibilityAliasFor: "verification_method_definition",
      },
    ];
  });

  if (validation.valid) {
    checks.push(
      notChecked(
        "receipt_signature_cryptographic",
        "The signature is well-formed, but no server-owned active production key is configured to verify it.",
      ),
      notChecked(
        "production_key_authorization",
        `Server trust policy ${PUBLIC_EXPOSURE_REVIEW_TRUST_SNAPSHOT.policyId} is draft and authorizes no production keys.`,
      ),
      notChecked(
        "request_record",
        "The receipt-only surface did not receive or independently check the originating request record.",
      ),
      notChecked(
        "scope_authorization",
        "The receipt-declared scope was syntax-checked, but it was not compared with the frozen target schedule, approved-check schedule, or authority packet.",
      ),
      notChecked(
        "workflow_contract_complete",
        "The receipt-only surface did not receive the complete authority and workflow execution records.",
      ),
      notChecked(
        "verification_method_execution",
        "The receipt preserves the frozen method definition, but the receipt-only surface did not independently check that the declared procedure was executed.",
      ),
      notChecked(
        "manifest_hash",
        "The manifest digest syntax was checked, but no manifest bytes were supplied or hashed.",
      ),
      notChecked(
        "artifact_hashes",
        "No artifact bytes were supplied, so artifact hashes were not recomputed.",
      ),
      notChecked(
        "evidence_support",
        "Claim references were shape-checked as manifest artifact IDs, but their evidence support was not independently evaluated.",
      ),
    );
  }

  return {
    ok: true,
    inputKind: PUBLIC_EXPOSURE_REVIEW_INPUT_KIND,
    adapter: PUBLIC_EXPOSURE_REVIEW_ADAPTER_ID,
    verdict: validation.valid ? "indeterminate" : "invalid",
    scope: "receipt-only",
    artifactRevalidation: "not_performed",
    proofStageClaimed: "unknown",
    proofStageVerified: "unknown",
    summary: validation.valid
      ? "The receipt has the recognized Public Exposure Review receipt structure, but its declared scope was not checked against authority records, and production signer trust, request and workflow completeness, manifest and artifact bytes, and evidence support were not independently checked. Verification remains indeterminate."
      : "The Public Exposure Review receipt conflicts with the required receipt profile or workflow acceptance policy.",
    checks,
    breaches: [],
  };
}

export { isPublicExposureReviewReceiptCandidate };
