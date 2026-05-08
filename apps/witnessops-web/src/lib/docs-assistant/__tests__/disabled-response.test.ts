import assert from "node:assert/strict";
import test from "node:test";

import { DOCS_ASSISTANT_DISABLED_RESPONSE, buildDocsAssistantDisabledResponse } from "../disabled-response";

test("docs assistant disabled response is fail-closed and exact", () => {
  const expected = {
    schema_version: "docs-assistant.disabled.v1",
    status: "disabled",
    answer_status: "cannot_claim",
    message: "WitnessOps Docs Assistant is not enabled.",
    human_review_required: true,
    not_proven: [
      "assistant_implemented",
      "retrieval_configured",
      "model_call_enabled",
      "source_freshness",
      "answer_correctness",
      "artifact_verification",
      "proof_bundle_verification",
      "production_readiness",
    ],
  };

  assert.deepEqual(DOCS_ASSISTANT_DISABLED_RESPONSE, expected);
  assert.deepEqual(buildDocsAssistantDisabledResponse(), expected);
});
