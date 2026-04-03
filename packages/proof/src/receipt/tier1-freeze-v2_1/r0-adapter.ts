import {
  TIER1_FREEZE_V2_1_SCHEMA_VERSION,
  type PrefixedSha256Digest,
  type Tier1ArtifactReference,
  type Tier1FreezeV2_1R0Receipt,
} from "./schema";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringField(
  source: UnknownRecord,
  fieldNames: readonly string[],
  label: string,
): string {
  for (const fieldName of fieldNames) {
    const value = source[fieldName];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  throw new Error(`Missing required field for ${label}`);
}

function normalizeArtifactReference(
  candidate: unknown,
  label: string,
): Tier1ArtifactReference {
  if (!isRecord(candidate)) {
    throw new Error(`Missing ${label} artifact reference`);
  }

  return {
    type: getStringField(candidate, ["type"], `${label}.type`),
    schemaVersion: getStringField(
      candidate,
      ["schemaVersion", "schema_version"],
      `${label}.schemaVersion`,
    ),
    hash: getStringField(candidate, ["hash"], `${label}.hash`) as PrefixedSha256Digest,
  };
}

function normalizeEvidenceDigests(source: UnknownRecord): PrefixedSha256Digest[] {
  const candidate =
    source.evidenceDigests ?? source.evidence_digests;

  if (!Array.isArray(candidate)) {
    throw new Error("Missing evidence digests");
  }

  const normalized = candidate.map((entry, index) => {
    if (typeof entry === "string") {
      return entry as PrefixedSha256Digest;
    }
    if (isRecord(entry) && typeof entry.value === "string") {
      return entry.value as PrefixedSha256Digest;
    }
    throw new Error(`Invalid evidence digest at index ${index}`);
  });

  if (normalized.length === 0) {
    throw new Error("Missing evidence digests");
  }

  return normalized;
}

function normalizePvRecordDigest(source: UnknownRecord): {
  algorithm: "sha256";
  value: string;
} {
  const pvReceipt = source.pvReceipt ?? source.pv_receipt;
  if (!isRecord(pvReceipt)) {
    throw new Error("Missing pvReceipt projection");
  }

  const recordDigest =
    pvReceipt.record_digest ??
    pvReceipt.recordDigest;
  if (!isRecord(recordDigest)) {
    throw new Error("Missing pvReceipt.record_digest");
  }

  return {
    algorithm: "sha256",
    value: getStringField(recordDigest, ["value"], "pvReceipt.record_digest.value"),
  };
}

/**
 * Adapter is mapping-only:
 * - normalizes live/offsec-like field names into frozen R0 schema
 * - does not compute artifactHash or executionHash
 * - does not redefine hash membership/semantics
 */
export function adaptLiveOffsecToTier1FreezeV2_1R0(
  liveInput: unknown,
): Tier1FreezeV2_1R0Receipt {
  if (!isRecord(liveInput)) {
    throw new Error("R0 adapter expects an object payload");
  }

  const tier1Section = isRecord(liveInput.tier1)
    ? liveInput.tier1
    : liveInput;

  return {
    type: "R0",
    schemaVersion: TIER1_FREEZE_V2_1_SCHEMA_VERSION,
    artifactHash: getStringField(
      liveInput,
      ["artifactHash", "artifact_hash"],
      "artifactHash",
    ) as PrefixedSha256Digest,
    tier1: {
      executionHash: getStringField(
        tier1Section,
        ["executionHash", "execution_hash"],
        "tier1.executionHash",
      ) as PrefixedSha256Digest,
      m0: normalizeArtifactReference(tier1Section.m0 ?? tier1Section.M0, "tier1.m0"),
      e0: normalizeArtifactReference(tier1Section.e0 ?? tier1Section.E0, "tier1.e0"),
      p1: normalizeArtifactReference(tier1Section.p1 ?? tier1Section.P1, "tier1.p1"),
      e2: normalizeArtifactReference(tier1Section.e2 ?? tier1Section.E2, "tier1.e2"),
      evidenceDigests: normalizeEvidenceDigests(tier1Section),
    },
    pvReceipt: {
      record_digest: normalizePvRecordDigest(liveInput),
    },
  };
}
