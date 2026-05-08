import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import * as route from "./route";
import { POST } from "./route";

const expectedPayload = {
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

test("docs assistant ask route is POST-only and fails closed", async () => {
  assert.equal("GET" in route, false);

  const response = await POST();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), expectedPayload);
});

test("docs assistant ask implementation does not include model, secret, retrieval, upload, or corpus paths", () => {
  const implementationFiles = [
    resolve(__dirname, "route.ts"),
    resolve(__dirname, "../../../../lib/docs-assistant/answer-contract.ts"),
    resolve(__dirname, "../../../../lib/docs-assistant/disabled-response.ts"),
    resolve(__dirname, "../../../../lib/docs-assistant/source-policy.ts"),
    resolve(__dirname, "../../../docs/assistant/page.tsx"),
  ];

  for (const file of implementationFiles) {
    const source = readFileSync(file, "utf-8");
    assert.doesNotMatch(source, /OpenAI|OPENAI_API_KEY|WITNESSOPS_DOCS_ASSISTANT_/);
    assert.doesNotMatch(source, /fetch\s*\(/);
    assert.doesNotMatch(source, /vector[-_ ]?store/i);
    assert.doesNotMatch(source, /upload/i);
    assert.doesNotMatch(source, /corpus[-_ ]?generation|generated corpus/i);
  }
});
