import test from "node:test";
import assert from "node:assert/strict";

import {
  buildReconciliationNoteTemplate,
  validateReconciliationNote,
} from "./reconciliation-note-policy";

test("reconciliation note policy builds case-aware templates", () => {
  const note = buildReconciliationNoteTemplate({
    evidenceSubcase: "provider_accepted_message_id_missing",
    deliveryAttemptId: "rsp_demo",
    provider: "m365",
    providerMessageId: null,
  });

  assert.match(note, /Evidence case:/);
  assert.match(note, /Corroboration:/);
  assert.match(note, /Judgment:/);
});

test("reconciliation note policy accepts sufficiently completed case-aware notes", () => {
  const validated = validateReconciliationNote({
    evidenceSubcase: "local_attempt_recorded_provider_outcome_unknown",
    note: [
      "Evidence reviewed: Reviewed the local file-provider EML output, the recorded mailbox, and the delivery attempt trace for rsp_demo.",
      "",
      "Why reconcile now: The local attempt is durably recorded but the provider outcome remains unknown, so the operator is recording judgment about ambiguity rather than claiming proof of delivery.",
      "",
      "Judgment: Reconcile the ambiguity, preserve the absence of INTAKE_RESPONDED, and continue without resending a second first reply.",
    ].join("\n"),
  });

  assert.match(validated, /Why reconcile now:/);
});

test("reconciliation note policy rejects decorative or incomplete notes", () => {
  assert.throws(
    () =>
      validateReconciliationNote({
        evidenceSubcase: "provider_delivery_evidence_incomplete",
        note: [
          "Missing evidence: [required]",
          "",
          "Additional context: reviewed by ops",
          "",
          "Judgment: looks fine",
        ].join("\n"),
      }),
    /must include completed sections/i,
  );
});
