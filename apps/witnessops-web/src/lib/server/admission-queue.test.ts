import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { appendIntakeEvent } from "./intake-event-ledger";
import { buildAdmissionQueueView } from "./admission-queue";
import {
  clearTokenStore,
  saveIntake,
  saveIssuance,
  type IntakeRecord,
  type TokenIssuanceRecord,
} from "./token-store";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

function makeIntake(overrides: Partial<IntakeRecord>): IntakeRecord {
  return {
    intakeId: "intk_default",
    channel: "engage",
    email: "security@witnessops.com",
    state: "verification_sent",
    createdAt: "2026-03-29T10:00:00Z",
    updatedAt: "2026-03-29T10:05:00Z",
    latestIssuanceId: "iss_default",
    threadId: null,
    submission: {},
    ...overrides,
  };
}

function makeIssuance(
  overrides: Partial<TokenIssuanceRecord>,
): TokenIssuanceRecord {
  return {
    issuanceId: "iss_default",
    intakeId: "intk_default",
    channel: "engage",
    email: "security@witnessops.com",
    tokenDigest: "sha256:test",
    createdAt: "2026-03-29T10:00:00Z",
    expiresAt: "2026-03-29T10:15:00Z",
    status: "issued",
    threadId: null,
    delivery: {
      mailbox: "witnessopsno-reply@witnessops.com",
      alias: null,
      templateVersion: "tier1-token-v2",
      provider: "file",
      providerMessageId: null,
      deliveredAt: "2026-03-29T10:01:00Z",
    },
    ...overrides,
  };
}

afterEach(async () => {
  await clearTokenStore();
});

test("admission queue rebuilds from ledger and preserves distinct states", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-"));
  applyTestEnv(baseDir);

  await saveIntake(
    makeIntake({
      intakeId: "intk_engage",
      state: "admitted",
      updatedAt: "2026-03-29T10:03:00Z",
      latestIssuanceId: "iss_engage",
      threadId: "thr_engage",
      submission: { intent: "Third-party assessment", org: "WITNESSOPS" },
    }),
  );
  await saveIssuance(
    makeIssuance({
      issuanceId: "iss_engage",
      intakeId: "intk_engage",
      status: "verified",
      threadId: "thr_engage",
      assessmentStatus: "pending",
    }),
  );
  await saveIntake(
    makeIntake({
      intakeId: "intk_support",
      channel: "support",
      email: "operator@gmail.com",
      state: "verification_sent",
      updatedAt: "2026-03-29T10:02:00Z",
      latestIssuanceId: "iss_support",
      submission: {
        category: "receipt",
        severity: "general",
        message: "Need help verifying a receipt.",
      },
    }),
  );
  await saveIssuance(
    makeIssuance({
      issuanceId: "iss_support",
      intakeId: "intk_support",
      channel: "support",
      email: "operator@gmail.com",
    }),
  );

  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: "2026-03-29T10:00:00Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: null,
    thread_id: null,
    previous_state: null,
    next_state: "submitted",
    source: "test",
    payload: { email: "security@witnessops.com" },
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFICATION_SENT",
    occurred_at: "2026-03-29T10:01:00Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: "iss_engage",
    thread_id: null,
    previous_state: "submitted",
    next_state: "verification_sent",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFIED",
    occurred_at: "2026-03-29T10:03:00Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: "iss_engage",
    thread_id: null,
    previous_state: "verification_sent",
    next_state: "verified",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_ADMITTED",
    occurred_at: "2026-03-29T10:03:01Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: "iss_engage",
    thread_id: "thr_engage",
    previous_state: "verified",
    next_state: "admitted",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: "2026-03-29T10:00:30Z",
    channel: "support",
    intake_id: "intk_support",
    issuance_id: null,
    thread_id: null,
    previous_state: null,
    next_state: "submitted",
    source: "test",
    payload: { email: "operator@gmail.com" },
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFICATION_SENT",
    occurred_at: "2026-03-29T10:02:00Z",
    channel: "support",
    intake_id: "intk_support",
    issuance_id: "iss_support",
    thread_id: null,
    previous_state: "submitted",
    next_state: "verification_sent",
    source: "test",
  });

  const view = await buildAdmissionQueueView();

  assert.equal(view.eventCount, 6);
  assert.equal(view.summary.total, 2);
  assert.equal(view.summary.ready, 1);
  assert.equal(view.summary.divergent, 0);
  assert.equal(view.summary.reconciliationPending, 0);
  assert.equal(view.summary.byState.admitted, 1);
  assert.equal(view.summary.byState.verification_sent, 1);
  assert.equal(view.rows[0].intakeId, "intk_engage");
  assert.equal(view.rows[0].queueEligible, true);
  assert.equal(view.rows[0].state, "admitted");
  assert.equal(view.rows[1].intakeId, "intk_support");
  assert.equal(view.rows[1].queueEligible, false);
  assert.equal(view.rows[1].state, "verification_sent");
});

