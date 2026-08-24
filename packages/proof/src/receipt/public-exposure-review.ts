/**
 * Receipt-only policy validation for the Public Exposure Review profile.
 *
 * This module deliberately does not accept evidence bundles, public keys, key
 * registries, trust policies, or verifier results. It validates only the
 * signed-envelope shape and the product-specific workflow context. Signature
 * and evidence verification remain separate, independently supplied checks.
 */

export const PUBLIC_EXPOSURE_REVIEW_RECEIPT_VERSION =
  "witnessops.receipt.v0" as const;
export const PUBLIC_EXPOSURE_REVIEW_RECEIPT_PROFILE =
  "witnessops.verification_context.v1" as const;
export const PUBLIC_EXPOSURE_REVIEW_WORKFLOW_CLASS =
  "public_exposure_review" as const;
export const PUBLIC_EXPOSURE_REVIEW_SUBJECT_TYPE =
  "public_facing_system" as const;

export const PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS = [
  "offer_contract_applied",
  "authority_and_scope_recorded",
  "recorded_checks_within_approved_schedule",
  "findings_reference_evidence",
  "unknowns_and_limitations_preserved",
  "source_artifacts_hash_bound",
] as const;

export const PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS = [
  "not_a_penetration_test",
  "not_a_certification",
  "not_an_attestation",
  "not_a_compliance_determination",
  "not_proof_of_security",
  "not_proof_of_completeness",
  "not_proof_of_third_party_acceptance",
  "not_proof_of_absence_of_vulnerabilities",
] as const;

/**
 * Exact snapshot of the governed workflow method in
 * `public_exposure_review.production.v1`. The web compatibility adapter must
 * move with that contract in one reviewed change; request input cannot replace
 * these values.
 */
export const PUBLIC_EXPOSURE_REVIEW_VERIFICATION_METHOD = {
  id: "external_exposure_assessment",
  version: "2.0.0",
  procedure: [
    "validate the complete offer-required authority packet and freeze target and approved-check schedules before target-facing work",
    "perform passive public-source discovery without expanding active scope",
    "after the approval checkpoint, perform only scheduled low-impact unauthenticated outside-in checks",
    "manually validate and deduplicate observations and link findings, unknowns, and exclusions to hashed artifacts",
    "produce a bounded review outcome with the fixed offer limitations and frozen source records preserved",
  ],
  pass_criteria: [
    "complete authority precedes target-facing work and scope remains within every fixed offer cap",
    "only approved checks run after approval and no prohibited method or unhonored stop condition is recorded",
    "every exported artifact is hash-bound, every material finding is reconstructable, and all required limitations are preserved",
  ],
  fail_criteria: [
    "authority is missing, scope or execution exceeds the approved schedule, or a prohibited method or constraint violation is recorded",
    "a triggered stop condition is not honored or required evidence is missing, ambiguous, dangling, or hash-mismatched",
    "a material finding is unsupported or a required limitation is omitted or weakened",
  ],
} as const;

export type PublicExposureReviewPolicyCheckStatus = "pass" | "fail";

export interface PublicExposureReviewPolicyCheck {
  name: string;
  status: PublicExposureReviewPolicyCheckStatus;
  detail: string;
}

export interface PublicExposureReviewReceiptValidation {
  valid: boolean;
  checks: PublicExposureReviewPolicyCheck[];
}

const IDENTIFIER = /^[a-z][a-z0-9_]*$/;
const PROOF_RUN_ID = /^pr_per_[a-f0-9]{24}$/;
const MANIFEST_ARTIFACT_ID = /^offsec_[a-f0-9]{24}$/;
const MANIFEST_HASH = /^sha256:[a-f0-9]{64}$/;
const SIGNATURE_HEX = /^[a-f0-9]{128}$/;
const RFC3339_UTC =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?Z$/;

