import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  clearTokenStore,
  getIntakeById,
  getIssuanceById,
  updateIssuance,
} from "@/lib/server/token-store";
import { CLAIMANT_SESSION_COOKIE_NAME } from "@/lib/server/claimant-session";

import { POST as engage } from "../engage/route";
import { POST as reviewRequest } from "../review/request/route";
import { POST as support } from "../support/route";
import { GET, POST } from "./route";

const originalFetch = global.fetch;

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_SIGNING_SECRET = "test-secret";
  process.env.WITNESSOPS_TOKEN_TTL_MINUTES = "15";
  process.env.WITNESSOPS_TOKEN_FROM_EMAIL = "engage@witnessops.com";
  process.env.WITNESSOPS_VERIFY_BASE_URL = "https://witnessops.com";
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAILBOX_ENGAGE = "engage@mail.witnessops.com";
  process.env.WITNESSOPS_MAILBOX_SUPPORT = "engage@mail.witnessops.com";
  process.env.WITNESSOPS_MAILBOX_NOREPLY = "noreply@send.witnessops.com";
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

async function issueToken(baseDir: string) {
  applyTestEnv(baseDir);
  const response = await engage(
    new Request("https://witnessops.com/api/engage", {
      method: "POST",
      body: JSON.stringify({ email: "security@witnessops.com" }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  const issuance = (await response.json()) as {
    issuanceId: string;
    email: string;
  };
  const [mailFile] = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  const mailRaw = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, mailFile),
    "utf8",
  );
  const token = mailRaw.match(/^Verification Code:\s+(.+)$/m)?.[1];
  assert.ok(token);
  return { issuanceId: issuance.issuanceId, email: issuance.email, token };
}

async function issueSupportToken(baseDir: string) {
  applyTestEnv(baseDir);
  const response = await support(
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
  const issuance = (await response.json()) as {
    issuanceId: string;
    email: string;
  };
  const [mailFile] = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  const mailRaw = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, mailFile),
    "utf8",
  );
  const token = mailRaw.match(/^Verification Code:\s+(.+)$/m)?.[1];
  assert.ok(token);
  return { issuanceId: issuance.issuanceId, email: issuance.email, token };
}

async function issueAccessChangeToken(baseDir: string) {
  applyTestEnv(baseDir);
  const response = await reviewRequest(
    new Request("https://witnessops.com/api/review/request", {
      method: "POST",
      body: JSON.stringify({
        name: "K. Witness",
        email: "security@witnessops.com",
        intent: "access-change-proof-run",
        scope: "Access change: contractor production access revoked.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  const issuance = (await response.json()) as {
    issuanceId: string;
    email: string;
  };
  const [mailFile] = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  const mailRaw = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, mailFile),
    "utf8",
  );
  const token = mailRaw.match(/^Verification Code:\s+(.+)$/m)?.[1];
  assert.ok(token);
  return { issuanceId: issuance.issuanceId, email: issuance.email, token };
}

async function issueExternalExposureToken(baseDir: string, locale: "en" | "pl") {
  applyTestEnv(baseDir);
  const response = await reviewRequest(
    new Request("https://witnessops.com/api/review/request", {
      method: "POST",
      body: JSON.stringify({
        name: "Synthetic Buyer",
        email: "security@witnessops.com",
        intent: "OFFSEC-EXTERNAL-EXPOSURE",
        locale,
        scope:
          `Request: WitnessOps review fit check\nSelected product / intent: OFFSEC-EXTERNAL-EXPOSURE\nRequest locale: ${locale}`,
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  const issuance = (await response.json()) as {
    issuanceId: string;
    email: string;
  };
  const [mailFile] = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  const mailRaw = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, mailFile),
    "utf8",
  );
  const token = mailRaw.match(/^Verification Code:\s+(.+)$/m)?.[1];
  assert.ok(token);
  return { issuanceId: issuance.issuanceId, email: issuance.email, token };
}

function assertClaimantSessionSet(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, new RegExp(`^${CLAIMANT_SESSION_COOKIE_NAME}=`));
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=strict/i);
  return setCookie.split(";")[0]!;
}

afterEach(async () => {
  global.fetch = originalFetch;
  delete process.env.GES_SERVER_URL;
  delete process.env.GES_ASSESSMENT_KEY;
  await clearTokenStore();
});

test("verify-token route requires issuanceId + email + token", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  applyTestEnv(baseDir);

  const response = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify({ email: "security@witnessops.com", token: "x" }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 400);
});

test("verify-token route allows repeat verification for the same issuance and token", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  const issued = await issueToken(baseDir);

  const first = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(first.status, 200);
  assertClaimantSessionSet(first);
  const firstPayload = (await first.json()) as {
    channel: string;
    intakeId: string;
    issuanceId: string;
    email: string;
    status: string;
    admissionState: string;
    threadId: string | null;
    verifiedAt: string;
    assessmentRunId: string | null;
    assessmentStatus: string;
    postVerifyPath: string;
  };
  assert.equal(firstPayload.channel, "engage");
  assert.ok(firstPayload.intakeId.startsWith("intk_"));
  assert.equal(firstPayload.status, "verified");
  assert.equal(firstPayload.admissionState, "admitted");
  assert.ok(firstPayload.threadId?.startsWith("thr_"));
  assert.equal(firstPayload.assessmentRunId, null);
  assert.equal(firstPayload.assessmentStatus, "unavailable");
  assert.equal(
    firstPayload.postVerifyPath,
    `/assessment/${encodeURIComponent(firstPayload.issuanceId)}?email=${encodeURIComponent(firstPayload.email)}`,
  );

  const second = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(second.status, 200);
  assertClaimantSessionSet(second);
  const secondPayload = (await second.json()) as {
    issuanceId: string;
    email: string;
    status: string;
    admissionState: string;
    threadId: string | null;
    verifiedAt: string;
    assessmentRunId: string | null;
    assessmentStatus: string;
    postVerifyPath: string;
  };
  assert.equal(secondPayload.status, "verified");
  assert.equal(secondPayload.admissionState, "admitted");
  assert.equal(secondPayload.verifiedAt, firstPayload.verifiedAt);
  assert.equal(secondPayload.threadId, firstPayload.threadId);
  assert.equal(secondPayload.assessmentRunId, null);
  assert.equal(secondPayload.assessmentStatus, "unavailable");
  assert.equal(
    secondPayload.postVerifyPath,
    `/assessment/${encodeURIComponent(secondPayload.issuanceId)}?email=${encodeURIComponent(secondPayload.email)}`,
  );
});

test("verify-token route returns access-change confirmation path without assessment attachment on replay", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    fetchCalls.push({ input: url, init });
    return new Response(
      JSON.stringify({ run_id: "run_unexpected", status: "pending" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  process.env.GES_SERVER_URL = "https://assessment.internal";
  process.env.GES_ASSESSMENT_KEY = "test-assessment-key";

  const issued = await issueAccessChangeToken(baseDir);

  const first = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(first.status, 200);
  const firstPayload = (await first.json()) as {
    channel: string;
    assessmentRunId: string | null;
    assessmentStatus: string;
    postVerifyPath: string;
  };
  assert.equal(firstPayload.channel, "engage");
  assert.equal(firstPayload.assessmentRunId, null);
  assert.equal(firstPayload.assessmentStatus, "unavailable");
  assert.equal(firstPayload.postVerifyPath, "/review/request/confirmed");
  assert.equal(fetchCalls.length, 0);

  const second = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(second.status, 200);
  const secondPayload = (await second.json()) as {
    assessmentRunId: string | null;
    assessmentStatus: string;
    postVerifyPath: string;
  };
  assert.equal(secondPayload.assessmentRunId, null);
  assert.equal(secondPayload.assessmentStatus, "unavailable");
  assert.equal(secondPayload.postVerifyPath, "/review/request/confirmed");
  assert.equal(fetchCalls.length, 0);
});

test("External Exposure Assessment stays on the locale-specific manual fit path", async () => {
  for (const locale of ["en", "pl"] as const) {
    const baseDir = await mkdtemp(
      path.join(os.tmpdir(), `witnessops-external-exposure-${locale}-`),
    );
    const fetchCalls: string[] = [];
    global.fetch = (async (input: string | URL | Request) => {
      fetchCalls.push(input instanceof Request ? input.url : input.toString());
      return new Response(
        JSON.stringify({ run_id: "run_unexpected", status: "pending" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
    process.env.GES_SERVER_URL = "https://assessment.internal";
    process.env.GES_ASSESSMENT_KEY = "test-assessment-key";

    const issued = await issueExternalExposureToken(baseDir, locale);
    const response = await POST(
      new Request("https://witnessops.com/api/verify-token", {
        method: "POST",
        body: JSON.stringify(issued),
        headers: { "Content-Type": "application/json" },
      }),
    );

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      assessmentRunId: string | null;
      assessmentStatus: string;
      postVerifyPath: string;
    };
    assert.equal(payload.assessmentRunId, null);
    assert.equal(payload.assessmentStatus, "unavailable");
    assert.equal(
      payload.postVerifyPath,
      locale === "pl"
        ? "/pl/review/request/confirmed"
        : "/review/request/confirmed",
    );
    assert.equal(fetchCalls.length, 0);

    await clearTokenStore();
  }
});

test("verify-token route sends a reply-ready operator notification for package requests", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-operator-notify-"));
  applyTestEnv(baseDir);

  const issueResponse = await reviewRequest(
    new Request("https://witnessops.com/api/review/request", {
      method: "POST",
      body: JSON.stringify({
        name: "K. Witness",
        org: "WitnessOps Labs",
        email: "security@witnessops.com",
        intent: "ai-agent-action-proof-run",
        scope:
          "Workflow: coding agent proposed and applied a configuration change after human approval.\nEvidence available: ticket, prompt transcript, commit record.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(issueResponse.status, 201);
  const issued = (await issueResponse.json()) as {
    intakeId: string;
    issuanceId: string;
    email: string;
  };
  const [verificationMailFile] = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  const verificationMailRaw = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, verificationMailFile),
    "utf8",
  );
  const token = verificationMailRaw.match(/^Verification Code:\s+(.+)$/m)?.[1];
  assert.ok(token);

  const first = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify({
        issuanceId: issued.issuanceId,
        email: issued.email,
        token,
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(first.status, 200);
  const firstPayload = (await first.json()) as {
    postVerifyPath: string;
    assessmentRunId: string | null;
  };
  assert.equal(firstPayload.postVerifyPath, "/review/request/confirmed");
  assert.equal(firstPayload.assessmentRunId, null);

  const mailFiles = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  assert.equal(mailFiles.length, 2);
  const mailRaws = await Promise.all(
    mailFiles.map((file) =>
      readFile(path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, file), "utf8"),
    ),
  );
  const operatorMailRaw = mailRaws.find((raw) =>
    /^To: engage@mail\.witnessops\.com$/m.test(raw),
  );

  assert.ok(operatorMailRaw);
  assert.match(operatorMailRaw, /^From: noreply@send\.witnessops\.com$/m);
  assert.match(operatorMailRaw, /^Reply-To: security@witnessops\.com$/m);
  assert.match(
    operatorMailRaw,
    /^Subject: Verified security-workflow package request: WitnessOps Labs$/m,
  );
  assert.match(operatorMailRaw, /^X-WitnessOps-Message-Class: internal_notification$/m);
  assert.match(operatorMailRaw, /^X-WitnessOps-Signature-Profile: none$/m);
  assert.match(operatorMailRaw, /Reply to this email to continue fit, scope, fee, and evidence-handling discussion/);
  assert.match(operatorMailRaw, /Workflow: coding agent proposed and applied a configuration change/);
  assert.match(operatorMailRaw, /No proof run has started\./);
  assert.match(operatorMailRaw, /No customer evidence has been accepted\./);

  const intake = await getIntakeById(issued.intakeId);
  assert.equal(intake?.operatorNotification?.mailbox, "engage@mail.witnessops.com");
  assert.equal(intake?.operatorNotification?.replyTo, "security@witnessops.com");

  const replay = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify({
        issuanceId: issued.issuanceId,
        email: issued.email,
        token,
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  assert.equal(replay.status, 200);
  assert.equal((await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!)).length, 2);
  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  const operatorEvents = eventLogRaw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { event_type: string })
    .filter((event) => event.event_type === "INTAKE_OPERATOR_NOTIFICATION_SENT");
  assert.equal(operatorEvents.length, 1);
});

test("verify-token route returns support confirmation path for support issuances", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-support-verify-"));
  const issued = await issueSupportToken(baseDir);

  const response = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    channel: string;
    intakeId: string;
    email: string;
    threadId: string | null;
    postVerifyPath: string;
  };
  assert.equal(payload.channel, "support");
  assert.ok(payload.threadId?.startsWith("thr_"));
  const expected = new URLSearchParams({
    verified: "1",
    intakeId: payload.intakeId,
    email: payload.email,
    threadId: payload.threadId!,
  });
  assert.equal(payload.postVerifyPath, `/support?${expected.toString()}`);

  const mailFiles = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  assert.equal(mailFiles.length, 2);
  const mailRaws = await Promise.all(
    mailFiles.map((file) =>
      readFile(path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, file), "utf8"),
    ),
  );
  const operatorMailRaw = mailRaws.find((raw) =>
    /^To: engage@mail\.witnessops\.com$/m.test(raw),
  );
  assert.ok(operatorMailRaw);
  assert.match(operatorMailRaw, /^From: noreply@send\.witnessops\.com$/m);
  assert.match(operatorMailRaw, /^Reply-To: operator@gmail\.com$/m);
  assert.match(
    operatorMailRaw,
    /^Subject: Verified support request: operator@gmail\.com$/m,
  );
  assert.match(operatorMailRaw, /Category: receipt/);
  assert.match(operatorMailRaw, /Severity: general/);
  assert.match(operatorMailRaw, /Need help verifying a receipt\./);

  const intake = await getIntakeById(payload.intakeId);
  assert.equal(intake?.operatorNotification?.mailbox, "engage@mail.witnessops.com");
  assert.equal(intake?.operatorNotification?.replyTo, "operator@gmail.com");
  assert.equal(intake?.operatorNotification?.provider, "file");
  assert.ok(intake?.operatorNotification?.providerMessageId);

  const replay = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );
  assert.equal(replay.status, 200);
  assert.equal((await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!)).length, 2);
  const supportEventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  const supportOperatorEvents = supportEventLogRaw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { event_type: string; channel: string })
    .filter(
      (event) =>
        event.event_type === "INTAKE_OPERATOR_NOTIFICATION_SENT" &&
        event.channel === "support",
    );
  assert.equal(supportOperatorEvents.length, 1);
});

test("verify-token preserves admitted support success when operator notification fails", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-support-verify-"));
  const issued = await issueSupportToken(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "invalid";

  const response = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    intakeId: string;
    status: string;
    admissionState: string;
  };
  assert.equal(payload.status, "verified");
  assert.equal(payload.admissionState, "admitted");
  assert.equal(
    (await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!)).length,
    1,
  );

  const intake = await getIntakeById(payload.intakeId);
  assert.equal(intake?.operatorNotification, undefined);
  assert.equal(intake?.operatorNotificationAttempt?.status, "failed");

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  const failureEvents = eventLogRaw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { event_type: string })
    .filter(
      (event) => event.event_type === "INTAKE_OPERATOR_NOTIFICATION_FAILED",
    );
  assert.equal(failureEvents.length, 1);

  const replay = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );
  assert.equal(replay.status, 200);
  assert.equal(
    (await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!)).length,
    1,
  );
});