test("admission queue rebuilds from ledger even when snapshots are missing", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-"));
  applyTestEnv(baseDir);

  await saveIssuance(
    makeIssuance({
      issuanceId: "iss_engage",
      intakeId: "intk_engage",
      status: "verified",
      threadId: "thr_engage",
    }),
  );

  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: "2026-03-29T10:00:00Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: null,
    thread_id: null,
    previous_state: null,
    next_state: "submitted",
    source: "test",
    payload: { email: "security@witnessops.com" },
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFICATION_SENT",
    occurred_at: "2026-03-29T10:01:00Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: "iss_engage",
    thread_id: null,
    previous_state: "submitted",
    next_state: "verification_sent",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFIED",
    occurred_at: "2026-03-29T10:03:00Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: "iss_engage",
    thread_id: null,
    previous_state: "verification_sent",
    next_state: "verified",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_ADMITTED",
    occurred_at: "2026-03-29T10:03:01Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: "iss_engage",
    thread_id: "thr_engage",
    previous_state: "verified",
    next_state: "admitted",
    source: "test",
  });

  const view = await buildAdmissionQueueView();
  const row = view.rows.find((entry) => entry.intakeId === "intk_engage");

  assert.ok(row);
  assert.equal(row.state, "admitted");
  assert.equal(row.queueEligible, true);
  assert.equal(row.hasDivergence, true);
  assert.equal(row.reconciliationPending, false);
  assert.match(row.divergenceReasons.join(" | "), /missing intake snapshot/);
});

test("admission queue surfaces snapshot and ledger disagreement", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-"));
  applyTestEnv(baseDir);

  await saveIntake(
    makeIntake({
      intakeId: "intk_engage",
      state: "verification_sent",
      latestIssuanceId: "iss_engage",
      threadId: null,
    }),
  );
  await saveIssuance(
    makeIssuance({
      issuanceId: "iss_engage",
      intakeId: "intk_engage",
      status: "issued",
      threadId: null,
    }),
  );

  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: "2026-03-29T10:00:00Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: null,
    thread_id: null,
    previous_state: null,
    next_state: "submitted",
    source: "test",
    payload: { email: "security@witnessops.com" },
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFICATION_SENT",
    occurred_at: "2026-03-29T10:01:00Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: "iss_engage",
    thread_id: null,
    previous_state: "submitted",
    next_state: "verification_sent",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFIED",
    occurred_at: "2026-03-29T10:03:00Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: "iss_engage",
    thread_id: null,
    previous_state: "verification_sent",
    next_state: "verified",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_ADMITTED",
    occurred_at: "2026-03-29T10:03:01Z",
    channel: "engage",
    intake_id: "intk_engage",
    issuance_id: "iss_engage",
    thread_id: "thr_engage",
    previous_state: "verified",
    next_state: "admitted",
    source: "test",
  });

  const view = await buildAdmissionQueueView();
  const row = view.rows.find((entry) => entry.intakeId === "intk_engage");

  assert.ok(row);
  assert.equal(row.hasDivergence, true);
  assert.match(
    row.divergenceReasons.join(" | "),
    /snapshot state verification_sent does not match ledger state admitted/,
  );
  assert.match(
    row.divergenceReasons.join(" | "),
    /issuance status issued does not satisfy admitted ledger state/,
  );
  assert.equal(row.reconciliationPending, false);
});

