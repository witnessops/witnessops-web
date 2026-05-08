import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path, { resolve } from "node:path";
import test from "node:test";

import {
  buildDocsAssistantCorpusPlan,
  deterministicCorpusJson,
  writeDocsAssistantCorpusPackage,
} from "../corpus-builder";
import {
  type DocsAssistantSourceManifestSeed,
  sourceReferenceForEntry,
} from "../source-manifest";

function loadSeedManifest(): DocsAssistantSourceManifestSeed {
  return JSON.parse(
    readFileSync(resolve(__dirname, "../fixtures/source-manifest.seed.json"), "utf-8"),
  ) as DocsAssistantSourceManifestSeed;
}

function loadExpectedCorpusPlan(): unknown {
  return JSON.parse(
    readFileSync(
      resolve(__dirname, "../fixtures/corpus-builder.expected.json"),
      "utf-8",
    ),
  ) as unknown;
}

test("docs assistant corpus builder reads the approved seed manifest deterministically", () => {
  const plan = buildDocsAssistantCorpusPlan(loadSeedManifest());
  const expected = loadExpectedCorpusPlan();

  assert.deepEqual(plan, expected);
  assert.equal(
    deterministicCorpusJson(plan),
    readFileSync(
      resolve(__dirname, "../fixtures/corpus-builder.expected.json"),
      "utf-8",
    ),
  );
});

test("docs assistant corpus plan source records are stably sorted", () => {
  const manifest = loadSeedManifest();
  const plan = buildDocsAssistantCorpusPlan(manifest);
  const expectedReferences = manifest.entries
    .map(sourceReferenceForEntry)
    .sort((left, right) => left.localeCompare(right));

  assert.deepEqual(
    plan.content_records.map((record) => record.source_reference),
    expectedReferences,
  );
});

test("docs assistant corpus plan keeps URL and repo-path sources uncollected", () => {
  const plan = buildDocsAssistantCorpusPlan(loadSeedManifest());

  for (const record of plan.content_records) {
    assert.equal(record.collection_status, "not_collected", record.source_id);
    assert.equal(record.content_body, null, record.source_id);
    assert.equal(record.content_sha256, null, record.source_id);
    assert.equal(record.source_sha256, null, record.source_id);
  }

  assert.ok(plan.content_records.some((record) => record.source_type === "source_url"));
  assert.ok(plan.content_records.some((record) => record.source_type === "repo_path"));
});

test("docs assistant corpus builder refuses disallowed source classes", () => {
  const manifest = loadSeedManifest();
  manifest.entries[0] = {
    ...manifest.entries[0],
    source_class: "customer_data" as never,
  };

  assert.throws(
    () => buildDocsAssistantCorpusPlan(manifest),
    /disallowed_source_class:src-witnessops-docs/,
  );
});

test("docs assistant corpus builder refuses fake hash and freshness fields", () => {
  const fakeHashManifest = loadSeedManifest();
  fakeHashManifest.entries[0] = {
    ...fakeHashManifest.entries[0],
    sha256: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
  };

  assert.throws(
    () => buildDocsAssistantCorpusPlan(fakeHashManifest),
    /seed_entry_fakes_custody_or_freshness:src-witnessops-docs/,
  );

  const fakeFreshnessManifest = loadSeedManifest();
  fakeFreshnessManifest.entries[0] = {
    ...fakeFreshnessManifest.entries[0],
    commit_sha: "b20228b0c915a287ed122c3c381df9305113afe2",
  };

  assert.throws(
    () => buildDocsAssistantCorpusPlan(fakeFreshnessManifest),
    /seed_entry_fakes_custody_or_freshness:src-witnessops-docs/,
  );

  const fakeCollectedManifest = loadSeedManifest();
  fakeCollectedManifest.entries[0] = {
    ...fakeCollectedManifest.entries[0],
    hash_status: "collected",
  };

  assert.throws(
    () => buildDocsAssistantCorpusPlan(fakeCollectedManifest),
    /seed_entry_collected:src-witnessops-docs/,
  );
});

test("docs assistant corpus package writer writes only the plan and manifest in a temp directory", async () => {
  const outputDirectory = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-docs-assistant-corpus-"),
  );
  const plan = buildDocsAssistantCorpusPlan(loadSeedManifest());

  const result = await writeDocsAssistantCorpusPackage(plan, outputDirectory);
  const files = await readdir(outputDirectory);

  assert.deepEqual(files.sort(), ["CORPUS_PLAN.json", "MANIFEST.sha256"]);
  assert.equal(path.basename(result.corpusPlanPath), "CORPUS_PLAN.json");
  assert.equal(path.basename(result.manifestPath), "MANIFEST.sha256");
  assert.deepEqual(result.files, ["CORPUS_PLAN.json", "MANIFEST.sha256"]);

  const corpusPlanJson = await readFile(result.corpusPlanPath, "utf-8");
  const manifestText = await readFile(result.manifestPath, "utf-8");

  assert.equal(corpusPlanJson, deterministicCorpusJson(plan));
  assert.equal(manifestText, `${result.corpusPlanSha256}  CORPUS_PLAN.json\n`);
});

test("docs assistant corpus builder implementation has no platform or collection path", () => {
  const source = readFileSync(resolve(__dirname, "../corpus-builder.ts"), "utf-8");

  assert.doesNotMatch(source, /OpenAI|OPENAI_API_KEY|WITNESSOPS_DOCS_ASSISTANT_/);
  assert.doesNotMatch(source, /Responses API/i);
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /crawl/i);
  assert.doesNotMatch(source, /upload/i);
  assert.doesNotMatch(source, /vector[-_ ]?store/i);
  assert.doesNotMatch(source, /model[-_ ]?call|call a model/i);
});
