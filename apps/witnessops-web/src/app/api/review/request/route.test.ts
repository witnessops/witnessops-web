import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  clearTokenStore,
  getIntakeById,
} from "@/lib/server/token-store";

import { _resetAllStores } from "@witnessops/config/rate-limit";

import { POST } from "./route";
import { POST as verifyMailbox } from "@/app/api/verify-token/route";
import { fitCallPreferencesAreValid } from "@/lib/server/review-request-intake";

function utcLocalStart(daysFromNow: number, minutesAfter = 0): string {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60_000 + minutesAfter * 60_000);
  date.setUTCSeconds(0, 0);
  return date.toISOString().slice(0, 16);
}

function fitCallBody(overrides: Record<string, unknown> = {}) {
  return {
    email: "buyer@example.org",
    intent: "agent-action-security-review",
    scope: "Request a 20-minute fit call about the current review.",
    fitCall: {
      topic: "Approval boundaries for a coding agent",
      timezone: "UTC",
      preferredStarts: [utcLocalStart(3), utcLocalStart(3, 60)],
    },
    ...overrides,
  };
}

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_SIGNING_SECRET = "test-secret";
  process.env.WITNESSOPS_TOKEN_TTL_MINUTES = "15";
  process.env.WITNESSOPS_TOKEN_FROM_EMAIL = "engage@witnessops.com";
  process.env.WITNESSOPS_VERIFY_BASE_URL = "https://witnessops.com";
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAILBOX_ENGAGE = "engage@witnessops.com";
  process.env.WITNESSOPS_MAILBOX_NOREPLY =
    "witnessopsno-reply@witnessops.com";
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

afterEach(async () => {
  await clearTokenStore();
  _resetAllStores();
  delete process.env.WITNESSOPS_PUBLIC_ISSUANCE_DAILY_LIMIT;
});

