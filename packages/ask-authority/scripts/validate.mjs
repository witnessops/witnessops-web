import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const artifactRoot = path.join(packageRoot, "artifacts/v1");
const schemaValidator = path.join(packageRoot, "validators/schema-validator.mjs");
const authorityValidator = path.join(packageRoot, "validators/authority-validator.mjs");
const runtimeProjectionValidator = path.join(
  packageRoot,
  "validators/runtime-projection-validator.mjs",
);
const runtimeExportBoundaryValidator = path.join(
  packageRoot,
  "validators/runtime-export-boundary-validator.mjs",
);
const runtimeProjectionGenerator = path.join(
  packageRoot,
  "scripts/generate-runtime-projection.mjs",
);
const sourcePresentationProjectionGenerator = path.join(
  packageRoot,
  "scripts/generate-source-presentation-projection.mjs",
);
const runtimeRoot = path.join(packageRoot, "runtime/v1");
const runtimeProjection = path.join(runtimeRoot, "authority-set.json");
const runtimeProjectionSchema = path.join(
  runtimeRoot,
  "schemas/authority-set.schema.json",
);
const sourcePresentationProjection = path.join(runtimeRoot, "source-presentation-projection.json");

const artifactBasenames = [
  "question-classes.v1.json",
  "ask-context-pack.v1.json",
  "claim-boundary.v1.json",
  "policy-rules.v1.json",
  "response-templates.v1.json",
  "source-presentation.v1.json",
  "ask-authority-set.v1.manifest.json",
];

const schemaBasenames = [
  "question-classes.v1.schema.json",
  "ask-context-pack.v1.schema.json",
  "claim-boundary.v1.schema.json",
  "policy-rules.v1.schema.json",
  "response-templates.v1.schema.json",
  "source-presentation.v1.schema.json",
  "ask-authority-set.v1.manifest.schema.json",
];

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sortedNames(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .map((entry) => entry.name)
    .sort();
}

function expectExact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    fail(`${label}:expected=${[...expected].sort().join(",")}:actual=${actual.join(",")}`);
  }
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: packageRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  process.stdout.write(result.stdout);
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
    });
}

function moduleSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*,?\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
}

const packageManifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
if (packageManifest.private !== true) fail("package_must_remain_private");
for (const prohibitedField of ["main", "module", "browser", "bin"]) {
  if (Object.hasOwn(packageManifest, prohibitedField)) fail(`runtime_entrypoint_forbidden:${prohibitedField}`);
}
runNode([runtimeExportBoundaryValidator, packageRoot]);

expectExact(
  sortedNames(artifactRoot),
  [...artifactBasenames, "hashes", "schemas"],
  "artifact_root_inventory",
);
expectExact(
  sortedNames(path.join(artifactRoot, "schemas")),
  schemaBasenames,
  "schema_inventory",
);
expectExact(
  sortedNames(path.join(artifactRoot, "hashes")),
  artifactBasenames.map((basename) => `${basename}.sha256`),
  "hash_inventory",
);
expectExact(sortedNames(path.join(packageRoot, "tools")), ["jcs.mjs"], "tool_inventory");
expectExact(
  sortedNames(path.join(packageRoot, "validators")),
  [
    "authority-validator.mjs",
    "runtime-export-boundary-validator.mjs",
    "runtime-projection-validator.mjs",
    "schema-validator.mjs",
  ],
  "validator_inventory",
);
expectExact(
  sortedNames(path.join(packageRoot, "scripts")),
  ["generate-runtime-projection.mjs", "generate-source-presentation-projection.mjs", "validate.mjs"],
  "script_inventory",
);
expectExact(
  sortedNames(runtimeRoot),
  ["authority-set.json", "hashes", "schemas", "source-presentation-projection.json"],
  "runtime_root_inventory",
);
expectExact(
  sortedNames(path.join(runtimeRoot, "hashes")),
  ["authority-set.json.sha256", "source-presentation-projection.json.sha256"],
  "runtime_hash_inventory",
);
expectExact(
  sortedNames(path.join(runtimeRoot, "schemas")),
  ["authority-set.schema.json"],
  "runtime_schema_inventory",
);
if (fs.existsSync(path.join(artifactRoot, "review"))) fail("review_renders_forbidden");

for (let index = 0; index < artifactBasenames.length; index += 1) {
  if (index < schemaBasenames.length) {
    runNode([
      schemaValidator,
      path.join(artifactRoot, "schemas", schemaBasenames[index]),
      path.join(artifactRoot, artifactBasenames[index]),
    ]);
  } else {
    // source-presentation.v1.json has no schema yet (governed separately)
    console.log(`skipping schema check for ${artifactBasenames[index]}`);
  }
}
runNode([authorityValidator, artifactRoot, "--manifest"]);

