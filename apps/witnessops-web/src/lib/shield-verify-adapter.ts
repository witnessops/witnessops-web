import type {
  VerifyCheckView,
  VerifySuccessResponse,
  VerifyVerdict,
} from "@/lib/verify-contract";

export const OFFSEC_SHIELD_RECEIPT_SCHEMA = "offsecshield.receipt.v1";
export const SHIELD_ADAPTER_ID = "witnessops.verify.offsec_shield_receipt.v1";

const SHA256_HEX = /^[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isOffsecShieldReceipt(
  receipt: Record<string, unknown>,
): boolean {
  if (receipt.schema === OFFSEC_SHIELD_RECEIPT_SCHEMA) {
    return true;
  }
  const schemaId = receipt.schema_id;
  return (
    typeof schemaId === "string" &&
    schemaId.includes("run_receipt.schema.json")
  );
}

function artifactSha256(
  artifacts: unknown,
  relativePath: string,
): string | null {
  if (!Array.isArray(artifacts)) return null;
  for (const item of artifacts) {
    if (!isRecord(item)) continue;
    if (item.path === relativePath && typeof item.sha256 === "string") {
      return item.sha256;
    }
  }
  return null;
}

function check(
  name: string,
  pass: boolean,
  detail: string,
): VerifyCheckView {
  return {
    name,
    status: pass ? "verified" : "unverified",
    detail,
  };
}

/**
 * Structural / cross-field validation only. Does not read artifact bytes
 * (unlike offsecshield.py verify on a run directory).
 */
export function verifyOffsecShieldReceipt(
  receipt: Record<string, unknown>,
): VerifySuccessResponse {
  const checks: VerifyCheckView[] = [];

  const push = (name: string, pass: boolean, detail: string) => {
    checks.push(check(name, pass, detail));
  };

  push(
    "SHIELD_SCHEMA",
    isOffsecShieldReceipt(receipt),
    `Expected ${OFFSEC_SHIELD_RECEIPT_SCHEMA} or run_receipt schema_id.`,
  );

  const requiredStrings = [
    "receipt_id",
    "run_id",
    "module",
    "issued_at_utc",
  ] as const;
  for (const key of requiredStrings) {
    const ok = typeof receipt[key] === "string" && receipt[key] !== "";
    push(`SHIELD_FIELD_${key.toUpperCase()}`, ok, `${key} must be a non-empty string.`);
  }

  const artifacts = receipt.artifacts;
  const artifactsOk =
    Array.isArray(artifacts) &&
    artifacts.length > 0 &&
    artifacts.every(
      (a) =>
        isRecord(a) &&
        typeof a.path === "string" &&
        typeof a.sha256 === "string" &&
        SHA256_HEX.test(a.sha256),
    );
  push(
    "SHIELD_ARTIFACTS",
    artifactsOk,
    "artifacts[] must list path + sha256 (64 hex) for each entry.",
  );

  const bindHash = (
    field: "authority_hash" | "scope_hash",
    evidencePath: string,
  ) => {
    const declared = receipt[field];
    if (declared === null || declared === undefined) {
      push(
        `SHIELD_${field.toUpperCase()}_OPTIONAL`,
        true,
        `${field} not set; skipped binding check.`,
      );
      return;
    }
    if (typeof declared !== "string" || !SHA256_HEX.test(declared)) {
      push(
        `SHIELD_${field.toUpperCase()}`,
        false,
        `${field} must be 64-char hex when present.`,
      );
      return;
    }
    const fromArtifact = artifactSha256(artifacts, evidencePath);
    const ok = fromArtifact === declared;
    push(
      `SHIELD_${field.toUpperCase()}_BINDING`,
      ok,
      ok
        ? `${field} matches artifacts[] sha256 for ${evidencePath}.`
        : `${field} does not match artifacts[] entry for ${evidencePath}.`,
    );
  };

  bindHash("authority_hash", "evidence/authority.json");
  bindHash("scope_hash", "evidence/scope.json");

  if (typeof receipt.evidence_manifest_hash === "string") {
    push(
      "SHIELD_EVIDENCE_MANIFEST_HASH_PRESENT",
      SHA256_HEX.test(receipt.evidence_manifest_hash),
      "evidence_manifest_hash present (bytes not revalidated on web).",
    );
  }

  if ("no_fabrication" in receipt) {
    push(
      "SHIELD_NO_FABRICATION",
      receipt.no_fabrication === true,
      "no_fabrication should be true for Shield run receipts.",
    );
  }

  push(
    "SHIELD_OFFLINE_BYTES",
    true,
    "Artifact bytes and MANIFEST.sha256 READY/MISMATCH/MISSING require offline offsecshield.py verify.",
  );

  const failed = checks.some((c) => c.status === "unverified");
  const verdict: VerifyVerdict = failed ? "invalid" : "valid";

  const summary = failed
    ? "OffSec Shield receipt failed structural checks on /api/verify (not PV/QV/WV)."
    : "OffSec Shield receipt passed structural checks only; use offline CLI to verify bytes on disk.";

  return {
    ok: true,
    inputKind: "offsec-shield-receipt",
    adapter: SHIELD_ADAPTER_ID,
    verdict,
    scope: "receipt-only",
    artifactRevalidation: "not_possible",
    proofStageClaimed: "unknown",
    proofStageVerified: "unknown",
    summary,
    checks,
    breaches: [],
  };
}