test("admission queue keeps accepted downstream provider outcomes separate from responded state", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-"));
  applyTestEnv(baseDir);

  await saveIntake(
    makeIntake({
      intakeId: "intk_provider_outcome",
      state: "admitted",
      updatedAt: "2026-03-29T10:06:00Z",
      latestIssuanceId: "iss_provider_outcome",
      threadId: "thr_provider_outcome",
      firstResponse: {
        deliveryAttemptId: "rsp_provider_outcome",
        subject: "Re: provider outcome",
        bodyDigest: "sha256:provider-outcome",
        actor: "local-dev",
        actorAuthSource: "local_bypass",
        actorSessionHash: null,
        mailbox: "engage@witnessops.com",
        provider: "file",
        providerMessageId: "msg_provider_outcome",
        deliveredAt: "2026-03-29T10:05:00Z",
      },
      respondedAt: "2026-03-29T10:05:00Z",
      responseProviderOutcome: {
        status: "accepted",
        observedAt: "2026-03-29T10:06:00Z",
        provider: "file",
        providerEventId: "evt_provider_outcome",
        providerMessageId: "msg_provider_outcome",
        deliveryAttemptId: "rsp_provider_outcome",
        source: "provider_webhook",
        rawEventType: "message.accepted",
        detail: "Provider accepted the reply downstream.",
      },
    }),
  );
  await saveIssuance(
    makeIssuance({
      issuanceId: "iss_provider_outcome",
      intakeId: "intk_provider_outcome",
      status: "verified",
      threadId: "thr_provider_outcome",
    }),
  );

  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: "2026-03-29T10:00:00Z",
    channel: "engage",
    intake_id: "intk_provider_outcome",
    issuance_id: null,
    thread_id: null,
    previous_state: null,
    next_state: "submitted",
    source: "test",
    payload: { email: "security@witnessops.com" },
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFICATION_SENT",
    occurred_at: "2026-03-29T10:01:00Z",
    channel: "engage",
    intake_id: "intk_provider_outcome",
    issuance_id: "iss_provider_outcome",
    thread_id: null,
    previous_state: "submitted",
    next_state: "verification_sent",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFIED",
    occurred_at: "2026-03-29T10:03:00Z",
    channel: "engage",
    intake_id: "intk_provider_outcome",
    issuance_id: "iss_provider_outcome",
    thread_id: null,
    previous_state: "verification_sent",
    next_state: "verified",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_ADMITTED",
    occurred_at: "2026-03-29T10:03:01Z",
    channel: "engage",
    intake_id: "intk_provider_outcome",
    issuance_id: "iss_provider_outcome",
    thread_id: "thr_provider_outcome",
    previous_state: "verified",
    next_state: "admitted",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED",
    occurred_at: "2026-03-29T10:06:00Z",
    channel: "engage",
    intake_id: "intk_provider_outcome",
    issuance_id: "iss_provider_outcome",
    thread_id: "thr_provider_outcome",
    previous_state: "admitted",
    next_state: "admitted",
    source: "test",
    payload: {
      provider: "file",
      providerEventId: "evt_provider_outcome",
      providerMessageId: "msg_provider_outcome",
      deliveryAttemptId: "rsp_provider_outcome",
      outcome: "accepted",
      source: "provider_webhook",
      rawEventType: "message.accepted",
      detail: "Provider accepted the reply downstream.",
    },
  });

  const view = await buildAdmissionQueueView();
  const row = view.rows.find(
    (entry) => entry.intakeId === "intk_provider_outcome",
  );

  assert.ok(row);
  assert.equal(row.state, "admitted");
  assert.equal(row.responseProviderOutcomeStatus, "accepted");
  assert.equal(row.responseProviderOutcomeEventId, "evt_provider_outcome");
  assert.equal(row.responseProviderOutcomeSource, "provider_webhook");
  assert.equal(row.responseProviderOutcomeRawEventType, "message.accepted");
  assert.equal(
    row.responseProviderOutcomeDetail,
    "Provider accepted the reply downstream.",
  );
  assert.equal(row.reconciliationPending, true);
});