const canonicalHashesBefore = new Map(
  artifactBasenames.map((basename) => [
    basename,
    sha256(fs.readFileSync(path.join(artifactRoot, basename))),
  ]),
);

runNode([schemaValidator, runtimeProjectionSchema, runtimeProjection]);
runNode([runtimeProjectionValidator, artifactRoot, runtimeProjection]);

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "witnessops-ask-runtime-projection-"),
);
try {
  const regeneratedProjection = path.join(
    temporaryRoot,
    "runtime/v1/authority-set.json",
  );
  runNode([
    runtimeProjectionGenerator,
    "--source-dir",
    artifactRoot,
    "--output",
    regeneratedProjection,
  ]);

  const committedBytes = fs.readFileSync(runtimeProjection);
  const regeneratedBytes = fs.readFileSync(regeneratedProjection);
  if (!committedBytes.equals(regeneratedBytes)) {
    fail("runtime_projection_regeneration_mismatch");
  }

  const committedSidecar = fs.readFileSync(
    path.join(runtimeRoot, "hashes/authority-set.json.sha256"),
  );
  const regeneratedSidecar = fs.readFileSync(
    path.join(
      path.dirname(regeneratedProjection),
      "hashes/authority-set.json.sha256",
    ),
  );
  if (!committedSidecar.equals(regeneratedSidecar)) {
    fail("runtime_projection_sidecar_regeneration_mismatch");
  }

  // Presentation projection regeneration check (parallel, not part of 5-layer authority)
  const regeneratedPresentationProjection = path.join(
    temporaryRoot,
    "runtime/v1/source-presentation-projection.json",
  );
  runNode([
    sourcePresentationProjectionGenerator,
    "--source-dir",
    artifactRoot,
    "--output",
    regeneratedPresentationProjection,
  ]);

  const committedPresentationBytes = fs.readFileSync(sourcePresentationProjection);
  const regeneratedPresentationBytes = fs.readFileSync(regeneratedPresentationProjection);
  if (!committedPresentationBytes.equals(regeneratedPresentationBytes)) {
    fail("source_presentation_projection_regeneration_mismatch");
  }

  const committedPresentationSidecar = fs.readFileSync(
    path.join(runtimeRoot, "hashes/source-presentation-projection.json.sha256"),
  );
  const regeneratedPresentationSidecar = fs.readFileSync(
    path.join(
      path.dirname(regeneratedPresentationProjection),
      "hashes/source-presentation-projection.json.sha256",
    ),
  );
  if (!committedPresentationSidecar.equals(regeneratedPresentationSidecar)) {
    fail("source_presentation_projection_sidecar_regeneration_mismatch");
  }
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

for (const [basename, before] of canonicalHashesBefore) {
  const after = sha256(fs.readFileSync(path.join(artifactRoot, basename)));
  if (after !== before) fail(`canonical_source_changed:${basename}`);
}

process.stdout.write("ask-authority runtime projection validation passed\n");

const appsRoot = path.join(repoRoot, "apps");
const approvedAppRoot = path.join(appsRoot, "witnessops-web");
const approvedAppManifestPath = path.join(approvedAppRoot, "package.json");
const approvedSourceRoot = path.join(approvedAppRoot, "src");
const approvedLoader = path.join(
  approvedSourceRoot,
  "lib/server/ask-witnessops/authority-loader.ts",
);
const approvedPresentationLoader = path.join(
  approvedSourceRoot,
  "lib/server/ask-witnessops/authority-presentation-loader.ts",
);
const authorityPackage = "@witnessops/ask-authority";
const authorityProjection = "@witnessops/ask-authority/v1/authority-set.json";
const presentationProjectionSpecifier = "@witnessops/ask-authority/v1/source-presentation-projection.json";
const dependencyGroups = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

const appManifestPaths = fs.readdirSync(appsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(appsRoot, entry.name, "package.json"))
  .filter((manifestPath) => fs.existsSync(manifestPath))
  .sort();

let authorityDependencyAdmissions = 0;
for (const manifestPath of appManifestPaths) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const group of dependencyGroups) {
    if (!Object.hasOwn(manifest[group] ?? {}, authorityPackage)) continue;
    if (
      manifestPath !== approvedAppManifestPath
      || group !== "dependencies"
      || manifest[group][authorityPackage] !== "workspace:*"
    ) {
      fail(
        `application_authority_dependency_not_admitted:${path.relative(repoRoot, manifestPath)}:${group}`,
      );
    }
    authorityDependencyAdmissions += 1;
  }
}
if (authorityDependencyAdmissions !== 1) {
  fail(`application_authority_dependency_count:${authorityDependencyAdmissions}`);
}

