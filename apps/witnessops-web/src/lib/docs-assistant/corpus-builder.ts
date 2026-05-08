import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  type DocsAssistantSourceManifestEntry,
  type DocsAssistantSourceManifestSeed,
  sourceReferenceForEntry,
  validateSeedManifest,
} from "./source-manifest";

export type DocsAssistantCorpusCollectionStatus = "not_collected";

export interface DocsAssistantCorpusPlanRecord {
  source_id: string;
  source_type: DocsAssistantSourceManifestEntry["source_type"];
  source_class: DocsAssistantSourceManifestEntry["source_class"];
  source_reference: string;
  title: string;
  classification: "public";
  inclusion_reason: string;
  anchors: string[];
  collection_status: DocsAssistantCorpusCollectionStatus;
  content_body: null;
  content_sha256: null;
  source_sha256: null;
  commit_sha: null;
}

export interface DocsAssistantSkippedSourceRecord {
  source_id: string;
  source_reference: string;
  reason: "source_not_collected_in_this_lane";
}

export interface DocsAssistantCorpusPlan {
  schema_version: "docs-assistant.corpus-plan.v1";
  collection_status: DocsAssistantCorpusCollectionStatus;
  generated_from_seed: true;
  source_count: number;
  content_records: DocsAssistantCorpusPlanRecord[];
  skipped_sources: DocsAssistantSkippedSourceRecord[];
  package_receipt: null;
  external_index_id: null;
}

export interface DocsAssistantCorpusPackageWriteResult {
  corpusPlanPath: string;
  manifestPath: string;
  corpusPlanSha256: `sha256:${string}`;
  files: readonly ["CORPUS_PLAN.json", "MANIFEST.sha256"];
}

function sortedSeedEntries(
  entries: DocsAssistantSourceManifestEntry[],
): DocsAssistantSourceManifestEntry[] {
  return [...entries].sort((left, right) =>
    sourceReferenceForEntry(left).localeCompare(sourceReferenceForEntry(right)),
  );
}

export function buildDocsAssistantCorpusPlan(
  manifest: DocsAssistantSourceManifestSeed,
): DocsAssistantCorpusPlan {
  const manifestErrors = validateSeedManifest(manifest);
  if (manifestErrors.length > 0) {
    throw new Error(
      `invalid docs assistant source seed manifest: ${manifestErrors.join(",")}`,
    );
  }

  const entries = sortedSeedEntries(manifest.entries);
  const contentRecords: DocsAssistantCorpusPlanRecord[] = entries.map((entry) => ({
    source_id: entry.source_id,
    source_type: entry.source_type,
    source_class: entry.source_class,
    source_reference: sourceReferenceForEntry(entry),
    title: entry.title,
    classification: "public",
    inclusion_reason: entry.inclusion_reason,
    anchors: [...entry.anchors],
    collection_status: "not_collected",
    content_body: null,
    content_sha256: null,
    source_sha256: null,
    commit_sha: null,
  }));

  return {
    schema_version: "docs-assistant.corpus-plan.v1",
    collection_status: "not_collected",
    generated_from_seed: true,
    source_count: contentRecords.length,
    content_records: contentRecords,
    skipped_sources: contentRecords.map((record) => ({
      source_id: record.source_id,
      source_reference: record.source_reference,
      reason: "source_not_collected_in_this_lane",
    })),
    package_receipt: null,
    external_index_id: null,
  };
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)]),
    );
  }

  return value;
}

export function deterministicCorpusJson(value: unknown): string {
  return `${JSON.stringify(sortJsonValue(value), null, 2)}\n`;
}

export function sha256ForDeterministicCorpusJson(jsonValue: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(jsonValue).digest("hex")}`;
}

export async function writeDocsAssistantCorpusPackage(
  plan: DocsAssistantCorpusPlan,
  outputDirectory: string,
): Promise<DocsAssistantCorpusPackageWriteResult> {
  await mkdir(outputDirectory, { recursive: true });

  const corpusPlanJson = deterministicCorpusJson(plan);
  const corpusPlanSha256 = sha256ForDeterministicCorpusJson(corpusPlanJson);
  const corpusPlanPath = join(outputDirectory, "CORPUS_PLAN.json");
  const manifestPath = join(outputDirectory, "MANIFEST.sha256");

  await writeFile(corpusPlanPath, corpusPlanJson, "utf-8");
  await writeFile(manifestPath, `${corpusPlanSha256}  CORPUS_PLAN.json\n`, "utf-8");

  return {
    corpusPlanPath,
    manifestPath,
    corpusPlanSha256,
    files: ["CORPUS_PLAN.json", "MANIFEST.sha256"],
  };
}
