export type DocsAssistantSourceType = "source_url" | "repo_path";

export type DocsAssistantSourceClass =
  | "public_witnessops_docs_pages"
  | "approved_public_repo_docs";

export type DocsAssistantSourceClassification = "public" | "private";

export type DocsAssistantHashStatus = "not_collected" | "collected";

export interface DocsAssistantSourceManifestEntry {
  source_id: string;
  source_type: DocsAssistantSourceType;
  source_class: DocsAssistantSourceClass;
  source_url?: string;
  repo_path?: string;
  title: string;
  classification: DocsAssistantSourceClassification;
  inclusion_reason: string;
  anchors: string[];
  hash_status: DocsAssistantHashStatus;
  sha256: string | null;
  commit_sha: string | null;
  crawl_timestamp: string | null;
  exclusion_reason: string | null;
}

export interface DocsAssistantSourceManifestSeed {
  schema_version: "docs-assistant.source-manifest-seed.v1";
  status: "seed_only";
  generated_corpus: false;
  entries: DocsAssistantSourceManifestEntry[];
}

export const DOCS_ASSISTANT_ALLOWED_SOURCE_CLASSES: readonly DocsAssistantSourceClass[] = [
  "public_witnessops_docs_pages",
  "approved_public_repo_docs",
];

export const DOCS_ASSISTANT_EXCLUDED_SOURCE_CLASSES = [
  "customer_data",
  "crm_mailbox_data",
  "internal_receipts",
  "azure_runtime_logs",
  "secrets",
  "old_positioning_files",
  "unreviewed_drafts",
  "private_workflow_details",
  "tokens",
  "emails",
  "customer_names",
] as const;

export const DOCS_ASSISTANT_EXPECTED_SEED_REFERENCES = [
  "https://witnessops.com/docs",
  "https://witnessops.com/verify",
  "https://witnessops.com/review",
  "https://witnessops.com/security",
  "https://witnessops.com/support",
  "https://witnessops.com/terms",
  "witnessops/witnessops-contracts:schemas/docs-assistant/answer.schema.json",
  "witnessops/witnessops-contracts:schemas/docs-assistant/source-manifest.schema.json",
  "witnessops/witnessops-contracts:schemas/docs-assistant/eval-result.schema.json",
] as const;

export function sourceReferenceForEntry(
  entry: DocsAssistantSourceManifestEntry,
): string {
  return entry.source_type === "source_url" ? entry.source_url ?? "" : entry.repo_path ?? "";
}

export function validateSeedManifest(
  manifest: DocsAssistantSourceManifestSeed,
): string[] {
  const errors: string[] = [];

  if (manifest.schema_version !== "docs-assistant.source-manifest-seed.v1") {
    errors.push("invalid_schema_version");
  }

  if (manifest.status !== "seed_only") {
    errors.push("manifest_not_seed_only");
  }

  if (manifest.generated_corpus !== false) {
    errors.push("generated_corpus_must_be_false");
  }

  const observedReferences = manifest.entries.map(sourceReferenceForEntry);
  for (const expectedReference of DOCS_ASSISTANT_EXPECTED_SEED_REFERENCES) {
    if (!observedReferences.includes(expectedReference)) {
      errors.push(`missing_seed_reference:${expectedReference}`);
    }
  }

  if (observedReferences.length !== DOCS_ASSISTANT_EXPECTED_SEED_REFERENCES.length) {
    errors.push("unexpected_seed_reference_count");
  }

  const sourceIds = new Set<string>();
  for (const entry of manifest.entries) {
    if (sourceIds.has(entry.source_id)) {
      errors.push(`duplicate_source_id:${entry.source_id}`);
    }
    sourceIds.add(entry.source_id);

    if (!DOCS_ASSISTANT_ALLOWED_SOURCE_CLASSES.includes(entry.source_class)) {
      errors.push(`disallowed_source_class:${entry.source_id}`);
    }

    if (entry.classification !== "public") {
      errors.push(`non_public_seed_entry:${entry.source_id}`);
    }

    const hasSourceUrl = typeof entry.source_url === "string" && entry.source_url.length > 0;
    const hasRepoPath = typeof entry.repo_path === "string" && entry.repo_path.length > 0;
    if (Number(hasSourceUrl) + Number(hasRepoPath) !== 1) {
      errors.push(`invalid_source_reference_shape:${entry.source_id}`);
    }

    if (entry.source_type === "source_url" && !hasSourceUrl) {
      errors.push(`missing_source_url:${entry.source_id}`);
    }

    if (entry.source_type === "repo_path" && !hasRepoPath) {
      errors.push(`missing_repo_path:${entry.source_id}`);
    }

    if (entry.hash_status !== "not_collected") {
      errors.push(`seed_entry_collected:${entry.source_id}`);
    }

    if (entry.sha256 !== null || entry.commit_sha !== null || entry.crawl_timestamp !== null) {
      errors.push(`seed_entry_fakes_custody_or_freshness:${entry.source_id}`);
    }

    if (entry.exclusion_reason !== null) {
      errors.push(`included_entry_has_exclusion_reason:${entry.source_id}`);
    }
  }

  return errors;
}
