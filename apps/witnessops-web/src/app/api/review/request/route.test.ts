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
});

test("review request route issues a verification email", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-review-"));
  applyTestEnv(baseDir);

  const response = await POST(
    new Request("https://witnessops.com/api/review/request", {
      method: "POST",
      body: JSON.stringify({
        name: "K. Witness",
        email: "security@witnessops.com",
        intent: "access-change-proof-run",
        scope:
          "Access change: contractor production access revoked.",
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
  assert.equal(intake?.submission.intent, "access-change-proof-run");
  assert.equal(
    intake?.submission.scope,
    "Access change: contractor production access revoked.",
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
    /^Subject: WitnessOps engage verification token for security@witnessops\.com$/m,
  );
  assert.match(mailRaw, /^X-WitnessOps-Message-Class: transactional$/m);
  assert.match(mailRaw, /^Token:\s+\S+$/m);
  assert.match(mailRaw, /https:\/\/witnessops\.com\/verify-token\?/);
});

test("review request route redacts upstream issuance errors", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-review-"));
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "invalid";

  const response = await POST(
    new Request("https://witnessops.com/api/review/request", {
      method: "POST",
      body: JSON.stringify({ email: "security@witnessops.com" }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 500);
  const payload = (await response.json()) as { ok: false; error: string };
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "Unable to issue verification token.");
});