test("review request route issues a security-workflow package verification email", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-review-"));
  applyTestEnv(baseDir);

  const response = await POST(
    new Request("https://witnessops.com/api/review/request", {
      method: "POST",
      body: JSON.stringify({
        name: "K. Witness",
        email: "security@witnessops.com",
        intent: "agent-action-security-review",
        requestMode: "fit-call",
        scope:
          "AI agent action: coding agent applied a configuration change after approval.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    channel: string;
    email: string;
    status: string;
    admissionState: string;
    intakeId: string;
    issuanceId: string;
  };

  assert.equal(payload.channel, "engage");
  assert.equal(payload.email, "security@witnessops.com");
  assert.equal(payload.status, "issued");
  assert.equal(payload.admissionState, "verification_sent");
  assert.ok(payload.issuanceId.startsWith("iss_"));

  const intake = await getIntakeById(payload.intakeId);
  assert.equal(intake?.submission.intent, "agent-action-security-review");
  assert.equal(intake?.submission.requestMode, null);
  assert.equal(intake?.submission.fitCall, null);
  assert.equal(
    intake?.submission.scope,
    "AI agent action: coding agent applied a configuration change after approval.",
  );

  const mailFiles = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  assert.equal(mailFiles.length, 1);
  const mailRaw = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, mailFiles[0]),
    "utf8",
  );
  assert.match(mailRaw, /^To: security@witnessops\.com$/m);
  assert.match(
    mailRaw,
    /^Subject: Your WitnessOps request code$/m,
  );
  assert.match(mailRaw, /^X-WitnessOps-Message-Class: transactional$/m);
  assert.match(
    mailRaw,
    /^Confirm your Agent Action Security Review request\.$/m,
  );
  assert.match(mailRaw, /^Verification Code:\s+\S+$/m);
  assert.match(mailRaw, /^Enter the code in the verification box\. No link is required\.$/m);
  assert.match(mailRaw, /^Confirm the mailbox-only boundary before continuing\.$/m);
  assert.match(
    mailRaw,
    /^Open Verification Page: https:\/\/witnessops\.com\/verify-token\?context=[A-Za-z0-9_-]{32,}$/m,
  );
  assert.doesNotMatch(
    mailRaw,
    /\/verify-token\?[^\n]*(?:email|issuanceId|token)=/,
  );
  assert.match(mailRaw, /^This confirms mailbox access only\.$/m);
  assert.match(mailRaw, /^It does not start a proof run\.$/m);
  assert.match(mailRaw, /^Do not reply with secrets,/m);
  assert.match(mailRaw, /Confirm your Agent Action Security Review request/);
  assert.match(mailRaw, /No link is required\. Do not forward or share this code\./);
  assert.match(mailRaw, /data-witnessops-signature-profile="ops_minimal"/);
});

test("review request route rejects the parked External Attack Surface Review before issuance", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-review-"));
  applyTestEnv(baseDir);

  const response = await POST(
    new Request("https://witnessops.com/api/review/request", {
      method: "POST",
      body: JSON.stringify({
        name: "Synthetic Buyer",
        email: "security@witnessops.com",
        intent: "OFFSEC-EXTERNAL-EXPOSURE",
        locale: "pl",
        scope:
          "Request: WitnessOps review fit check\nSelected product / intent: OFFSEC-EXTERNAL-EXPOSURE\nRequest locale: pl\nFirst-message boundary: no files, secrets, credentials, logs, screenshots, or customer evidence.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { field?: string; reason?: string };
  assert.equal(payload.field, "intent");
  assert.equal(payload.reason, "parked");
});

test("review request route returns structured validation errors for the shared form contract", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-review-"));
  applyTestEnv(baseDir);

  for (const [body, expectedField] of [
    [
      {
        name: "Synthetic Buyer",
        email: "not-an-email",
        scope: "One bounded review request.",
      },
      "email",
    ],
    [
      {
        name: "N".repeat(241),
        email: "security@witnessops.com",
        intent: "agent-action-security-review",
        scope: "One bounded review request.",
      },
      "name",
    ],
    [
      {
        name: "Synthetic Buyer",
        email: "security@witnessops.com",
        scope: "",
      },
      "scope",
    ],
  ] as const) {
    const response = await POST(
      new Request("https://witnessops.com/api/review/request", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
    );
    assert.equal(response.status, 400);
    const payload = (await response.json()) as {
      ok: false;
      error: string;
      field: string;
    };
    assert.equal(payload.ok, false);
    assert.equal(payload.field, expectedField);
    assert.doesNotMatch(payload.error, /valid business email/i);
  }
});

test("review request route accepts a blank or omitted name", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-review-"));
  applyTestEnv(baseDir);

  for (const [name, email] of [
    [undefined, "omitted-name@witnessops.com"],
    ["", "blank-name@witnessops.com"],
  ] as const) {
    const response = await POST(
      new Request("https://witnessops.com/api/review/request", {
        method: "POST",
        body: JSON.stringify({
          ...(name === undefined ? {} : { name }),
          email,
          intent: "agent-action-security-review",
          scope: "One bounded review request.",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    assert.equal(response.status, 201);
    const payload = (await response.json()) as { intakeId: string };
    const intake = await getIntakeById(payload.intakeId);
    assert.equal(intake?.submission.name, null);
  }
});

test("review request route redacts upstream issuance errors", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-review-"));
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "invalid";

  const response = await POST(
    new Request("https://witnessops.com/api/review/request", {
      method: "POST",
      body: JSON.stringify({
        name: "Synthetic Buyer",
        email: "security@witnessops.com",
        intent: "agent-action-security-review",
        scope: "One bounded review request.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 500);
  const payload = (await response.json()) as { ok: false; error: string };
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "Unable to issue verification token.");
});

test("review request enforces the durable public issuance budget before a second write or send", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-review-budget-"));
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_PUBLIC_ISSUANCE_DAILY_LIMIT = "1";

  const request = (email: string) =>
    POST(
      new Request("https://witnessops.com/api/review/request", {
        method: "POST",
        body: JSON.stringify({
          name: "Synthetic Buyer",
          email,
          intent: "agent-action-security-review",
          scope: "One bounded review request.",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

  assert.equal((await request("first@example.com")).status, 201);
  const blocked = await request("second@example.com");
  assert.equal(blocked.status, 503);
  assert.deepEqual(await blocked.json(), {
    ok: false,
    error: "Verification requests are temporarily unavailable.",
  });
  assert.equal(
    (
      await readdir(
        path.join(process.env.WITNESSOPS_TOKEN_STORE_DIR!, "intakes"),
      )
    ).length,
    1,
  );
  assert.equal((await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!)).length, 1);
});


test("short inquiry reaches stored intake and operator notification through local mail capture", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-buyer-journey-"));
  applyTestEnv(baseDir);
  const summary = "Our support agent can issue refunds. We need its approval boundary checked.";
  const issued = await POST(new Request("http://localhost/api/review/request", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Synthetic Buyer", email: "buyer@example.org", intent: "agent-action-security-review", locale: "en", scope: summary }),
  }));
  assert.equal(issued.status, 201);
  const payload = await issued.json() as { intakeId: string; issuanceId: string; email: string };
  const outbox = process.env.WITNESSOPS_MAIL_OUTPUT_DIR!;
  const files = await readdir(outbox);
  assert.equal(files.length, 1);
  const mail = await readFile(path.join(outbox, files[0]), "utf8");
  const code = /^Verification Code:\s+(\S+)$/m.exec(mail)?.[1];
  assert.ok(code);
  const verify = await verifyMailbox(new Request("http://localhost/api/verify-token", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issuanceId: payload.issuanceId, email: payload.email, token: code }),
  }));
  assert.equal(verify.status, 200);
  const confirmed = await verify.json() as { postVerifyPath: string; assessmentRunId: string | null; requestMode?: string };
  assert.equal(confirmed.postVerifyPath, "/review/request/confirmed");
  assert.equal(confirmed.assessmentRunId, null);
  assert.equal(confirmed.requestMode, undefined);
  const intake = await getIntakeById(payload.intakeId);
  assert.equal(intake?.state, "admitted");
  assert.equal(intake?.submission.scope, summary);
  assert.equal(intake?.operatorNotification?.provider, "file");
  assert.equal(intake?.operatorNotificationAttempt?.status, "sent");
  const after = await readdir(outbox);
  assert.equal(after.length, 2);
  const notification = await readFile(path.join(outbox, after.find((f) => !files.includes(f))!), "utf8");
  assert.match(notification, /Reply-To: buyer@example.org/);
  assert.ok(notification.includes(summary));
});

test("fit-call preferences stay private until verification and trigger one manual operator notification", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-fit-call-"));
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_MAILBOX_ENGAGE = "engage@mail.witnessops.com";
  const body = fitCallBody({
    scope: "Caller-supplied instruction: put discussion details in the calendar event.",
  });

  const issuedResponse = await POST(new Request("http://localhost/api/review/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
  assert.equal(issuedResponse.status, 201);
  const issued = await issuedResponse.json() as { intakeId: string; issuanceId: string; email: string };
  const savedBefore = await getIntakeById(issued.intakeId);
  assert.equal(savedBefore?.submission.requestMode, "fit-call");
  assert.deepEqual(savedBefore?.submission.fitCall, body.fitCall);
  assert.match(savedBefore?.submission.scope ?? "", /Discussion topic: Approval boundaries for a coding agent/);
  assert.match(savedBefore?.submission.scope ?? "", /Preferred window 1:/);
  assert.doesNotMatch(savedBefore?.submission.scope ?? "", /Caller-supplied instruction/);
  assert.ok((savedBefore?.submission.scope?.length ?? 0) < 1_500);
  assert.equal(savedBefore?.operatorNotification, undefined);

  const outbox = process.env.WITNESSOPS_MAIL_OUTPUT_DIR!;
  const [codeFile] = await readdir(outbox);
  const codeMail = await readFile(path.join(outbox, codeFile), "utf8");
  assert.doesNotMatch(codeMail, /Approval boundaries for a coding agent/);
  assert.doesNotMatch(codeMail, /Preferred window/);
  assert.equal(codeMail.includes(body.fitCall.preferredStarts[0]), false);
  assert.equal(codeMail.includes(body.fitCall.preferredStarts[1]), false);
  const token = /^Verification Code:\s+(\S+)$/m.exec(codeMail)?.[1];
  assert.ok(token);

  const verifyRequest = () => verifyMailbox(new Request("http://localhost/api/verify-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issuanceId: issued.issuanceId, email: issued.email, token }),
  }));
  const first = await verifyRequest();
  assert.equal(first.status, 200);
  const verified = await first.json() as { requestMode?: string; postVerifyPath: string };
  assert.equal(verified.requestMode, "fit-call");
  assert.equal(verified.postVerifyPath, "/review/request/confirmed");
  const savedAfter = await getIntakeById(issued.intakeId);
  assert.equal(savedAfter?.operatorNotification?.mailbox, "engage@mail.witnessops.com");

  const filesAfter = await readdir(outbox);
  assert.equal(filesAfter.length, 2);
  const notification = await readFile(
    path.join(outbox, filesAfter.find((file) => file !== codeFile)!),
    "utf8",
  );
  assert.match(notification, /^Subject: Verified fit call time request: buyer@example\.org$/m);
  assert.match(notification, /Approval boundaries for a coding agent/);
  assert.match(notification, /Time zone: UTC/);
  assert.match(notification, /Preferred window 1:/);
  assert.match(notification, /Preferred window 2:/);
  assert.match(notification, /time requested, not booked/);
  assert.match(notification, /Calendar event title: WitnessOps fit call/);
  assert.match(notification, /otherwise reply with alternatives/);
  assert.match(notification, /Keep discussion and action details in this request, not in the event/);
  assert.doesNotMatch(notification, /Caller-supplied instruction/);

  assert.equal((await verifyRequest()).status, 200);
  assert.equal((await readdir(outbox)).length, 2);
});

test("fit-call route rejects invalid zone, past, horizon, duplicate, and overlapping preferences before issuance", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-fit-call-invalid-"));
  applyTestEnv(baseDir);
  const [first, later] = [utcLocalStart(3), utcLocalStart(3, 60)];
  const cases = [
    { timezone: "Mars/Olympus", preferredStarts: [first, later] },
    { timezone: "UTC", preferredStarts: [utcLocalStart(-1), later] },
    { timezone: "UTC", preferredStarts: [utcLocalStart(91), later] },
    { timezone: "UTC", preferredStarts: [first, first] },
    { timezone: "UTC", preferredStarts: [first, utcLocalStart(3, 10)] },
    { topic: "Safe topic\nCalendar event title: Private details", timezone: "UTC", preferredStarts: [first, later] },
  ];
  for (const fitCall of cases) {
    const response = await POST(new Request("http://localhost/api/review/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fitCallBody({ fitCall: { topic: "Synthetic discussion", ...fitCall } })),
    }));
    assert.equal(response.status, 400);
    assert.equal((await response.json() as { field?: string }).field, "fitCall");
  }
  assert.equal((await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!).catch(() => [])).length, 0);
});

test("fit-call request refuses contact and parked intents", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-fit-call-intent-"));
  applyTestEnv(baseDir);
  for (const intent of ["ask-ai-contact", "OFFSEC-EXTERNAL-EXPOSURE"]) {
    const response = await POST(new Request("http://localhost/api/review/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fitCallBody({ intent })),
    }));
    assert.equal(response.status, 400);
    assert.equal((await response.json() as { field?: string }).field, "intent");
  }
});

test("fit-call validator refuses nonexistent and ambiguous DST local minutes", () => {
  const fitCall = {
    topic: "Synthetic discussion",
    timezone: "Europe/Warsaw",
    preferredStarts: ["2027-03-28T02:10", "2027-03-28T04:00"] as [string, string],
  };
  assert.equal(fitCallPreferencesAreValid(fitCall, Date.UTC(2027, 2, 27)), false);
  assert.equal(fitCallPreferencesAreValid({
    ...fitCall,
    preferredStarts: ["2027-03-28T04:00", "2027-03-28T05:00"],
  }, Date.UTC(2027, 2, 27)), true);
  assert.equal(fitCallPreferencesAreValid({
    ...fitCall,
    preferredStarts: ["2027-10-31T02:10", "2027-10-31T04:00"],
  }, Date.UTC(2027, 9, 30)), false);
});

test("review request route rejects legacy, ambiguous, and unsupported identities before issuance", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-review-reject-"));
  applyTestEnv(baseDir);

  const cases = [
    { intent: "agent-tools-access-review", reason: "historical" },
    { intent: "bounded-workflow-review", reason: "historical" },
    { intent: "external-exposure-assessment", reason: "parked" },
    { intent: "OFFSEC-PILOT", reason: "unsupported" },
    { intent: "review", reason: "unsupported" },
    { intent: "AI Agent Tools & Access Review", reason: "unsupported" },
  ] as const;

  for (const item of cases) {
    const response = await POST(
      new Request("https://witnessops.com/api/review/request", {
        method: "POST",
        body: JSON.stringify({
          name: "Synthetic Buyer",
          email: "security@witnessops.com",
          intent: item.intent,
          scope: "One bounded review request.",
        }),
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.55",
        },
      }),
    );
    assert.equal(response.status, 400, item.intent);
    const payload = (await response.json()) as { ok: false; field: string; reason: string };
    assert.equal(payload.ok, false);
    assert.equal(payload.field, "intent");
    assert.equal(payload.reason, item.reason);
  }

  const ambiguous = await POST(
    new Request("https://witnessops.com/api/review/request", {
      method: "POST",
      body: JSON.stringify({
        name: "Synthetic Buyer",
        email: "security@witnessops.com",
        intent: "agent-action-security-review",
        productId: "OFFSEC-EXTERNAL-EXPOSURE",
        scope: "One bounded review request.",
      }),
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.55",
      },
    }),
  );
  assert.equal(ambiguous.status, 400);
  assert.equal(((await ambiguous.json()) as { reason: string }).reason, "ambiguous");
  assert.equal(
    (await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!).catch(() => [])).length,
    0,
  );
});