test("concurrent support verification sends exactly one operator notification", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-support-verify-"));
  const issued = await issueSupportToken(baseDir);

  const verify = () =>
    POST(
      new Request("https://witnessops.com/api/verify-token", {
        method: "POST",
        body: JSON.stringify(issued),
        headers: { "Content-Type": "application/json" },
      }),
    );
  const responses = await Promise.all([verify(), verify()]);

  assert.deepEqual(
    responses.map((response) => response.status),
    [200, 200],
  );
  const payloads = await Promise.all(
    responses.map(
      async (response) => (await response.json()) as { intakeId: string },
    ),
  );
  assert.equal(payloads[0]?.intakeId, payloads[1]?.intakeId);
  assert.equal(
    (await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!)).length,
    2,
  );

  const storedIntake = await getIntakeById(payloads[0]!.intakeId);
  assert.equal(storedIntake?.operatorNotificationAttempt?.status, "sent");
  assert.ok(storedIntake?.operatorNotification);

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  const sentEvents = eventLogRaw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { event_type: string })
    .filter(
      (event) => event.event_type === "INTAKE_OPERATOR_NOTIFICATION_SENT",
    );
  assert.equal(sentEvents.length, 1);
});

test("verify-token route does not start assessment before explicit approval", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  applyTestEnv(baseDir);
  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    fetchCalls.push({ input: url, init });
    return new Response("", { status: 500 });
  }) as typeof fetch;

  const issued = await issueToken(baseDir);

  const first = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(first.status, 200);
  const firstPayload = (await first.json()) as {
    channel: string;
    intakeId: string;
    assessmentRunId: string | null;
    assessmentStatus: string;
    admissionState: string;
    threadId: string | null;
  };
  assert.equal(firstPayload.channel, "engage");
  assert.ok(firstPayload.intakeId.startsWith("intk_"));
  assert.equal(firstPayload.admissionState, "admitted");
  assert.ok(firstPayload.threadId?.startsWith("thr_"));
  assert.equal(firstPayload.assessmentRunId, null);
  assert.equal(firstPayload.assessmentStatus, "unavailable");
  assert.equal(fetchCalls.length, 0);

  const second = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(second.status, 200);
  const secondPayload = (await second.json()) as {
    assessmentRunId: string | null;
    assessmentStatus: string;
  };
  assert.equal(secondPayload.assessmentRunId, null);
  assert.equal(secondPayload.assessmentStatus, "unavailable");
  assert.equal(fetchCalls.length, 0);
});

