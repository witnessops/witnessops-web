import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";

import { appendIntakeEvent } from "@/lib/server/intake-event-ledger";
import {
  clearTokenStore,
  saveIntake,
  saveIssuance,
  type IntakeRecord,
  type TokenIssuanceRecord,
} from "@/lib/server/token-store";

import { GET } from "./route";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

function makeIntake(overrides: Partial<IntakeRecord>): IntakeRecord {
  return {
    intakeId: "intk_report_pending",
    channel: "support",
    email: "operator@gmail.com",
    state: "responded",
    createdAt: "2026-03-29T11:00:00Z",
    updatedAt: "2026-03-29T11:05:00Z",
    latestIssuanceId: "iss_report_pending",
    threadId: "thr_report_pending",
    submission: {
      category: "receipt",
      severity: "general",
      message: "Need help verifying a receipt.",
    },
    firstResponse: {
      deliveryAttemptId: "rsp_report_pending",
      subject: "Re: pending",
      bodyDigest: "sha256:pending",
      actor: "local-dev",
      actorAuthSource: "local_bypass",
      actorSessionHash: null,
      mailbox: "support@witnessops.com",
      provider: "file",
      providerMessageId: "msg_report_pending",
      deliveredAt: "2026-03-29T11:05:00Z",
    },
    respondedAt: "2026-03-29T11:05:00Z",
    ...overrides,
  };
}

function makeIssuance(
  overrides: Partial<TokenIssuanceRecord>,
): TokenIssuanceRecord {
  return {
    issuanceId: "iss_report_pending",
    intakeId: "intk_report_pending",
    channel: "support",
    email: "operator@gmail.com",
    tokenDigest: "sha256:test",
    createdAt: "2026-03-29T11:00:00Z",
    expiresAt: "2026-03-29T11:15:00Z",
    status: "verified",
    threadId: "thr_report_pending",
    delivery: {
      mailbox: "support@witnessops.com",
      alias: null,
      templateVersion: "tier1-token-v2",
      provider: "file",
      providerMessageId: null,
      deliveredAt: "2026-03-29T11:01:00Z",
    },
    ...overrides,
  };
}

async function seedPendingCase() {
  await saveIntake(makeIntake({}));
  await saveIssuance(makeIssuance({}));

  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: "2026-03-29T11:00:00Z",
    channel: "support",
    intake_id: "intk_report_pending",
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
    intake_id: "intk_report_pending",
    issuance_id: "iss_report_pending",
    thread_id: null,
    previous_state: "submitted",
    next_state: "verification_sent",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFIED",
    occurred_at: "2026-03-29T11:02:00Z",
    channel: "support",
    intake_id: "intk_report_pending",
    issuance_id: "iss_report_pending",
    thread_id: null,
    previous_state: "verification_sent",
    next_state: "verified",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_ADMITTED",
    occurred_at: "2026-03-29T11:03:00Z",
    channel: "support",
    intake_id: "intk_report_pending",
    issuance_id: "iss_report_pending",
    thread_id: "thr_report_pending",
    previous_state: "verified",
    next_state: "admitted",
    source: "test",
  });
}

async function seedResolvedCase() {
  await saveIntake(
    makeIntake({
      intakeId: "intk_report_resolved",
      channel: "engage",
      email: "security@witnessops.com",
      createdAt: "2026-03-28T09:00:00Z",
      updatedAt: "2026-03-29T12:00:00Z",
      latestIssuanceId: "iss_report_resolved",
      threadId: "thr_report_resolved",
      firstResponse: {
        deliveryAttemptId: "rsp_report_resolved",
        subject: "Re: resolved",
        bodyDigest: "sha256:resolved",
        actor: "admin:ops",
        actorAuthSource: "session_cookie",
        actorSessionHash: "ops-session",
        mailbox: "engage@witnessops.com",
        provider: "file",
        providerMessageId: "msg_report_resolved",
        deliveredAt: "2026-03-28T09:05:00Z",
      },
      respondedAt: "2026-03-28T09:05:00Z",
      reconciliation: {
        reconciledAt: "2026-03-29T12:00:00Z",
        actor: "admin:ops",
        actorAuthSource: "session_cookie",
        actorSessionHash: "ops-session",
        note: "Reviewed provider evidence and recorded the ambiguity without backfilling responded.",
        evidenceSubcase: "local_attempt_recorded_provider_outcome_unknown",
        notePolicyVersion: "reconciliation_note_v1",
        deliveryAttemptId: "rsp_report_resolved",
        provider: "file",
        providerMessageId: "msg_report_resolved",
        mailbox: "engage@witnessops.com",
      },
    }),
  );
  await saveIssuance(
    makeIssuance({
      issuanceId: "iss_report_resolved",
      intakeId: "intk_report_resolved",
      channel: "engage",
      email: "security@witnessops.com",
      threadId: "thr_report_resolved",
      delivery: {
        mailbox: "engage@witnessops.com",
        alias: null,
        templateVersion: "tier1-token-v2",
        provider: "file",
        providerMessageId: null,
        deliveredAt: "2026-03-28T09:01:00Z",
      },
    }),
  );

  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: "2026-03-28T09:00:00Z",
    channel: "engage",
    intake_id: "intk_report_resolved",
    issuance_id: null,
    thread_id: null,
    previous_state: null,
    next_state: "submitted",
    source: "test",
    payload: { email: "security@witnessops.com" },
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFICATION_SENT",
    occurred_at: "2026-03-28T09:01:00Z",
    channel: "engage",
    intake_id: "intk_report_resolved",
    issuance_id: "iss_report_resolved",
    thread_id: null,
    previous_state: "submitted",
    next_state: "verification_sent",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFIED",
    occurred_at: "2026-03-28T09:02:00Z",
    channel: "engage",
    intake_id: "intk_report_resolved",
    issuance_id: "iss_report_resolved",
    thread_id: null,
    previous_state: "verification_sent",
    next_state: "verified",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_ADMITTED",
    occurred_at: "2026-03-28T09:03:00Z",
    channel: "engage",
    intake_id: "intk_report_resolved",
    issuance_id: "iss_report_resolved",
    thread_id: "thr_report_resolved",
    previous_state: "verified",
    next_state: "admitted",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_RESPONSE_RECONCILED",
    occurred_at: "2026-03-29T12:00:00Z",
    channel: "engage",
    intake_id: "intk_report_resolved",
    issuance_id: "iss_report_resolved",
    thread_id: "thr_report_resolved",
    previous_state: "admitted",
    next_state: "admitted",
    source: "test",
    payload: { deliveryAttemptId: "rsp_report_resolved" },
  });
}

