import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
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

import { POST } from "./route";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
  process.env.WITNESSOPS_PROVIDER_EVENT_SECRET = "provider-secret";
}

function buildSvixHeaders(payload: string, secret: string) {
  const messageId = "msg_resend_provider_outcome";
  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const signingSecret = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signature = createHmac("sha256", signingSecret)
    .update(`${messageId}.${timestamp}.${payload}`)
    .digest("base64");

  return {
    "svix-id": messageId,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${signature}`,
  };
}

function makeIntake(overrides: Partial<IntakeRecord>): IntakeRecord {
  return {
    intakeId: "intk_provider_outcome",
    channel: "support",
    email: "operator@gmail.com",
    state: "admitted",
    createdAt: "2026-03-29T11:00:00Z",
    updatedAt: "2026-03-29T11:05:00Z",
    latestIssuanceId: "iss_provider_outcome",
    threadId: "thr_provider_outcome",
    submission: {
      category: "receipt",
      severity: "general",
      message: "Need help verifying a receipt.",
    },
    firstResponse: {
      deliveryAttemptId: "rsp_provider_outcome",
      subject: "Re: provider outcome",
      bodyDigest: "sha256:provider-outcome",
      actor: "local-dev",
      actorAuthSource: "local_bypass",
      actorSessionHash: null,
      mailbox: "support@witnessops.com",
      provider: "file",
      providerMessageId: "msg_provider_outcome",
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
    issuanceId: "iss_provider_outcome",
    intakeId: "intk_provider_outcome",
    channel: "support",
    email: "operator@gmail.com",
    tokenDigest: "sha256:test",
    createdAt: "2026-03-29T11:00:00Z",
    expiresAt: "2026-03-29T11:15:00Z",
    status: "verified",
    threadId: "thr_provider_outcome",
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

async function seedProviderOutcomeCase(args?: {
  intake?: Partial<IntakeRecord>;
  issuance?: Partial<TokenIssuanceRecord>;
}) {
  await saveIntake(makeIntake(args?.intake ?? {}));
  await saveIssuance(makeIssuance(args?.issuance ?? {}));

  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: "2026-03-29T11:00:00Z",
    channel: "support",
    intake_id: "intk_provider_outcome",
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
    intake_id: "intk_provider_outcome",
    issuance_id: "iss_provider_outcome",
    thread_id: null,
    previous_state: "submitted",
    next_state: "verification_sent",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_VERIFIED",
    occurred_at: "2026-03-29T11:02:00Z",
    channel: "support",
    intake_id: "intk_provider_outcome",
    issuance_id: "iss_provider_outcome",
    thread_id: null,
    previous_state: "verification_sent",
    next_state: "verified",
    source: "test",
  });
  await appendIntakeEvent({
    event_type: "INTAKE_ADMITTED",
    occurred_at: "2026-03-29T11:03:00Z",
    channel: "support",
    intake_id: "intk_provider_outcome",
    issuance_id: "iss_provider_outcome",
    thread_id: "thr_provider_outcome",
    previous_state: "verified",
    next_state: "admitted",
    source: "test",
  });
}

afterEach(async () => {
  await clearTokenStore();
  delete process.env.WITNESSOPS_PROVIDER_EVENT_SECRET;
  delete process.env.WITNESSOPS_RESEND_WEBHOOK_SECRET;
});

test("provider outcome route records downstream evidence against an existing response attempt", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-provider-outcome-"),
  );
  applyTestEnv(baseDir);
  await seedProviderOutcomeCase();

  const response = await POST(
    new NextRequest(
      "http://localhost:3001/api/provider-events/response-outcome",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-witnessops-provider-secret": "provider-secret",
        },
        body: JSON.stringify({
          provider: "file",
          providerEventId: "evt_provider_outcome_1",
          providerMessageId: "msg_provider_outcome",
          outcome: "delivered",
          observedAt: "2026-03-29T11:06:00Z",
          source: "provider_webhook",
          rawEventType: "message.delivered",
          detail: "Provider reported final downstream delivery.",
        }),
      },
    ),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    status: string;
    intakeId: string;
    deliveryAttemptId: string;
    outcome: string;
    source: string;
  };
  assert.equal(payload.status, "recorded");
  assert.equal(payload.intakeId, "intk_provider_outcome");
  assert.equal(payload.deliveryAttemptId, "rsp_provider_outcome");
  assert.equal(payload.outcome, "delivered");
  assert.equal(payload.source, "provider_webhook");

  const intakeRaw = await readFile(
    path.join(
      process.env.WITNESSOPS_TOKEN_STORE_DIR!,
      "intakes",
      "intk_provider_outcome.json",
    ),
    "utf8",
  );
  assert.match(intakeRaw, /"responseProviderOutcome"/);
  assert.match(intakeRaw, /"status":\s*"delivered"/);
  assert.match(intakeRaw, /"providerEventId":\s*"evt_provider_outcome_1"/);

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  assert.match(
    eventLogRaw,
    /"event_type":"INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED"/,
  );
  assert.match(eventLogRaw, /"providerEventId":"evt_provider_outcome_1"/);
});

test("provider outcome route is idempotent for the same provider event id", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-provider-outcome-"),
  );
  applyTestEnv(baseDir);
  await seedProviderOutcomeCase();

  const request = () =>
    POST(
      new NextRequest(
        "http://localhost:3001/api/provider-events/response-outcome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-witnessops-provider-secret": "provider-secret",
          },
          body: JSON.stringify({
            provider: "file",
            providerEventId: "evt_provider_outcome_1",
            deliveryAttemptId: "rsp_provider_outcome",
            outcome: "accepted",
            observedAt: "2026-03-29T11:06:00Z",
            source: "provider_webhook",
            rawEventType: "message.accepted",
          }),
        },
      ),
    );

  const first = await request();
  assert.equal(first.status, 200);

  const second = await request();
  assert.equal(second.status, 200);
  const payload = (await second.json()) as { status: string };
  assert.equal(payload.status, "already_recorded");

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  const outcomeEvents = eventLogRaw
    .trim()
    .split("\n")
    .filter((line) =>
      line.includes('"event_type":"INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED"'),
    );
  assert.equal(outcomeEvents.length, 1);
});

test("provider outcome route rejects unauthorized event sources", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-provider-outcome-"),
  );
  applyTestEnv(baseDir);
  await seedProviderOutcomeCase();

  const response = await POST(
    new NextRequest(
      "http://localhost:3001/api/provider-events/response-outcome",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-witnessops-provider-secret": "wrong-secret",
        },
        body: JSON.stringify({
          provider: "file",
          providerEventId: "evt_provider_outcome_unauthorized",
          deliveryAttemptId: "rsp_provider_outcome",
          outcome: "accepted",
          observedAt: "2026-03-29T11:06:00Z",
          source: "provider_webhook",
          rawEventType: "message.accepted",
        }),
      },
    ),
  );

  assert.equal(response.status, 401);
});

test("provider outcome route verifies and adapts Resend webhook events", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-provider-outcome-"),
  );
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from(
    "resend-webhook-secret",
    "utf8",
  ).toString("base64")}`;
  await seedProviderOutcomeCase({
    intake: {
      firstResponse: {
        deliveryAttemptId: "rsp_provider_outcome",
        subject: "Re: provider outcome",
        bodyDigest: "sha256:provider-outcome",
        actor: "local-dev",
        actorAuthSource: "local_bypass",
        actorSessionHash: null,
        mailbox: "support@witnessops.com",
        provider: "resend",
        providerMessageId: "re_provider_outcome",
        deliveredAt: "2026-03-29T11:05:00Z",
      },
    },
    issuance: {
      delivery: {
        mailbox: "support@witnessops.com",
        alias: null,
        templateVersion: "tier1-token-v2",
        provider: "resend",
        providerMessageId: null,
        deliveredAt: "2026-03-29T11:01:00Z",
      },
    },
  });

  const body = JSON.stringify({
    type: "email.delivered",
    created_at: "2026-03-29T11:06:00Z",
    data: {
      created_at: "2026-03-29T11:05:59.000000+00:00",
      email_id: "re_provider_outcome",
      from: "WitnessOps <support@witnessops.com>",
      to: ["operator@gmail.com"],
      subject: "Re: provider outcome",
    },
  });

  const response = await POST(
    new NextRequest(
      "http://localhost:3001/api/provider-events/response-outcome",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildSvixHeaders(
            body,
            process.env.WITNESSOPS_RESEND_WEBHOOK_SECRET,
          ),
        },
        body,
      },
    ),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    status: string;
    provider: string;
    providerMessageId: string | null;
    outcome: string;
    rawEventType: string;
  };
  assert.equal(payload.status, "recorded");
  assert.equal(payload.provider, "resend");
  assert.equal(payload.providerMessageId, "re_provider_outcome");
  assert.equal(payload.outcome, "delivered");
  assert.equal(payload.rawEventType, "email.delivered");

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  assert.match(eventLogRaw, /"provider":"resend"/);
  assert.match(eventLogRaw, /"rawEventType":"email.delivered"/);
});