test("verify-token route enforces expiry", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  const issued = await issueToken(baseDir);

  await updateIssuance(issued.issuanceId, (record) => ({
    ...record,
    expiresAt: "2000-01-01T00:00:00Z",
  }));

  const response = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { error: string };
  assert.match(payload.error, /expired/i);
});

test("verify-token GET route redirects to confirmation page without consuming token", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  const issued = await issueToken(baseDir);

  const response = await GET(
    new Request(
      `https://witnessops.com/api/verify-token?issuanceId=${encodeURIComponent(issued.issuanceId)}&email=${encodeURIComponent(issued.email)}&token=${encodeURIComponent(issued.token)}`,
    ),
  );

  assert.equal(response.status, 302);
  const location = response.headers.get("location") ?? "";
  assert.ok(
    location.startsWith("https://witnessops.com/verify-token?"),
    `Expected redirect to /verify-token, got: ${location}`,
  );
  assert.ok(
    location.includes(`issuanceId=${encodeURIComponent(issued.issuanceId)}`),
    `Expected issuanceId param in redirect URL, got: ${location}`,
  );
  assert.ok(location.includes("email="));
  assert.ok(location.includes("token="));
  const stored = await getIssuanceById(issued.issuanceId);
  assert.equal(stored?.status, "issued");
});

