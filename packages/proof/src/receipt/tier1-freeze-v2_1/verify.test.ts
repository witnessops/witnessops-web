import assert from "node:assert/strict";
import test from "node:test";
import {
  computeR0ArtifactHash,
  computeTier1ExecutionHashFromR0,
} from "./hash";
import {
  TIER1_FREEZE_V2_1_SCHEMA_VERSION,
  type PrefixedSha256Digest,
  type Tier1FreezeV2_1R0Receipt,
} from "./schema";
import { verifyTier1FreezeV2_1R0 } from "../verify-bundle";

function prefixedDigest(fill: string): PrefixedSha256Digest {
  return `sha256:${fill.repeat(64)}` as PrefixedSha256Digest;
}

function makeValidR0(): Tier1FreezeV2_1R0Receipt {
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

test("Tier1 Freeze v2.1 verifier passes with separate, valid artifactHash + executionHash", () => {
  const r0 = makeValidR0();
  const verdict = verifyTier1FreezeV2_1R0(r0);

  assert.equal(verdict.result, "pass");
  assert.equal(verdict.checks.artifactHashMatches, true);
  assert.equal(verdict.checks.executionHashMatches, true);
  assert.equal(verdict.checks.pvRecordDigestBindsExecutionHash, true);
  assert.notEqual(r0.artifactHash, r0.tier1.executionHash);
});

test("Tier1 Freeze v2.1 verifier fails when only artifactHash mismatches", () => {
  const r0 = makeValidR0();
  r0.artifactHash = prefixedDigest("a");

  const verdict = verifyTier1FreezeV2_1R0(r0);
  assert.equal(verdict.result, "fail");
  assert.equal(verdict.checks.artifactHashMatches, false);
  assert.equal(verdict.checks.executionHashMatches, true);
  assert.equal(verdict.checks.pvRecordDigestBindsExecutionHash, true);
});

test("Tier1 Freeze v2.1 verifier fails when only executionHash mismatches", () => {
  const r0 = makeValidR0();
  const wrongExecutionHash = prefixedDigest("b");
  r0.tier1.executionHash = wrongExecutionHash;
  r0.pvReceipt.record_digest.value = wrongExecutionHash.slice("sha256:".length);
  r0.artifactHash = computeR0ArtifactHash(r0);

  const verdict = verifyTier1FreezeV2_1R0(r0);
  assert.equal(verdict.result, "fail");
  assert.equal(verdict.checks.artifactHashMatches, true);
  assert.equal(verdict.checks.executionHashMatches, false);
  assert.equal(verdict.checks.pvRecordDigestBindsExecutionHash, true);
});

test("Tier1 Freeze v2.1 verifier enforces pvReceipt.record_digest binding separately", () => {
  const r0 = makeValidR0();
  r0.pvReceipt.record_digest.value = "c".repeat(64);
  r0.artifactHash = computeR0ArtifactHash(r0);

  const verdict = verifyTier1FreezeV2_1R0(r0);
  assert.equal(verdict.result, "fail");
  assert.equal(verdict.checks.artifactHashMatches, true);
  assert.equal(verdict.checks.executionHashMatches, true);
  assert.equal(verdict.checks.pvRecordDigestBindsExecutionHash, false);
});
