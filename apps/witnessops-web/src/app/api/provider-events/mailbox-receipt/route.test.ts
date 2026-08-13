import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";

import {
  clearTokenStore,
  saveIntake,
  type IntakeRecord,
} from "@/lib/server/token-store";
import { POST } from "./route";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
  process.env.WITNESSOPS_PROVIDER_EVENT_SECRET = "provider-secret";
}

afterEach(async () => {
  await clearTokenStore();
  delete process.env.WITNESSOPS_PROVIDER_EVENT_SECRET;
});

test("mailbox receipt rejects oversized authenticated bodies before JSON parsing", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-mailbox-receipt-limit-"),
  );
  applyTestEnv(baseDir);

  const response = await POST(
    new NextRequest("http://localhost:3001/api/provider-events/mailbox-receipt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-witnessops-provider-secret": "provider-secret",
      },
      body: JSON.stringify({ padding: "x".repeat(64 * 1024) }),
    }),
  );

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Request body is too large.",
  });
});

test("concurrent mailbox receipt replays record one receipt and one closure", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-mailbox-receipt-race-"),
  );
  applyTestEnv(baseDir);
  const intake: IntakeRecord = {
    intakeId: "intk_mailbox_receipt",
    channel: "engage",
    email: "buyer@example.com",
    state: "admitted",
    createdAt: "2026-03-29T11:00:00Z",
    updatedAt: "2026-03-29T11:05:00Z",
    latestIssuanceId: "iss_mailbox_receipt",
    threadId: "thr_mailbox_receipt",
    submission: {},
    firstResponse: {
      deliveryAttemptId: "rsp_mailbox_receipt",
      subject: "Re: mailbox receipt",
      bodyDigest: "sha256:mailbox-receipt",
      actor: "admin:test",
      actorAuthSource: "local_bypass",
      actorSessionHash: null,
      mailbox: "engage@witnessops.com",
      provider: "file",
      providerMessageId: "msg_mailbox_receipt",
      deliveredAt: "2026-03-29T11:05:00Z",
    },
    respondedAt: "2026-03-29T11:05:00Z",
  };
  await saveIntake(intake);

  const request = () =>
    POST(new NextRequest("http://localhost:3001/api/provider-events/mailbox-receipt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-witnessops-provider-secret": "provider-secret",
      },
      body: JSON.stringify({
        deliveryAttemptId: "rsp_mailbox_receipt",
        providerMessageId: "msg_mailbox_receipt",
        receiptId: "receipt_concurrent",
        status: "delivered",
        observedAt: "2026-03-29T11:06:00Z",
      }),
    }));

  const responses = await Promise.all(Array.from({ length: 8 }, request));
  const statuses = (
    await Promise.all(
      responses.map((response) => response.json() as Promise<{ status: string }>),
    )
  ).map((payload) => payload.status);
  assert.equal(statuses.filter((status) => status === "recorded").length, 1);
  assert.equal(statuses.filter((status) => status === "already_recorded").length, 7);

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  const lines = eventLogRaw.trim().split("\n");
  assert.equal(
    lines.filter((line) => line.includes('"receiptId":"receipt_concurrent"')).length,
    1,
  );
  assert.equal(
    lines.filter((line) =>
      line.includes('"event_type":"INTAKE_AMBIGUITY_CLOSED_BY_POLICY"'),
    ).length,
    1,
  );
});
