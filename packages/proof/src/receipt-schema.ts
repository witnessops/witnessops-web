/**
 * OFFSEC Receipt Schema — PV → QV → WV
 *
 * Proof-grade receipt contract with discriminated unions by proof stage.
 * Canonical record digest is the single proof pivot: local signature binds to it,
 * RFC-3161 timestamps it, QIN witnesses it, verifier reasons over it.
 *
 * Schema versions:
 *   1.0.0 — PV baseline (flat manifest, SHA-256, local attestation)
 *   1.1.0 — transitional PV/QV bridge (dual-hash, record_digests introduced)
 *   2.0.0 — QV canonical (BLAKE3 primary, Merkle manifest, RFC-3161 required)
 *   2.1.0 — WV extension (QIN witness, multi-witness array)
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type ProofStage = "PV" | "QV" | "WV";

export type DigestAlgorithm = "sha256" | "blake3";

export type SignatureAlgorithm = "ed25519";

export type AttestationType = "none" | "local-signature";

export type AnchoringStatus = "not_present" | "present" | "verification_failed";

export type WitnessType = "qin" | "court_registry" | "insurer" | "marketplace";

export type WitnessTrustStatus = "trusted" | "untrusted" | "unknown";

export type ManifestFormat =
  | "flat-hash-list-v1"
  | "merkle-tree-v1";

export type ReceiptCanonicalization = "JCS-8785";

export type ManifestCanonicalization =
  | "line-v1"
  | "merkle-manifest-v2";

export type CryptographicValidity = "valid" | "invalid" | "unchecked";

export type CertChainStatus = "valid" | "invalid" | "expired" | "unchecked";

// ---------------------------------------------------------------------------
// Digest primitives
// ---------------------------------------------------------------------------

export interface Digest {
  algorithm: DigestAlgorithm;
  value: string;
}

// ---------------------------------------------------------------------------
// Subject block — what the receipt is about
// ---------------------------------------------------------------------------

export interface TargetIdentity {
  input: string;
  normalized: string;
  classification: "ipv4" | "ipv6" | "domain" | "url" | "cidr" | "hostname";
}

export interface SubjectEnvironment {
  host_os: string;
  host_arch: string;
  runtime: string;
  runtime_version: string;
}

export interface Subject {
  kind: string;
  tool: string;
  tool_version: string;
  workflow: string;
  agent: string;
  mode: "lab" | "production";
  target: TargetIdentity;
  environment: SubjectEnvironment;
}

// ---------------------------------------------------------------------------
// Materialization block — local outputs (descriptive, not normative)
// ---------------------------------------------------------------------------

export interface MaterializationArtifact {
  path: string;
  media_type: string;
  size_bytes: number;
  mtime_epoch: number;
}

export interface Materialization {
  status: "completed" | "failed" | "aborted";
  started_at: string;
  completed_at: string;
  artifacts: MaterializationArtifact[];
  artifact_count: number;
}

// ---------------------------------------------------------------------------
// Integrity block — proof contract heart
// ---------------------------------------------------------------------------

export interface Canonicalization {
  receipt_c14n: ReceiptCanonicalization;
  manifest_c14n: ManifestCanonicalization;
}

// PV: flat hash list

export interface FlatArtifactHash {
  path: string;
  algorithm: DigestAlgorithm;
  digest: string;
}

export interface FlatManifest {
  format: "flat-hash-list-v1";
  artifact_hashes: FlatArtifactHash[];
}

// QV: Merkle tree

export interface MerkleArtifactRecord {
  path: string;
  digests: Digest[];
  leaf_digest: Digest;
}

export interface MerkleManifest {
  format: "merkle-tree-v1";
  leaf_canonicalization: "artifact-record-v1";
  leaf_digest_algorithm: DigestAlgorithm;
  root: Digest;
  artifacts: MerkleArtifactRecord[];
}

// PV integrity: single hash, flat manifest

export interface PVIntegrity {
  canonicalization: Canonicalization & {
    manifest_c14n: "line-v1";
  };
  digest_algorithms: ["sha256"];
  primary_digest_algorithm: "sha256";
  record_digest: Digest & { algorithm: "sha256" };
  manifest: FlatManifest;
}

// QV integrity: dual hash, Merkle manifest

export interface QVIntegrity {
  canonicalization: Canonicalization & {
    manifest_c14n: "merkle-manifest-v2";
  };
  digest_algorithms: DigestAlgorithm[];
  primary_digest_algorithm: "blake3";
  record_digests: Digest[];
  record_digest: Digest & { algorithm: "blake3" };
  manifest: MerkleManifest;
}

// ---------------------------------------------------------------------------
// Attestation block — local cryptographic sealing
// ---------------------------------------------------------------------------

export interface SigningKey {
  key_id: string;
  public_key: string;
}

export interface SignedSubject {
  type: "record_digest";
  algorithm: DigestAlgorithm;
  value: string;
}

export interface NoAttestation {
  type: "none";
}

export interface LocalSignatureAttestation {
  type: "local-signature";
  signature_algorithm: SignatureAlgorithm;
  signing_key: SigningKey;
  signed_subject: SignedSubject;
  signature: string;
}

export type Attestation = NoAttestation | LocalSignatureAttestation;

// ---------------------------------------------------------------------------
// Anchoring block — RFC-3161 time anchoring (not attestation, not witness)
// ---------------------------------------------------------------------------

export interface TSAIdentity {
  name: string;
  url: string;
}

export interface RFC3161Verification {
  cryptographic_validity: CryptographicValidity;
  message_imprint_match: boolean;
  cert_chain_status: CertChainStatus;
  policy_oid?: string;
  serial_number?: string;
}

export interface RFC3161NotPresent {
  status: "not_present";
}

export interface RFC3161Present {
  status: "present";
  tsa: TSAIdentity;
  message_imprint: Digest;
  timestamp_token_path: string;
  token_format: "RFC-3161";
  gen_time: string;
  verification: RFC3161Verification;
}

export interface RFC3161Failed {
  status: "verification_failed";
  tsa?: TSAIdentity;
  message_imprint?: Digest;
  timestamp_token_path?: string;
  error?: string;
}

export type RFC3161Anchoring =
  | RFC3161NotPresent
  | RFC3161Present
  | RFC3161Failed;

export interface Anchoring {
  rfc3161: RFC3161Anchoring;
}

// ---------------------------------------------------------------------------
// Witnesses block — external institutional witnesses (QIN, court, insurer)
// ---------------------------------------------------------------------------

export interface WitnessSignature {
  algorithm: SignatureAlgorithm;
  key_id: string;
  public_key: string;
  value: string;
}

export interface WitnessEnvironment {
  cloud: string;
  region: string;
}

export interface WitnessReference {
  anchor_url: string;
}

export interface WitnessVerification {
  signature_valid: boolean;
  subject_match: boolean;
  witness_trust_status: WitnessTrustStatus;
}

export interface Witness {
  type: WitnessType;
  witness_id: string;
  receipt_id: string;
  observed_at: string;
  subject: SignedSubject;
  environment: WitnessEnvironment;
  signature: WitnessSignature;
  reference?: WitnessReference;
  verification: WitnessVerification;
}

// ---------------------------------------------------------------------------
// Verification hints — non-normative, tooling convenience only
// ---------------------------------------------------------------------------

export interface BundlePaths {
  receipt: string;
  manifest: string;
  signature?: string;
  timestamp?: string;
}

export interface VerificationHints {
  bundle_paths?: BundlePaths;
  ui_summary?: {
    status: string;
    artifact_count: number;
  };
}

// ---------------------------------------------------------------------------
// Predecessor — proof-stage promotion lineage
// ---------------------------------------------------------------------------

export interface Predecessor {
  receipt_id: string;
  proof_stage: ProofStage;
  record_digest?: Digest;
}

// ---------------------------------------------------------------------------
// Bundle reference
// ---------------------------------------------------------------------------

export interface BundleRef {
  bundle_id: string;
  layout_version: string;
}

// ---------------------------------------------------------------------------
// Receipts — discriminated union by proof_stage
// ---------------------------------------------------------------------------

interface ReceiptBase {
  schema_version: string;
  receipt_id: string;
  run_id: string;
  created_at: string;
  subject: Subject;
  materialization: Materialization;
  verification_hints?: VerificationHints;
  trust_profile?: string;
  bundle?: BundleRef;
}

export interface PVReceipt extends ReceiptBase {
  schema_version: "1.0.0" | "1.1.0";
  proof_stage: "PV";
  integrity: PVIntegrity;
  attestation: Attestation;
  anchoring: Anchoring & { rfc3161: RFC3161NotPresent };
  witnesses: [];
  predecessor?: undefined;
}

export interface QVReceipt extends ReceiptBase {
  schema_version: "2.0.0";
  proof_stage: "QV";
  integrity: QVIntegrity;
  attestation: LocalSignatureAttestation;
  anchoring: Anchoring & { rfc3161: RFC3161Present };
  witnesses: [];
  predecessor: Predecessor & { proof_stage: "PV" };
}

export interface WVReceipt extends ReceiptBase {
  schema_version: "2.1.0";
  proof_stage: "WV";
  integrity: QVIntegrity;
  attestation: LocalSignatureAttestation;
  anchoring: Anchoring & { rfc3161: RFC3161Present };
  witnesses: [Witness, ...Witness[]];
  predecessor: Predecessor & { proof_stage: "QV" };
}

export type Receipt = PVReceipt | QVReceipt | WVReceipt;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isPV(receipt: Receipt): receipt is PVReceipt {
  return receipt.proof_stage === "PV";
}

export function isQV(receipt: Receipt): receipt is QVReceipt {
  return receipt.proof_stage === "QV";
}

export function isWV(receipt: Receipt): receipt is WVReceipt {
  return receipt.proof_stage === "WV";
}

// ---------------------------------------------------------------------------
// Verification modes
// ---------------------------------------------------------------------------

/**
 * receipt-only: structural + internal consistency checks on the receipt JSON.
 *   Does NOT recompute artifact hashes, Merkle roots, or cryptographic signatures.
 *   Sufficient to classify proof stage and detect internal contradictions.
 *
 * bundle-complete: everything in receipt-only, plus:
 *   - artifact bytes available and hashes recomputed
 *   - Merkle leaf/root recomputed from artifact records
 *   - Ed25519 signature cryptographically verified
 *   - RFC-3161 token parsed and cryptographically verified
 */
