import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";

import { clearTokenStore, getIntakeById } from "@/lib/server/token-store";

import { POST as verifyToken } from "../../../verify-token/route";
import { POST as support } from "../../../support/route";
import { POST as reconcile } from "../reconcile/route";
import { POST } from "./route";

const originalFetch = globalThis.fetch;

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";
  process.env.WITNESSOPS_TOKEN_SIGNING_SECRET = "test-secret";
  process.env.WITNESSOPS_TOKEN_TTL_MINUTES = "15";
  process.env.WITNESSOPS_TOKEN_FROM_EMAIL = "support@witnessops.com";
  process.env.WITNESSOPS_VERIFY_BASE_URL = "https://witnessops.com";
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAILBOX_SUPPORT = "engage@mail.witnessops.com";
  process.env.WITNESSOPS_MAILBOX_NOREPLY = "noreply@send.witnessops.com";
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

async function createAdmittedSupportIntake(baseDir: string) {
  applyTestEnv(baseDir);

  const intakeResponse = await support(
    new Request("https://witnessops.com/api/support", {
      method: "POST",
      body: JSON.stringify({
        email: "operator@gmail.com",
        category: "receipt",
        severity: "general",
        message: "Need help verifying a receipt.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  const intakePayload = (await intakeResponse.json()) as {
    intakeId: string;
    issuanceId: string;
    email: string;
  };

  const [mailFile] = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  const verificationMail = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, mailFile),
    "utf8",
  );
  const token = verificationMail.match(/^Verification Code:\s+(.+)$/m)?.[1];
  assert.ok(token);

  const verificationResponse = await verifyToken(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify({
        issuanceId: intakePayload.issuanceId,
        email: intakePayload.email,
        token,
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(verificationResponse.status, 200);
  const verifiedPayload = (await verificationResponse.json()) as {
    intakeId: string;
    threadId: string | null;
    admissionState: string;
  };
  assert.equal(verifiedPayload.admissionState, "admitted");
  assert.ok(verifiedPayload.threadId?.startsWith("thr_"));

  return intakePayload;
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  delete process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
  await clearTokenStore();
});

function reconciliationRequest(intakeId: string): NextRequest {
  return new NextRequest("http://localhost:3001/api/admin/intake/reconcile", {
    method: "POST",
    body: JSON.stringify({
      intakeId,
      evidenceSubcase: "local_attempt_recorded_provider_outcome_unknown",
      note: [
        "Evidence reviewed: Reviewed the durable response attempt identifier, content digest, actor, mailbox, and unresolved send result.",
        "",
        "Why reconcile now: The attempt is durably reserved and the provider outcome is unknown, so a second first response must remain blocked.",
        "",
        "Judgment: Record the ambiguity without claiming delivery and do not resend the first response.",
      ].join("\n"),
    }),
    headers: { "Content-Type": "application/json", host: "localhost:3001" },
  });
}

test("admin respond route sends the first external reply and records responded", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-respond-"));
  const intake = await createAdmittedSupportIntake(baseDir);

  const response = await POST(
    new NextRequest("http://localhost:3001/api/admin/intake/respond", {
      method: "POST",
      body: JSON.stringify({
        intakeId: intake.intakeId,
        subject: "Re: WitnessOps support request",
        body: "We reviewed your receipt and will continue from this thread.",
      }),
      headers: { "Content-Type": "application/json", host: "localhost:3001" },
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    status: string;
    admissionState: string;
    actor: string;
    actorAuthSource: string;
    actorSessionHash: string | null;
    provider: string;
    providerMessageId: string | null;
    deliveryAttemptId: string;
    mailbox: string;
    threadId: string | null;
  };
  assert.equal(payload.status, "sent");
  assert.equal(payload.admissionState, "responded");
  assert.equal(payload.actor, "local-dev");
  assert.equal(payload.actorAuthSource, "local_bypass");
  assert.equal(payload.actorSessionHash, null);
  assert.equal(payload.provider, "file");
  assert.ok(payload.providerMessageId);
  assert.ok(payload.deliveryAttemptId.startsWith("rsp_"));
  assert.equal(payload.mailbox, "engage@mail.witnessops.com");
  assert.ok(payload.threadId?.startsWith("thr_"));

  const intakeRaw = await readFile(
    path.join(
      process.env.WITNESSOPS_TOKEN_STORE_DIR!,
      "intakes",
      `${intake.intakeId}.json`,
    ),
    "utf8",
  );
  assert.match(intakeRaw, /"state":\s*"responded"/);
  assert.match(intakeRaw, /"firstResponse"/);
  assert.match(intakeRaw, /"deliveryAttemptId":\s*"rsp_/);
  assert.match(intakeRaw, /"actor":\s*"local-dev"/);
  assert.match(intakeRaw, /"actorAuthSource":\s*"local_bypass"/);
  assert.match(intakeRaw, /"subject":\s*"Re: WitnessOps support request"/);

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  assert.match(eventLogRaw, /"event_type":"INTAKE_RESPONDED"/);

  const mailFiles = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  assert.equal(mailFiles.length, 3);
  const responseMail = await Promise.all(
    mailFiles.map((file) =>
      readFile(
        path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, file),
        "utf8",
      ),
    ),
  );
  assert.ok(
    responseMail.some((mail) =>
      mail.includes("Subject: Re: WitnessOps support request"),
    ),
  );
});

test("admin respond route is idempotent after the first responded event", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-respond-"));
  const intake = await createAdmittedSupportIntake(baseDir);

  const request = () =>
    POST(
      new NextRequest("http://localhost:3001/api/admin/intake/respond", {
        method: "POST",
        body: JSON.stringify({
          intakeId: intake.intakeId,
          subject: "Re: WitnessOps support request",
          body: "We reviewed your receipt and will continue from this thread.",
        }),
        headers: { "Content-Type": "application/json", host: "localhost:3001" },
      }),
    );

  const first = await request();
  assert.equal(first.status, 200);

  const second = await request();
  assert.equal(second.status, 200);
  const payload = (await second.json()) as {
    status: string;
    actor: string;
    actorAuthSource: string;
    actorSessionHash: string | null;
    deliveryAttemptId: string;
  };
  assert.equal(payload.status, "already_responded");
  assert.equal(payload.actor, "local-dev");
  assert.equal(payload.actorAuthSource, "local_bypass");
  assert.equal(payload.actorSessionHash, null);
  assert.ok(payload.deliveryAttemptId.startsWith("rsp_"));

  const mailFiles = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  assert.equal(mailFiles.length, 3);

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  const respondedEvents = eventLogRaw
    .trim()
    .split("\n")
    .filter((line) => line.includes('"event_type":"INTAKE_RESPONDED"'));
  assert.equal(respondedEvents.length, 1);
});

test("concurrent first responses reserve one provider delivery", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-respond-race-"));
  const intake = await createAdmittedSupportIntake(baseDir);

  const request = () =>
    POST(
      new NextRequest("http://localhost:3001/api/admin/intake/respond", {
        method: "POST",
        body: JSON.stringify({
          intakeId: intake.intakeId,
          subject: "Re: concurrent WitnessOps support request",
          body: "This reply must be delivered exactly once.",
        }),
        headers: { "Content-Type": "application/json", host: "localhost:3001" },
      }),
    );

  const responses = await Promise.all([request(), request()]);
  const payloads = await Promise.all(responses.map((response) => response.json()));
  assert.equal(payloads.filter((payload) => payload.status === "sent").length, 1);
  assert.ok(responses.every((response) => response.status === 200 || response.status === 409));

  const mailFiles = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  assert.equal(mailFiles.length, 3);
  const intakeRaw = await readFile(
    path.join(
      process.env.WITNESSOPS_TOKEN_STORE_DIR!,
      "intakes",
      `${intake.intakeId}.json`,
    ),
    "utf8",
  );
  assert.match(intakeRaw, /"responseAttempt"/);
  assert.match(intakeRaw, /"status":\s*"sent"/);

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  assert.equal(
    eventLogRaw
      .trim()
      .split("\n")
      .filter((line) => line.includes('"event_type":"INTAKE_RESPONDED"'))
      .length,
    1,
  );
});

test("ambiguous provider failure is durable and blocks resend", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-respond-unknown-"));
  const intake = await createAdmittedSupportIntake(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "resend";
  delete process.env.WITNESSOPS_RESEND_API_KEY;

  const request = () =>
    POST(
      new NextRequest("http://localhost:3001/api/admin/intake/respond", {
        method: "POST",
        body: JSON.stringify({
          intakeId: intake.intakeId,
          subject: "Re: unresolved delivery",
          body: "Do not retry this response automatically.",
        }),
        headers: { "Content-Type": "application/json", host: "localhost:3001" },
      }),
    );

  const failed = await request();
  assert.equal(failed.status, 502);
  assert.deepEqual(await failed.json(), {
    ok: false,
    error: "Mail delivery outcome is unresolved; reconcile it before retrying.",
  });

  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  const retry = await request();
  assert.equal(retry.status, 409);
  assert.deepEqual(await retry.json(), {
    ok: false,
    error: "A previous response delivery requires reconciliation. Refusing to resend.",
  });

  const intakeRaw = await readFile(
    path.join(
      process.env.WITNESSOPS_TOKEN_STORE_DIR!,
      "intakes",
      `${intake.intakeId}.json`,
    ),
    "utf8",
  );
  assert.match(intakeRaw, /"status":\s*"needs_reconciliation"/);
  assert.equal((await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!)).length, 2);

  const reconciled = await reconcile(reconciliationRequest(intake.intakeId));
  assert.equal(reconciled.status, 200);
  assert.equal((await reconciled.json()).status, "reconciled");

  const afterReconciliation = await request();
  assert.equal(afterReconciliation.status, 409);
  assert.deepEqual(await afterReconciliation.json(), {
    ok: false,
    error:
      "A previous response delivery was reconciled without durable confirmation. Refusing to resend.",
  });
  assert.equal((await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!)).length, 2);
});

test("manual reconciliation cannot finalize an active provider send", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-respond-live-"));
  const intake = await createAdmittedSupportIntake(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "resend";
  process.env.WITNESSOPS_RESEND_API_KEY = "test-key";

  let releaseProvider!: () => void;
  const providerGate = new Promise<void>((resolve) => {
    releaseProvider = resolve;
  });
  let signalProviderCalled!: () => void;
  const providerCalled = new Promise<void>((resolve) => {
    signalProviderCalled = resolve;
  });
  globalThis.fetch = async () => {
    signalProviderCalled();
    await providerGate;
    return new Response(JSON.stringify({ id: "provider-message-live" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const send = POST(
    new NextRequest("http://localhost:3001/api/admin/intake/respond", {
      method: "POST",
      body: JSON.stringify({
        intakeId: intake.intakeId,
        subject: "Re: active provider delivery",
        body: "The provider call remains active during reconciliation.",
      }),
      headers: { "Content-Type": "application/json", host: "localhost:3001" },
    }),
  );
  await providerCalled;

  const reconciliation = await reconcile(reconciliationRequest(intake.intakeId));
  assert.equal(reconciliation.status, 409);
  assert.deepEqual(await reconciliation.json(), {
    ok: false,
    error:
      "The response delivery attempt is still active or no longer matches this evidence. Reload the queue before reconciling.",
  });

  releaseProvider();
  const sent = await send;
  assert.equal(sent.status, 200);
  assert.equal((await sent.json()).status, "sent");

  const stored = await getIntakeById(intake.intakeId);
  assert.equal(stored?.responseAttempt?.status, "sent");
  assert.equal(stored?.reconciliation, undefined);
  assert.ok(stored?.firstResponse);

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  assert.match(eventLogRaw, /"event_type":"INTAKE_RESPONDED"/);
  assert.doesNotMatch(eventLogRaw, /"event_type":"INTAKE_RESPONSE_RECONCILED"/);
});

test("admin respond route requires admin authentication outside local development", async () => {
  const response = await POST(
    new NextRequest("https://witnessops.com/api/admin/intake/respond", {
      method: "POST",
      body: JSON.stringify({
        intakeId: "intk_missing",
        subject: "Re: test",
        body: "test",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 401);
});
