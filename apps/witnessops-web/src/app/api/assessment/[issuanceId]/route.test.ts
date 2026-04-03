import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  clearTokenStore,
  getIssuanceById,
  updateIssuance,
} from "@/lib/server/token-store";

import { POST as engage } from "../../engage/route";
import { GET } from "./route";

const originalFetch = global.fetch;

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

async function issueToken(baseDir: string) {
  applyTestEnv(baseDir);
  const response = await engage(
    new Request("https://witnessops.com/api/engage", {
      method: "POST",
      body: JSON.stringify({ email: "security@witnessops.com" }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  return await response.json() as { issuanceId: string; email: string };
}

afterEach(async () => {
  global.fetch = originalFetch;
  delete process.env.GES_SERVER_URL;
  delete process.env.GES_ASSESSMENT_KEY;
  await clearTokenStore();
});

test("assessment route persists live status updates back to the issuance record", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-assessment-"));
  process.env.GES_SERVER_URL = "http://ges.internal";
  process.env.GES_ASSESSMENT_KEY = "ges-key";

  const issued = await issueToken(baseDir);
  await updateIssuance(issued.issuanceId, (record) => ({
    ...record,
    status: "verified",
    verifiedAt: "2026-03-28T12:00:00Z",
    consumedAt: "2026-03-28T12:00:00Z",
    assessmentRunId: "run_demo123",
    assessmentStatus: "pending",
    assessmentError: "stale error",
  }));

  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        ok: true,
        run_id: "run_demo123",
        status: "completed",
        domain: "witnessops.com",
        findings_count: 0,
        envelopes_count: 1,
        checks_count: 5,
        signed_with: "vm-cast-ed25519",
        completed_at: "2026-03-28T12:01:00Z",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )) as typeof fetch;

  const response = await GET(
    new Request(
      `https://witnessops.com/api/assessment/${encodeURIComponent(issued.issuanceId)}?email=${encodeURIComponent(issued.email)}`,
    ),
    { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
  );

  assert.equal(response.status, 200);
  const payload = await response.json() as {
    assessmentStatus: string;
    assessmentRunId: string | null;
  };
  assert.equal(payload.assessmentStatus, "completed");
  assert.equal(payload.assessmentRunId, "run_demo123");

  const stored = await getIssuanceById(issued.issuanceId);
  assert.equal(stored?.assessmentStatus, "completed");
  assert.equal(stored?.assessmentError, null);
});