const TOP_LEVEL_KEYS = [
  "receipt_version",
  "receipt_profile",
  "workflow_class",
  "proof_run_id",
  "verification_context",
  "result",
  "claims",
  "manifest_hash",
  "signature",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function hasExactKeys(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

function isBoundedText(value: unknown, maxLength = 1000): value is string {
  return (
    typeof value === "string" && value.length >= 1 && value.length <= maxLength
  );
}

function isUniqueStringArray(
  value: unknown,
  options: {
    min: number;
    max: number;
    pattern?: RegExp;
    bounded?: boolean;
  },
): value is string[] {
  if (
    !Array.isArray(value) ||
    value.length < options.min ||
    value.length > options.max ||
    !value.every((item) =>
      options.bounded
        ? isBoundedText(item)
        : typeof item === "string" &&
          (options.pattern === undefined || options.pattern.test(item)),
    )
  ) {
    return false;
  }
  return new Set(value).size === value.length;
}

function equalsStringArray(value: unknown, expected: readonly string[]): boolean {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    expected.every((item, index) => value[index] === item)
  );
}

function isRfc3339Utc(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = RFC3339_UTC.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth[month - 1] &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    Number.isFinite(Date.parse(value))
  );
}

function check(
  name: string,
  passed: boolean,
  passDetail: string,
  failDetail: string,
): PublicExposureReviewPolicyCheck {
  return {
    name,
    status: passed ? "pass" : "fail",
    detail: passed ? passDetail : failDetail,
  };
}

/**
 * A workflow marker routes a document to this bounded adapter, even when other
 * required profile fields are malformed. Only a fully valid document is
 * accepted as a recognized Public Exposure Review receipt.
 */
export function isPublicExposureReviewReceiptCandidate(
  receipt: Record<string, unknown>,
): boolean {
  return receipt.workflow_class === PUBLIC_EXPOSURE_REVIEW_WORKFLOW_CLASS;
}

