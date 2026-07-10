// witnessops-source-presentation-projection-generator 1.0.0
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { canonicalize, selfTest as jcsSelfTest } from "../tools/jcs.mjs";

export const TOOL_NAME = "witnessops-source-presentation-projection-generator";
export const TOOL_VERSION = "1.0.0";

const PRESENTATION_ARTIFACT_BASENAME = "source-presentation.v1.json";
const RUNTIME_AUTHORITY_SET = "authority-set.json";
const PROJECTION_BASENAME = "source-presentation-projection.json";

const INVARIANTS = [
  "Source presentation projection is a deterministic buyer-facing derivative only.",
  "Internal source metadata, repo paths, section IDs, and provenance are stripped.",
  "This projection does not affect classification, policy selection, or template choice.",
  "Presentation data is output-only and must not expand authority.",
  "The projection is bound to a specific SOURCE_PRESENTATION_V1 and ASK_RUNTIME_AUTHORITY_SET_V1 projection.",
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

function readJson(filePath) {
  const bytes = fs.readFileSync(filePath);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) };
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

function derivePresentationSource(rawSource) {
  // Buyer-facing derivative only. Strip internal fields.
  return {
    source_id: rawSource.source_id,
    public_label: rawSource.public_label,
    canonical_href: rawSource.canonical_href,
    href_class: rawSource.href_class,
    display_permission: rawSource.display_permission,
    section_display_policy: rawSource.section_display_policy,
  };
}

export function generatePresentationProjection(sourceDir) {
  jcsSelfTest();

  const presentationArtifactPath = path.join(sourceDir, PRESENTATION_ARTIFACT_BASENAME);
  const { bytes: presentationBytes, value: presentation } = readJson(presentationArtifactPath);
  const sourcePresentationSha = sha256(presentationBytes);

  if (presentation.artifact_id !== "SOURCE_PRESENTATION_V1") {
    fail("source_presentation_artifact_id_mismatch");
  }

  const runtimeAuthorityPath = path.join(sourceDir, "..", "..", "runtime", "v1", RUNTIME_AUTHORITY_SET);
  let coreProjectionSha;
  try {
    const runtimeBytes = fs.readFileSync(runtimeAuthorityPath);
    coreProjectionSha = sha256(runtimeBytes);
  } catch (e) {
    fail("core_projection_not_found_for_binding");
  }

  const globalRules = presentation.global_presentation_rules;
  if (!globalRules || !Array.isArray(globalRules.citation_order)) {
    fail("invalid_global_presentation_rules");
  }

  const derivedSources = presentation.sources.map(derivePresentationSource);

  const projection = {
    schema: "witnessops.ask.source-presentation-projection.v1",
    projection_id: "ASK_SOURCE_PRESENTATION_PROJECTION_V1",
    projection_version: 1,
    authority_set_id: "ASK_AUTHORITY_SET_V1",
    core_projection_sha256: coreProjectionSha,
    source_presentation_sha256: sourcePresentationSha,
    generation: {
      procedure_id: "witnessops.ask.source-presentation-projection",
      procedure_version: 1,
      generator_version: TOOL_VERSION,
      canonicalization: "RFC8785_JCS",
    },
    global_presentation_rules: globalRules,
    sources: derivedSources,
    invariants: INVARIANTS,
  };

  return {
    projection,
    sourcePresentationSha,
    coreProjectionSha,
  };
}

export function writePresentationProjection(sourceDir, output) {
  const { projection, sourcePresentationSha, coreProjectionSha } = generatePresentationProjection(sourceDir);
  const bytes = canonicalize(projection);
  atomicWrite(output, bytes);
  const digest = sha256(bytes);

  const hashesDirectory = path.join(path.dirname(output), "hashes");
  fs.mkdirSync(hashesDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(hashesDirectory, 0o700);

  const sidecarPath = path.join(hashesDirectory, path.basename(output) + ".sha256");
  atomicWrite(sidecarPath, Buffer.from(digest + "  " + path.basename(output) + "\n", "utf8"));

  return {
    digest,
    output,
    sidecarPath,
    sourcePresentationSha,
    coreProjectionSha,
  };
}

if (import.meta.url === new URL("file://" + process.argv[1]).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = writePresentationProjection(args.sourceDir, args.output);
    process.stdout.write(
      `${TOOL_NAME} ${TOOL_VERSION} PASS ${result.digest} source=${result.sourcePresentationSha} core=${result.coreProjectionSha}\n`
    );
  } catch (error) {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
    process.exit(1);
  }
}
