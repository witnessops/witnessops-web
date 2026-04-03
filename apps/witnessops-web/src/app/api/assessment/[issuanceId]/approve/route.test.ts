import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { clearTokenStore } from "@/lib/server/token-store";

import { POST as engage } from "../../../engage/route";
import { POST as verifyToken } from "../../../verify-token/route";
import { POST } from "./route";

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

async function issueVerifiedToken(baseDir: string) {
  applyTestEnv(baseDir);
  const response = await engage(
    new Request("https://witnessops.com/api/engage", {
      method: "POST",
      body: JSON.stringify({
        email: "security@witnessops.com",
        intent: "Third-party assessment",
        scope: "Passive-only recon of witnessops.com",
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );
  const issuance = (await response.json()) as {
    issuanceId: string;
    email: string;
  };
  const [mailFile] = await readdir(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!);
  const mailRaw = await readFile(
    path.join(process.env.WITNESSOPS_MAIL_OUTPUT_DIR!, mailFile),
    "utf8",
  );
  const token = mailRaw.match(/^Token:\s+(.+)$/m)?.[1];
  assert.ok(token);

  const verified = await verifyToken(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify({
        issuanceId: issuance.issuanceId,
        email: issuance.email,
        token,
      }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(verified.status, 200);
  return { issuanceId: issuance.issuanceId, email: issuance.email };
}

afterEach(async () => {
  global.fetch = originalFetch;
  delete process.env.GES_SERVER_URL;
  delete process.env.GES_ASSESSMENT_KEY;
  await clearTokenStore();
});

test("approval route captures explicit approval and starts governed recon once", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-approval-"));
  const issued = await issueVerifiedToken(baseDir);
  applyTestEnv(baseDir);
  process.env.GES_SERVER_URL = "http://ges.internal";
  process.env.GES_ASSESSMENT_KEY = "ges-key";

  const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    fetchCalls.push({ input: url, init });
    return new Response(
      JSON.stringify({ run_id: "run_demo123", status: "pending" }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  const response = await POST(
    new Request(
      `https://witnessops.com/api/assessment/${encodeURIComponent(issued.issuanceId)}/approve`,
      {
        method: "POST",
        body: JSON.stringify({
          email: issued.email,
          approverName: "Verified Operator",
          approvalNote: "Approved for passive-only recon.",
        }),
        headers: { "Content-Type": "application/json" },
      },
    ),
    { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    status: string;
    approvalStatus: string;
    approvedAt: string;
    assessmentRunId: string | null;
    assessmentStatus: string;
    run_id?: string;
    approverEmail: string;
    approverName: string | null;
    approvalNote: string | null;
  };
  assert.equal(payload.status, "approved");
  assert.equal(payload.approvalStatus, "approved");
  assert.match(payload.approvedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(payload.assessmentRunId, "run_demo123");
  assert.equal(payload.assessmentStatus, "pending");
  assert.equal(payload.run_id, "run_demo123");
  assert.equal(payload.approverEmail, issued.email);
  assert.equal(payload.approverName, "Verified Operator");
  assert.equal(payload.approvalNote, "Approved for passive-only recon.");
  assert.equal(fetchCalls.length, 1);

  const second = await POST(
    new Request(
      `https://witnessops.com/api/assessment/${encodeURIComponent(issued.issuanceId)}/approve`,
      {
        method: "POST",
        body: JSON.stringify({
          email: issued.email,
        }),
        headers: { "Content-Type": "application/json" },
      },
    ),
    { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
  );

  assert.equal(second.status, 200);
  const secondPayload = (await second.json()) as {
    status: string;
    assessmentRunId: string | null;
    assessmentStatus: string;
  };
  assert.equal(secondPayload.status, "already_approved");
  assert.equal(secondPayload.assessmentRunId, "run_demo123");
  assert.equal(secondPayload.assessmentStatus, "pending");
  assert.equal(fetchCalls.length, 1);
});

test("approval route requires an email", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-approval-"));
  const issued = await issueVerifiedToken(baseDir);

  const response = await POST(
    new Request(
      `https://witnessops.com/api/assessment/${encodeURIComponent(issued.issuanceId)}/approve`,
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      },
    ),
    { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
  );

  assert.equal(response.status, 400);
});
