import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  clearTokenStore,
  getIntakeById,
} from "@/lib/server/token-store";

import { POST } from "./route";

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
        intent: "ai-agent-action-proof-run",
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
  assert.equal(intake?.submission.intent, "ai-agent-action-proof-run");
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
    /^Confirm your AI Agent Action Proof Run request\.$/m,
  );
  assert.match(mailRaw, /^Verification Code:\s+\S+$/m);
  assert.match(mailRaw, /^Enter the code in the verification box\. No link is required\.$/m);
  assert.match(mailRaw, /^Confirm the mailbox-only boundary before continuing\.$/m);
  assert.doesNotMatch(mailRaw, /^Open Verification Page:/m);
  assert.doesNotMatch(mailRaw, /https:\/\/witnessops\.com\/verify-token/);
  assert.match(mailRaw, /^This confirms mailbox access only\.$/m);
  assert.match(mailRaw, /^It does not start a proof run\.$/m);
  assert.match(mailRaw, /^Do not reply with secrets,/m);
  assert.match(mailRaw, /Confirm your AI Agent Action Proof Run request/);
  assert.match(mailRaw, /No link is required\. Do not forward or share this code\./);
  assert.match(mailRaw, /data-witnessops-signature-profile="ops_minimal"/);
});

test("review request route preserves the Public Exposure Review SKU and locale", async () => {
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

  assert.equal(response.status, 201);
  const payload = (await response.json()) as { intakeId: string };
  const intake = await getIntakeById(payload.intakeId);

  assert.equal(intake?.submission.intent, "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(intake?.submission.locale, "pl");
  assert.match(intake?.submission.scope ?? "", /First-message boundary: no files, secrets/);
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
        name: "",
        email: "security@witnessops.com",
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