export function validatePublicExposureReviewReceipt(
  receipt: Record<string, unknown>,
): PublicExposureReviewReceiptValidation {
  const checks: PublicExposureReviewPolicyCheck[] = [];

  const envelopeValid = hasExactKeys(receipt, TOP_LEVEL_KEYS);
  checks.push(
    check(
      "receipt_schema",
      envelopeValid,
      "The receipt contains exactly the canonical profiled-envelope fields.",
      "The Public Exposure Review receipt envelope is missing required fields or contains unsupported fields.",
    ),
  );

  const proofRunId = receipt.proof_run_id;
  const identityValid =
    receipt.receipt_version === PUBLIC_EXPOSURE_REVIEW_RECEIPT_VERSION &&
    receipt.receipt_profile === PUBLIC_EXPOSURE_REVIEW_RECEIPT_PROFILE &&
    receipt.workflow_class === PUBLIC_EXPOSURE_REVIEW_WORKFLOW_CLASS &&
    typeof proofRunId === "string" &&
    PROOF_RUN_ID.test(proofRunId);
  checks.push(
    check(
      "receipt_identity",
      identityValid,
      "Receipt version, profile, workflow class, and proof run ID match the Public Exposure Review contract.",
      "Receipt version, profile, workflow class, or proof run ID does not match the Public Exposure Review contract.",
    ),
  );

  const result = receipt.result;
  const resultShapeValid = hasExactKeys(result, ["outcome", "failure_states"]);
  const outcome = resultShapeValid ? result.outcome : undefined;
  const failureStates = resultShapeValid ? result.failure_states : undefined;
  const resultValid =
    resultShapeValid &&
    (outcome === "pass" ||
      outcome === "partial" ||
      outcome === "fail" ||
      outcome === "inconclusive") &&
    isUniqueStringArray(failureStates, {
      min: 0,
      max: 100,
      pattern: IDENTIFIER,
    }) &&
    !(outcome === "pass" && failureStates.length > 0);
  checks.push(
    check(
      "review_result",
      resultValid,
      "The bounded review outcome and failure-state inventory are structurally consistent.",
      "The bounded review outcome or failure-state inventory is malformed or contradictory.",
    ),
  );

  const claims = receipt.claims;
  const claimNames = Array.isArray(claims)
    ? claims.map((claim) => (isRecord(claim) ? claim.claim : undefined))
    : [];
  const exactClaimSet =
    claimNames.length === PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS.length &&
    new Set(claimNames).size === claimNames.length &&
    PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS.every((required) =>
      claimNames.includes(required),
    );
  const claimsValid =
    Array.isArray(claims) &&
    exactClaimSet &&
    claims.every((claim) => {
      if (!hasExactKeys(claim, ["claim", "status", "evidence_refs"])) {
        return false;
      }
      const statusValid =
        claim.status === "passed" ||
        claim.status === "partial" ||
        claim.status === "failed" ||
        claim.status === "inconclusive";
      return (
        typeof claim.claim === "string" &&
        PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS.includes(
          claim.claim as (typeof PUBLIC_EXPOSURE_REVIEW_REQUIRED_CLAIMS)[number],
        ) &&
        statusValid &&
        isUniqueStringArray(claim.evidence_refs, {
          min: 1,
          max: 1000,
          pattern: MANIFEST_ARTIFACT_ID,
        }) &&
        !(outcome === "pass" && claim.status !== "passed")
      );
    });
  checks.push(
    check(
      "receipt_claims",
      claimsValid,
      "The receipt contains exactly the six workflow claims and canonical OffSec manifest artifact references.",
      "The receipt must contain exactly the six Public Exposure Review claims, each once and with canonical OffSec manifest artifact IDs.",
    ),
  );

  const context = receipt.verification_context;
  const contextShapeValid = hasExactKeys(context, [
    "subject",
    "scope",
    "verification_method",
    "timestamps",
    "limitations",
  ]);
  const subject = contextShapeValid ? context.subject : undefined;
  const subjectValid =
    hasExactKeys(subject, ["type", "reference"], ["display_name"]) &&
    subject.type === PUBLIC_EXPOSURE_REVIEW_SUBJECT_TYPE &&
    typeof proofRunId === "string" &&
    subject.reference ===
      `urn:witnessops:public-exposure-review:${proofRunId}` &&
    (!hasOwn(subject, "display_name") ||
      isBoundedText(subject.display_name, 200));

  const scope = contextShapeValid ? context.scope : undefined;
  const scopeShapeValid = hasExactKeys(scope, [
    "included",
    "criteria",
    "excluded",
    "observation_window",
  ]);
  const observationWindow = scopeShapeValid
    ? scope.observation_window
    : undefined;
  const observationWindowShapeValid = hasExactKeys(observationWindow, [
    "started_at",
    "ended_at",
  ]);
  const scopeValid =
    scopeShapeValid &&
    isUniqueStringArray(scope.included, { min: 1, max: 50, bounded: true }) &&
    isUniqueStringArray(scope.criteria, { min: 1, max: 50, bounded: true }) &&
    isUniqueStringArray(scope.excluded, { min: 1, max: 50, bounded: true }) &&
    observationWindowShapeValid &&
    isRfc3339Utc(observationWindow.started_at) &&
    isRfc3339Utc(observationWindow.ended_at);
  const verificationContextValid = contextShapeValid && subjectValid && scopeValid;
  checks.push(
    check(
      "verification_context_syntax",
      verificationContextValid,
      "The receipt-declared subject and scope are structurally well-formed for the Public Exposure Review profile.",
      "The receipt-declared Public Exposure Review subject or scope is malformed or inconsistent with the proof run ID.",
    ),
  );

  const method = contextShapeValid ? context.verification_method : undefined;
  const methodValid =
    hasExactKeys(method, [
      "id",
      "version",
      "procedure",
      "pass_criteria",
      "fail_criteria",
    ]) &&
    method.id === PUBLIC_EXPOSURE_REVIEW_VERIFICATION_METHOD.id &&
    method.version === PUBLIC_EXPOSURE_REVIEW_VERIFICATION_METHOD.version &&
    equalsStringArray(
      method.procedure,
      PUBLIC_EXPOSURE_REVIEW_VERIFICATION_METHOD.procedure,
    ) &&
    equalsStringArray(
      method.pass_criteria,
      PUBLIC_EXPOSURE_REVIEW_VERIFICATION_METHOD.pass_criteria,
    ) &&
    equalsStringArray(
      method.fail_criteria,
      PUBLIC_EXPOSURE_REVIEW_VERIFICATION_METHOD.fail_criteria,
    );
  checks.push(
    check(
      "verification_method",
      methodValid,
      "The exact External Exposure Assessment 2.0.0 method definition is preserved.",
      "The verification method ID, version, procedure, or acceptance criteria differ from the governed workflow contract.",
    ),
  );

  const limitations = contextShapeValid ? context.limitations : undefined;
  const limitationsValid =
    isUniqueStringArray(limitations, { min: 1, max: 50, bounded: true }) &&
    PUBLIC_EXPOSURE_REVIEW_REQUIRED_LIMITATIONS.every((limitation) =>
      limitations.includes(limitation),
    );
  checks.push(
    check(
      "receipt_limitations",
      limitationsValid,
      "All fixed Public Exposure Review non-claims are preserved.",
      "One or more required Public Exposure Review limitation codes are missing or malformed.",
    ),
  );

  const timestamps = contextShapeValid ? context.timestamps : undefined;
  const timestampsShapeValid = hasExactKeys(timestamps, [
    "performed_at",
    "issued_at",
    "expires_at",
  ]);
  const startedAt = observationWindowShapeValid
    ? observationWindow.started_at
    : undefined;
  const endedAt = observationWindowShapeValid
    ? observationWindow.ended_at
    : undefined;
  const performedAt = timestampsShapeValid ? timestamps.performed_at : undefined;
  const issuedAt = timestampsShapeValid ? timestamps.issued_at : undefined;
  const expiresAt = timestampsShapeValid ? timestamps.expires_at : undefined;
  const timestampsSyntacticallyValid =
    isRfc3339Utc(startedAt) &&
    isRfc3339Utc(endedAt) &&
    isRfc3339Utc(performedAt) &&
    isRfc3339Utc(issuedAt) &&
    (expiresAt === null || isRfc3339Utc(expiresAt));
  const chronologyValid =
    timestampsShapeValid &&
    timestampsSyntacticallyValid &&
    Date.parse(startedAt) <= Date.parse(endedAt) &&
    Date.parse(endedAt) <= Date.parse(performedAt) &&
    Date.parse(performedAt) <= Date.parse(issuedAt) &&
    (expiresAt === null || Date.parse(issuedAt) < Date.parse(expiresAt));
  checks.push(
    check(
      "receipt_chronology",
      chronologyValid,
      "Observation, performance, issuance, and optional expiry timestamps are chronological UTC values.",
      "Timestamps are malformed or violate started_at <= ended_at <= performed_at <= issued_at < expires_at.",
    ),
  );

  const manifestHashValid =
    typeof receipt.manifest_hash === "string" &&
    MANIFEST_HASH.test(receipt.manifest_hash);
  checks.push(
    check(
      "manifest_hash_syntax",
      manifestHashValid,
      "The receipt contains a lowercase SHA-256 manifest digest.",
      "manifest_hash must be sha256 followed by exactly 64 lowercase hexadecimal characters.",
    ),
  );

  const signature = receipt.signature;
  const signatureValid =
    hasExactKeys(signature, [
      "algorithm",
      "public_key_id",
      "encoding",
      "signature",
    ]) &&
    signature.algorithm === "ed25519" &&
    signature.encoding === "hex" &&
    typeof signature.public_key_id === "string" &&
    IDENTIFIER.test(signature.public_key_id) &&
    typeof signature.signature === "string" &&
    SIGNATURE_HEX.test(signature.signature);
  checks.push(
    check(
      "receipt_signature_syntax",
      signatureValid,
      "The receipt declares an Ed25519 key ID and a 64-byte lowercase-hex signature.",
      "The receipt signature block must use Ed25519, a canonical key ID, hex encoding, and exactly 64 signature bytes.",
    ),
  );

  return {
    valid: checks.every((item) => item.status === "pass"),
    checks,
  };
}
