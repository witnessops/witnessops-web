import {
  verifyTier1FreezeV2_1R0,
  type Tier1FreezeV2_1VerificationVerdict,
} from "../verify-bundle";
import {
  TIER1_FREEZE_V2_1_SCHEMA_VERSION,
  type PrefixedSha256Digest,
  type Tier1FreezeV2_1R0Receipt,
} from "./schema";
import {
  verifyTier1StrictArtifacts,
  type StrictTier1ArtifactStage,
} from "./strict-artifacts";

export const TIER1_FREEZE_V2_1_V0_VERIFIER = "verifyTier1FreezeV2_1R0" as const;

export interface Tier1FreezeV2_1V0 {
  type: "V0";
  schemaVersion: typeof TIER1_FREEZE_V2_1_SCHEMA_VERSION;
  verifier: typeof TIER1_FREEZE_V2_1_V0_VERIFIER;
  replaySource: "disk-only";
  networkDependency: false;
  localOnly: true;
  deterministic: true;
  strictArtifacts?: true;
  checks: {
    artifactHashMatches: boolean;
    executionHashMatches: boolean;
    pvRecordDigestBindsExecutionHash: boolean;
  };
  componentHashChecks?: Record<StrictTier1ArtifactStage, boolean>;
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
  verdict: "pass" | "fail";
  timestamp: string;
}

export interface EmitTier1FreezeV2_1V0Options {
  now?: () => string;
  strictArtifactsRoot?: string;
}

async function mapVerdict(
  r0: Tier1FreezeV2_1R0Receipt,
  verdict: Tier1FreezeV2_1VerificationVerdict,
  options: Required<Pick<EmitTier1FreezeV2_1V0Options, "now">> &
    Pick<EmitTier1FreezeV2_1V0Options, "strictArtifactsRoot">,
): Promise<Tier1FreezeV2_1V0> {
  const v0: Tier1FreezeV2_1V0 = {
    type: "V0",
    schemaVersion: TIER1_FREEZE_V2_1_SCHEMA_VERSION,
    verifier: TIER1_FREEZE_V2_1_V0_VERIFIER,
    replaySource: "disk-only",
    networkDependency: false,
    localOnly: true,
    deterministic: true,
    checks: {
      artifactHashMatches: verdict.checks.artifactHashMatches,
      executionHashMatches: verdict.checks.executionHashMatches,
      pvRecordDigestBindsExecutionHash:
        verdict.checks.pvRecordDigestBindsExecutionHash,
    },
    claimed: {
      artifactHash: verdict.claimed.artifactHash,
      executionHash: verdict.claimed.executionHash,
    },
    recomputed: {
      artifactHash: verdict.recomputed.artifactHash,
      executionHash: verdict.recomputed.executionHash,
      pvBoundExecutionHash: verdict.recomputed.pvBoundExecutionHash,
    },
    failures: [...verdict.failures],
    verdict: verdict.result,
    timestamp: options.now(),
  };

  if (!options.strictArtifactsRoot) {
    return v0;
  }

  const strictResult = await verifyTier1StrictArtifacts(options.strictArtifactsRoot, {
    m0: r0.tier1.m0,
    e0: r0.tier1.e0,
    p1: r0.tier1.p1,
    e2: r0.tier1.e2,
  });

  v0.strictArtifacts = true;
  v0.componentHashChecks = strictResult.componentHashChecks;
  v0.failures = [...v0.failures, ...strictResult.failures];
  v0.verdict = v0.failures.length === 0 ? "pass" : "fail";
  return v0;
}

export async function emitTier1FreezeV2_1V0(
  r0: Tier1FreezeV2_1R0Receipt,
  options: EmitTier1FreezeV2_1V0Options = {},
): Promise<Tier1FreezeV2_1V0> {
  const now = options.now ?? (() => new Date().toISOString());
  return mapVerdict(r0, verifyTier1FreezeV2_1R0(r0), {
    now,
    strictArtifactsRoot: options.strictArtifactsRoot,
  });
}
