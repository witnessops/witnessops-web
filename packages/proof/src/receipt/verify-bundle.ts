/**
 * Bundle-complete verification — recomputes artifact digests from actual bytes
 * and compares against receipt/manifest claims.
 *
 * This is the materially honest verification mode: it proves the receipt is not
 * just internally consistent, but consistent with the actual artifact files.
 *
 * Requires:
 *   - engagement directory with artifacts on disk
 *   - manifest.json with artifact entries containing digests
 *   - receipt.json with hashes block
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type {
  VerificationCheck,
  VerificationVerdict,
  VerificationVerdict_,
  VerificationMode,
  ArtifactRevalidation,
  Breach,
  BreachCode,
  ProofStage,
} from "../receipt-schema";
import { verifyReceipt } from "./verify-receipt";
import {
  computeR0ArtifactHash,
  computeTier1ExecutionHashFromR0,
} from "./tier1-freeze-v2_1/hash";
import {
  expectedExecutionHashFromPvReceipt,
  type PrefixedSha256Digest,
  type Tier1FreezeV2_1R0Receipt,
} from "./tier1-freeze-v2_1/schema";

// ---------------------------------------------------------------------------
// Hash recomputation
// ---------------------------------------------------------------------------

function sha256File(filePath: string): string {
  const data = readFileSync(filePath);
  return createHash("sha256").update(data).digest("hex");
}

let _blake3: ((data: Buffer) => string) | null | undefined;

function tryLoadBlake3(): ((data: Buffer) => string) | null {
  if (_blake3 !== undefined) return _blake3;
  try {
    // Try native blake3 binding if available
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const b3 = require("blake3");
    _blake3 = (data: Buffer) => b3.hash(data).toString("hex");
    return _blake3;
  } catch {
    // Fall back to command-line b3sum via execSync
    try {
      const { execSync } = require("node:child_process");
      execSync("b3sum --version", { stdio: "pipe" });
      _blake3 = (data: Buffer) => {
        const { execSync: exec } = require("node:child_process");
        const tmpPath = `/tmp/b3sum-verify-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        require("node:fs").writeFileSync(tmpPath, data);
        try {
          const result = exec(`b3sum --no-names "${tmpPath}"`, { encoding: "utf-8" }).trim();
          return result;
        } finally {
          require("node:fs").unlinkSync(tmpPath);
        }
      };
      return _blake3;
    } catch {
      _blake3 = null;
      return null;
    }
  }
}

function blake3File(filePath: string): string | null {
  const hashFn = tryLoadBlake3();
  if (!hashFn) return null;
  const data = readFileSync(filePath);
  return hashFn(data);
}

// ---------------------------------------------------------------------------
// Artifact revalidation
// ---------------------------------------------------------------------------

interface ArtifactDigest {
  algorithm: string;
  value: string;
}

interface ManifestArtifact {
  path: string;
  sha256?: string;
  blake3?: string;
  digests?: ArtifactDigest[];
}

interface ManifestJson {
  artifacts: ManifestArtifact[];
  digest_algorithms?: string[];
  primary_digest_algorithm?: string;
}

interface ReceiptHashes {
  state_sha256?: string;
  summary_sha256?: string;
  manifest_sha256?: string;
  state_blake3?: string;
  summary_blake3?: string;
  manifest_blake3?: string;
}

interface ArtifactRevalidationResult {
  total: number;
  found: number;
  missing: number;
  sha256_matched: number;
  sha256_mismatched: number;
  blake3_matched: number;
  blake3_mismatched: number;
  blake3_skipped: number;
  mismatches: Array<{
    path: string;
    algorithm: string;
    expected: string;
    actual: string;
  }>;
}

function revalidateArtifacts(
  manifest: ManifestJson,
  engagementDir: string,
): ArtifactRevalidationResult {
  const result: ArtifactRevalidationResult = {
    total: manifest.artifacts.length,
    found: 0,
    missing: 0,
    sha256_matched: 0,
    sha256_mismatched: 0,
    blake3_matched: 0,
    blake3_mismatched: 0,
    blake3_skipped: 0,
    mismatches: [],
  };

  const blake3Fn = tryLoadBlake3();

  for (const artifact of manifest.artifacts) {
    const filePath = resolve(engagementDir, artifact.path);
    if (!existsSync(filePath)) {
      result.missing++;
      continue;
    }
    result.found++;

    // SHA-256 recomputation
    const expectedSha256 =
      artifact.sha256 ??
      artifact.digests?.find((d) => d.algorithm === "sha256")?.value;

    if (expectedSha256) {
      const actual = sha256File(filePath);
      if (actual === expectedSha256) {
        result.sha256_matched++;
      } else {
        result.sha256_mismatched++;
        result.mismatches.push({
          path: artifact.path,
          algorithm: "sha256",
          expected: expectedSha256,
          actual,
        });
      }
    }

    // BLAKE3 recomputation
    const expectedBlake3 =
      artifact.blake3 ??
      artifact.digests?.find((d) => d.algorithm === "blake3")?.value;

    if (expectedBlake3 && blake3Fn) {
      const data = readFileSync(filePath);
      const actual = blake3Fn(data);
      if (actual === expectedBlake3) {
        result.blake3_matched++;
      } else {
        result.blake3_mismatched++;
        result.mismatches.push({
          path: artifact.path,
          algorithm: "blake3",
          expected: expectedBlake3,
          actual,
        });
      }
    } else if (expectedBlake3 && !blake3Fn) {
      result.blake3_skipped++;
    }
  }

  return result;
}

function revalidateCoreFiles(
  hashes: ReceiptHashes,
  runDir: string,
): ArtifactRevalidationResult {
  const coreFiles: Array<{ name: string; sha256Key: keyof ReceiptHashes; blake3Key: keyof ReceiptHashes }> = [
    { name: "state.json", sha256Key: "state_sha256", blake3Key: "state_blake3" },
    { name: "runbook-summary.md", sha256Key: "summary_sha256", blake3Key: "summary_blake3" },
    { name: "manifest.json", sha256Key: "manifest_sha256", blake3Key: "manifest_blake3" },
  ];

  const result: ArtifactRevalidationResult = {
    total: coreFiles.length,
    found: 0,
    missing: 0,
    sha256_matched: 0,
    sha256_mismatched: 0,
    blake3_matched: 0,
    blake3_mismatched: 0,
    blake3_skipped: 0,
    mismatches: [],
  };

  const blake3Fn = tryLoadBlake3();

  for (const { name, sha256Key, blake3Key } of coreFiles) {
    const filePath = resolve(runDir, name);
    if (!existsSync(filePath)) {
      result.missing++;
      continue;
    }
    result.found++;

    const expectedSha = hashes[sha256Key];
    if (expectedSha) {
      const actual = sha256File(filePath);
      if (actual === expectedSha) {
        result.sha256_matched++;
      } else {
        result.sha256_mismatched++;
        result.mismatches.push({ path: name, algorithm: "sha256", expected: expectedSha, actual });
      }
    }

    const expectedB3 = hashes[blake3Key];
    if (expectedB3 && blake3Fn) {
      const data = readFileSync(filePath);
      const actual = blake3Fn(data);
      if (actual === expectedB3) {
        result.blake3_matched++;
      } else {
        result.blake3_mismatched++;
        result.mismatches.push({ path: name, algorithm: "blake3", expected: expectedB3, actual });
      }
    } else if (expectedB3 && !blake3Fn) {
      result.blake3_skipped++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Bundle-complete verdict
// ---------------------------------------------------------------------------

export interface BundleCompleteOptions {
  /** Path to the run directory containing receipt.json, manifest.json, state.json */
  runDir: string;
  /** Path to the engagement directory containing the artifacts referenced in manifest */
  engagementDir: string;
  /** Optional receipt filename override (default: "receipt.json") */
  receiptFile?: string;
}

