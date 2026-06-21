import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const MESH_RECEIPT_PUBLIC_SCHEMA = "offseclane.mesh_receipt_public.v1";
export const MESH_RECEIPT_INDEX_SCHEMA = "offseclane.mesh_receipt_index.v1";

export type MeshGateVerdict = "mesh_gate_valid" | "mesh_gate_invalid";

export type MeshGateResult = {
  ok: boolean;
  verdict: MeshGateVerdict;
  schema: "witnessops.mesh_gate_verify.v1";
  scope: "operator-mesh-hygiene-only";
  engagement_id?: string;
  overall_mesh_gate?: string;
  content_sha256?: string;
  errors: string[];
  warnings: string[];
};

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeysDeep(obj[key]);
    }
    return sorted;
  }
  return value;
}

/** Matches Python json.dumps(..., sort_keys=True, separators=(",", ":")). */
function sha256Canonical(doc: Record<string, unknown>): string {
  const sorted = sortKeysDeep(doc) as Record<string, unknown>;
  const body = JSON.stringify(sorted);
  return crypto.createHash("sha256").update(body).digest("hex");
}

function resolveMeshGateFixtureRoot(): string {
  const candidates = [
    path.resolve(process.cwd(), "fixtures/mesh-gate"),
    path.resolve(process.cwd(), "apps/witnessops-web/fixtures/mesh-gate"),
  ];
  for (const root of candidates) {
    if (fs.existsSync(root)) return root;
  }
  return candidates[0];
}

export function loadPublishedMeshReceiptIndex(): Record<string, unknown> | null {
  const file = path.join(resolveMeshGateFixtureRoot(), "mesh-receipt-index.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
}

export function validateMeshReceiptPublic(
  doc: Record<string, unknown>,
): MeshGateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (doc.schema !== MESH_RECEIPT_PUBLIC_SCHEMA) {
    errors.push(`unsupported schema: ${String(doc.schema)}`);
  }

  const serialized = JSON.stringify(doc);
  if (serialized.includes("/home/")) {
    errors.push("public mesh receipt must not contain /home/ paths");
  }
  if ("evd_pointer" in doc) {
    errors.push("public mesh receipt must not contain evd_pointer");
  }

  const storedHash = doc.content_sha256;
  if (typeof storedHash !== "string" || !/^[a-f0-9]{64}$/.test(storedHash)) {
    errors.push("missing or invalid content_sha256");
  } else {
    const forHash: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(doc)) {
      if (key === "content_sha256" || key === "source_receipt_sha256") {
        continue;
      }
      forHash[key] = value;
    }
    const computed = sha256Canonical(forHash);
    if (computed !== storedHash) {
      errors.push("content_sha256 mismatch");
    }
  }

  if (!doc.engagement_id) {
    warnings.push("engagement_id missing");
  }

  warnings.push(
    "mesh_gate_valid means redacted receipt structure only; not bastion hunt verify or customer assurance",
  );

  const ok = errors.length === 0;
  return {
    ok,
    verdict: ok ? "mesh_gate_valid" : "mesh_gate_invalid",
    schema: "witnessops.mesh_gate_verify.v1",
    scope: "operator-mesh-hygiene-only",
    engagement_id:
      typeof doc.engagement_id === "string" ? doc.engagement_id : undefined,
    overall_mesh_gate:
      typeof doc.overall_mesh_gate === "string"
        ? doc.overall_mesh_gate
        : undefined,
    content_sha256:
      typeof storedHash === "string" ? storedHash : undefined,
    errors,
    warnings,
  };
}