export type VerificationMode = "receipt-only" | "bundle-complete";

/**
 * Whether artifact material was revalidated against declared digests.
 */
export type ArtifactRevalidation =
  | "not_performed"     // receipt-only mode
  | "not_possible"      // bundle-complete requested but artifacts unavailable
  | "performed"         // all artifacts revalidated
  | "partial";          // some artifacts revalidated, some missing

// ---------------------------------------------------------------------------
// Breach codes — machine-readable, not just human strings
// ---------------------------------------------------------------------------

export type BreachCode =
  // Schema / structural
  | "SCHEMA_MISSING_FIELD"
  | "SCHEMA_INVALID_TIMESTAMP"
  | "SCHEMA_UNKNOWN_STAGE"
  | "SCHEMA_UNSUPPORTED_VERSION"
  // Predecessor / promotion
  | "PREDECESSOR_MISSING"
  | "PREDECESSOR_WRONG_STAGE"
  // Digest / integrity
  | "DIGEST_ALGORITHM_MISMATCH"
  | "DIGEST_RECORD_NOT_IN_SET"
  | "DIGEST_ARTIFACT_TAMPERED"
  | "DIGEST_MERKLE_ROOT_MISMATCH"
  // Attestation
  | "ATTESTATION_MISSING"
  | "ATTESTATION_SIGNATURE_INVALID"
  | "ATTESTATION_SUBJECT_MISMATCH"
  // Anchoring
  | "ANCHOR_RFC3161_MISSING"
  | "ANCHOR_RFC3161_IMPRINT_MISMATCH"
  | "ANCHOR_RFC3161_TOKEN_INVALID"
  | "ANCHOR_RFC3161_CHAIN_INVALID"
  // Witness
  | "WITNESS_NONE_PRESENT"
  | "WITNESS_SIGNATURE_INVALID"
  | "WITNESS_SUBJECT_MISMATCH"
  | "WITNESS_UNTRUSTED";

