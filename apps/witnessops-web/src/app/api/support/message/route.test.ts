import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { clearTokenStore } from "@/lib/server/token-store";

import { POST } from "./route";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_SIGNING_SECRET = "test-secret";
  process.env.WITNESSOPS_TOKEN_TTL_MINUTES = "15";
  process.env.WITNESSOPS_TOKEN_FROM_EMAIL = "support@witnessops.com";
  process.env.WITNESSOPS_VERIFY_BASE_URL = "https://witnessops.com";
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAILBOX_SUPPORT = "support@witnessops.com";
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

afterEach(async () => {
  await clearTokenStore();
});

test("support message route issues mailbox verification for support intake", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-support-message-"));
  applyTestEnv(baseDir);

  const response = await POST(
    new Request("https://witnessops.com/api/support/message", {
      method: "POST",
      body: JSON.stringify({
        email: "operator@example.com",
        subject: "[receipt] Need help verifying a receipt",
        category: "receipt",
        severity: "general",
        message: "Need help verifying a receipt.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 202);
  const payload = (await response.json()) as {
    channel: string;
    status: string;
    admissionState: string;
  };
  assert.equal(payload.channel, "support");
  assert.equal(payload.status, "issued");
  assert.equal(payload.admissionState, "verification_sent");
});

test("support message route redacts upstream issuance errors", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-support-message-"));
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "invalid";

  const response = await POST(
    new Request("https://witnessops.com/api/support/message", {
      method: "POST",
      body: JSON.stringify({
        email: "operator@example.com",
        category: "receipt",
        severity: "general",
        message: "Need help verifying a receipt.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 500);
  const payload = (await response.json()) as { ok: false; error: string };
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "Unable to issue verification token.");
});
