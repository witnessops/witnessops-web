import { createHash } from "node:crypto";
import {
  canonicalizeR0ArtifactBodyWithoutDerivedFieldsV1,
  canonicalizeTier1ExecutionHashPayloadV1,
} from "./canonicalize";
import {
  TIER1_EXECUTION_HASH_PAYLOAD_TYPE,
  TIER1_FREEZE_V2_1_SCHEMA_VERSION,
  type PrefixedSha256Digest,
  type Tier1ExecutionHashPayload,
  type Tier1FreezeV2_1R0Receipt,
} from "./schema";

function sha256Hex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function toPrefixedSha256Digest(hexDigest: string): PrefixedSha256Digest {
  return `sha256:${hexDigest}`;
}

/**
 * Artifact-hash path: body-without-derived-fields:v1 over frozen R0 included fields.
 * This is not the execution hash path.
 */
export function computeR0ArtifactHash(
  r0: Tier1FreezeV2_1R0Receipt,
): PrefixedSha256Digest {
  const canonical = canonicalizeR0ArtifactBodyWithoutDerivedFieldsV1(r0);
  return toPrefixedSha256Digest(sha256Hex(canonical));
}

export function buildTier1ExecutionHashPayload(
  r0: Tier1FreezeV2_1R0Receipt,
): Tier1ExecutionHashPayload {
  return {
    type: TIER1_EXECUTION_HASH_PAYLOAD_TYPE,
    schemaVersion: TIER1_FREEZE_V2_1_SCHEMA_VERSION,
    m0: { ...r0.tier1.m0 },
    e0: { ...r0.tier1.e0 },
    p1: { ...r0.tier1.p1 },
    e2: { ...r0.tier1.e2 },
    evidenceDigests: [...r0.tier1.evidenceDigests],
  };
}

/**
 * Execution-hash path: locked typed Tier 1 payload only.
 * This is not computed from projected R0 fields.
 */
export function computeTier1ExecutionHash(
  payload: Tier1ExecutionHashPayload,
): PrefixedSha256Digest {
  const canonical = canonicalizeTier1ExecutionHashPayloadV1(payload);
  return toPrefixedSha256Digest(sha256Hex(canonical));
}

export function computeTier1ExecutionHashFromR0(
  r0: Tier1FreezeV2_1R0Receipt,
): PrefixedSha256Digest {
  return computeTier1ExecutionHash(buildTier1ExecutionHashPayload(r0));
}
