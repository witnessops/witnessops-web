import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { isDeepStrictEqual } from "node:util";

const TOOL_NAME = "witnessops-runtime-export-boundary-validator";
const TOOL_VERSION = "1.0.0";
const PACKAGE_NAME = "@witnessops/ask-authority";
const APPROVED_SPECIFIER = `${PACKAGE_NAME}/v1/authority-set.json`;
const APPROVED_TARGET = "./runtime/v1/authority-set.json";
const APPROVED_SHA256 = "8c64e10fbb7e738dc314dfad5fb0df4f74e838600492f8e2c8be7af70a6bfb34";
const EXPECTED_EXPORTS = {
  "./v1/authority-set.json": {
    node: APPROVED_TARGET,
  },
};

function fail(message) {
  process.stderr.write(`${TOOL_NAME} ${TOOL_VERSION} FAIL ${message}\n`);
  process.exit(1);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const packageRoot = path.resolve(process.argv[2] ?? ".");
const manifestPath = path.join(packageRoot, "package.json");
const targetPath = path.join(packageRoot, APPROVED_TARGET.slice(2));
const sidecarPath = path.join(
  packageRoot,
  "runtime/v1/hashes/authority-set.json.sha256",
);

if (!fs.existsSync(manifestPath)) fail("package_manifest_missing");
if (!fs.existsSync(targetPath)) fail("approved_export_target_missing");
if (!fs.existsSync(sidecarPath)) fail("approved_export_sidecar_missing");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.name !== PACKAGE_NAME) fail("package_name_mismatch");
if (manifest.private !== true) fail("package_must_remain_private");
if (!isDeepStrictEqual(manifest.exports, EXPECTED_EXPORTS)) {
  fail("export_map_mismatch");
}
for (const prohibitedField of ["main", "module", "browser", "bin"]) {
  if (Object.hasOwn(manifest, prohibitedField)) {
    fail(`executable_or_browser_entrypoint_forbidden:${prohibitedField}`);
  }
}

const targetBytes = fs.readFileSync(targetPath);
if (sha256(targetBytes) !== APPROVED_SHA256) fail("approved_export_hash_mismatch");
const expectedSidecar = `${APPROVED_SHA256}  authority-set.json\n`;
if (fs.readFileSync(sidecarPath, "utf8") !== expectedSidecar) {
  fail("approved_export_sidecar_mismatch");
}

const packageRequire = createRequire(manifestPath);
let resolvedTarget;
try {
  resolvedTarget = packageRequire.resolve(APPROVED_SPECIFIER);
} catch (error) {
  fail(`approved_node_resolution_failed:${error?.code ?? "unknown"}`);
}
if (fs.realpathSync(resolvedTarget) !== fs.realpathSync(targetPath)) {
  fail("approved_node_resolution_target_mismatch");
}

let requiredProjection;
try {
  requiredProjection = packageRequire(APPROVED_SPECIFIER);
} catch (error) {
  fail(`approved_node_require_failed:${error?.code ?? "unknown"}`);
}
const parsedProjection = JSON.parse(targetBytes.toString("utf8"));
if (!isDeepStrictEqual(requiredProjection, parsedProjection)) {
  fail("approved_node_require_content_mismatch");
}

let importedProjection;
try {
  importedProjection = await import(APPROVED_SPECIFIER, {
    with: { type: "json" },
  });
} catch (error) {
  fail(`approved_node_import_failed:${error?.code ?? "unknown"}`);
}
if (!isDeepStrictEqual(importedProjection.default, parsedProjection)) {
  fail("approved_node_import_content_mismatch");
}

const forbiddenSpecifiers = [
  PACKAGE_NAME,
  `${PACKAGE_NAME}/package.json`,
  `${PACKAGE_NAME}/latest`,
  `${PACKAGE_NAME}/latest/authority-set.json`,
  `${PACKAGE_NAME}/v1`,
  `${PACKAGE_NAME}/v1/authority-set`,
  `${PACKAGE_NAME}/v1/question-classes.v1.json`,
  `${PACKAGE_NAME}/runtime/v1/authority-set.json`,
  `${PACKAGE_NAME}/artifacts/v1/question-classes.v1.json`,
  `${PACKAGE_NAME}/schemas/authority-set.schema.json`,
  `${PACKAGE_NAME}/hashes/authority-set.json.sha256`,
  `${PACKAGE_NAME}/validators/runtime-projection-validator.mjs`,
  `${PACKAGE_NAME}/tools/jcs.mjs`,
  `${PACKAGE_NAME}/scripts/validate.mjs`,
];

for (const specifier of forbiddenSpecifiers) {
  try {
    packageRequire.resolve(specifier);
    fail(`unapproved_export_resolved:${specifier}`);
  } catch (error) {
    if (error?.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") {
      fail(`unexpected_unapproved_export_error:${specifier}:${error?.code ?? "unknown"}`);
    }
  }
}

process.stdout.write(
  `${TOOL_NAME} ${TOOL_VERSION} PASS ${APPROVED_SPECIFIER} ${APPROVED_SHA256}\n`,
);
