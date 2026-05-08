import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  DOCS_ASSISTANT_ALLOWED_SOURCE_CLASSES,
  DOCS_ASSISTANT_EXCLUDED_SOURCE_CLASSES,
  DOCS_ASSISTANT_EXPECTED_SEED_REFERENCES,
  type DocsAssistantSourceManifestSeed,
  sourceReferenceForEntry,
  validateSeedManifest,
} from "../source-manifest";

function loadSeedManifest(): DocsAssistantSourceManifestSeed {
  return JSON.parse(
    readFileSync(
      resolve(__dirname, "../fixtures/source-manifest.seed.json"),
      "utf-8",
    ),
  ) as DocsAssistantSourceManifestSeed;
}

test("docs assistant source manifest seed contains exactly the approved source references", () => {
  const manifest = loadSeedManifest();
  const references = manifest.entries.map(sourceReferenceForEntry);

  assert.deepEqual(references, [...DOCS_ASSISTANT_EXPECTED_SEED_REFERENCES]);
  assert.deepEqual(validateSeedManifest(manifest), []);
});

test("docs assistant source manifest seed includes only allowed source classes", () => {
  const manifest = loadSeedManifest();

  for (const entry of manifest.entries) {
    assert.ok(DOCS_ASSISTANT_ALLOWED_SOURCE_CLASSES.includes(entry.source_class));
    assert.equal(entry.classification, "public");
  }
});

test("docs assistant source manifest seed excludes private customer runtime and secret classes", () => {
  const manifestRaw = readFileSync(
    resolve(__dirname, "../fixtures/source-manifest.seed.json"),
    "utf-8",
  );

  for (const excluded of DOCS_ASSISTANT_EXCLUDED_SOURCE_CLASSES) {
    assert.doesNotMatch(manifestRaw, new RegExp(`\"source_class\":\\s*\"${excluded}\"`));
  }
});

test("docs assistant source manifest seed has exactly one source reference per entry", () => {
  const manifest = loadSeedManifest();

  for (const entry of manifest.entries) {
    const hasSourceUrl = typeof entry.source_url === "string" && entry.source_url.length > 0;
    const hasRepoPath = typeof entry.repo_path === "string" && entry.repo_path.length > 0;

    assert.equal(Number(hasSourceUrl) + Number(hasRepoPath), 1, entry.source_id);
  }
});

test("docs assistant source manifest seed does not fake hash custody or source freshness", () => {
  const manifest = loadSeedManifest();

  for (const entry of manifest.entries) {
    assert.equal(entry.hash_status, "not_collected", entry.source_id);
    assert.equal(entry.sha256, null, entry.source_id);
    assert.equal(entry.commit_sha, null, entry.source_id);
    assert.equal(entry.crawl_timestamp, null, entry.source_id);
  }
});
