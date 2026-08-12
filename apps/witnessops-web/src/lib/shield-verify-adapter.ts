import type {
  VerifyCheckView,
  VerifySuccessResponse,
  VerifyVerdict,
} from "@/lib/verify-contract";

/** Primary WitnessOps wire token for local-server-audit structural receipts. */
export const LOCAL_SERVER_AUDIT_RECEIPT_SCHEMA =
  "witnessops.local_server_audit.receipt.v1";

/** Legacy wire token still accepted for dual-read (emitters / older packages). */
export const LEGACY_OFFSEC_SHIELD_RECEIPT_SCHEMA = "offsecshield.receipt.v1";

/** Exact schema_id emitted by older local-server-audit packages. */
export const LEGACY_RUN_RECEIPT_SCHEMA_ID =
  "https://offsecagent.com/schemas/run_receipt.schema.json";

/** @deprecated Use LEGACY_OFFSEC_SHIELD_RECEIPT_SCHEMA */
export const OFFSEC_SHIELD_RECEIPT_SCHEMA = LEGACY_OFFSEC_SHIELD_RECEIPT_SCHEMA;

export const LOCAL_SERVER_AUDIT_ADAPTER_ID =
  "witnessops.verify.local_server_audit_receipt.v1";

/** @deprecated Prefer LOCAL_SERVER_AUDIT_ADAPTER_ID; dual-read responses use the primary adapter id. */
export const SHIELD_ADAPTER_ID = LOCAL_SERVER_AUDIT_ADAPTER_ID;

export const LOCAL_SERVER_AUDIT_INPUT_KIND = "local-server-audit-receipt" as const;

const SHA256_HEX = /^[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Detect local-server-audit receipts for structural verify.
 * Accepts the two wire schemas and the exact schema_id-only legacy marker.
 */
export function isLocalServerAuditReceipt(
  receipt: Record<string, unknown>,
): boolean {
  if (receipt.schema === LOCAL_SERVER_AUDIT_RECEIPT_SCHEMA) {
    return true;
  }
  if (receipt.schema === LEGACY_OFFSEC_SHIELD_RECEIPT_SCHEMA) {
    return true;
  }
  return (
    receipt.schema === undefined &&
    receipt.schema_id === LEGACY_RUN_RECEIPT_SCHEMA_ID
  );
}

/** @deprecated Use isLocalServerAuditReceipt */
export function isOffsecShieldReceipt(
  receipt: Record<string, unknown>,
): boolean {
  return isLocalServerAuditReceipt(receipt);
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

function schemaToken(receipt: Record<string, unknown>): string {
  if (typeof receipt.schema === "string" && receipt.schema !== "") {
    return receipt.schema;
  }
  if (typeof receipt.schema_id === "string") {
    return receipt.schema_id;
  }
  return "(missing)";
}

/**
 * Structural / cross-field validation only. Does not read artifact bytes
 * (offline byte/MANIFEST READY checks remain on the operator CLI path).
 */
export function verifyLocalServerAuditReceipt(
  receipt: Record<string, unknown>,
): VerifySuccessResponse {
  const checks: VerifyCheckView[] = [];

  const push = (name: string, pass: boolean, detail: string) => {
    checks.push(check(name, pass, detail));
  };

  const recognized = isLocalServerAuditReceipt(receipt);
  push(
    "LSA_SCHEMA",
    recognized,
    `Expected ${LOCAL_SERVER_AUDIT_RECEIPT_SCHEMA}, legacy ${LEGACY_OFFSEC_SHIELD_RECEIPT_SCHEMA}, or exact legacy ${LEGACY_RUN_RECEIPT_SCHEMA_ID}. Observed: ${schemaToken(receipt)}.`,
  );

  // Keep SHIELD_* check names for binding failures so existing tests and callers stay stable.
  push(
    "SHIELD_SCHEMA",
    recognized,
    `Dual-read detector matched local-server-audit structural receipt family.`,
  );

  const requiredStrings = [
    "receipt_id",
    "run_id",
    "module",
    "issued_at_utc",
  ] as const;
  for (const key of requiredStrings) {
    const ok = typeof receipt[key] === "string" && receipt[key] !== "";
    push(
      `SHIELD_FIELD_${key.toUpperCase()}`,
      ok,
      `${key} must be a non-empty string.`,
    );
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
      checks.push({
        name: `SHIELD_${field.toUpperCase()}_OPTIONAL`,
        status: "not_applicable",
        detail: `${field} not set; binding check was not performed.`,
      });
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
      "no_fabrication should be true for local-server-audit run receipts.",
    );
  }

  checks.push({
    name: "SHIELD_OFFLINE_BYTES",
    status: "not_applicable",
    detail:
      "Artifact bytes and MANIFEST.sha256 READY/MISMATCH/MISSING require offline CLI verify on the operator host.",
  });

  const failed = checks.some((c) => c.status === "unverified");
  const verdict: VerifyVerdict = failed ? "invalid" : "indeterminate";

  const isLegacy =
    receipt.schema === LEGACY_OFFSEC_SHIELD_RECEIPT_SCHEMA ||
    (receipt.schema === undefined &&
      receipt.schema_id === LEGACY_RUN_RECEIPT_SCHEMA_ID);

  const summary = failed
    ? "Local server audit receipt failed structural checks on /api/verify (not PV/QV/WV)."
    : isLegacy && receipt.schema !== LOCAL_SERVER_AUDIT_RECEIPT_SCHEMA
      ? "Local server audit receipt (legacy dual-read) passed structural checks only; use offline CLI to verify bytes on disk."
      : "Local server audit receipt passed structural checks only; use offline CLI to verify bytes on disk.";

  return {
    ok: true,
    inputKind: LOCAL_SERVER_AUDIT_INPUT_KIND,
    adapter: LOCAL_SERVER_AUDIT_ADAPTER_ID,
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

/** @deprecated Use verifyLocalServerAuditReceipt */
export function verifyOffsecShieldReceipt(
  receipt: Record<string, unknown>,
): VerifySuccessResponse {
  return verifyLocalServerAuditReceipt(receipt);
}
