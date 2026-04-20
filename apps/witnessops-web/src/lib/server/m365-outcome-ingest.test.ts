import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
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

import { POST } from "@/app/api/provider-events/response-outcome/route";
import deliveredFixture from "../../../fixtures/m365/delivered.json";
import bouncedFixture from "../../../fixtures/m365/bounced.json";
import failedFixture from "../../../fixtures/m365/failed.json";

const M365_WEBHOOK_SECRET = "test-m365-hmac-secret";
const PROVIDER_EVENT_SECRET = "test-provider-secret";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
  process.env.WITNESSOPS_M365_WEBHOOK_SECRET = M365_WEBHOOK_SECRET;
  process.env.WITNESSOPS_PROVIDER_EVENT_SECRET = PROVIDER_EVENT_SECRET;
}

function hmac(body: string): string {
  return createHmac("sha256", M365_WEBHOOK_SECRET)
    .update(body, "utf8")
    .digest("hex");
}

function m365Request(payload: unknown): NextRequest {
  const body = JSON.stringify(payload);
  return new NextRequest("http://localhost/api/provider-events/response-outcome", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-witnessops-m365-hmac": hmac(body),
    },
    body,
  });
}

function makeIntake(overrides?: Partial<IntakeRecord>): IntakeRecord {
  return {
    intakeId: "intk_m365_test",
    channel: "engage",
    email: "test@company.com",
    state: "admitted",
    createdAt: "2026-03-29T11:00:00Z",
    updatedAt: "2026-03-29T11:05:00Z",
    latestIssuanceId: "iss_m365_test",
    threadId: "thr_m365_test",
    submission: {
      category: "receipt",
      severity: "general",
      message: "M365 test case.",
    },
    firstResponse: {
      deliveryAttemptId: "rsp_abc123def456",
      subject: "Re: test",
      bodyDigest: "sha256:test",
      actor: "local-dev",
      actorAuthSource: "local_bypass",
      actorSessionHash: null,
      mailbox: "engage@witnessops.com",
      provider: "m365",
      providerMessageId: "<rsp_abc123def456@witnessops.m365>",
      deliveredAt: "2026-03-29T11:05:00Z",
    },
    respondedAt: "2026-03-29T11:05:00Z",
    ...overrides,
  };
}

function makeIssuance(): TokenIssuanceRecord {
  return {
    issuanceId: "iss_m365_test",
    intakeId: "intk_m365_test",
    channel: "engage",
    email: "test@company.com",
    tokenDigest: "sha256:test",
    createdAt: "2026-03-29T11:00:00Z",
    expiresAt: "2026-03-29T11:15:00Z",
    status: "verified",
    threadId: "thr_m365_test",
    delivery: {
      mailbox: "witnessopsno-reply@witnessops.com",
      alias: null,
      templateVersion: "tier1-token-v2",
      provider: "m365",
      providerMessageId: null,
      deliveredAt: "2026-03-29T11:01:00Z",
    },
  };
}

afterEach(async () => {
  await clearTokenStore();
});

test("M365 delivered fixture maps to recorded delivered outcome", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "m365-delivered-"));
  applyTestEnv(baseDir);
  await saveIntake(makeIntake());
  await saveIssuance(makeIssuance());

  const response = await POST(m365Request(deliveredFixture));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "recorded");
  assert.equal(body.outcome, "delivered");
  assert.equal(body.provider, "m365");
  assert.equal(body.providerMessageId, "<rsp_abc123def456@witnessops.m365>");
  assert.equal(body.deliveryAttemptId, "rsp_abc123def456");
  assert.equal(body.intakeId, "intk_m365_test");
});

test("M365 bounced fixture maps to recorded bounced outcome", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "m365-bounced-"));
  applyTestEnv(baseDir);
  await saveIntake(
    makeIntake({
      firstResponse: {
        deliveryAttemptId: "rsp_bounce789",
        subject: "Re: bounce",
        bodyDigest: "sha256:bounce",
        actor: "local-dev",
        actorAuthSource: "local_bypass",
        actorSessionHash: null,
        mailbox: "engage@witnessops.com",
        provider: "m365",
        providerMessageId: "<rsp_bounce789@witnessops.m365>",
        deliveredAt: "2026-03-29T11:05:00Z",
      },
    }),
  );
  await saveIssuance(makeIssuance());

  const response = await POST(m365Request(bouncedFixture));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "recorded");
  assert.equal(body.outcome, "bounced");
  assert.equal(body.provider, "m365");
});

test("M365 failed fixture maps to recorded failed outcome", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "m365-failed-"));
  applyTestEnv(baseDir);
  await saveIntake(
    makeIntake({
      firstResponse: {
        deliveryAttemptId: "rsp_fail456",
        subject: "Re: fail",
        bodyDigest: "sha256:fail",
        actor: "local-dev",
        actorAuthSource: "local_bypass",
        actorSessionHash: null,
        mailbox: "engage@witnessops.com",
        provider: "m365",
        providerMessageId: "<rsp_fail456@witnessops.m365>",
        deliveredAt: "2026-03-29T11:05:00Z",
      },
    }),
  );
  await saveIssuance(makeIssuance());

  const response = await POST(m365Request(failedFixture));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "recorded");
  assert.equal(body.outcome, "failed");
  assert.equal(body.provider, "m365");
});

test("M365 rejects malformed HMAC signature", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "m365-bad-sig-"));
  applyTestEnv(baseDir);

  const body = JSON.stringify(deliveredFixture);
  const request = new NextRequest(
    "http://localhost/api/provider-events/response-outcome",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-witnessops-m365-hmac": "0000000000000000000000000000000000000000000000000000000000000000",
      },
      body,
    },
  );

  const response = await POST(request);
  assert.equal(response.status, 401);
});

test("M365 duplicate event is idempotent", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "m365-dedup-"));
  applyTestEnv(baseDir);
  await saveIntake(makeIntake());
  await saveIssuance(makeIssuance());

  const first = await POST(m365Request(deliveredFixture));
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.status, "recorded");

  const second = await POST(m365Request(deliveredFixture));
  assert.equal(second.status, 200);
  const secondBody = await second.json();
  assert.equal(secondBody.status, "already_recorded");
});

test("M365 correlation uses deterministic internet message id", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "m365-corr-"));
  applyTestEnv(baseDir);

  const attemptId = `rsp_${randomUUID().replace(/-/g, "")}`;
  const internetMsgId = `<${attemptId}@witnessops.m365>`;

  await saveIntake(
    makeIntake({
      firstResponse: {
        deliveryAttemptId: attemptId,
        subject: "Re: corr",
        bodyDigest: "sha256:corr",
        actor: "local-dev",
        actorAuthSource: "local_bypass",
        actorSessionHash: null,
        mailbox: "engage@witnessops.com",
        provider: "m365",
        providerMessageId: internetMsgId,
        deliveredAt: "2026-03-29T11:05:00Z",
      },
    }),
  );
  await saveIssuance(makeIssuance());

  const payload = {
    messageId: internetMsgId,
    status: "delivered",
    observedAt: "2026-03-29T12:10:00Z",
    eventId: `m365-evt-${attemptId}`,
    rawEventType: "MessageTrace.Delivered",
  };

  const response = await POST(m365Request(payload));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "recorded");
  assert.equal(body.providerMessageId, internetMsgId);
  assert.equal(body.intakeId, "intk_m365_test");
});
