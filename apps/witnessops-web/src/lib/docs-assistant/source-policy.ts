export const DOCS_ASSISTANT_ALLOWED_SOURCE_CLASSES = [
  "public_witnessops_docs_pages",
  "approved_public_repo_docs",
] as const;

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

export type DocsAssistantAllowedSourceClass =
  (typeof DOCS_ASSISTANT_ALLOWED_SOURCE_CLASSES)[number];

export type DocsAssistantExcludedSourceClass =
  (typeof DOCS_ASSISTANT_EXCLUDED_SOURCE_CLASSES)[number];