export interface BundleRevalidation {
  core_files: ArtifactRevalidationResult;
  manifest_artifacts: ArtifactRevalidationResult;
}

export interface BundleCompleteVerdict extends VerificationVerdict_ {
  verification_mode: "bundle-complete";
  revalidation: BundleRevalidation;
}

export interface Tier1FreezeV2_1VerificationVerdict {
  version: "tier1-freeze-v2.1";
  result: "pass" | "fail";
  checks: {
    artifactHashMatches: boolean;
    executionHashMatches: boolean;
    pvRecordDigestBindsExecutionHash: boolean;
  };
  claimed: {
    artifactHash: PrefixedSha256Digest;
    executionHash: PrefixedSha256Digest;
  };
  recomputed: {
    artifactHash: PrefixedSha256Digest;
    executionHash: PrefixedSha256Digest;
    pvBoundExecutionHash: PrefixedSha256Digest;
  };
  failures: string[];
}

/**
 * Tier 1 Freeze v2.1 (V0 verifier boundary).
 *
 * Contract:
 * - R0.artifactHash: recomputed from body-without-derived-fields:v1 (artifact-body hash only)
 * - executionHash: recomputed from locked typed Tier 1 execution-hash payload only
 * - PV binding: R0.tier1.executionHash must equal "sha256:" + R0.pvReceipt.record_digest.value
 *
 * The two hash recomputations are intentionally separate and never collapsed.
 */
