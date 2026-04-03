import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
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

test("support route issues mailbox verification and persists support intake metadata", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-support-"));
  applyTestEnv(baseDir);

  const response = await POST(
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

  assert.equal(response.status, 202);
  const payload = (await response.json()) as {
    channel: string;
    intakeId: string;
    issuanceId: string;
    threadId: string | null;
    email: string;
    status: string;
    admissionState: string;
  };

  assert.equal(payload.channel, "support");
  assert.equal(payload.email, "operator@gmail.com");
  assert.equal(payload.status, "issued");
  assert.equal(payload.admissionState, "verification_sent");
  assert.equal(payload.threadId, null);

  const intakeRaw = await readFile(
    path.join(
      process.env.WITNESSOPS_TOKEN_STORE_DIR!,
      "intakes",
      `${payload.intakeId}.json`,
    ),
    "utf8",
  );
  assert.match(intakeRaw, /"channel":\s*"support"/);
  assert.match(intakeRaw, /"category":\s*"receipt"/);
  assert.match(intakeRaw, /"severity":\s*"general"/);
  assert.match(intakeRaw, /"message":\s*"Need help verifying a receipt\."/);

  const issuanceRaw = await readFile(
    path.join(
      process.env.WITNESSOPS_TOKEN_STORE_DIR!,
      "issuances",
      `${payload.issuanceId}.json`,
    ),
    "utf8",
  );
  assert.match(issuanceRaw, /"channel":\s*"support"/);
  assert.match(issuanceRaw, /"tokenDigest":\s*"sha256:/);

  const [mailFile] = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  const mailRaw = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, mailFile),
    "utf8",
  );
  assert.match(mailRaw, /^From:\s+support@witnessops\.com$/m);
  assert.match(mailRaw, /^Token:\s+.+$/m);

  const eventLogRaw = await readFile(
    path.join(process.env.WITNESSOPS_TOKEN_AUDIT_DIR!, "events.ndjson"),
    "utf8",
  );
  const events = eventLogRaw
    .trim()
    .split("\n")
    .map(
      (line) =>
        JSON.parse(line) as {
          event_type: string;
          channel: string;
        },
    );
  assert.deepEqual(
    events.map((event) => event.event_type),
    ["INTAKE_SUBMITTED", "INTAKE_VERIFICATION_SENT"],
  );
  assert.ok(events.every((event) => event.channel === "support"));
});

test("support route redacts upstream issuance errors", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-support-"));
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "invalid";

  const response = await POST(
    new Request("https://witnessops.com/api/support", {
      method: "POST",
      body: JSON.stringify({
        email: "operator@witnessops.com",
        category: "receipt",
        severity: "general",
        message: "Need help verifying a receipt.",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 500);
  const payload = (await response.json()) as { ok?: boolean; error: string };
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "Unable to issue verification token.");
});
