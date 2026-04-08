import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";

import {
  clearTokenStore,
  saveIntake,
  saveIssuance,
  type IntakeRecord,
  type TokenIssuanceRecord,
} from "@/lib/server/token-store";
import { appendIntakeEvent } from "@/lib/server/intake-event-ledger";

import { POST } from "./route";

function buildValidReconciliationNote(): string {
  return [
    "Evidence reviewed: Reviewed the local file-provider EML output, the delivery attempt record, and the stored mailbox context for rsp_reconcile.",
    "",
    "Why reconcile now: The local attempt is durably recorded but the provider outcome remains unknown, so this records operator judgment about ambiguity rather than claiming delivery proof.",
    "",
    "Judgment: Reconcile the ambiguity, preserve the absence of INTAKE_RESPONDED, and continue without resending a second first reply.",
  ].join("\n");
}

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

function makeIntake(overrides: Partial<IntakeRecord>): IntakeRecord {
  return {
    intakeId: "intk_reconcile",
    channel: "support",
    email: "operator@gmail.com",
    state: "responded",
    createdAt: "2026-03-29T11:00:00Z",
    updatedAt: "2026-03-29T11:05:00Z",
    latestIssuanceId: "iss_reconcile",
    threadId: "thr_reconcile",
    submission: {
      category: "receipt",
      severity: "general",
      message: "Need help verifying a receipt.",
    },
    firstResponse: {
      deliveryAttemptId: "rsp_reconcile",
      subject: "Re: reconciliation",
      bodyDigest: "sha256:reconcile",
      actor: "local-dev",
      mailbox: "support@witnessops.com",
      provider: "file",
      providerMessageId: "msg_reconcile",
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
    issuanceId: "iss_reconcile",
    intakeId: "intk_reconcile",
    channel: "support",
    email: "operator@gmail.com",
    tokenDigest: "sha256:test",
    createdAt: "2026-03-29T11:00:00Z",
    expiresAt: "2026-03-29T11:15:00Z",
    status: "verified",
    threadId: "thr_reconcile",
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

async function seedReconciliationCase() {
  await saveIntake(makeIntake({}));
  await saveIssuance(makeIssuance({}));

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
}

afterEach(async () => {
  delete process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
  await clearTokenStore();
});

test("admin reconcile route records a reconciliation fact without backfilling responded", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-reconcile-"),
  );
  applyTestEnv(baseDir);
  await seedReconciliationCase();

  const response = await POST(
    new NextRequest("http://localhost:3001/api/admin/intake/reconcile", {
      method: "POST",
      body: JSON.stringify({
        intakeId: "intk_reconcile",
        evidenceSubcase: "local_attempt_recorded_provider_outcome_unknown",
        note: buildValidReconciliationNote(),
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    status: string;
    actor: string;
    actorAuthSource: string;
    actorSessionHash: string | null;
    deliveryAttemptId: string;
    evidenceSubcase: string;
    notePolicyVersion: string;
    note: string;
  };
  assert.equal(payload.status, "reconciled");
  assert.equal(payload.actor, "local-dev");
  assert.equal(payload.actorAuthSource, "local_bypass");
  assert.equal(payload.actorSessionHash, null);
  assert.equal(payload.deliveryAttemptId, "rsp_reconcile");
  assert.equal(
    payload.evidenceSubcase,
    "local_attempt_recorded_provider_outcome_unknown",
  );
  assert.equal(payload.notePolicyVersion, "reconciliation_note_v1");
  assert.match(payload.note, /Why reconcile now:/);

  const intakeRaw = await readFile(
    path.join(
      process.env.WITNESSOPS_TOKEN_STORE_DIR!,
      "intakes",
      "intk_reconcile.json",
    ),
    "utf8",
  );
  assert.match(intakeRaw, /"reconciliation"/);
  assert.match(intakeRaw, /"actorAuthSource":\s*"local_bypass"/);
  assert.match(
    intakeRaw,
    /"evidenceSubcase":\s*"local_attempt_recorded_provider_outcome_unknown"/,
  );
  assert.match(intakeRaw, /"notePolicyVersion":\s*"reconciliation_note_v1"/);

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  assert.match(eventLogRaw, /"event_type":"INTAKE_RESPONSE_RECONCILED"/);
  assert.doesNotMatch(eventLogRaw, /"event_type":"INTAKE_RESPONDED"/);
});

test("admin reconcile route is idempotent after the reconciliation event exists", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-reconcile-"),
  );
  applyTestEnv(baseDir);
  await seedReconciliationCase();

  const request = () =>
    POST(
      new NextRequest("http://localhost:3001/api/admin/intake/reconcile", {
        method: "POST",
        body: JSON.stringify({
          intakeId: "intk_reconcile",
          evidenceSubcase: "local_attempt_recorded_provider_outcome_unknown",
          note: buildValidReconciliationNote(),
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

  const first = await request();
  assert.equal(first.status, 200);

  const second = await request();
  assert.equal(second.status, 200);
  const payload = (await second.json()) as { status: string };
  assert.equal(payload.status, "already_reconciled");

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  const reconciliationEvents = eventLogRaw
    .trim()
    .split("\n")
    .filter((line) =>
      line.includes('"event_type":"INTAKE_RESPONSE_RECONCILED"'),
    );
  assert.equal(reconciliationEvents.length, 1);
});

test("admin reconcile route rejects when responded is already durably confirmed", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-reconcile-"),
  );
  applyTestEnv(baseDir);
  await seedReconciliationCase();
  await appendIntakeEvent({
    event_type: "INTAKE_RESPONDED",
    occurred_at: "2026-03-29T11:05:00Z",
    channel: "support",
    intake_id: "intk_reconcile",
    issuance_id: "iss_reconcile",
    thread_id: "thr_reconcile",
    previous_state: "admitted",
    next_state: "responded",
    source: "test",
    payload: { deliveryAttemptId: "rsp_reconcile" },
  });

  const response = await POST(
    new NextRequest("http://localhost:3001/api/admin/intake/reconcile", {
      method: "POST",
      body: JSON.stringify({
        intakeId: "intk_reconcile",
        evidenceSubcase: "local_attempt_recorded_provider_outcome_unknown",
        note: "Should fail because responded is already durable.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 409);
});

test("admin reconcile route rejects once strong downstream provider evidence already closes the ambiguity", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-reconcile-"),
  );
  applyTestEnv(baseDir);
  await seedReconciliationCase();
  await saveIntake(
    makeIntake({
      responseProviderOutcome: {
        status: "delivered",
        observedAt: "2026-03-29T11:06:00Z",
        provider: "resend",
        providerEventId: "evt_reconcile_delivered",
        providerMessageId: "msg_reconcile",
        deliveryAttemptId: "rsp_reconcile",
        source: "provider_webhook",
        rawEventType: "email.delivered",
        detail: "Resend confirmed downstream delivery.",
      },
    }),
  );
  await appendIntakeEvent({
    event_type: "INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED",
    occurred_at: "2026-03-29T11:06:00Z",
    channel: "support",
    intake_id: "intk_reconcile",
    issuance_id: "iss_reconcile",
    thread_id: "thr_reconcile",
    previous_state: "admitted",
    next_state: "admitted",
    source: "test",
    payload: {
      provider: "resend",
      providerEventId: "evt_reconcile_delivered",
      providerMessageId: "msg_reconcile",
      deliveryAttemptId: "rsp_reconcile",
      outcome: "delivered",
      source: "provider_webhook",
      rawEventType: "email.delivered",
      detail: "Resend confirmed downstream delivery.",
    },
  });

  const response = await POST(
    new NextRequest("http://localhost:3001/api/admin/intake/reconcile", {
      method: "POST",
      body: JSON.stringify({
        intakeId: "intk_reconcile",
        evidenceSubcase: "local_attempt_recorded_provider_outcome_unknown",
        note: buildValidReconciliationNote(),
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 409);
  const payload = (await response.json()) as { error: string };
  assert.match(payload.error, /strong downstream provider evidence/i);
});

test("admin reconcile route rejects mismatched evidence subcases", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-reconcile-"),
  );
  applyTestEnv(baseDir);
  await seedReconciliationCase();

  const response = await POST(
    new NextRequest("http://localhost:3001/api/admin/intake/reconcile", {
      method: "POST",
      body: JSON.stringify({
        intakeId: "intk_reconcile",
        evidenceSubcase: "provider_delivery_evidence_incomplete",
        note: buildValidReconciliationNote(),
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 409);
  const payload = (await response.json()) as { error: string };
  assert.match(payload.error, /Evidence case mismatch/i);
});

test("admin reconcile route rejects decorative notes that do not satisfy the case policy", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-reconcile-"),
  );
  applyTestEnv(baseDir);
  await seedReconciliationCase();

  const response = await POST(
    new NextRequest("http://localhost:3001/api/admin/intake/reconcile", {
      method: "POST",
      body: JSON.stringify({
        intakeId: "intk_reconcile",
        evidenceSubcase: "local_attempt_recorded_provider_outcome_unknown",
        note: "Reviewed by ops. Looks fine.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { error: string };
  assert.match(
    payload.error,
    /case-aware evidence review|must include completed sections/i,
  );
});
