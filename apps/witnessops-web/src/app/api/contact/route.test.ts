import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { POST } from "./route";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAILBOX_ENGAGE = "engage@witnessops.com";
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");
}

test("contact route sends direct email to engage", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-contact-"));
  applyTestEnv(baseDir);

  const response = await POST(
    new Request("https://witnessops.com/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "K. Witness",
        email: "operator@example.com",
        org: "Example Co",
        intent: "review",
        scope: "One workflow, handled over email.",
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
  assert.match(raw, /^From:\s+engage@witnessops\.com$/m);
  assert.match(raw, /^To:\s+engage@witnessops\.com$/m);
  assert.match(raw, /^X-WitnessOps-Message-Class:\s+internal_notification$/m);
  assert.match(raw, /^X-WitnessOps-Signature-Profile:\s+none$/m);
  assert.match(raw, /WitnessOps review request/);
  assert.match(raw, /operator@example\.com/);
  assert.doesNotMatch(raw, /Karol Stefanski/);
});

test("contact route returns a failure when delivery fails", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-contact-"));
  applyTestEnv(baseDir);
  process.env.WITNESSOPS_MAIL_PROVIDER = "invalid";

  const response = await POST(
    new Request("https://witnessops.com/api/contact", {
      method: "POST",
      body: JSON.stringify({ email: "operator@example.com" }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 500);
  const payload = (await response.json()) as { ok: false; error: string };
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "Unable to send message.");
});
