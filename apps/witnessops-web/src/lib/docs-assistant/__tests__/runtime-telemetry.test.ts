import assert from "node:assert/strict";
import test from "node:test";

import { buildDocsAssistantTelemetryEvent } from "../runtime-telemetry";

test("docs assistant telemetry records question hash without raw question", () => {
  const event = buildDocsAssistantTelemetryEvent({
    requestId: "req_123",
    caseId: "probe-verify-purpose",
    question: "What is /verify for?",
    answerStatus: "partially_supported",
    citationCount: 5,
    latencyMs: 42,
    errorClass: null,
  });

  assert.equal(event.request_id, "req_123");
  assert.equal(event.case_id, "probe-verify-purpose");
  assert.match(event.question_sha256, /^sha256:[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(event).includes("What is /verify for?"), false);
  assert.equal(event.answer_status, "partially_supported");
  assert.equal(event.citation_count, 5);
  assert.equal(event.latency_ms, 42);
  assert.equal(event.error_class, null);
});
