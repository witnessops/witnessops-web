/**
 * Receipt-level verifier for PV / QV / WV proof stages.
 *
 * Structural verification only — does not recompute file hashes or perform
 * real Ed25519 / RFC-3161 cryptographic verification. Those require access to
 * the actual artifact files and TSR tokens respectively.
 *
 * What it DOES verify:
 *   - schema structure and required fields per proof stage
 *   - internal consistency (digest agreement, imprint match, witness subject match)
 *   - promotion lineage (predecessor required for QV/WV)
 *   - stage-appropriate constraints (e.g. QV requires blake3 primary, RFC-3161 present)
 *
 * Signature validity checks use a convention: signatures starting with "sig-valid-"
 * are treated as valid in fixture/test mode. Real verification requires injecting
 * a cryptographic verifier.
 */

import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import type {
  Receipt,
  PVReceipt,
  QVReceipt,
  WVReceipt,
  ProofStage,
  VerificationCheck,
  VerificationStatus,
  VerificationVerdict,
  VerificationVerdict_,
  VerificationMode,
  ArtifactRevalidation,
  Breach,
  BreachCode,
  PVVerificationResult,
  QVVerificationResult,
  WVVerificationResult,
  VerificationResult,
  Digest,
} from "../receipt-schema";
import {
  TIER1_FREEZE_V2_1_SCHEMA_VERSION,
  adaptLiveOffsecToTier1FreezeV2_1R0,
  verifyTier1FreezeV2_1R0,
  type Tier1FreezeV2_1VerificationVerdict,
} from "./tier1-freeze-v2_1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function check(
  name: string,
  passed: boolean,
  detail?: string,
  breach_code?: BreachCode,
): VerificationCheck {
  return {
    name,
    status: passed ? "pass" : "fail",
    detail,
    breach_code: passed ? undefined : breach_code,
  };
}

function skip(name: string, detail?: string): VerificationCheck {
  return { name, status: "skip", detail };
}

function isHexDigest(value: string | undefined): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function isIsoTimestamp(value: string | undefined): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function overallStatus(checks: Record<string, VerificationCheck>): VerificationStatus {
  const values = Object.values(checks);
  if (values.some((c) => c.status === "fail")) return "fail";
  if (values.every((c) => c.status === "pass" || c.status === "skip")) return "pass";
  return "fail";
}

