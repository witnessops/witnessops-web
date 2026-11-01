import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { getIssuanceById } from "./token-store";
import { createVerificationIssuance } from "./token-issuance";

test("synthetic Polish issuance stores the new email template version", async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), "wops-pl-template-test-"));
  const env = {
    WITNESSOPS_TOKEN_SIGNING_SECRET: "synthetic-test-secret",
    WITNESSOPS_TOKEN_TTL_MINUTES: "15",
    WITNESSOPS_TOKEN_FROM_EMAIL: "engage@example.test",
    WITNESSOPS_VERIFY_BASE_URL: "https://example.test",
    WITNESSOPS_MAIL_PROVIDER: "file",
    WITNESSOPS_MAILBOX_ENGAGE: "engage@example.test",
    WITNESSOPS_INTAKE_STORE_DIR: path.join(base, "store"),
    WITNESSOPS_TOKEN_STORE_DIR: path.join(base, "store"),
    WITNESSOPS_MAIL_OUTPUT_DIR: path.join(base, "mail"),
    WITNESSOPS_INTAKE_EVENT_DIR: path.join(base, "audit"),
    WITNESSOPS_TOKEN_AUDIT_DIR: path.join(base, "audit"),
    WITNESSOPS_EMAIL_SIGNATURES_ENABLED: "0",
  };
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  try {
    const issued = await createVerificationIssuance({
      channel: "engage", email: "buyer@example.test", source: "test-polish-template",
      submission: { intent: "agent-action-security-review", locale: "pl", scope: "Synthetic example" },
    });
    const stored = await getIssuanceById(issued.issuanceId);
    assert.equal(stored?.delivery?.provider, "file");
    assert.equal(stored?.delivery?.templateVersion, "tier1-code-v5-light");
    const [file] = await readdir(env.WITNESSOPS_MAIL_OUTPUT_DIR);
    assert.ok(file);
    const text = await readFile(path.join(env.WITNESSOPS_MAIL_OUTPUT_DIR, file), "utf8");
    assert.match(text, /czas w Polsce, UTC\+0[12]:00/);
    assert.match(text, /Otwórz stronę weryfikacji \(po angielsku\)/);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(base, { recursive: true, force: true });
  }
});
