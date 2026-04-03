export const TIER1_FREEZE_V2_1_SCHEMA_VERSION = "tier1-freeze-v2.1" as const;
export const TIER1_EXECUTION_HASH_PAYLOAD_TYPE =
  "tier1-execution-hash-payload:v1" as const;
export const R0_ARTIFACT_BODY_CANONICALIZATION =
  "body-without-derived-fields:v1" as const;

export type PrefixedSha256Digest = `sha256:${string}`;

export interface Tier1ArtifactReference {
  type: string;
  schemaVersion: string;
  hash: PrefixedSha256Digest;
}

export interface Tier1ExecutionHashPayload {
  type: typeof TIER1_EXECUTION_HASH_PAYLOAD_TYPE;
  schemaVersion: typeof TIER1_FREEZE_V2_1_SCHEMA_VERSION;
  m0: Tier1ArtifactReference;
  e0: Tier1ArtifactReference;
  p1: Tier1ArtifactReference;
  e2: Tier1ArtifactReference;
  evidenceDigests: PrefixedSha256Digest[];
}

export interface Tier1PvReceiptProjection {
  record_digest: {
    algorithm: "sha256";
    value: string;
  };
}

export interface Tier1R0Tier1 {
  executionHash: PrefixedSha256Digest;
  m0: Tier1ArtifactReference;
  e0: Tier1ArtifactReference;
  p1: Tier1ArtifactReference;
  e2: Tier1ArtifactReference;
  evidenceDigests: PrefixedSha256Digest[];
}

export interface Tier1FreezeV2_1R0Receipt {
  type: "R0";
  schemaVersion: typeof TIER1_FREEZE_V2_1_SCHEMA_VERSION;
  artifactHash: PrefixedSha256Digest;
  tier1: Tier1R0Tier1;
  pvReceipt: Tier1PvReceiptProjection;
}

/**
 * R0 binding rule:
 * - This equality binds the embedded PV projection to the already-computed executionHash.
 * - It does not redefine executionHash computation.
 */
export function expectedExecutionHashFromPvReceipt(
  r0: Pick<Tier1FreezeV2_1R0Receipt, "pvReceipt">,
): PrefixedSha256Digest {
  return `sha256:${r0.pvReceipt.record_digest.value}`;
}

export function isR0ExecutionHashBoundToPvReceipt(
  r0: Pick<Tier1FreezeV2_1R0Receipt, "tier1" | "pvReceipt">,
): boolean {
  return r0.tier1.executionHash === expectedExecutionHashFromPvReceipt(r0);
}
