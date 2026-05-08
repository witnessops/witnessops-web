import assert from "node:assert/strict";
import test from "node:test";

import {
  DOCS_ASSISTANT_ALLOWED_SOURCE_CLASSES,
  DOCS_ASSISTANT_EXCLUDED_SOURCE_CLASSES,
} from "../source-policy";

test("docs assistant source policy is public-docs only and excludes private/runtime classes", () => {
  assert.deepEqual(DOCS_ASSISTANT_ALLOWED_SOURCE_CLASSES, [
    "public_witnessops_docs_pages",
    "approved_public_repo_docs",
  ]);

  for (const excluded of [
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
  ]) {
    assert.ok(DOCS_ASSISTANT_EXCLUDED_SOURCE_CLASSES.includes(excluded as never));
  }
});
