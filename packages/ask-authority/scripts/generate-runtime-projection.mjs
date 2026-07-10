// witnessops-runtime-authority-projection-generator 1.0.0
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { canonicalize, selfTest as jcsSelfTest } from "../tools/jcs.mjs";

export const TOOL_NAME = "witnessops-runtime-authority-projection-generator";
export const TOOL_VERSION = "1.0.0";

const MANIFEST_BASENAME = "ask-authority-set.v1.manifest.json";
const LAYER_BASENAMES = [
  "question-classes.v1.json",
  "ask-context-pack.v1.json",
  "claim-boundary.v1.json",
  "policy-rules.v1.json",
  "response-templates.v1.json",
];
const EXPECTED_ARTIFACT_IDS = [
  "QUESTION_CLASSES_V1",
  "ASK_CONTEXT_PACK_V1",
  "CLAIM_BOUNDARY_V1",
  "POLICY_RULES_V1",
  "RESPONSE_TEMPLATES_V1",
];
const INVARIANTS = [
  "Canonical authority artifacts remain the source of authority.",
  "This projection is deterministic, derived, and not independently editable.",
  "No source presentation, matcher, precedence, API, model, receipt, or runtime policy semantics are introduced.",
  "Approval of knowledge authority does not authorize execution authority.",
];

function fail(code) {
  throw new Error(code);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key || !key.startsWith("--") || !value) fail("invalid_arguments");
    values.set(key, value);
  }
  if (values.size !== 2 || !values.has("--source-dir") || !values.has("--output")) {
    fail("usage:--source-dir SOURCE --output FILE");
  }
  return { sourceDir: path.resolve(values.get("--source-dir")), output: path.resolve(values.get("--output")) };
}

function readCanonical(sourceDir, basename) {
  const artifactPath = path.join(sourceDir, basename);
  const sidecarPath = path.join(sourceDir, "hashes", basename + ".sha256");
  const bytes = fs.readFileSync(artifactPath);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("bom_forbidden:" + basename);
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("json_parse_failed:" + basename + ":" + error.message);
  }
  const canonical = canonicalize(value);
  if (!canonical.equals(bytes)) fail("canonical_bytes_mismatch:" + basename);
  const digest = sha256(bytes);
  const sidecar = fs.readFileSync(sidecarPath, "utf8").trimEnd();
  if (sidecar !== digest + "  " + basename) fail("sidecar_mismatch:" + basename);
  return { basename, bytes, value, digest };
}

function atomicWrite(target, bytes) {
  const directory = path.dirname(target);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  const temporary = path.join(directory, "." + path.basename(target) + "." + process.pid + ".tmp");
  const descriptor = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporary, target);
  fs.chmodSync(target, 0o600);
}

export function generateProjection(sourceDir) {
  jcsSelfTest();
  const manifestRecord = readCanonical(sourceDir, MANIFEST_BASENAME);
  const layerRecords = LAYER_BASENAMES.map((basename) => readCanonical(sourceDir, basename));
  const manifest = manifestRecord.value;
  if (manifest.manifest_id !== "ASK_AUTHORITY_SET_V1_MANIFEST") fail("manifest_id_mismatch");
  if (manifest.manifest_version !== 1) fail("manifest_version_mismatch");
  if (manifest.authority_set_id !== "ASK_AUTHORITY_SET_V1") fail("authority_set_id_mismatch");
  const manifestBasenames = manifest.artifacts.map((entry) => entry.basename);
  const manifestIds = manifest.artifacts.map((entry) => entry.artifact_id);
  if (JSON.stringify(manifestBasenames) !== JSON.stringify(LAYER_BASENAMES)) fail("manifest_layer_order_mismatch");
  if (JSON.stringify(manifestIds) !== JSON.stringify(EXPECTED_ARTIFACT_IDS)) fail("manifest_artifact_id_order_mismatch");
  if (JSON.stringify(manifest.dependency_order) !== JSON.stringify(EXPECTED_ARTIFACT_IDS)) fail("manifest_dependency_order_mismatch");

  const layers = manifest.artifacts.map((entry, index) => {
    const source = layerRecords[index];
    const document = source.value;
    if (entry.basename !== source.basename) fail("manifest_source_alignment_mismatch:" + entry.artifact_id);
    if (entry.sha256 !== source.digest) fail("manifest_digest_mismatch:" + entry.artifact_id);
    if (document.artifact_id !== entry.artifact_id) fail("document_artifact_id_mismatch:" + entry.artifact_id);
    if (document.artifact_version !== 1) fail("document_artifact_version_mismatch:" + entry.artifact_id);
    return {
      artifact_id: entry.artifact_id,
      artifact_version: document.artifact_version,
      sha256: source.digest,
      document,
    };
  });

  return {
    schema: "witnessops.ask.runtime-authority-set.v1",
    projection_id: "ASK_RUNTIME_AUTHORITY_SET_V1",
    projection_version: 1,
    authority_set_id: "ASK_AUTHORITY_SET_V1",
    manifest_sha256: manifestRecord.digest,
    generation: {
      procedure_id: "witnessops.ask.runtime-projection.jcs",
      procedure_version: 1,
      generator_version: TOOL_VERSION,
      canonicalization: "RFC8785_JCS",
    },
    manifest,
    layers,
    invariants: INVARIANTS,
  };
}

export function writeProjection(sourceDir, output) {
  const projection = generateProjection(sourceDir);
  const bytes = canonicalize(projection);
  atomicWrite(output, bytes);
  const digest = sha256(bytes);
  const hashesDirectory = path.join(path.dirname(output), "hashes");
  fs.mkdirSync(hashesDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(hashesDirectory, 0o700);
  const sidecarPath = path.join(hashesDirectory, path.basename(output) + ".sha256");
  atomicWrite(sidecarPath, Buffer.from(digest + "  " + path.basename(output) + "\n", "utf8"));
  return { digest, output, sidecarPath };
}

if (import.meta.url === new URL("file://" + process.argv[1]).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = writeProjection(args.sourceDir, args.output);
    process.stdout.write(TOOL_NAME + " " + TOOL_VERSION + " PASS " + result.digest + "\n");
  } catch (error) {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
    process.exit(1);
  }
}
