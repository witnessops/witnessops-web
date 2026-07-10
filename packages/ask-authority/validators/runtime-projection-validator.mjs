// witnessops-runtime-authority-projection-validator 1.0.0
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { canonicalize, selfTest as jcsSelfTest } from "../tools/jcs.mjs";

export const TOOL_NAME = "witnessops-runtime-authority-projection-validator";
export const TOOL_VERSION = "1.0.0";

const ROOT_KEYS = [
  "authority_set_id",
  "generation",
  "invariants",
  "layers",
  "manifest",
  "manifest_sha256",
  "projection_id",
  "projection_version",
  "schema",
];
const LAYER_KEYS = ["artifact_id", "artifact_version", "document", "sha256"];
const GENERATION_KEYS = ["canonicalization", "generator_version", "procedure_id", "procedure_version"];
const EXPECTED_BASENAMES = [
  "question-classes.v1.json",
  "ask-context-pack.v1.json",
  "claim-boundary.v1.json",
  "policy-rules.v1.json",
  "response-templates.v1.json",
];
const EXPECTED_IDS = [
  "QUESTION_CLASSES_V1",
  "ASK_CONTEXT_PACK_V1",
  "CLAIM_BOUNDARY_V1",
  "POLICY_RULES_V1",
  "RESPONSE_TEMPLATES_V1",
];
const EXPECTED_INVARIANTS = [
  "Canonical authority artifacts remain the source of authority.",
  "This projection is deterministic, derived, and not independently editable.",
  "No source presentation, matcher, precedence, API, model, receipt, or runtime policy semantics are introduced.",
  "Approval of knowledge authority does not authorize execution authority.",
];

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function equalKeys(value, expected) {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function readCanonical(file, label, errors) {
  let bytes;
  try {
    bytes = fs.readFileSync(file);
  } catch {
    errors.push("missing_file:" + label);
    return null;
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    errors.push("parse_failed:" + label);
    return null;
  }
  try {
    if (!canonicalize(value).equals(bytes)) errors.push("noncanonical_bytes:" + label);
  } catch (error) {
    errors.push("canonicalization_failed:" + label + ":" + error.message);
  }
  return { bytes, value, digest: sha256(bytes) };
}

function verifySourceSidecar(sourceDir, basename, record, errors) {
  if (!record) return;
  const sidecarPath = path.join(sourceDir, "hashes", basename + ".sha256");
  let sidecar;
  try {
    sidecar = fs.readFileSync(sidecarPath, "utf8").trimEnd();
  } catch {
    errors.push("missing_source_sidecar:" + basename);
    return;
  }
  if (sidecar !== record.digest + "  " + basename) errors.push("source_sidecar_mismatch:" + basename);
}

function scanEnvelope(value, location, errors) {
  if (typeof value === "string") {
    if (/\/Users\/|\/home\/|\.codex(?:\/|\b)|127\.0\.0\.1|localhost/i.test(value)) {
      errors.push("forbidden_environment_string:" + location);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanEnvelope(entry, location + "/" + index, errors));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) scanEnvelope(entry, location + "/" + key, errors);
  }
}

