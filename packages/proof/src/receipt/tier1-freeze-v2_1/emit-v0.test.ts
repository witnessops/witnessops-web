import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { computeR0ArtifactHash, computeTier1ExecutionHashFromR0 } from "./hash";
import { computeTier1StageArtifactHash } from "./strict-artifacts";
import { emitTier1FreezeV2_1V0 } from "./emit-v0";
import {
  TIER1_FREEZE_V2_1_SCHEMA_VERSION,
  type PrefixedSha256Digest,
  type Tier1FreezeV2_1R0Receipt,
} from "./schema";

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

async function writeStrictArtifactSet(
  dirPath: string,
  r0: Tier1FreezeV2_1R0Receipt,
): Promise<void> {
  const stageBodies = {
    m0: {
      type: "M0",
      schemaVersion: "tier1-freeze-v2.1",
      mailbox: "security@offsecglobal.com",
      mailboxClass: "shared",
      artifactHashScope: "body-without-derived-fields:v1",
      timestamp: "2026-03-18T15:47:55Z",
    },
    e0: {
      type: "E0",
      schemaVersion: "tier1-freeze-v2.1",
      mailbox: "security@offsecglobal.com",
      tokenMessageDigest: prefixedDigest("a"),
      artifactHashScope: "body-without-derived-fields:v1",
      timestamp: "2026-03-18T15:51:29Z",
    },
    p1: {
      type: "P1",
      schemaVersion: "tier1-freeze-v2.1",
      operator: "k.stefanski@vaultmesh.org",
      verdict: "approved",
      artifactHashScope: "body-without-derived-fields:v1",
      timestamp: "2026-03-18T15:57:01Z",
    },
    e2: {
      type: "E2",
      schemaVersion: "tier1-freeze-v2.1",
      executionId: "live-tier1-governed-20260318T155701Z",
      reportDigests: [prefixedDigest("b")],
      artifactHashScope: "body-without-derived-fields:v1",
      timestamp: "2026-03-18T15:58:04Z",
    },
  } as const;

  for (const [stage, body] of Object.entries(stageBodies)) {
    const stageKey = stage as "m0" | "e0" | "p1" | "e2";
    const artifact = {
      ...body,
      artifactHash: computeTier1StageArtifactHash(stageKey, body),
    };
    r0.tier1[stageKey].hash = artifact.artifactHash;
    await writeFile(
      path.join(dirPath, `${stage}.json`),
      `${JSON.stringify(artifact, null, 2)}\n`,
      "utf-8",
    );
  }

  r0.tier1.executionHash = computeTier1ExecutionHashFromR0(r0);
  r0.pvReceipt.record_digest.value = r0.tier1.executionHash.slice("sha256:".length);
  r0.artifactHash = computeR0ArtifactHash(r0);
}

test("emitTier1FreezeV2_1V0 emits deterministic V0 for the same R0 and now()", async () => {
  const r0 = makeValidR0();
  const now = () => "2026-03-18T16:07:21Z";

  const first = await emitTier1FreezeV2_1V0(r0, { now });
  const second = await emitTier1FreezeV2_1V0(r0, { now });

  assert.deepEqual(first, second);
  assert.equal(first.type, "V0");
  assert.equal(first.schemaVersion, TIER1_FREEZE_V2_1_SCHEMA_VERSION);
  assert.equal(first.verifier, "verifyTier1FreezeV2_1R0");
  assert.equal(first.replaySource, "disk-only");
  assert.equal(first.networkDependency, false);
  assert.equal(first.localOnly, true);
  assert.equal(first.deterministic, true);
  assert.equal(first.verdict, "pass");
});

test("emitTier1FreezeV2_1V0 preserves structured failure output", async () => {
  const r0 = makeValidR0();
  r0.artifactHash = prefixedDigest("a");

  const emitted = await emitTier1FreezeV2_1V0(r0, {
    now: () => "2026-03-18T16:07:21Z",
  });

  assert.equal(emitted.verdict, "fail");
  assert.equal(emitted.checks.artifactHashMatches, false);
  assert.equal(emitted.checks.executionHashMatches, true);
  assert.equal(emitted.checks.pvRecordDigestBindsExecutionHash, true);
  assert.deepEqual(emitted.failures, [
    "R0.artifactHash mismatch against recomputed artifact-body hash",
  ]);
});

test("emitTier1FreezeV2_1V0 adds strict component hash checks on strict pass", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "emit-v0-strict-"));
  const r0 = makeValidR0();
  try {
    await mkdir(tempDir, { recursive: true });
    await writeStrictArtifactSet(tempDir, r0);
    const emitted = await emitTier1FreezeV2_1V0(r0, {
      now: () => "2026-03-18T16:07:21Z",
      strictArtifactsRoot: tempDir,
    });

    assert.equal(emitted.strictArtifacts, true);
    assert.deepEqual(emitted.componentHashChecks, {
      m0: true,
      e0: true,
      p1: true,
      e2: true,
    });
    assert.equal(emitted.verdict, "pass");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("emitTier1FreezeV2_1V0 treats missing artifactHash in a loaded strict artifact as verifier failure", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "emit-v0-strict-"));
  const r0 = makeValidR0();
  try {
    await mkdir(tempDir, { recursive: true });
    await writeStrictArtifactSet(tempDir, r0);
    const p1Path = path.join(tempDir, "p1.json");
    const broken = {
      type: "P1",
      schemaVersion: "tier1-freeze-v2.1",
      operator: "k.stefanski@vaultmesh.org",
      verdict: "approved",
      artifactHashScope: "body-without-derived-fields:v1",
      timestamp: "2026-03-18T15:57:01Z",
    };
    await writeFile(p1Path, `${JSON.stringify(broken, null, 2)}\n`, "utf-8");

    const emitted = await emitTier1FreezeV2_1V0(r0, {
      now: () => "2026-03-18T16:07:21Z",
      strictArtifactsRoot: tempDir,
    });

    assert.equal(emitted.strictArtifacts, true);
    assert.equal(emitted.componentHashChecks?.p1, false);
    assert.equal(emitted.verdict, "fail");
    assert.match(
      emitted.failures.join("\n"),
      /P1 artifact is missing artifactHash/,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
