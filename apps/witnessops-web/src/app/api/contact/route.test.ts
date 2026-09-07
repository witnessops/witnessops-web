import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _resetAllStores } from "@witnessops/config/rate-limit";
import { buildAskAiContactRequest } from "@/components/docs-assistant/docs-assistant-contact-handoff-contract";
import { clearTokenStore, getAllIntakes, getIntakeById } from "@/lib/server/token-store";
import { readIntakeEvents } from "@/lib/server/intake-event-ledger";

import { POST } from "./route";
import { POST as verifyToken } from "../verify-token/route";

const testEnvKeys = [
  "WITNESSOPS_TOKEN_SIGNING_SECRET", "WITNESSOPS_TOKEN_TTL_MINUTES",
  "WITNESSOPS_TOKEN_FROM_EMAIL", "WITNESSOPS_VERIFY_BASE_URL",
  "WITNESSOPS_MAIL_PROVIDER", "WITNESSOPS_MAILBOX_ENGAGE",
  "WITNESSOPS_MAILBOX_NOREPLY", "WITNESSOPS_TOKEN_STORE_DIR",
  "WITNESSOPS_INTAKE_STORE_DIR", "WITNESSOPS_MAIL_OUTPUT_DIR",
  "WITNESSOPS_TOKEN_AUDIT_DIR", "WITNESSOPS_INTAKE_EVENT_DIR",
] as const;
const originalEnv = Object.fromEntries(testEnvKeys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const testDirs: string[] = [];

function applyTestEnv(baseDir: string): void {
  testDirs.push(baseDir);
  _resetAllStores();
  globalThis.fetch = async () => {
    throw new Error("External requests are forbidden in contact intake tests.");
  };
  process.env.WITNESSOPS_TOKEN_SIGNING_SECRET = "test-secret";
  process.env.WITNESSOPS_TOKEN_TTL_MINUTES = "15";
  process.env.WITNESSOPS_TOKEN_FROM_EMAIL = "engage@witnessops.com";
  process.env.WITNESSOPS_VERIFY_BASE_URL = "https://witnessops.com";
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAILBOX_ENGAGE = "engage@witnessops.com";
  process.env.WITNESSOPS_MAILBOX_NOREPLY =
    "witnessopsno-reply@witnessops.com";
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_INTAKE_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
  process.env.WITNESSOPS_INTAKE_EVENT_DIR = path.join(baseDir, "audit");
}

afterEach(async () => {
  await clearTokenStore();
  await Promise.all(testDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  for (const key of testEnvKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  globalThis.fetch = originalFetch;
  _resetAllStores();
});

const askFit = {
  schema: "witnessops.ask.commercial-fit.v1" as const,
  result: "likely" as const,
  intent: "workflow" as const,
  offer_id: "bounded-workflow-review" as const,
  source: "ask" as const,
  offer: null,
  matching_specimen_id: null,
};

function contactRequest(body: unknown): Request {
  return new Request("https://witnessops.com/api/contact", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function verificationRequest(body: unknown): Request {
  return new Request("https://witnessops.com/api/verify-token", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

async function readTestMail(): Promise<string[]> {
  const directory = process.env.WITNESSOPS_MAIL_OUTPUT_DIR!;
  const files = await readdir(directory);
  return Promise.all(files.map((file) => readFile(path.join(directory, file), "utf8")));
}

async function issueAskContact(includeQuestion = false) {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-ask-contact-"));
  applyTestEnv(baseDir);
  const body = buildAskAiContactRequest(
    "buyer@company.example",
    "Review our agent approval step.",
    askFit,
    { includeQuestion, question: "Can you review our billing agent's approval checks?" },
  );
  const response = await POST(contactRequest(body));
  assert.equal(response.status, 201);
  const issued = await response.json() as {
    intakeId: string;
    issuanceId: string;
    email: string;
  };
  const [mail] = await readTestMail();
  const token = mail.match(/^Verification Code:\s+(.+)$/m)?.[1];
  assert.ok(token);
  return { ...issued, token, scope: body.scope };
}

test("contact route issues mailbox verification for review intake", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-contact-"));
  applyTestEnv(baseDir);

  const response = await POST(
    new Request("https://witnessops.com/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "K. Witness",
        email: "operator@company.com",
        org: "Example Co",
        intent: "review",
        scope: "One workflow, handled over email.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    channel: string;
    status: string;
    admissionState: string;
  };
  assert.equal(payload.channel, "engage");
  assert.equal(payload.status, "issued");
  assert.equal(payload.admissionState, "verification_sent");
});

test("contact route redacts upstream issuance errors", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-contact-"));
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "invalid";

  const response = await POST(
    new Request("https://witnessops.com/api/contact", {
      method: "POST",
      body: JSON.stringify({ email: "operator@company.com" }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 500);
  const payload = (await response.json()) as { ok: false; error: string };
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "Unable to issue verification token.");
});

test("Ask follow-up is stored before verification without sharing the question by default", async () => {
  const issued = await issueAskContact();
  const intake = await getIntakeById(issued.intakeId);

  assert.equal(intake?.email, issued.email);
  assert.equal(intake?.state, "verification_sent");
  assert.equal(intake?.submission.intent, "ask-ai-contact");
  assert.equal(intake?.submission.scope, issued.scope);
  assert.match(issued.scope, /Source: ask/);
  assert.match(issued.scope, /Offer: bounded-workflow-review/);
  assert.match(issued.scope, /Visitor note: Review our agent approval step\./);
  assert.match(issued.scope, /Follow-up requested: reply by email/);
  assert.match(issued.scope, /Question sharing: not requested/);
  assert.doesNotMatch(issued.scope, /billing agent|Visitor-approved question:/);
  assert.equal(intake?.operatorNotification, undefined);
  assert.equal((await readTestMail()).length, 1);
  const submitted = (await readIntakeEvents()).find((event) => event.event_type === "INTAKE_SUBMITTED");
  assert.equal(submitted?.source, "api/contact");
});

test("Ask verification notifies the operator once with the approved question and scope", async () => {
  const issued = await issueAskContact(true);
  const before = await getIntakeById(issued.intakeId);
  assert.equal(before?.submission.scope, issued.scope);
  assert.match(issued.scope, /Question sharing: visitor opted in/);
  assert.match(issued.scope, /Visitor-approved question: Can you review our billing agent's approval checks\?/);

  const invalid = await verifyToken(verificationRequest({ ...issued, token: "INVALID-CODE" }));
  assert.equal(invalid.status, 400);
  assert.equal((await getIntakeById(issued.intakeId))?.state, "verification_sent");
  assert.equal((await readTestMail()).length, 1);

  const verified = await verifyToken(verificationRequest(issued));
  assert.equal(verified.status, 200);
  const payload = await verified.json() as { status: string; admissionState: string; requestIntent: string };
  assert.equal(payload.status, "verified");
  assert.equal(payload.admissionState, "admitted");
  assert.equal(payload.requestIntent, "ask-ai-contact");
  const after = await getIntakeById(issued.intakeId);
  assert.ok(after?.verifiedAt);
  assert.ok(after?.threadId);
  assert.equal(after?.operatorNotification?.provider, "file");
  assert.equal(after?.operatorNotification?.replyTo, issued.email);
  const mails = await readTestMail();
  assert.equal(mails.length, 2);
  const notification = mails.find((mail) => mail.includes("Subject: Verified Ask WitnessOps follow-up request:"));
  assert.ok(notification);
  assert.ok(notification.includes(issued.scope));
  assert.match(notification, /^Reply-To: buyer@company\.example$/m);

  const replay = await verifyToken(verificationRequest(issued));
  assert.equal(replay.status, 200);
  assert.equal((await readTestMail()).length, 2);
  const notifications = (await readIntakeEvents()).filter((event) => event.event_type === "INTAKE_OPERATOR_NOTIFICATION_SENT");
  assert.equal(notifications.length, 1);
});

test("Ask notification failure preserves the saved verified request without resending on replay", async () => {
  const issued = await issueAskContact(true);
  process.env.WITNESSOPS_MAIL_PROVIDER = "invalid";

  const verified = await verifyToken(verificationRequest(issued));
  assert.equal(verified.status, 200);
  const intake = await getIntakeById(issued.intakeId);
  assert.equal(intake?.state, "admitted");
  assert.equal(intake?.submission.scope, issued.scope);
  assert.equal(intake?.operatorNotification, undefined);
  assert.equal(intake?.operatorNotificationAttempt?.status, "failed");
  assert.equal((await readTestMail()).length, 1);

  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  const replay = await verifyToken(verificationRequest(issued));
  assert.equal(replay.status, 200);
  assert.equal((await readTestMail()).length, 1);
  const failures = (await readIntakeEvents()).filter((event) => event.event_type === "INTAKE_OPERATOR_NOTIFICATION_FAILED");
  assert.equal(failures.length, 1);
});

test("Ask confirmation-code failure leaves an unverified request with the submitted context", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-ask-contact-"));
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "invalid";
  const body = buildAskAiContactRequest("buyer@company.example", "Please review our approval step.", askFit);
  const response = await POST(contactRequest(body));

  assert.equal(response.status, 500);
  const [intake] = await getAllIntakes();
  assert.equal(intake.state, "submitted");
  assert.equal(intake.submission.scope, body.scope);
  assert.equal(intake.latestIssuanceId, null);
  assert.equal(intake.verifiedAt, undefined);
  assert.equal(intake.operatorNotification, undefined);
});