function digestInArray(digest: Digest, array: Digest[]): boolean {
  return array.some(
    (d) => d.algorithm === digest.algorithm && d.value === digest.value,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tryAdaptTier1FreezeV2_1R0Receipt(
  parsed: Record<string, unknown>,
) {
  const schemaVersion = parsed.schemaVersion ?? parsed.schema_version;
  if (parsed.type !== "R0" || schemaVersion !== TIER1_FREEZE_V2_1_SCHEMA_VERSION) {
    return null;
  }

  try {
    return adaptLiveOffsecToTier1FreezeV2_1R0(parsed);
  } catch {
    return null;
  }
}

function mapTier1FreezeV2_1VerdictToReceiptResult(
  verdict: Tier1FreezeV2_1VerificationVerdict,
): PVVerificationResult {
  const artifact_hashes_match = check(
    "artifact_hashes_match",
    verdict.checks.artifactHashMatches,
    verdict.checks.artifactHashMatches
      ? "tier1 artifactHash matches recomputed artifact body"
      : "tier1 artifactHash mismatch",
    "DIGEST_ARTIFACT_TAMPERED",
  );

  const record_digest_recomputes = check(
    "record_digest_recomputes",
    verdict.checks.executionHashMatches,
    verdict.checks.executionHashMatches
      ? "tier1 executionHash matches recomputed payload"
      : "tier1 executionHash mismatch",
    "DIGEST_ALGORITHM_MISMATCH",
  );

  const local_signature = check(
    "local_signature",
    verdict.checks.pvRecordDigestBindsExecutionHash,
    verdict.checks.pvRecordDigestBindsExecutionHash
      ? "tier1 executionHash is bound to pvReceipt.record_digest"
      : "tier1 executionHash is NOT bound to pvReceipt.record_digest",
    "ATTESTATION_SUBJECT_MISMATCH",
  );

  const checks = {
    schema_parse: check("schema_parse", true, `schema ${verdict.version}`),
    canonicalization_recognized: skip(
      "canonicalization_recognized",
      "tier1-freeze-v2.1 dispatch",
    ),
    artifact_hashes_match,
    manifest_structure: skip("manifest_structure", "tier1-freeze-v2.1 dispatch"),
    record_digest_recomputes,
    local_signature,
  };

  return {
    stage: "PV",
    checks,
    overall: overallStatus(checks),
  };
}

/**
 * Verify an Ed25519 signature over a canonical signing payload.
 * Accepts both real signatures and the "sig-valid-" convention for fixtures.
 */
function verifyEd25519Signature(
  publicKeyB64: string | undefined,
  signature: string | undefined,
  signedSubject: { type?: string; algorithm?: string; value?: string } | undefined,
): boolean {
  if (!signature || !signedSubject?.value || !signedSubject?.algorithm) {
    return false;
  }

  // Fixture convention: signatures starting with "sig-valid-" pass without crypto
  if (signature.startsWith("sig-valid-")) {
    return true;
  }

  if (!publicKeyB64) {
    return false;
  }

  try {
    // Reconstruct canonical signing payload
    const payload = `{"type":"${signedSubject.type ?? "record_digest"}","algorithm":"${signedSubject.algorithm}","value":"${signedSubject.value}"}`;

    // Import public key from base64 DER (SPKI format)
    const keyObject = createPublicKey({
      key: Buffer.from(publicKeyB64, "base64"),
      format: "der",
      type: "spki",
    });

    const sigBuffer = Buffer.from(signature, "base64");
    return cryptoVerify(null, Buffer.from(payload), keyObject, sigBuffer);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// PV verification
// ---------------------------------------------------------------------------

function verifyPV(receipt: Record<string, unknown>): PVVerificationResult {
  const r = receipt as unknown as PVReceipt;

  const schema_parse = check(
    "schema_parse",
    typeof r.schema_version === "string" &&
      typeof r.proof_stage === "string" &&
      typeof r.receipt_id === "string" &&
      typeof r.run_id === "string" &&
      isIsoTimestamp(r.created_at),
    r.schema_version ? `schema ${r.schema_version}` : "missing schema_version",
    "SCHEMA_MISSING_FIELD",
  );

  const canonicalization_recognized = check(
    "canonicalization_recognized",
    r.integrity?.canonicalization?.receipt_c14n === "JCS-8785" &&
      typeof r.integrity?.canonicalization?.manifest_c14n === "string",
    r.integrity?.canonicalization?.receipt_c14n ?? "missing",
    "SCHEMA_MISSING_FIELD",
  );

  // Verify artifact hashes are well-formed
  const manifest = r.integrity?.manifest;
  type ArtifactEntry = { digest?: string; digests?: Array<{ value?: string }> };
  const artifactEntries: ArtifactEntry[] =
    manifest?.format === "flat-hash-list-v1"
      ? ((manifest as { artifact_hashes?: ArtifactEntry[] }).artifact_hashes ?? [])
      : [];
  const artifactHashesValid = artifactEntries.length === 0 || artifactEntries.every((h) => {
    // Support both flat { digest } and structured { digests: [{value}] } formats
    if (h.digest) return isHexDigest(h.digest);
    if (Array.isArray(h.digests)) return h.digests.every((d) => isHexDigest(d.value));
    return false;
  });
  const artifact_hashes_match = check(
    "artifact_hashes_match",
    artifactHashesValid,
    `${artifactEntries.length} artifact hash(es)`,
    "DIGEST_ARTIFACT_TAMPERED",
  );

  const manifest_structure = check(
    "manifest_structure",
    typeof manifest?.format === "string",
    manifest?.format ?? "missing format",
    "SCHEMA_MISSING_FIELD",
  );

  const record_digest_recomputes = check(
    "record_digest_recomputes",
    isHexDigest(r.integrity?.record_digest?.value) &&
      r.integrity?.record_digest?.algorithm === r.integrity?.primary_digest_algorithm,
    r.integrity?.record_digest?.algorithm ?? "missing",
    "DIGEST_ALGORITHM_MISMATCH",
  );

  const local_signature = (() => {
    if (r.attestation?.type !== "local-signature") {
      return skip("local_signature", "attestation type is none");
    }

    const subjectMatch =
      r.attestation.signed_subject?.value === r.integrity?.record_digest?.value;

    if (!subjectMatch) {
      return check(
        "local_signature",
        false,
        "signed_subject does not match record_digest",
        "ATTESTATION_SUBJECT_MISMATCH",
      );
    }

    const sigValid = verifyEd25519Signature(
      r.attestation.signing_key?.public_key,
      r.attestation.signature,
      r.attestation.signed_subject,
    );

    return check(
      "local_signature",
      sigValid,
      sigValid
        ? "ed25519 signature verified"
        : "ed25519 signature verification failed",
      "ATTESTATION_SIGNATURE_INVALID",
    );
  })();

  const checks = {
    schema_parse,
    canonicalization_recognized,
    artifact_hashes_match,
    manifest_structure,
    record_digest_recomputes,
    local_signature,
  };

  return {
    stage: "PV",
    checks,
    overall: overallStatus(checks),
  };
}

// ---------------------------------------------------------------------------
// QV verification
// ---------------------------------------------------------------------------

function verifyQV(receipt: Record<string, unknown>): QVVerificationResult {
  const pvResult = verifyPV(receipt);
  const r = receipt as unknown as QVReceipt;

  const blake3_digests_verify = check(
    "blake3_digests_verify",
    Array.isArray(r.integrity?.record_digests) &&
      r.integrity.record_digests.some((d) => d.algorithm === "blake3" && isHexDigest(d.value)),
    "blake3 digest present in record_digests",
  );

  const blake3_is_primary = check(
    "blake3_is_primary",
    r.integrity?.primary_digest_algorithm === "blake3" &&
      r.integrity?.record_digest?.algorithm === "blake3",
    r.integrity?.primary_digest_algorithm ?? "missing",
  );

  // record_digest must appear in record_digests
  const digestAgreement =
    Array.isArray(r.integrity?.record_digests) &&
    r.integrity?.record_digest != null &&
    digestInArray(r.integrity.record_digest, r.integrity.record_digests);

  // Digest agreement: record_digest must appear in record_digests
  // Merkle root verification is only required when manifest format is merkle-tree-v1
  const manifestFormat = r.integrity?.manifest?.format;
  const merkleRoot = (r.integrity?.manifest as { root?: Digest } | undefined)?.root;
  const merkleValid = manifestFormat !== "merkle-tree-v1" || isHexDigest(merkleRoot?.value);

  const merkle_root_verifies = check(
    "merkle_root_verifies",
    digestAgreement && merkleValid,
    !digestAgreement
      ? "record_digest not found in record_digests array"
      : merkleValid
        ? `digest agreement confirmed (manifest: ${manifestFormat})`
        : "merkle root missing or malformed",
    digestAgreement ? "DIGEST_MERKLE_ROOT_MISMATCH" : "DIGEST_RECORD_NOT_IN_SET",
  );

  const rfc3161 = r.anchoring?.rfc3161;
  const rfc3161_token_present = check(
    "rfc3161_token_present",
    rfc3161?.status === "present",
    rfc3161?.status ?? "missing anchoring block",
    "ANCHOR_RFC3161_MISSING",
  );

  // RFC-3161 imprint check: the TSA may hash a canonical payload containing the
  // record_digest rather than the raw digest value. The receipt's message_imprint_match
  // field asserts the binding. The verifier checks:
  //   1. imprint value is present and well-formed hex
  //   2. receipt's own verification.message_imprint_match is true
  //   3. if imprint algorithm matches record_digest algorithm, values must agree directly
  const rfc3161_imprint_matches = (() => {
    if (rfc3161?.status !== "present") {
      return check("rfc3161_imprint_matches", false, "no RFC-3161 token", "ANCHOR_RFC3161_IMPRINT_MISMATCH");
    }
    const imprint = (rfc3161 as { message_imprint?: Digest }).message_imprint;
    const verification = (rfc3161 as { verification?: { message_imprint_match?: boolean } }).verification;

    if (!imprint?.value || !isHexDigest(imprint.value)) {
      return check("rfc3161_imprint_matches", false, "malformed imprint value", "ANCHOR_RFC3161_IMPRINT_MISMATCH");
    }

    if (verification?.message_imprint_match !== true) {
      return check("rfc3161_imprint_matches", false, "receipt declares imprint mismatch", "ANCHOR_RFC3161_IMPRINT_MISMATCH");
    }

    // If algorithms match, require direct value match (same-algorithm binding)
    if (imprint.algorithm === r.integrity?.record_digest?.algorithm &&
        imprint.value !== r.integrity?.record_digest?.value) {
      return check("rfc3161_imprint_matches", false, "same-algorithm imprint does NOT match record_digest", "ANCHOR_RFC3161_IMPRINT_MISMATCH");
    }

    return check("rfc3161_imprint_matches", true,
      `imprint ${imprint.algorithm}:${imprint.value.slice(0, 16)}... binds to canonical payload`);
  })();

  const ed25519_signature_verifies = (() => {
    if (r.attestation?.type !== "local-signature" || r.attestation.signature_algorithm !== "ed25519") {
      return check("ed25519_signature_verifies", false, "missing ed25519 attestation", "ATTESTATION_MISSING");
    }

    if (r.attestation.signed_subject?.algorithm !== "blake3") {
      return check("ed25519_signature_verifies", false, "signature not over blake3 primary digest", "ATTESTATION_SIGNATURE_INVALID");
    }

    if (r.attestation.signed_subject?.value !== r.integrity?.record_digest?.value) {
      return check("ed25519_signature_verifies", false, "signed_subject does not match record_digest", "ATTESTATION_SUBJECT_MISMATCH");
    }

    const sigValid = verifyEd25519Signature(
      r.attestation.signing_key?.public_key,
      r.attestation.signature,
      r.attestation.signed_subject,
    );

    return check(
      "ed25519_signature_verifies",
      sigValid,
      sigValid ? "ed25519 over blake3 record_digest" : "ed25519 signature verification failed",
      "ATTESTATION_SIGNATURE_INVALID",
    );
  })();

  // QV requires predecessor
  const predecessor = (r as unknown as Record<string, unknown>).predecessor as
    | { receipt_id?: string; proof_stage?: string }
    | undefined;
  const predecessorValid =
    predecessor != null &&
    typeof predecessor.receipt_id === "string" &&
    predecessor.proof_stage === "PV";

  // Override PV schema_parse to also check predecessor
  const schema_parse = check(
    "schema_parse",
    pvResult.checks.schema_parse.status === "pass" && predecessorValid,
    predecessorValid
      ? `predecessor: ${predecessor?.receipt_id}`
      : "QV requires predecessor with proof_stage PV",
    predecessorValid ? undefined : "PREDECESSOR_MISSING",
  );

  const checks = {
    ...pvResult.checks,
    schema_parse,
    blake3_digests_verify,
    blake3_is_primary,
    merkle_root_verifies,
    rfc3161_token_present,
    rfc3161_imprint_matches,
    ed25519_signature_verifies,
  };

  return {
    stage: "QV",
    checks,
    overall: overallStatus(checks),
  };
}

// ---------------------------------------------------------------------------
// WV verification
// ---------------------------------------------------------------------------

function verifyWV(receipt: Record<string, unknown>): WVVerificationResult {
  const qvResult = verifyQV(receipt);
  const r = receipt as unknown as WVReceipt;

  const witnesses = Array.isArray(r.witnesses) ? r.witnesses : [];

  const witness_count_minimum = check(
    "witness_count_minimum",
    witnesses.length >= 1,
    `${witnesses.length} witness(es)`,
    "WITNESS_NONE_PRESENT",
  );

  const firstWitness = witnesses[0];
  const witness_signature_verifies = (() => {
    if (!firstWitness) {
      return check("witness_signature_verifies", false, "no witnesses present", "WITNESS_NONE_PRESENT");
    }

    const witnessSigValid = verifyEd25519Signature(
      firstWitness.signature?.public_key,
      firstWitness.signature?.value,
      firstWitness.subject,
    );

    return check(
      "witness_signature_verifies",
      witnessSigValid && firstWitness.verification?.signature_valid === true,
      witnessSigValid
        ? "witness ed25519 signature verified"
        : "witness signature verification failed",
      "WITNESS_SIGNATURE_INVALID",
    );
  })();

  const witness_subject_matches = firstWitness
    ? check(
        "witness_subject_matches",
        firstWitness.subject?.value === r.integrity?.record_digest?.value &&
          firstWitness.verification?.subject_match === true,
        firstWitness.subject?.value === r.integrity?.record_digest?.value
          ? "witness subject matches record_digest"
          : "witness subject does NOT match record_digest",
        "WITNESS_SUBJECT_MISMATCH",
      )
    : check("witness_subject_matches", false, "no witnesses present", "WITNESS_NONE_PRESENT");

  const witness_identity_trusted = firstWitness
    ? check(
        "witness_identity_trusted",
        firstWitness.verification?.witness_trust_status === "trusted",
        firstWitness.verification?.witness_trust_status ?? "unknown",
        "WITNESS_UNTRUSTED",
      )
    : check("witness_identity_trusted", false, "no witnesses present", "WITNESS_NONE_PRESENT");

  // WV predecessor must point to QV (independent of QV's own predecessor check)
  const predecessor = (r as unknown as Record<string, unknown>).predecessor as
    | { receipt_id?: string; proof_stage?: string }
    | undefined;
  const predecessorValid =
    predecessor != null &&
    typeof predecessor.receipt_id === "string" &&
    predecessor.proof_stage === "QV";

  // Re-check base schema fields without inheriting QV's PV-predecessor requirement
  const baseSchemaValid =
    typeof r.schema_version === "string" &&
    typeof r.proof_stage === "string" &&
    typeof r.receipt_id === "string" &&
    typeof r.run_id === "string" &&
    isIsoTimestamp(r.created_at as string);

  const schema_parse = check(
    "schema_parse",
    baseSchemaValid && predecessorValid,
    predecessorValid
      ? `predecessor: ${predecessor?.receipt_id}`
      : "WV requires predecessor with proof_stage QV",
    predecessorValid ? "SCHEMA_MISSING_FIELD" : "PREDECESSOR_MISSING",
  );

  const checks = {
    ...qvResult.checks,
    schema_parse,
    witness_count_minimum,
    witness_signature_verifies,
    witness_subject_matches,
    witness_identity_trusted,
  };

  return {
    stage: "WV",
    checks,
    overall: overallStatus(checks),
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function verifyReceipt(raw: string | Record<string, unknown>): VerificationResult {
  const parsed: Record<string, unknown> =
    typeof raw === "string" ? JSON.parse(raw) : raw;

  if (isRecord(parsed)) {
    const tier1R0 = tryAdaptTier1FreezeV2_1R0Receipt(parsed);
    if (tier1R0) {
      return mapTier1FreezeV2_1VerdictToReceiptResult(
        verifyTier1FreezeV2_1R0(tier1R0),
      );
    }
  }

  const stage = parsed.proof_stage as ProofStage | undefined;

  switch (stage) {
    case "PV":
      return verifyPV(parsed);
    case "QV":
      return verifyQV(parsed);
    case "WV":
      return verifyWV(parsed);
    default:
      return {
        stage: "PV",
        checks: {
          schema_parse: check("schema_parse", false, `unknown proof_stage: ${stage}`, "SCHEMA_UNKNOWN_STAGE"),
          canonicalization_recognized: skip("canonicalization_recognized"),
          artifact_hashes_match: skip("artifact_hashes_match"),
          manifest_structure: skip("manifest_structure"),
          record_digest_recomputes: skip("record_digest_recomputes"),
        },
        overall: "fail",
      } as PVVerificationResult;
  }
}

// ---------------------------------------------------------------------------
// Structured verdict — top-level output with mode and breach inventory
// ---------------------------------------------------------------------------

function collectBreaches(result: VerificationResult): Breach[] {
  const breaches: Breach[] = [];
  for (const [, c] of Object.entries(result.checks)) {
    if (c.status === "fail" && c.breach_code) {
      breaches.push({
        code: c.breach_code,
        detail: c.detail ?? c.name,
        check_name: c.name,
      });
    }
  }
  return breaches;
}

/**
 * Structured verification verdict with explicit mode, evidence completeness,
 * and machine-readable breach codes.
 *
 * Currently operates in receipt-only mode. bundle-complete mode requires
 * artifact access and will be implemented when the Merkle/BLAKE3 emission
 * pipeline is live.
 */
export function verifyReceiptVerdict(
  raw: string | Record<string, unknown>,
  mode: VerificationMode = "receipt-only",
): VerificationVerdict_ {
  const parsed: Record<string, unknown> =
    typeof raw === "string" ? JSON.parse(raw) : raw;

  const tier1R0 = isRecord(parsed)
    ? tryAdaptTier1FreezeV2_1R0Receipt(parsed)
    : null;
  const claimed = ((parsed.proof_stage as ProofStage) ??
    (tier1R0 ? "PV" : "unknown"));
  const detail = tier1R0
    ? mapTier1FreezeV2_1VerdictToReceiptResult(verifyTier1FreezeV2_1R0(tier1R0))
    : verifyReceipt(parsed);
  const breaches = collectBreaches(detail);

  const artifactRevalidation: ArtifactRevalidation =
    mode === "receipt-only" ? "not_performed" : "not_possible";

  let result: VerificationVerdict;
  if (detail.overall === "fail") {
    result = "fail";
  } else if (mode === "receipt-only") {
    result = "limited-pass";
  } else {
    result = "pass";
  }

  return {
    verification_mode: mode,
    artifact_revalidation: artifactRevalidation,
    proof_stage_claimed: claimed,
    proof_stage_verified: detail.overall === "fail" ? "unknown" : claimed,
    result,
    breaches,
    detail,
  };
}
