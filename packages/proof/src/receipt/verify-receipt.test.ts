import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyReceipt, verifyReceiptVerdict } from "./verify-receipt";
import {
  computeR0ArtifactHash,
  computeTier1ExecutionHashFromR0,
} from "./tier1-freeze-v2_1/hash";
import {
  TIER1_FREEZE_V2_1_SCHEMA_VERSION,
  type PrefixedSha256Digest,
  type Tier1FreezeV2_1R0Receipt,
} from "./tier1-freeze-v2_1/schema";

function loadFixture(name: string): Record<string, unknown> {
  const path = resolve(__dirname, "__fixtures__", `${name}.json`);
  return JSON.parse(readFileSync(path, "utf-8"));
}

function prefixedDigest(fill: string): PrefixedSha256Digest {
  return `sha256:${fill.repeat(64)}` as PrefixedSha256Digest;
}

function makeValidTier1R0(): Tier1FreezeV2_1R0Receipt {
  const r0: Tier1FreezeV2_1R0Receipt = {
    type: "R0",
    schemaVersion: TIER1_FREEZE_V2_1_SCHEMA_VERSION,
    artifactHash: prefixedDigest("0"),
    tier1: {
      executionHash: prefixedDigest("1"),
      m0: {
        type: "M0",
        schemaVersion: "m0/v1",
        hash: prefixedDigest("2"),
      },
      e0: {
        type: "E0",
        schemaVersion: "e0/v1",
        hash: prefixedDigest("3"),
      },
      p1: {
        type: "P1",
        schemaVersion: "p1/v1",
        hash: prefixedDigest("4"),
      },
      e2: {
        type: "E2",
        schemaVersion: "e2/v1",
        hash: prefixedDigest("5"),
      },
      evidenceDigests: [prefixedDigest("7"), prefixedDigest("6")],
    },
    pvReceipt: {
      record_digest: {
        algorithm: "sha256",
        value: "9".repeat(64),
      },
    },
  };

  const executionHash = computeTier1ExecutionHashFromR0(r0);
  r0.tier1.executionHash = executionHash;
  r0.pvReceipt.record_digest.value = executionHash.slice("sha256:".length);
  r0.artifactHash = computeR0ArtifactHash(r0);
  return r0;
}

// ---------------------------------------------------------------------------
// Fixture matrix
// ---------------------------------------------------------------------------
//
// | Fixture                  | Stage | Expected | Failure reason                          |
// |--------------------------|-------|----------|---------------------------------------- |
// | pv-valid                 | PV    | pass     | —                                       |
// | qv-valid                 | QV    | pass     | —                                       |
// | wv-valid                 | WV    | pass     | —                                       |
// | pv-tampered-hash         | PV    | pass*    | artifact hash is wrong (structural ok)  |
// | qv-bad-imprint           | QV    | fail     | RFC-3161 imprint ≠ record_digest        |
// | wv-witness-mismatch      | WV    | fail     | witness subject ≠ record_digest         |
// | qv-missing-predecessor   | QV    | fail     | predecessor field absent                |
// | qv-digest-disagreement   | QV    | fail     | record_digest ∉ record_digests          |
//
// * pv-tampered-hash passes structural verification because the verifier
//   does not recompute file hashes (that requires artifact access).
//   The tampered hash is well-formed hex — the breach is semantic, not structural.

describe("receipt verifier — valid fixtures", () => {
  it("PV valid receipt passes all checks", () => {
    const result = verifyReceipt(loadFixture("pv-valid"));
    assert.equal(result.stage, "PV");
    assert.equal(result.overall, "pass");
    for (const check of Object.values(result.checks)) {
      assert.notEqual(check.status, "fail", `${check.name}: ${check.detail}`);
    }
  });

  it("QV valid receipt passes all checks", () => {
    const result = verifyReceipt(loadFixture("qv-valid"));
    assert.equal(result.stage, "QV");
    assert.equal(result.overall, "pass");
    for (const check of Object.values(result.checks)) {
      assert.notEqual(check.status, "fail", `${check.name}: ${check.detail}`);
    }
  });

  it("WV valid receipt passes all checks", () => {
    const result = verifyReceipt(loadFixture("wv-valid"));
    assert.equal(result.stage, "WV");
    assert.equal(result.overall, "pass");
    for (const check of Object.values(result.checks)) {
      assert.notEqual(check.status, "fail", `${check.name}: ${check.detail}`);
    }
  });
});

