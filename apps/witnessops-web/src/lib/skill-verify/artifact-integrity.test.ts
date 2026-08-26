import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";

const vendorDir = resolve(process.cwd(), "../../vendor/aegis");
const manifest = JSON.parse(
  readFileSync(resolve(vendorDir, "manifest.json"), "utf8"),
) as {
  artifact: string;
  sha256: string;
  verifier: string;
  source_sha: string;
  package: string;
};

test("checked-in Aegis tarball SHA-256 matches the provenance manifest", () => {
  const bytes = readFileSync(resolve(vendorDir, manifest.artifact));
  const digest = createHash("sha256").update(bytes).digest("hex");
  assert.equal(digest, manifest.sha256);
  assert.equal(
    digest,
    "d438853a906de7949e3e476f7ca7c5589dcbd3d1f7d08e62b96d840900d046eb",
  );
});

test("manifest pins the accepted Aegis source and verifier", () => {
  assert.equal(manifest.package, "aegis-deterministic");
  assert.equal(manifest.verifier, "aegis-deterministic@2.0.0-cleanroom.3");
  assert.equal(manifest.source_sha, "af967e166d44776675ed78e9fd68eda52c3d72ff");
});

test("WitnessOps resolves the vendored package, not a copied scanner", () => {
  const require = createRequire(import.meta.url);
  const entry = require.resolve("aegis-deterministic");
  assert.match(entry, /aegis-deterministic/);
  assert.match(entry, /dist\/lib\/verifier\/scan\.js$/);
  assert.doesNotMatch(entry, /src\/lib\/verifier\/scan\.ts$/);
});
