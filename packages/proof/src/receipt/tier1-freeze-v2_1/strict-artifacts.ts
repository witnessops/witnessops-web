import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type {
  PrefixedSha256Digest,
  Tier1ArtifactReference,
} from "./schema";

export type StrictTier1ArtifactStage = "m0" | "e0" | "p1" | "e2";

export const STRICT_TIER1_ARTIFACT_FILE_NAMES: Record<
  StrictTier1ArtifactStage,
  string
> = {
  m0: "m0.json",
  e0: "e0.json",
  p1: "p1.json",
  e2: "e2.json",
};

export class StrictArtifactInputError extends Error {}

interface UnknownRecord extends Record<string, unknown> {
  artifactHash?: unknown;
  artifactHashScope?: unknown;
}

export interface StrictArtifactStageSuccess {
  stage: StrictTier1ArtifactStage;
  filePath: string;
  recomputedHash: PrefixedSha256Digest;
  fileArtifactHash: PrefixedSha256Digest;
  r0ReferenceHash: PrefixedSha256Digest;
  matchesFileArtifactHash: boolean;
  matchesR0ReferenceHash: boolean;
  checkPassed: boolean;
}

export interface StrictArtifactStageFailure {
  stage: StrictTier1ArtifactStage;
  filePath: string;
  failures: string[];
}

export interface StrictArtifactVerificationResult {
  componentHashChecks: Record<StrictTier1ArtifactStage, boolean>;
  failures: string[];
  stages: Record<
    StrictTier1ArtifactStage,
    StrictArtifactStageSuccess | StrictArtifactStageFailure
  >;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function toPrefixedSha256Digest(hexDigest: string): PrefixedSha256Digest {
  return `sha256:${hexDigest}`;
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function projectTier1StageArtifactBodyWithoutDerivedFieldsV1(
  stage: StrictTier1ArtifactStage,
  artifact: UnknownRecord,
): Record<string, unknown> {
  const projected: Record<string, unknown> = { ...artifact };
  delete projected.artifactHash;
  if (stage === "p1" || stage === "e2") {
    delete projected.artifactHashScope;
  }
  return projected;
}

export function computeTier1StageArtifactHash(
  stage: StrictTier1ArtifactStage,
  artifact: UnknownRecord,
): PrefixedSha256Digest {
  const canonical = canonicalizeValue(
    projectTier1StageArtifactBodyWithoutDerivedFieldsV1(stage, artifact),
  );
  return toPrefixedSha256Digest(sha256Hex(canonical));
}

async function readArtifactRecord(filePath: string): Promise<UnknownRecord> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (error) {
    throw new StrictArtifactInputError(
      `Unable to read strict artifact file: ${filePath}`,
      { cause: error },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new StrictArtifactInputError(
      `Unable to parse JSON from strict artifact file: ${filePath}`,
      { cause: error },
    );
  }

  if (!isRecord(parsed)) {
    throw new StrictArtifactInputError(
      `Strict artifact file must contain a JSON object: ${filePath}`,
    );
  }

  return parsed;
}

function resolveArtifactFilePath(
  artifactRoot: string,
  stage: StrictTier1ArtifactStage,
): string {
  return path.join(artifactRoot, STRICT_TIER1_ARTIFACT_FILE_NAMES[stage]);
}

function describeStage(stage: StrictTier1ArtifactStage): string {
  return stage.toUpperCase();
}

function verifyLoadedArtifact(
  stage: StrictTier1ArtifactStage,
  filePath: string,
  artifact: UnknownRecord,
  r0Reference: Tier1ArtifactReference,
): StrictArtifactStageSuccess | StrictArtifactStageFailure {
  const stageLabel = describeStage(stage);
  const failures: string[] = [];
  const fileArtifactHash =
    typeof artifact.artifactHash === "string"
      ? (artifact.artifactHash as PrefixedSha256Digest)
      : null;

  if (!fileArtifactHash) {
    failures.push(`${stageLabel} artifact is missing artifactHash`);
  }

  const recomputedHash = computeTier1StageArtifactHash(stage, artifact);
  const matchesFileArtifactHash =
    fileArtifactHash !== null && recomputedHash === fileArtifactHash;
  const matchesR0ReferenceHash = recomputedHash === r0Reference.hash;

  if (fileArtifactHash !== null && !matchesFileArtifactHash) {
    failures.push(
      `${stageLabel} recomputed hash does not match ${STRICT_TIER1_ARTIFACT_FILE_NAMES[stage]} artifactHash`,
    );
  }
  if (!matchesR0ReferenceHash) {
    failures.push(
      `${stageLabel} recomputed hash does not match R0.tier1.${stage}.hash`,
    );
  }

  if (failures.length > 0) {
    return {
      stage,
      filePath,
      failures,
    };
  }

  return {
    stage,
    filePath,
    recomputedHash,
    fileArtifactHash: fileArtifactHash as PrefixedSha256Digest,
    r0ReferenceHash: r0Reference.hash,
    matchesFileArtifactHash,
    matchesR0ReferenceHash,
    checkPassed: true,
  };
}

export async function verifyTier1StrictArtifacts(
  artifactRoot: string,
  references: Record<StrictTier1ArtifactStage, Tier1ArtifactReference>,
): Promise<StrictArtifactVerificationResult> {
  const componentHashChecks: Record<StrictTier1ArtifactStage, boolean> = {
    m0: false,
    e0: false,
    p1: false,
    e2: false,
  };
  const failures: string[] = [];
  const stages = {} as StrictArtifactVerificationResult["stages"];

  for (const stage of Object.keys(STRICT_TIER1_ARTIFACT_FILE_NAMES) as StrictTier1ArtifactStage[]) {
    const filePath = resolveArtifactFilePath(artifactRoot, stage);
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch (error) {
      throw new StrictArtifactInputError(
        `Missing required strict artifact file: ${filePath}`,
        { cause: error },
      );
    }

    if (!stat.isFile()) {
      throw new StrictArtifactInputError(
        `Strict artifact path is not a file: ${filePath}`,
      );
    }

    const artifact = await readArtifactRecord(filePath);
    const stageResult = verifyLoadedArtifact(stage, filePath, artifact, references[stage]);
    stages[stage] = stageResult;

    if ("checkPassed" in stageResult) {
      componentHashChecks[stage] =
        stageResult.matchesFileArtifactHash &&
        stageResult.matchesR0ReferenceHash;
      continue;
    }

    failures.push(...stageResult.failures);
  }

  return {
    componentHashChecks,
    failures,
    stages,
  };
}
