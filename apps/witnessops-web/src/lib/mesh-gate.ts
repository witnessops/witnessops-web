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

type JsonObject = Record<string, unknown>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const COMPACT_UTC_PATTERN = /^\d{8}T\d{6}Z$/;
const MESH_GATE_STATES = new Set(["PASS", "FAIL"]);
const PUBLIC_CLAIM = "operator_mesh_hygiene_structure_only";
const REQUIRED_BOUNDARY_MARKERS = [
  "not customer assurance",
  "not /api/verify proof",
  "not hunt verification",
] as const;

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(
  value: unknown,
  label: string,
  errors: string[],
): JsonObject | null {
  if (!isJsonObject(value)) {
    errors.push(`${label} must be an object`);
    return null;
  }
  return value;
}

function requireNonEmptyString(
  object: JsonObject,
  key: string,
  label: string,
  errors: string[],
): string | null {
  const value = object[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${label} must be a non-empty string`);
    return null;
  }
  return value;
}

function requireSha256(
  object: JsonObject,
  key: string,
  label: string,
  errors: string[],
): string | null {
  const value = requireNonEmptyString(object, key, label, errors);
  if (value !== null && !SHA256_PATTERN.test(value)) {
    errors.push(`${label} must be a lowercase SHA-256 digest`);
    return null;
  }
  return value;
}

function requireBoolean(
  object: JsonObject,
  key: string,
  label: string,
  errors: string[],
): boolean | null {
  const value = object[key];
  if (typeof value !== "boolean") {
    errors.push(`${label} must be a boolean`);
    return null;
  }
  return value;
}

function requireMeshGateState(
  object: JsonObject,
  key: string,
  label: string,
  errors: string[],
): string | null {
  const value = requireNonEmptyString(object, key, label, errors);
  if (value !== null && !MESH_GATE_STATES.has(value)) {
    errors.push(`${label} must be PASS or FAIL`);
    return null;
  }
  return value;
}

function validateNodes(doc: JsonObject, errors: string[]) {
  const nodes = requireObject(doc.nodes, "nodes", errors);
  if (!nodes) return;
  const entries = Object.entries(nodes);
  if (entries.length === 0) {
    errors.push("nodes must contain at least one node");
    return;
  }
  for (const [nodeId, value] of entries) {
    const node = requireObject(value, `nodes.${nodeId}`, errors);
    if (!node) continue;
    requireNonEmptyString(node, "host", `nodes.${nodeId}.host`, errors);
    requireNonEmptyString(node, "mesh_ip", `nodes.${nodeId}.mesh_ip`, errors);
  }
}

function validateChildReceipts(
  doc: JsonObject,
  errors: string[],
): boolean[] | null {
  if (!Array.isArray(doc.child_receipts) || doc.child_receipts.length === 0) {
    errors.push("child_receipts must be a non-empty array");
    return null;
  }

  const passStates: boolean[] = [];
  const ids = new Set<string>();
  for (const [index, value] of doc.child_receipts.entries()) {
    const label = `child_receipts[${index}]`;
    const child = requireObject(value, label, errors);
    if (!child) continue;
    const id = requireNonEmptyString(child, "id", `${label}.id`, errors);
    if (id !== null) {
      if (ids.has(id)) errors.push(`${label}.id must be unique`);
      ids.add(id);
    }
    requireNonEmptyString(child, "schema", `${label}.schema`, errors);
    requireNonEmptyString(child, "role", `${label}.role`, errors);
    requireNonEmptyString(child, "authority", `${label}.authority`, errors);
    const redactedPath = requireNonEmptyString(
      child,
      "path_redacted",
      `${label}.path_redacted`,
      errors,
    );
    if (
      redactedPath !== null &&
      (redactedPath.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(redactedPath))
    ) {
      errors.push(`${label}.path_redacted must not be an absolute path`);
    }
    requireSha256(child, "sha256", `${label}.sha256`, errors);
    const pass = requireBoolean(child, "pass", `${label}.pass`, errors);
    if (pass !== null) passStates.push(pass);
    if (!("summary" in child) || (child.summary !== null && typeof child.summary !== "string")) {
      errors.push(`${label}.summary must be a string or null`);
    }
  }
  return passStates;
}

function validateRequiredStructure(doc: JsonObject, errors: string[]) {
  const generatedAt = requireNonEmptyString(
    doc,
    "generated_at",
    "generated_at",
    errors,
  );
  if (generatedAt !== null && !COMPACT_UTC_PATTERN.test(generatedAt)) {
    errors.push("generated_at must use YYYYMMDDTHHMMSSZ");
  }
  requireNonEmptyString(doc, "engagement_id", "engagement_id", errors);
  const overall = requireMeshGateState(
    doc,
    "overall_mesh_gate",
    "overall_mesh_gate",
    errors,
  );

  validateNodes(doc, errors);
  const childPassStates = validateChildReceipts(doc, errors);

  requireSha256(doc, "source_receipt_sha256", "source_receipt_sha256", errors);
  const boundary = requireNonEmptyString(doc, "boundary", "boundary", errors);
  if (boundary !== null) {
    for (const marker of REQUIRED_BOUNDARY_MARKERS) {
      if (!boundary.includes(marker)) {
        errors.push(`boundary must state ${marker}`);
      }
    }
  }
  const publicClaim = requireNonEmptyString(
    doc,
    "public_claim",
    "public_claim",
    errors,
  );
  if (publicClaim !== null && publicClaim !== PUBLIC_CLAIM) {
    errors.push(`public_claim must be ${PUBLIC_CLAIM}`);
  }

  if (overall === "PASS") {
    if (childPassStates !== null && childPassStates.some((value) => !value)) {
      errors.push("overall_mesh_gate PASS requires every child receipt to pass");
    }
  }
}

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

export function computeMeshReceiptContentSha256(doc: JsonObject): string {
  const forHash: JsonObject = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === "content_sha256" || key === "source_receipt_sha256") continue;
    forHash[key] = value;
  }
  return sha256Canonical(forHash);
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
  input: unknown,
): MeshGateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isJsonObject(input)) {
    return {
      ok: false,
      verdict: "mesh_gate_invalid",
      schema: "witnessops.mesh_gate_verify.v1",
      scope: "operator-mesh-hygiene-only",
      errors: ["receipt must be a JSON object"],
      warnings: [
        "mesh_gate_valid means redacted receipt structure only; not bastion hunt verify or customer assurance",
      ],
    };
  }
  const doc = input;

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

  validateRequiredStructure(doc, errors);

  const storedHash = doc.content_sha256;
  if (typeof storedHash !== "string" || !SHA256_PATTERN.test(storedHash)) {
    errors.push("missing or invalid content_sha256");
  } else {
    const computed = computeMeshReceiptContentSha256(doc);
    if (computed !== storedHash) {
      errors.push("content_sha256 mismatch");
    }
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
      typeof doc.engagement_id === "string" && doc.engagement_id.length > 0
        ? doc.engagement_id
        : undefined,
    overall_mesh_gate:
      typeof doc.overall_mesh_gate === "string" &&
      MESH_GATE_STATES.has(doc.overall_mesh_gate)
        ? doc.overall_mesh_gate
        : undefined,
    content_sha256:
      typeof storedHash === "string" && SHA256_PATTERN.test(storedHash)
        ? storedHash
        : undefined,
    errors,
    warnings,
  };
}