export function validateProjection(sourceDir, projectionPath) {
  const errors = [];
  try { jcsSelfTest(); } catch (error) { errors.push("jcs_self_test_failed:" + error.message); }
  const projection = readCanonical(projectionPath, "projection", errors);
  if (!projection) return errors.sort();
  const value = projection.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) errors.push("projection_not_object");
  if (!equalKeys(value, ROOT_KEYS)) errors.push("projection_root_keys_mismatch");
  if (value.schema !== "witnessops.ask.runtime-authority-set.v1") errors.push("projection_schema_mismatch");
  if (value.projection_id !== "ASK_RUNTIME_AUTHORITY_SET_V1") errors.push("projection_id_mismatch");
  if (value.projection_version !== 1) errors.push("projection_version_mismatch");
  if (value.authority_set_id !== "ASK_AUTHORITY_SET_V1") errors.push("authority_set_id_mismatch");
  if (!value.generation || !equalKeys(value.generation, GENERATION_KEYS)) errors.push("generation_keys_mismatch");
  if (value.generation?.procedure_id !== "witnessops.ask.runtime-projection.jcs") errors.push("procedure_id_mismatch");
  if (value.generation?.procedure_version !== 1) errors.push("procedure_version_mismatch");
  if (value.generation?.generator_version !== "1.0.0") errors.push("generator_version_mismatch");
  if (value.generation?.canonicalization !== "RFC8785_JCS") errors.push("canonicalization_id_mismatch");
  if (JSON.stringify(value.invariants) !== JSON.stringify(EXPECTED_INVARIANTS)) errors.push("invariants_mismatch");
  scanEnvelope({
    schema: value.schema,
    projection_id: value.projection_id,
    authority_set_id: value.authority_set_id,
    generation: value.generation,
    invariants: value.invariants,
  }, "$envelope", errors);

  const sidecarPath = path.join(path.dirname(projectionPath), "hashes", path.basename(projectionPath) + ".sha256");
  let projectionSidecar;
  try { projectionSidecar = fs.readFileSync(sidecarPath, "utf8").trimEnd(); } catch { errors.push("projection_sidecar_missing"); }
  if (projectionSidecar !== undefined && projectionSidecar !== projection.digest + "  " + path.basename(projectionPath)) {
    errors.push("projection_sidecar_mismatch");
  }

  const manifestPath = path.join(sourceDir, "ask-authority-set.v1.manifest.json");
  const sourceManifest = readCanonical(manifestPath, "source_manifest", errors);
  verifySourceSidecar(sourceDir, "ask-authority-set.v1.manifest.json", sourceManifest, errors);
  if (sourceManifest) {
    if (value.manifest_sha256 !== sourceManifest.digest) errors.push("manifest_digest_mismatch");
    try {
      if (!canonicalize(value.manifest).equals(sourceManifest.bytes)) errors.push("embedded_manifest_mismatch");
    } catch { errors.push("embedded_manifest_canonicalization_failed"); }
  }

  const manifest = sourceManifest?.value;
  if (manifest) {
    if (manifest.authority_set_id !== "ASK_AUTHORITY_SET_V1") errors.push("source_manifest_authority_set_mismatch");
    if (manifest.artifacts.length !== 5) errors.push("source_manifest_artifact_count");
    if (JSON.stringify(manifest.artifacts.map((entry) => entry.basename)) !== JSON.stringify(EXPECTED_BASENAMES)) {
      errors.push("source_manifest_basename_order");
    }
    if (JSON.stringify(manifest.artifacts.map((entry) => entry.artifact_id)) !== JSON.stringify(EXPECTED_IDS)) {
      errors.push("source_manifest_id_order");
    }
  }

  if (!Array.isArray(value.layers) || value.layers.length !== 5) {
    errors.push("projection_layer_count");
  } else if (manifest) {
    const seen = new Set();
    value.layers.forEach((layer, index) => {
      const manifestEntry = manifest.artifacts[index];
      if (!layer || typeof layer !== "object" || Array.isArray(layer)) {
        errors.push("layer_not_object:" + index);
        return;
      }
      if (!equalKeys(layer, LAYER_KEYS)) errors.push("layer_keys_mismatch:" + index);
      if (seen.has(layer.artifact_id)) errors.push("duplicate_layer_id:" + layer.artifact_id);
      seen.add(layer.artifact_id);
      if (layer.artifact_id !== EXPECTED_IDS[index]) errors.push("layer_id_order:" + index);
      if (layer.artifact_version !== 1) errors.push("layer_version:" + index);
      if (layer.artifact_id !== manifestEntry.artifact_id) errors.push("layer_manifest_id:" + index);
      if (layer.sha256 !== manifestEntry.sha256) errors.push("layer_manifest_digest:" + index);
      const source = readCanonical(path.join(sourceDir, manifestEntry.basename), "source_layer:" + manifestEntry.basename, errors);
      verifySourceSidecar(sourceDir, manifestEntry.basename, source, errors);
      if (!source) return;
      if (layer.sha256 !== source.digest) errors.push("layer_source_digest:" + index);
      if (layer.document?.artifact_id !== layer.artifact_id) errors.push("layer_document_id:" + index);
      if (layer.document?.artifact_version !== layer.artifact_version) errors.push("layer_document_version:" + index);
      try {
        if (!canonicalize(layer.document).equals(source.bytes)) errors.push("embedded_layer_mismatch:" + index);
      } catch { errors.push("embedded_layer_canonicalization_failed:" + index); }
    });
  }

  return errors.sort();
}

if (import.meta.url === new URL("file://" + process.argv[1]).href) {
  if (process.argv.length !== 4) {
    process.stderr.write("usage: " + process.argv[1] + " SOURCE_DIR PROJECTION\n");
    process.exit(2);
  }
  const errors = validateProjection(path.resolve(process.argv[2]), path.resolve(process.argv[3]));
  if (errors.length) {
    process.stderr.write(errors.join("\n") + "\n");
    process.exit(1);
  }
  process.stdout.write(TOOL_NAME + " " + TOOL_VERSION + " PASS " + process.argv[3] + "\n");
}