test("provider outcome route rejects invalid Resend signatures", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-provider-outcome-"),
  );
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from(
    "resend-webhook-secret",
    "utf8",
  ).toString("base64")}`;
  await seedProviderOutcomeCase();

  const response = await POST(
    new NextRequest(
      "http://localhost:3001/api/provider-events/response-outcome",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "svix-id": "msg_invalid",
          "svix-timestamp": `${Math.floor(Date.now() / 1000)}`,
          "svix-signature": "v1,invalid",
        },
        body: JSON.stringify({
          type: "email.delivered",
          created_at: "2026-03-29T11:06:00Z",
          data: {
            email_id: "msg_provider_outcome",
          },
        }),
      },
    ),
  );

  assert.equal(response.status, 401);
});

test("provider outcome route ignores verified Resend events that do not map to delivery outcomes", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-provider-outcome-"),
  );
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from(
    "resend-webhook-secret",
    "utf8",
  ).toString("base64")}`;
  await seedProviderOutcomeCase();

  const body = JSON.stringify({
    type: "email.opened",
    created_at: "2026-03-29T11:06:00Z",
    data: {
      email_id: "msg_provider_outcome",
    },
  });

  const response = await POST(
    new NextRequest(
      "http://localhost:3001/api/provider-events/response-outcome",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildSvixHeaders(
            body,
            process.env.WITNESSOPS_RESEND_WEBHOOK_SECRET,
          ),
        },
        body,
      },
    ),
  );

  assert.equal(response.status, 202);
  const payload = (await response.json()) as {
    status: string;
    rawEventType: string;
  };
  assert.equal(payload.status, "ignored");
  assert.equal(payload.rawEventType, "email.opened");

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  const outcomeEvents = eventLogRaw
    .trim()
    .split("\n")
    .filter((line) =>
      line.includes('"event_type":"INTAKE_RESPONSE_PROVIDER_OUTCOME_RECORDED"'),
    );
  assert.equal(outcomeEvents.length, 0);
});