afterEach(async () => {
  delete process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
  await clearTokenStore();
});

test("admin reconciliation report route exports unresolved and resolved ambiguity", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-report-"));
  applyTestEnv(baseDir);
  await seedPendingCase();
  await seedResolvedCase();

  const response = await GET(
    new NextRequest(
      "http://localhost:3001/api/admin/intake/reconciliation-report",
    ),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    pendingTotal: number;
    resolvedTotal: number;
    oldestPendingAt: string | null;
    latestResolvedAt: string | null;
    disclaimer: string;
    byChannel: Array<{ channel: string; pending: number; resolved: number }>;
    bySubcase: Array<{
      subcase: string;
      total: number;
      pending: number;
      resolved: number;
    }>;
    pendingRows: Array<{
      actorAuthSource: string | null;
      actorSessionHash: string | null;
    }>;
    resolvedRows: Array<{
      reconciliationActorAuthSource: string | null;
      reconciliationActorSessionHash: string | null;
      reconciliationEvidenceSubcase: string | null;
      reconciliationNotePolicyVersion: string | null;
    }>;
    timeline: Array<{
      date: string;
      ambiguityStarted: number;
      ambiguityResolved: number;
      openAtClose: number;
    }>;
  };

  assert.equal(payload.pendingTotal, 1);
  assert.equal(payload.resolvedTotal, 1);
  assert.equal(payload.oldestPendingAt, "2026-03-29T11:05:00Z");
  assert.equal(payload.latestResolvedAt, "2026-03-29T12:00:00Z");
  assert.match(payload.disclaimer, /does not prove/i);
  assert.deepEqual(payload.byChannel, [
    { channel: "engage", pending: 0, resolved: 1 },
    { channel: "support", pending: 1, resolved: 0 },
    { channel: "noreply", pending: 0, resolved: 0 },
  ]);
  assert.deepEqual(payload.bySubcase, [
    {
      subcase: "provider_accepted_message_id_present_no_durable_confirmation",
      total: 0,
      pending: 0,
      resolved: 0,
    },
    {
      subcase: "provider_accepted_message_id_missing",
      total: 0,
      pending: 0,
      resolved: 0,
    },
    {
      subcase: "provider_delivery_evidence_incomplete",
      total: 0,
      pending: 0,
      resolved: 0,
    },
    {
      subcase: "local_attempt_recorded_provider_outcome_unknown",
      total: 1,
      pending: 1,
      resolved: 0,
    },
    {
      subcase: "reconciled_after_provider_evidence_review",
      total: 1,
      pending: 0,
      resolved: 1,
    },
    {
      subcase: "closed_after_strong_provider_outcome",
      total: 0,
      pending: 0,
      resolved: 0,
    },
    {
      subcase: "closed_after_strong_mailbox_receipt",
      total: 0,
      pending: 0,
      resolved: 0,
    },
  ]);
  assert.deepEqual(payload.timeline, [
    {
      date: "2026-03-28",
      ambiguityStarted: 1,
      ambiguityResolved: 0,
      openAtClose: 1,
    },
    {
      date: "2026-03-29",
      ambiguityStarted: 1,
      ambiguityResolved: 1,
      openAtClose: 1,
    },
  ]);
  assert.equal(payload.pendingRows[0].actorAuthSource, "local_bypass");
  assert.equal(payload.pendingRows[0].actorSessionHash, null);
  assert.equal(
    payload.resolvedRows[0].reconciliationActorAuthSource,
    "session_cookie",
  );
  assert.equal(
    payload.resolvedRows[0].reconciliationActorSessionHash,
    "ops-session",
  );
  assert.equal(
    payload.resolvedRows[0].reconciliationEvidenceSubcase,
    "local_attempt_recorded_provider_outcome_unknown",
  );
  assert.equal(
    payload.resolvedRows[0].reconciliationNotePolicyVersion,
    "reconciliation_note_v1",
  );
});

test("admin reconciliation report route requires an authenticated admin session outside localhost", async () => {
  const response = await GET(
    new NextRequest(
      "https://witnessops.example/api/admin/intake/reconciliation-report",
    ),
  );

  assert.equal(response.status, 401);
});
