import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyDeliveryEvidenceSubcase,
  deriveReconciliationReportSubcase,
} from "./reconciliation-subcases";

test("reconciliation subcases classify provider accepted evidence with a message identifier", () => {
  assert.equal(
    classifyDeliveryEvidenceSubcase({
      responseProvider: "resend",
      responseProviderMessageId: "re_123",
      responseDeliveryAttemptId: "rsp_123",
      responseMailbox: "support@witnessops.com",
      respondedAt: "2026-03-29T11:05:00Z",
    }),
    "provider_accepted_message_id_present_no_durable_confirmation",
  );
});

test("reconciliation subcases classify provider accepted evidence without a message identifier", () => {
  assert.equal(
    classifyDeliveryEvidenceSubcase({
      responseProvider: "m365",
      responseProviderMessageId: null,
      responseDeliveryAttemptId: "rsp_123",
      responseMailbox: "support@witnessops.com",
      respondedAt: "2026-03-29T11:05:00Z",
    }),
    "provider_accepted_message_id_missing",
  );
});

test("reconciliation subcases classify incomplete delivery evidence separately", () => {
  assert.equal(
    classifyDeliveryEvidenceSubcase({
      responseProvider: "resend",
      responseProviderMessageId: null,
      responseDeliveryAttemptId: null,
      responseMailbox: "support@witnessops.com",
      respondedAt: "2026-03-29T11:05:00Z",
    }),
    "provider_delivery_evidence_incomplete",
  );
});

test("reconciliation subcases classify local attempts and resolved review separately", () => {
  assert.equal(
    classifyDeliveryEvidenceSubcase({
      responseProvider: "file",
      responseProviderMessageId: "msg_local",
      responseDeliveryAttemptId: "rsp_local",
      responseMailbox: "support@witnessops.com",
      respondedAt: "2026-03-29T11:05:00Z",
    }),
    "local_attempt_recorded_provider_outcome_unknown",
  );

  assert.equal(
    deriveReconciliationReportSubcase({
      responseProvider: "file",
      responseProviderMessageId: "msg_local",
      responseDeliveryAttemptId: "rsp_local",
      responseMailbox: "support@witnessops.com",
      respondedAt: "2026-03-29T11:05:00Z",
      reconciliationRecordedAt: "2026-03-29T12:00:00Z",
    }),
    "reconciled_after_provider_evidence_review",
  );

  assert.equal(
    deriveReconciliationReportSubcase({
      responseProvider: "resend",
      responseProviderMessageId: "re_123",
      responseDeliveryAttemptId: "rsp_123",
      responseMailbox: "support@witnessops.com",
      respondedAt: "2026-03-29T11:05:00Z",
      responseProviderOutcomeStatus: "delivered",
    }),
    "closed_after_strong_provider_outcome",
  );
});
