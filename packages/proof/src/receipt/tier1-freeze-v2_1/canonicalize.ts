import type {
  Tier1ExecutionHashPayload,
  Tier1FreezeV2_1R0Receipt,
} from "./schema";

export const R0_INCLUDED_FIELDS_FOR_ARTIFACT_HASH_V1 = Object.freeze([
  "type",
  "schemaVersion",
  "tier1.m0",
  "tier1.e0",
  "tier1.p1",
  "tier1.e2",
  "tier1.evidenceDigests(sorted)",
  "pvReceipt.record_digest.algorithm",
  "pvReceipt.record_digest.value",
]);

function compareLex(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function canonicalizeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Cannot canonicalize non-finite number");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalizeValue(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => compareLex(left, right));
    const serialized = entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalizeValue(entryValue)}`)
      .join(",");
    return `{${serialized}}`;
  }

  throw new Error(`Unsupported canonicalization type: ${typeof value}`);
}

export function sortEvidenceDigests(
  evidenceDigests: readonly string[],
): string[] {
  return [...evidenceDigests].sort(compareLex);
}

export interface R0ArtifactBodyProjectionV1 {
  type: "R0";
  schemaVersion: string;
  tier1: {
    m0: {
      type: string;
      schemaVersion: string;
      hash: string;
    };
    e0: {
      type: string;
      schemaVersion: string;
      hash: string;
    };
    p1: {
      type: string;
      schemaVersion: string;
      hash: string;
    };
    e2: {
      type: string;
      schemaVersion: string;
      hash: string;
    };
    evidenceDigests: string[];
  };
  pvReceipt: {
    record_digest: {
      algorithm: "sha256";
      value: string;
    };
  };
}

/**
 * Artifact-body projection only.
 * Derived fields are excluded by contract:
 * - R0.artifactHash
 * - R0.tier1.executionHash
 */
export function projectR0ArtifactBodyWithoutDerivedFieldsV1(
  r0: Tier1FreezeV2_1R0Receipt,
): R0ArtifactBodyProjectionV1 {
  return {
    type: r0.type,
    schemaVersion: r0.schemaVersion,
    tier1: {
      m0: { ...r0.tier1.m0 },
      e0: { ...r0.tier1.e0 },
      p1: { ...r0.tier1.p1 },
      e2: { ...r0.tier1.e2 },
      evidenceDigests: sortEvidenceDigests(r0.tier1.evidenceDigests),
    },
    pvReceipt: {
      record_digest: {
        algorithm: r0.pvReceipt.record_digest.algorithm,
        value: r0.pvReceipt.record_digest.value,
      },
    },
  };
}

export function canonicalizeR0ArtifactBodyWithoutDerivedFieldsV1(
  r0: Tier1FreezeV2_1R0Receipt,
): string {
  return canonicalizeValue(projectR0ArtifactBodyWithoutDerivedFieldsV1(r0));
}

export interface Tier1ExecutionHashProjectionV1 {
  type: string;
  schemaVersion: string;
  m0: {
    type: string;
    schemaVersion: string;
    hash: string;
  };
  e0: {
    type: string;
    schemaVersion: string;
    hash: string;
  };
  p1: {
    type: string;
    schemaVersion: string;
    hash: string;
  };
  e2: {
    type: string;
    schemaVersion: string;
    hash: string;
  };
  evidenceDigests: string[];
}

export function projectTier1ExecutionHashPayloadV1(
  payload: Tier1ExecutionHashPayload,
): Tier1ExecutionHashProjectionV1 {
  return {
    type: payload.type,
    schemaVersion: payload.schemaVersion,
    m0: { ...payload.m0 },
    e0: { ...payload.e0 },
    p1: { ...payload.p1 },
    e2: { ...payload.e2 },
    evidenceDigests: sortEvidenceDigests(payload.evidenceDigests),
  };
}

export function canonicalizeTier1ExecutionHashPayloadV1(
  payload: Tier1ExecutionHashPayload,
): string {
  return canonicalizeValue(projectTier1ExecutionHashPayloadV1(payload));
}