test("admission queue auto resolves ambiguity when strong downstream provider evidence arrives", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-"));
  applyTestEnv(baseDir);

  await saveIntake(
    makeIntake({
      intakeId: "intk_provider_auto_resolve",
      state: "admitted",
      updatedAt: "2026-03-29T10:06:00Z",
      latestIssuanceId: "iss_provider_auto_resolve",
      threadId: "thr_provider_auto_resolve",
      firstResponse: {
        deliveryAttemptId: "rsp_provider_auto_resolve",
        subject: "Re: auto resolve",
        bodyDigest: "sha256:provider-auto-resolve",
        actor: "local-dev",
        actorAuthSource: "local_bypass",
        actorSessionHash: null,
        mailbox: "engage@witnessops.com",
        provider: "resend",
        providerMessageId: "re_provider_auto_resolve",
        deliveredAt: "2026-03-29T10:05:00Z",
      },
      respondedAt: "2026-03-29T10:05:00Z",
      responseProviderOutcome: {
        status: "delivered",
        observedAt: "2026-03-29T10:06:00Z",
        provider: "resend",
        providerEventId: "evt_provider_auto_resolve",
        providerMessageId: "re_provider_auto_resolve",
        deliveryAttemptId: "rsp_provider_auto_resolve",
        source: "provider_webhook",
        rawEventType: "email.delivered",
        detail: "Resend confirmed downstream delivery.",
      },
    }),
  );
  await saveIssuance(
    makeIssuance({
      issuanceId: "iss_provider_auto_resolve",
      intakeId: "intk_provider_auto_resolve",
      status: "verified",
      threadId: "thr_provider_auto_resolve",
    }),
  );

  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: "2026-03-29T10:00:00Z",
    channel: "engage",
    intake_id: "intk_provider_auto_resolve",
    issuance_id: null,
    thread_id: null,
    previous_state: null,
    next_state: "submitted",
    source: "test",
    payload: { email: "security@witnessops.com" },
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFICATION_SENT",
    occurred_at: "2026-03-29T10:01:00Z",
    channel: "engage",
    intake_id: "intk_provider_auto_resolve",
    issuance_id: "iss_provider_auto_resolve",
    thread_id: null,
    previous_state: "submitted",
    next_state: "verification_sent",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFIED",
    occurred_at: "2026-03-29T10:03:00Z",
    channel: "engage",
    intake_id: "intk_provider_auto_resolve",
    issuance_id: "iss_provider_auto_resolve",
    thread_id: null,
    previous_state: "verification_sent",
    next_state: "verified",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_ADMITTED",
    occurred_at: "2026-03-29T10:03:01Z",
    channel: "engage",
    intake_id: "intk_provider_auto_resolve",
    issuance_id: "iss_provider_auto_resolve",
    thread_id: "thr_provider_auto_resolve",
    previous_state: "verified",
    next_state: "admitted",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED",
    occurred_at: "2026-03-29T10:06:00Z",
    channel: "engage",
    intake_id: "intk_provider_auto_resolve",
    issuance_id: "iss_provider_auto_resolve",
    thread_id: "thr_provider_auto_resolve",
    previous_state: "admitted",
    next_state: "admitted",
    source: "test",
    payload: {
      provider: "resend",
      providerEventId: "evt_provider_auto_resolve",
      providerMessageId: "re_provider_auto_resolve",
      deliveryAttemptId: "rsp_provider_auto_resolve",
      outcome: "delivered",
      source: "provider_webhook",
      rawEventType: "email.delivered",
      detail: "Resend confirmed downstream delivery.",
    },
  });

  const view = await buildAdmissionQueueView();
  const row = view.rows.find(
    (entry) => entry.intakeId === "intk_provider_auto_resolve",
  );

  assert.ok(row);
  assert.equal(row.reconciliationPending, false);
  assert.equal(row.reconciliationResolved, true);
  assert.equal(row.ambiguityResolutionKind, "provider_outcome");
  assert.equal(row.ambiguityResolvedAt, "2026-03-29T10:06:00Z");
  assert.equal(
    row.reconciliationSubcase,
    "closed_after_strong_provider_outcome",
  );
});

test("admission queue replays ledger in append order instead of timestamp order", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-"));
  applyTestEnv(baseDir);

  await saveIntake(
    makeIntake({
      intakeId: "intk_ordered",
      channel: "support",
      email: "operator@gmail.com",
      state: "responded",
      latestIssuanceId: "iss_ordered",
      threadId: "thr_ordered",
      respondedAt: "2026-03-29T09:00:00Z",
      firstResponse: {
        deliveryAttemptId: "rsp_ordered",
        subject: "Re: ordered",
        bodyDigest: "sha256:ordered",
        actor: "admin:test",
        mailbox: "support@witnessops.com",
        provider: "file",
        providerMessageId: "msg_ordered",
        deliveredAt: "2026-03-29T09:00:00Z",
      },
    }),
  );
  await saveIssuance(
    makeIssuance({
      issuanceId: "iss_ordered",
      intakeId: "intk_ordered",
      channel: "support",
      email: "operator@gmail.com",
      status: "verified",
      threadId: "thr_ordered",
    }),
  );

  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: "2026-03-29T10:00:00Z",
    channel: "support",
    intake_id: "intk_ordered",
    issuance_id: null,
    thread_id: null,
    previous_state: null,
    next_state: "submitted",
    source: "test",
    payload: { email: "operator@gmail.com" },
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFICATION_SENT",
    occurred_at: "2026-03-29T10:01:00Z",
    channel: "support",
    intake_id: "intk_ordered",
    issuance_id: "iss_ordered",
    thread_id: null,
    previous_state: "submitted",
    next_state: "verification_sent",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFIED",
    occurred_at: "2026-03-29T10:02:00Z",
    channel: "support",
    intake_id: "intk_ordered",
    issuance_id: "iss_ordered",
    thread_id: null,
    previous_state: "verification_sent",
    next_state: "verified",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_ADMITTED",
    occurred_at: "2026-03-29T10:03:00Z",
    channel: "support",
    intake_id: "intk_ordered",
    issuance_id: "iss_ordered",
    thread_id: "thr_ordered",
    previous_state: "verified",
    next_state: "admitted",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_RESPONDED",
    occurred_at: "2026-03-29T09:00:00Z",
    channel: "support",
    intake_id: "intk_ordered",
    issuance_id: "iss_ordered",
    thread_id: "thr_ordered",
    previous_state: "admitted",
    next_state: "responded",
    source: "test",
  });

  const view = await buildAdmissionQueueView();
  const row = view.rows.find((entry) => entry.intakeId === "intk_ordered");

  assert.ok(row);
  assert.equal(row.state, "responded");
  assert.equal(row.queueEligible, false);
  assert.equal(row.hasDivergence, false);
  assert.equal(row.responseDeliveryAttemptId, "rsp_ordered");
  assert.equal(row.reconciliationPending, false);
});

