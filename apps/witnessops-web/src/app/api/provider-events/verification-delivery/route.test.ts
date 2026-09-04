import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";

import { POST } from "./route";
import {
  clearTokenStore,
  getIssuanceById,
  saveIntake,
  saveIssuance,
  type IntakeRecord,
  type TokenIssuanceRecord,
} from "@/lib/server/token-store";

const RESEND_WEBHOOK_SECRET = `whsec_${Buffer.from(
  "verification-delivery-test-secret",
  "utf8",
).toString("base64")}`;

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
  process.env.WITNESSOPS_RESEND_WEBHOOK_SECRET = RESEND_WEBHOOK_SECRET;
}

function buildSvixHeaders(payload: string, eventId: string) {
  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const signingSecret = Buffer.from(
    RESEND_WEBHOOK_SECRET.replace(/^whsec_/, ""),
    "base64",
  );
  const signature = createHmac("sha256", signingSecret)
    .update(`${eventId}.${timestamp}.${payload}`)
    .digest("base64");

  return {
    "svix-id": eventId,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${signature}`,
  };
}

function makeIntake(): IntakeRecord {
  return {
    intakeId: "intk_verification_delivery",
    channel: "engage",
    email: "claimant@example.com",
    state: "verification_sent",
    createdAt: "2026-09-04T10:00:00Z",
    updatedAt: "2026-09-04T10:01:00Z",
    latestIssuanceId: "iss_verification_delivery",
    threadId: null,
    submission: {},
  };
}

function makeIssuance(
  overrides?: Partial<TokenIssuanceRecord>,
): TokenIssuanceRecord {
  return {
    issuanceId: "iss_verification_delivery",
    intakeId: "intk_verification_delivery",
    channel: "engage",
    email: "claimant@example.com",
    tokenDigest: "sha256:test-token",
    createdAt: "2026-09-04T10:00:00Z",
    expiresAt: "2026-09-04T10:30:00Z",
    status: "issued",
    delivery: {
      mailbox: "noreply@send.witnessops.com",
      alias: null,
      templateVersion: "tier1-token-v2",
      provider: "resend",
      providerMessageId: "re_verification_delivery",
      providerAcceptedAt: "2026-09-04T10:01:00Z",
      status: "provider_accepted",
      statusObservedAt: "2026-09-04T10:01:00Z",
      providerEventId: null,
      statusDetail: null,
    },
    ...overrides,
  };
}

function resendRequest(
  body: string,
  eventId: string,
): NextRequest {
  return new NextRequest(
    "http://localhost:3001/api/provider-events/verification-delivery",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildSvixHeaders(body, eventId),
      },
      body,
    },
  );
}

async function seed(baseDir: string, issuance?: Partial<TokenIssuanceRecord>) {
  applyTestEnv(baseDir);
  await saveIntake(makeIntake());
  await saveIssuance(makeIssuance(issuance));
}

function deliveryBody(args: {
  type: string;
  createdAt: string;
  emailId?: string;
  detail?: Record<string, unknown>;
}): string {
  return JSON.stringify({
    type: args.type,
    created_at: args.createdAt,
    data: {
      email_id: args.emailId ?? "re_verification_delivery",
      ...args.detail,
    },
  });
}

afterEach(async () => {
  await clearTokenStore();
  delete process.env.WITNESSOPS_TOKEN_STORE_DIR;
  delete process.env.WITNESSOPS_TOKEN_AUDIT_DIR;
  delete process.env.WITNESSOPS_RESEND_WEBHOOK_SECRET;
});

test("records signed Resend delivery status against the MFA issuance", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-verification-delivery-"),
  );
  await seed(baseDir);
  const body = deliveryBody({
    type: "email.delivered",
    createdAt: "2026-09-04T10:02:00Z",
  });

  const response = await POST(resendRequest(body, "evt_verification_delivered"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "recorded",
    issuanceId: "iss_verification_delivery",
    provider: "resend",
    providerEventId: "evt_verification_delivered",
    providerMessageId: "re_verification_delivery",
    deliveryStatus: "delivered",
    statusObservedAt: "2026-09-04T10:02:00Z",
    observedAt: "2026-09-04T10:02:00Z",
    rawEventType: "email.delivered",
  });

  const issuance = await getIssuanceById("iss_verification_delivery");
  assert.equal(issuance?.delivery.status, "delivered");
  assert.equal(issuance?.delivery.providerEventId, "evt_verification_delivered");
  assert.equal(issuance?.delivery.providerAcceptedAt, "2026-09-04T10:01:00Z");

  const eventLog = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  assert.match(
    eventLog,
    /"event_type":"INTAKE_VERIFICATION_DELIVERY_UPDATED"/,
  );
  assert.match(eventLog, /"effectiveStatus":"delivered"/);
  assert.doesNotMatch(eventLog, /claimant@example\.com|token/i);
});

test("is idempotent for a Resend replay and rejects event-ID reuse across issuances", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-verification-delivery-replay-"),
  );
  await seed(baseDir);
  const body = deliveryBody({
    type: "email.delivered",
    createdAt: "2026-09-04T10:02:00Z",
  });
  const request = () => POST(resendRequest(body, "evt_verification_replay"));

  assert.equal((await request()).status, 200);
  const replay = await request();
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).status, "already_recorded");

  const eventLog = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  assert.equal(
    eventLog
      .trim()
      .split("\n")
      .filter((line) =>
        line.includes('"event_type":"INTAKE_VERIFICATION_DELIVERY_UPDATED"'),
      ).length,
    1,
  );
});

test("an older delayed event cannot regress a newer delivered status", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-verification-delivery-order-"),
  );
  await seed(baseDir);
  const deliveredBody = deliveryBody({
    type: "email.delivered",
    createdAt: "2026-09-04T10:03:00Z",
  });
  const delayedBody = deliveryBody({
    type: "email.delivery_delayed",
    createdAt: "2026-09-04T10:02:00Z",
  });

  assert.equal(
    (await POST(resendRequest(deliveredBody, "evt_verification_newer"))).status,
    200,
  );
  const older = await POST(
    resendRequest(delayedBody, "evt_verification_older"),
  );
  assert.equal(older.status, 200);
  assert.equal((await older.json()).deliveryStatus, "delivered");

  const issuance = await getIssuanceById("iss_verification_delivery");
  assert.equal(issuance?.delivery.status, "delivered");
  assert.equal(
    issuance?.delivery.providerEventId,
    "evt_verification_newer",
  );
});

test("maps bounce and suppression events without exposing message content", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-verification-delivery-failure-"),
  );
  await seed(baseDir);
  const bounceBody = deliveryBody({
    type: "email.bounced",
    createdAt: "2026-09-04T10:02:00Z",
    detail: {
      bounce: {
        type: "Permanent",
        subType: "General",
        message: "recipient server rejected the message",
      },
    },
  });

  const bounce = await POST(resendRequest(bounceBody, "evt_verification_bounce"));
  assert.equal(bounce.status, 200);
  assert.equal((await bounce.json()).deliveryStatus, "bounced");

  const suppressionBody = deliveryBody({
    type: "email.suppressed",
    createdAt: "2026-09-04T10:03:00Z",
    detail: { suppressed: { reason: "previous hard bounce" } },
  });
  const suppression = await POST(
    resendRequest(suppressionBody, "evt_verification_suppressed"),
  );
  assert.equal(suppression.status, 200);
  assert.equal((await suppression.json()).deliveryStatus, "suppressed");

  const issuance = await getIssuanceById("iss_verification_delivery");
  assert.equal(issuance?.delivery.status, "suppressed");
  assert.match(issuance?.delivery.statusDetail ?? "", /previous hard bounce/);
  assert.doesNotMatch(issuance?.delivery.statusDetail ?? "", /token|code/i);
});

test("requires a valid Resend signature and ignores unrelated signed events", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-verification-delivery-auth-"),
  );
  await seed(baseDir);
  const body = deliveryBody({
    type: "email.opened",
    createdAt: "2026-09-04T10:02:00Z",
  });

  const ignored = await POST(resendRequest(body, "evt_verification_opened"));
  assert.equal(ignored.status, 202);
  assert.equal((await ignored.json()).status, "ignored");

  const invalid = await POST(
    new NextRequest(
      "http://localhost:3001/api/provider-events/verification-delivery",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "svix-id": "evt_invalid",
          "svix-timestamp": `${Math.floor(Date.now() / 1000)}`,
          "svix-signature": "v1,invalid",
        },
        body,
      },
    ),
  );
  assert.equal(invalid.status, 401);
  assert.deepEqual(await invalid.json(), {
    ok: false,
    error: "Unauthorized provider event source.",
  });
});
