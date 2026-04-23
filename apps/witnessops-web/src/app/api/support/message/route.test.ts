import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { POST } from "./route";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAILBOX_SUPPORT = "support@witnessops.com";
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");
}

test("support message route sends direct email to support", async () => {
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
  const payload = (await response.json()) as { ok: true; deliveredAt: string };
  assert.equal(payload.ok, true);
  assert.ok(payload.deliveredAt);

  const files = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  const eml = files.find((file) => file.endsWith(".eml"));
  assert.ok(eml);
  const raw = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, eml!),
    "utf8",
  );
  assert.match(raw, /^From:\s+support@witnessops\.com$/m);
  assert.match(raw, /^To:\s+support@witnessops\.com$/m);
  assert.match(raw, /WitnessOps support request/);
  assert.match(raw, /operator@example\.com/);
});

test("support message route returns a failure when delivery fails", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-support-message-"));
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "invalid";

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

  assert.equal(response.status, 500);
  const payload = (await response.json()) as { ok: false; error: string };
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "Unable to send message.");
});