const appManifest = JSON.parse(fs.readFileSync(approvedAppManifestPath, "utf8"));
if (appManifest.dependencies?.["server-only"] !== "0.0.1") {
  fail("application_server_only_dependency_required");
}
for (const group of dependencyGroups.slice(1)) {
  if (Object.hasOwn(appManifest[group] ?? {}, "server-only")) {
    fail(`application_server_only_dependency_group_forbidden:${group}`);
  }
}

const runtimeFiles = walkFiles(approvedSourceRoot)
  .filter((file) => /\.(?:[cm]?[jt]sx?)$/.test(file))
  .filter((file) => !/\.(?:test|spec)\.(?:[cm]?[jt]sx?)$/.test(file))
  .filter((file) => !file.split(path.sep).includes("__tests__"));

const projectionImporters = [];
const loaderConsumers = [];
for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, "utf8");
  const specifiers = moduleSpecifiers(source);
  const authoritySpecifiers = specifiers.filter(
    (specifier) => specifier.startsWith(authorityPackage)
      || specifier.includes("packages/ask-authority"),
  );
  if (authoritySpecifiers.length > 0) {
    const isApprovedAuthority = (
      file === approvedLoader &&
      authoritySpecifiers.length === 1 &&
      authoritySpecifiers[0] === authorityProjection
    );
    const isApprovedPresentation = (
      file === approvedPresentationLoader &&
      authoritySpecifiers.length === 1 &&
      authoritySpecifiers[0] === presentationProjectionSpecifier
    );
    if (!isApprovedAuthority && !isApprovedPresentation) {
      fail(`application_authority_import_forbidden:${path.relative(repoRoot, file)}`);
    }
    projectionImporters.push(file);
  }

  if (file !== approvedLoader) {
    const importsLoader = specifiers.some((specifier) =>
      /(?:^|\/)authority-loader(?:\.[cm]?[jt]sx?)?$/.test(specifier)
    );
    if (importsLoader) loaderConsumers.push(file);
  }
}

expectExact(
  projectionImporters.map((file) => path.relative(repoRoot, file)).sort(),
  [
    path.relative(repoRoot, approvedLoader),
    path.relative(repoRoot, approvedPresentationLoader),
  ].sort(),
  "application_projection_importers",
);
expectExact(
  loaderConsumers.map((file) => path.relative(repoRoot, file)).sort(),
  [
    "apps/witnessops-web/src/lib/server/ask-witnessops/authority-policy-executor.ts",
  ].sort(),
  "application_loader_consumers",
);

const loaderSource = fs.readFileSync(approvedLoader, "utf8");
if (!loaderSource.startsWith('import "server-only";\n')) {
  fail("application_loader_server_only_guard_required");
}
if ((loaderSource.match(/import\s+["']server-only["'];/g) ?? []).length !== 1) {
  fail("application_loader_server_only_guard_count");
}
if (!loaderSource.includes("const require = createRequire(import.meta.url);")) {
  fail("application_loader_node_only_resolution_required");
}

const approvedQueries = [
  "getAuthority",
  "getAuthoritySetIdentity",
  "getGlobalPresentationRules",
  "getPolicyRule",
  "getPresentationForSource",
  "getPresentationProjectionIdentity",
  "getQuestionClass",
  "getRoute",
  "getSource",
  "getTemplate",
  "getTemplateForQuestionClass",
];
const exportedQueries = [...loaderSource.matchAll(/export const (get[A-Za-z]+)\s*=/g)]
  .map((match) => match[1])
  .sort();
expectExact(exportedQueries, approvedQueries, "application_loader_query_exports");

const forbiddenLoaderPatterns = [
  [/["']use client["']/, "client_directive"],
  [/\b(?:getClaimRule|getSelectedSection|listAll|search|getByKind)\b/, "unapproved_query"],
  [/\b(?:classes|rules|templates|sources|authorities|routes)\s*=/, "raw_collection"],
  [/\b(?:process\.env|import\.meta\.env)\b/, "environment_selection"],
  [/\b(?:fetch|WebSocket|EventSource|XMLHttpRequest)\b/, "browser_or_network_api"],
  [/\bnode:(?:fs|http|https|net|tls|dgram|dns)(?:\/promises)?\b/, "filesystem_or_network_module"],
  [/\b(?:window|document|navigator|localStorage|sessionStorage)\b/, "client_global"],
];
for (const [pattern, label] of forbiddenLoaderPatterns) {
  if (pattern.test(loaderSource)) fail(`application_loader_forbidden:${label}`);
}

process.stdout.write("ask-authority governed application-consumption boundary validation passed\n");
