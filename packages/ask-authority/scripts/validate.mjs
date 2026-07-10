import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const artifactRoot = path.join(packageRoot, "artifacts/v1");
const schemaValidator = path.join(packageRoot, "validators/schema-validator.mjs");
const authorityValidator = path.join(packageRoot, "validators/authority-validator.mjs");

const artifactBasenames = [
  "question-classes.v1.json",
  "ask-context-pack.v1.json",
  "claim-boundary.v1.json",
  "policy-rules.v1.json",
  "response-templates.v1.json",
  "ask-authority-set.v1.manifest.json",
];

const schemaBasenames = [
  "question-classes.v1.schema.json",
  "ask-context-pack.v1.schema.json",
  "claim-boundary.v1.schema.json",
  "policy-rules.v1.schema.json",
  "response-templates.v1.schema.json",
  "ask-authority-set.v1.manifest.schema.json",
];

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
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
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}

const packageManifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
if (packageManifest.private !== true) fail("package_must_remain_private");
if (JSON.stringify(packageManifest.exports) !== "{}") fail("package_exports_must_remain_empty");
for (const prohibitedField of ["main", "module", "browser", "bin"]) {
  if (Object.hasOwn(packageManifest, prohibitedField)) fail(`runtime_entrypoint_forbidden:${prohibitedField}`);
}

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
  ["authority-validator.mjs", "schema-validator.mjs"],
  "validator_inventory",
);
if (fs.existsSync(path.join(artifactRoot, "review"))) fail("review_renders_forbidden");

for (let index = 0; index < artifactBasenames.length; index += 1) {
  runNode([
    schemaValidator,
    path.join(artifactRoot, "schemas", schemaBasenames[index]),
    path.join(artifactRoot, artifactBasenames[index]),
  ]);
}
runNode([authorityValidator, artifactRoot, "--manifest"]);

const appManifest = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "apps/witnessops-web/package.json"), "utf8"),
);
for (const group of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
  if (appManifest[group]?.["@witnessops/ask-authority"]) {
    fail(`application_dependency_forbidden:${group}`);
  }
}

for (const file of walkFiles(path.join(repoRoot, "apps/witnessops-web/src"))) {
  const source = fs.readFileSync(file, "utf8");
  if (source.includes("@witnessops/ask-authority") || source.includes("packages/ask-authority")) {
    fail(`application_import_forbidden:${path.relative(repoRoot, file)}`);
  }
}

process.stdout.write("ask-authority promotion validation passed\n");