test("verify-token GET route uses the public origin instead of the internal request host", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  const issued = await issueToken(baseDir);

  const response = await GET(
    new Request(
      `https://0.0.0.0:3000/api/verify-token?issuanceId=${encodeURIComponent(issued.issuanceId)}&email=${encodeURIComponent(issued.email)}&token=${encodeURIComponent(issued.token)}`,
    ),
  );

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    `https://witnessops.com/verify-token?issuanceId=${encodeURIComponent(issued.issuanceId)}&email=${encodeURIComponent(issued.email)}&token=${encodeURIComponent(issued.token)}`,
  );
});

test("verify-token GET route redirects support verification to confirmation page without consuming token", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-support-verify-"),
  );
  const issued = await issueSupportToken(baseDir);

  const response = await GET(
    new Request(
      `https://witnessops.com/api/verify-token?issuanceId=${encodeURIComponent(issued.issuanceId)}&email=${encodeURIComponent(issued.email)}&token=${encodeURIComponent(issued.token)}`,
    ),
  );

  assert.equal(response.status, 302);
  const location = response.headers.get("location") ?? "";
  assert.ok(
    location.startsWith("https://witnessops.com/verify-token?"),
    `Expected redirect to /verify-token, got: ${location}`,
  );
  const stored = await getIssuanceById(issued.issuanceId);
  assert.equal(stored?.status, "issued");
});

test("verify-token GET support redirect uses the public origin instead of the internal request host", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-support-verify-"),
  );
  const issued = await issueSupportToken(baseDir);

  const response = await GET(
    new Request(
      `https://0.0.0.0:3000/api/verify-token?issuanceId=${encodeURIComponent(issued.issuanceId)}&email=${encodeURIComponent(issued.email)}&token=${encodeURIComponent(issued.token)}`,
    ),
  );

  assert.equal(response.status, 302);
  const location = response.headers.get("location") ?? "";
  assert.ok(
    location.startsWith("https://witnessops.com/verify-token?"),
    `Expected public confirmation redirect, got: ${location}`,
  );
});
