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
  process.env.WITNESSOPS_TOKEN_FROM_EMAIL = "engage@witnessops.com";
  process.env.WITNESSOPS_VERIFY_BASE_URL = "https://witnessops.com";
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAILBOX_ENGAGE = "engage@witnessops.com";
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

afterEach(async () => {
  await clearTokenStore();
});

test("engage route rejects freemail server-side", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-engage-"));
  applyTestEnv(baseDir);

  const response = await POST(
    new Request("https://witnessops.com/api/engage", {
      method: "POST",
      body: JSON.stringify({ email: "user@gmail.com" }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { error: string };
  assert.match(payload.error, /business email/i);
});

test("engage route creates issuance metadata and persists only token digest", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-engage-"));
  applyTestEnv(baseDir);

  const response = await POST(
    new Request("https://witnessops.com/api/engage", {
      method: "POST",
      body: JSON.stringify({ email: "security@witnessops.com" }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 201);
  const payload = (await response.json()) as {
    channel: string;
    intakeId: string;
    issuanceId: string;
    threadId: string | null;
    email: string;
    createdAt: string;
    expiresAt: string;
    status: string;
    admissionState: string;
  };

  assert.equal(payload.channel, "engage");
  assert.equal(payload.email, "security@witnessops.com");
  assert.equal(payload.status, "issued");
  assert.equal(payload.admissionState, "verification_sent");
  assert.ok(payload.issuanceId.startsWith("iss_"));
  assert.ok(payload.intakeId.startsWith("intk_"));
  assert.equal(payload.threadId, null);

  const issuanceRaw = await readFile(
    path.join(
      process.env.WITNESSOPS_TOKEN_STORE_DIR!,
      "issuances",
      `${payload.issuanceId}.json`,
    ),
    "utf8",
  );
  assert.match(issuanceRaw, /"tokenDigest":\s*"sha256:/);
  assert.doesNotMatch(issuanceRaw, /"token":/);

  const mailFiles = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  assert.equal(mailFiles.length, 1);
  const mailRaw = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, mailFiles[0]),
    "utf8",
  );
  const tokenMatch = mailRaw.match(/^Token:\s+(.+)$/m);
  assert.ok(tokenMatch);
  assert.equal(issuanceRaw.includes(tokenMatch[1]), false);

  const intakeRaw = await readFile(
    path.join(
      process.env.WITNESSOPS_TOKEN_STORE_DIR!,
      "intakes",
      `${payload.intakeId}.json`,
    ),
    "utf8",
  );
  assert.match(intakeRaw, /"state":\s*"verification_sent"/);
  assert.match(intakeRaw, /"latestIssuanceId":\s*"iss_/);

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
          intake_id: string;
          channel: string;
          next_state: string;
        },
    );
  assert.deepEqual(
    events.map((event) => event.event_type),
    ["INTAKE_SUBMITTED", "INTAKE_VERIFICATION_SENT"],
  );
  assert.ok(events.every((event) => event.intake_id === payload.intakeId));
  assert.ok(events.every((event) => event.channel === "engage"));
  assert.equal(events.at(-1)?.next_state, "verification_sent");
});

test("engage route redacts upstream issuance errors", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-engage-"));
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "invalid";

  const response = await POST(
    new Request("https://witnessops.com/api/engage", {
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