describe("receipt verifier — failure fixtures", () => {
  it("PV tampered hash passes structural verification (hash is well-formed)", () => {
    // The verifier checks hex format, not content correctness.
    // Detecting the tamper requires access to the actual files.
    const result = verifyReceipt(loadFixture("pv-tampered-hash"));
    assert.equal(result.stage, "PV");
    assert.equal(result.overall, "pass");
  });

  it("QV bad RFC-3161 imprint fails", () => {
    const result = verifyReceipt(loadFixture("qv-bad-imprint"));
    assert.equal(result.stage, "QV");
    assert.equal(result.overall, "fail");

    const checks = result.checks as Record<string, { status: string; detail?: string }>;
    assert.equal(checks.rfc3161_imprint_matches.status, "fail");
  });

  it("WV witness subject mismatch fails", () => {
    const result = verifyReceipt(loadFixture("wv-witness-mismatch"));
    assert.equal(result.stage, "WV");
    assert.equal(result.overall, "fail");

    const checks = result.checks as Record<string, { status: string; detail?: string }>;
    assert.equal(checks.witness_subject_matches.status, "fail");
  });

  it("QV missing predecessor fails", () => {
    const result = verifyReceipt(loadFixture("qv-missing-predecessor"));
    assert.equal(result.stage, "QV");
    assert.equal(result.overall, "fail");

    const checks = result.checks as Record<string, { status: string; detail?: string }>;
    assert.equal(checks.schema_parse.status, "fail");
    assert.match(checks.schema_parse.detail!, /predecessor/);
  });

  it("QV digest disagreement fails", () => {
    const result = verifyReceipt(loadFixture("qv-digest-disagreement"));
    assert.equal(result.stage, "QV");
    assert.equal(result.overall, "fail");

    const checks = result.checks as Record<string, { status: string; detail?: string }>;
    assert.equal(checks.merkle_root_verifies.status, "fail");
    assert.match(checks.merkle_root_verifies.detail!, /not found in record_digests/);
  });
});

describe("receipt verifier — edge cases", () => {
  it("unknown proof_stage returns fail", () => {
    const result = verifyReceipt({ proof_stage: "UNKNOWN" });
    assert.equal(result.overall, "fail");
  });

  it("missing proof_stage returns fail", () => {
    const result = verifyReceipt({});
    assert.equal(result.overall, "fail");
  });

  it("accepts raw JSON string", () => {
    const fixture = loadFixture("pv-valid");
    const result = verifyReceipt(JSON.stringify(fixture));
    assert.equal(result.stage, "PV");
    assert.equal(result.overall, "pass");
  });
});

describe("receipt verifier — tier1 freeze v2.1 dispatch", () => {
  it("dispatches R0 through Tier1 verifier via verifyReceipt()", () => {
    const r0 = makeValidTier1R0();
    const result = verifyReceipt(r0);

    assert.equal(result.stage, "PV");
    assert.equal(result.overall, "pass");
    assert.equal(result.checks.artifact_hashes_match.status, "pass");
    assert.equal(result.checks.record_digest_recomputes.status, "pass");
    assert.equal(result.checks.local_signature?.status, "pass");
  });

  it("Tier1 mismatch fails through verifyReceipt() dispatch path", () => {
    const r0 = makeValidTier1R0();
    r0.artifactHash = prefixedDigest("a");

    const result = verifyReceipt(r0);
    assert.equal(result.stage, "PV");
    assert.equal(result.overall, "fail");
    assert.equal(result.checks.artifact_hashes_match.status, "fail");
  });
});