export function verifyTier1FreezeV2_1R0(
  r0: Tier1FreezeV2_1R0Receipt,
): Tier1FreezeV2_1VerificationVerdict {
  const recomputedArtifactHash = computeR0ArtifactHash(r0);
  const recomputedExecutionHash = computeTier1ExecutionHashFromR0(r0);
  const pvBoundExecutionHash = expectedExecutionHashFromPvReceipt(r0);

  const artifactHashMatches = recomputedArtifactHash === r0.artifactHash;
  const executionHashMatches = recomputedExecutionHash === r0.tier1.executionHash;
  const pvRecordDigestBindsExecutionHash =
    r0.tier1.executionHash === pvBoundExecutionHash;

  const failures: string[] = [];
  if (!artifactHashMatches) {
    failures.push("R0.artifactHash mismatch against recomputed artifact-body hash");
  }
  if (!executionHashMatches) {
    failures.push("R0.tier1.executionHash mismatch against recomputed typed Tier 1 payload hash");
  }
  if (!pvRecordDigestBindsExecutionHash) {
    failures.push("R0.tier1.executionHash does not match sha256:pvReceipt.record_digest.value binding");
  }

  return {
    version: "tier1-freeze-v2.1",
    result: failures.length === 0 ? "pass" : "fail",
    checks: {
      artifactHashMatches,
      executionHashMatches,
      pvRecordDigestBindsExecutionHash,
    },
    claimed: {
      artifactHash: r0.artifactHash,
      executionHash: r0.tier1.executionHash,
    },
    recomputed: {
      artifactHash: recomputedArtifactHash,
      executionHash: recomputedExecutionHash,
      pvBoundExecutionHash,
    },
    failures,
  };
}

export function verifyBundleComplete(opts: BundleCompleteOptions): BundleCompleteVerdict {
  const { runDir, engagementDir, receiptFile = "receipt.json" } = opts;

  // Load receipt and manifest
  const receiptPath = resolve(runDir, receiptFile);
  const manifestPath = resolve(runDir, "manifest.json");

  if (!existsSync(receiptPath) || !existsSync(manifestPath)) {
    const detail = verifyReceipt({});
    return {
      verification_mode: "bundle-complete",
      artifact_revalidation: "not_possible",
      proof_stage_claimed: "unknown",
      proof_stage_verified: "unknown",
      result: "fail",
      breaches: [{ code: "SCHEMA_MISSING_FIELD", detail: "receipt.json or manifest.json not found", check_name: "bundle_access" }],
      detail,
      revalidation: {
        core_files: { total: 0, found: 0, missing: 0, sha256_matched: 0, sha256_mismatched: 0, blake3_matched: 0, blake3_mismatched: 0, blake3_skipped: 0, mismatches: [] },
        manifest_artifacts: { total: 0, found: 0, missing: 0, sha256_matched: 0, sha256_mismatched: 0, blake3_matched: 0, blake3_mismatched: 0, blake3_skipped: 0, mismatches: [] },
      },
    };
  }

  const receipt = JSON.parse(readFileSync(receiptPath, "utf-8"));
  const manifest: ManifestJson = JSON.parse(readFileSync(manifestPath, "utf-8"));

  // Receipt-level structural verification first
  const structuralResult = verifyReceipt(receipt);
  const structuralBreaches: Breach[] = [];
  for (const [, c] of Object.entries(structuralResult.checks)) {
    if (c.status === "fail" && c.breach_code) {
      structuralBreaches.push({ code: c.breach_code, detail: c.detail ?? c.name, check_name: c.name });
    }
  }

  // Core file revalidation (state.json, summary, manifest against receipt hashes)
  const coreResult = revalidateCoreFiles(receipt.hashes ?? {}, runDir);

  // Manifest artifact revalidation
  const artifactResult = revalidateArtifacts(manifest, engagementDir);

  // Collect revalidation breaches
  const revalBreaches: Breach[] = [];
  for (const m of [...coreResult.mismatches, ...artifactResult.mismatches]) {
    revalBreaches.push({
      code: "DIGEST_ARTIFACT_TAMPERED",
      detail: `${m.path}: ${m.algorithm} expected ${m.expected.slice(0, 16)}... got ${m.actual.slice(0, 16)}...`,
      check_name: "artifact_recomputation",
    });
  }

  const allBreaches = [...structuralBreaches, ...revalBreaches];

  // Determine artifact revalidation status
  let artifactRevalidation: ArtifactRevalidation;
  if (coreResult.found === 0 && artifactResult.found === 0) {
    artifactRevalidation = "not_possible";
  } else if (coreResult.missing > 0 || artifactResult.missing > 0) {
    artifactRevalidation = "partial";
  } else {
    artifactRevalidation = "performed";
  }

  // Determine verdict
  const claimed = (receipt.proof_stage as ProofStage) ?? "unknown";
  let result: VerificationVerdict;
  if (structuralResult.overall === "fail" || revalBreaches.length > 0) {
    result = "fail";
  } else if (artifactRevalidation === "performed") {
    result = "pass";
  } else {
    result = "limited-pass";
  }

  return {
    verification_mode: "bundle-complete",
    artifact_revalidation: artifactRevalidation,
    proof_stage_claimed: claimed,
    proof_stage_verified: result === "fail" ? "unknown" : claimed,
    result,
    breaches: allBreaches,
    detail: structuralResult,
    revalidation: {
      core_files: coreResult,
      manifest_artifacts: artifactResult,
    },
  };
}