test("admission queue reports reconciliation debt when response metadata exists without ledger confirmation", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-queue-"));
  applyTestEnv(baseDir);

  await saveIntake(
    makeIntake({
      intakeId: "intk_reconcile",
      channel: "support",
      email: "operator@gmail.com",
      state: "responded",
      latestIssuanceId: "iss_reconcile",
      threadId: "thr_reconcile",
      respondedAt: "2026-03-29T11:05:00Z",
      firstResponse: {
        deliveryAttemptId: "rsp_reconcile",
        subject: "Re: reconciliation",
        bodyDigest: "sha256:reconcile",
        actor: "admin:demo",
        mailbox: "support@witnessops.com",
        provider: "file",
        providerMessageId: "msg_reconcile",
        deliveredAt: "2026-03-29T11:05:00Z",
      },
    }),
  );
  await saveIssuance(
    makeIssuance({
      issuanceId: "iss_reconcile",
      intakeId: "intk_reconcile",
      channel: "support",
      email: "operator@gmail.com",
      status: "verified",
      threadId: "thr_reconcile",
    }),
  );

  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: "2026-03-29T11:00:00Z",
    channel: "support",
    intake_id: "intk_reconcile",
    issuance_id: null,
    thread_id: null,
    previous_state: null,
    next_state: "submitted",
    source: "test",
    payload: { email: "operator@gmail.com" },
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFICATION_SENT",
    occurred_at: "2026-03-29T11:01:00Z",
    channel: "support",
    intake_id: "intk_reconcile",
    issuance_id: "iss_reconcile",
    thread_id: null,
    previous_state: "submitted",
    next_state: "verification_sent",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFIED",
    occurred_at: "2026-03-29T11:02:00Z",
    channel: "support",
    intake_id: "intk_reconcile",
    issuance_id: "iss_reconcile",
    thread_id: null,
    previous_state: "verification_sent",
    next_state: "verified",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_ADMITTED",
    occurred_at: "2026-03-29T11:03:00Z",
    channel: "support",
    intake_id: "intk_reconcile",
    issuance_id: "iss_reconcile",
    thread_id: "thr_reconcile",
    previous_state: "verified",
    next_state: "admitted",
    source: "test",
  });

  const view = await buildAdmissionQueueView();
  const row = view.rows.find((entry) => entry.intakeId === "intk_reconcile");

  assert.ok(row);
  assert.equal(view.summary.reconciliationPending, 1);
  assert.equal(row.reconciliationPending, true);
  assert.equal(row.responseActor, "admin:demo");
  assert.equal(row.responseMailbox, "support@witnessops.com");
  assert.equal(row.responseProvider, "file");
  assert.equal(row.responseProviderMessageId, "msg_reconcile");
  assert.equal(row.responseDeliveryAttemptId, "rsp_reconcile");
  assert.equal(
    row.responseEvidenceSubcase,
    "local_attempt_recorded_provider_outcome_unknown",
  );
  assert.equal(
    row.reconciliationSubcase,
    "local_attempt_recorded_provider_outcome_unknown",
  );
  assert.match(
    row.divergenceReasons.join(" | "),
    /response delivery metadata exists without matching INTAKE_RESPONDED ledger state/,
  );
});