describe("structured verdict — verifyReceiptVerdict", () => {
  it("PV valid returns limited-pass in receipt-only mode", () => {
    const verdict = verifyReceiptVerdict(loadFixture("pv-valid"));
    assert.equal(verdict.verification_mode, "receipt-only");
    assert.equal(verdict.artifact_revalidation, "not_performed");
    assert.equal(verdict.proof_stage_claimed, "PV");
    assert.equal(verdict.proof_stage_verified, "PV");
    assert.equal(verdict.result, "limited-pass");
    assert.equal(verdict.breaches.length, 0);
  });

  it("QV valid returns limited-pass with no breaches", () => {
    const verdict = verifyReceiptVerdict(loadFixture("qv-valid"));
    assert.equal(verdict.proof_stage_claimed, "QV");
    assert.equal(verdict.proof_stage_verified, "QV");
    assert.equal(verdict.result, "limited-pass");
    assert.equal(verdict.breaches.length, 0);
  });

  it("WV valid returns limited-pass with no breaches", () => {
    const verdict = verifyReceiptVerdict(loadFixture("wv-valid"));
    assert.equal(verdict.proof_stage_claimed, "WV");
    assert.equal(verdict.proof_stage_verified, "WV");
    assert.equal(verdict.result, "limited-pass");
    assert.equal(verdict.breaches.length, 0);
  });

  it("QV bad imprint returns fail with ANCHOR_RFC3161_IMPRINT_MISMATCH breach", () => {
    const verdict = verifyReceiptVerdict(loadFixture("qv-bad-imprint"));
    assert.equal(verdict.result, "fail");
    assert.equal(verdict.proof_stage_verified, "unknown");
    const codes = verdict.breaches.map((b) => b.code);
    assert.ok(codes.includes("ANCHOR_RFC3161_IMPRINT_MISMATCH"));
  });

  it("WV witness mismatch returns fail with WITNESS_SUBJECT_MISMATCH breach", () => {
    const verdict = verifyReceiptVerdict(loadFixture("wv-witness-mismatch"));
    assert.equal(verdict.result, "fail");
    const codes = verdict.breaches.map((b) => b.code);
    assert.ok(codes.includes("WITNESS_SUBJECT_MISMATCH"));
  });

  it("QV missing predecessor returns fail with PREDECESSOR_MISSING breach", () => {
    const verdict = verifyReceiptVerdict(loadFixture("qv-missing-predecessor"));
    assert.equal(verdict.result, "fail");
    const codes = verdict.breaches.map((b) => b.code);
    assert.ok(codes.includes("PREDECESSOR_MISSING"));
  });

  it("QV digest disagreement returns fail with DIGEST_RECORD_NOT_IN_SET breach", () => {
    const verdict = verifyReceiptVerdict(loadFixture("qv-digest-disagreement"));
    assert.equal(verdict.result, "fail");
    const codes = verdict.breaches.map((b) => b.code);
    assert.ok(codes.includes("DIGEST_RECORD_NOT_IN_SET"));
  });

  it("bundle-complete mode reports artifact_revalidation as not_possible", () => {
    const verdict = verifyReceiptVerdict(loadFixture("pv-valid"), "bundle-complete");
    assert.equal(verdict.verification_mode, "bundle-complete");
    assert.equal(verdict.artifact_revalidation, "not_possible");
  });

  it("Tier1 dispatch assigns claimed/verified stage for structured verdict", () => {
    const verdict = verifyReceiptVerdict(makeValidTier1R0());
    assert.equal(verdict.proof_stage_claimed, "PV");
    assert.equal(verdict.proof_stage_verified, "PV");
    assert.equal(verdict.result, "limited-pass");
  });
});