export interface Breach {
  code: BreachCode;
  detail: string;
  check_name: string;
}

// ---------------------------------------------------------------------------
// Verifier result types
// ---------------------------------------------------------------------------

export type VerificationStatus = "pass" | "fail" | "skip";

/**
 * Overall verification verdict.
 *   pass         — all checks passed for the claimed stage
 *   fail         — one or more checks failed
 *   limited-pass — receipt-only mode passed but artifact revalidation was not performed
 */
export type VerificationVerdict = "pass" | "fail" | "limited-pass";

export interface VerificationCheck {
  name: string;
  status: VerificationStatus;
  detail?: string;
  breach_code?: BreachCode;
}

export interface PVVerificationResult {
  stage: "PV";
  checks: {
    schema_parse: VerificationCheck;
    canonicalization_recognized: VerificationCheck;
    artifact_hashes_match: VerificationCheck;
    manifest_structure: VerificationCheck;
    record_digest_recomputes: VerificationCheck;
    local_signature?: VerificationCheck;
  };
  overall: VerificationStatus;
}

export interface QVVerificationResult {
  stage: "QV";
  checks: PVVerificationResult["checks"] & {
    blake3_digests_verify: VerificationCheck;
    blake3_is_primary: VerificationCheck;
    merkle_root_verifies: VerificationCheck;
    rfc3161_token_present: VerificationCheck;
    rfc3161_imprint_matches: VerificationCheck;
    ed25519_signature_verifies: VerificationCheck;
  };
  overall: VerificationStatus;
}

export interface WVVerificationResult {
  stage: "WV";
  checks: QVVerificationResult["checks"] & {
    witness_count_minimum: VerificationCheck;
    witness_signature_verifies: VerificationCheck;
    witness_subject_matches: VerificationCheck;
    witness_identity_trusted: VerificationCheck;
  };
  overall: VerificationStatus;
}

export type VerificationResult =
  | PVVerificationResult
  | QVVerificationResult
  | WVVerificationResult;

/**
 * Structured verification verdict — the top-level output of any verification call.
 * Explicitly declares mode, evidence completeness, and breach inventory.
 */
export interface VerificationVerdict_ {
  verification_mode: VerificationMode;
  artifact_revalidation: ArtifactRevalidation;
  proof_stage_claimed: ProofStage | "unknown";
  proof_stage_verified: ProofStage | "unknown";
  result: VerificationVerdict;
  breaches: Breach[];
  detail: VerificationResult;
}
