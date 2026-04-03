import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { clearTokenStore, updateIssuance } from "@/lib/server/token-store";

import { POST as engage } from "../engage/route";
import { POST as support } from "../support/route";
import { GET, POST } from "./route";

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
  return { issuanceId: issuance.issuanceId, email: issuance.email, token };
}

async function issueSupportToken(baseDir: string) {
  applyTestEnv(baseDir);
  const response = await support(
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
  return { issuanceId: issuance.issuanceId, email: issuance.email, token };
}

afterEach(async () => {
  global.fetch = originalFetch;
  delete process.env.GES_SERVER_URL;
  delete process.env.GES_ASSESSMENT_KEY;
  await clearTokenStore();
});

test("verify-token route requires issuanceId + email + token", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  applyTestEnv(baseDir);

  const response = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify({ email: "security@witnessops.com", token: "x" }),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 400);
});

test("verify-token route allows repeat verification for the same issuance and token", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  const issued = await issueToken(baseDir);

  const first = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(first.status, 200);
  const firstPayload = (await first.json()) as {
    channel: string;
    intakeId: string;
    status: string;
    admissionState: string;
    threadId: string | null;
    verifiedAt: string;
    assessmentRunId: string | null;
    assessmentStatus: string;
  };
  assert.equal(firstPayload.channel, "engage");
  assert.ok(firstPayload.intakeId.startsWith("intk_"));
  assert.equal(firstPayload.status, "verified");
  assert.equal(firstPayload.admissionState, "admitted");
  assert.ok(firstPayload.threadId?.startsWith("thr_"));
  assert.equal(firstPayload.assessmentRunId, null);
  assert.equal(firstPayload.assessmentStatus, "unavailable");

  const second = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(second.status, 200);
  const secondPayload = (await second.json()) as {
    status: string;
    admissionState: string;
    threadId: string | null;
    verifiedAt: string;
    assessmentRunId: string | null;
    assessmentStatus: string;
  };
  assert.equal(secondPayload.status, "verified");
  assert.equal(secondPayload.admissionState, "admitted");
  assert.equal(secondPayload.verifiedAt, firstPayload.verifiedAt);
  assert.equal(secondPayload.threadId, firstPayload.threadId);
  assert.equal(secondPayload.assessmentRunId, null);
  assert.equal(secondPayload.assessmentStatus, "unavailable");
});

test("verify-token route triggers the assessment once and reuses the stored run id", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
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

  const issued = await issueToken(baseDir);

  const first = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(first.status, 200);
  const firstPayload = (await first.json()) as {
    channel: string;
    intakeId: string;
    assessmentRunId: string | null;
    assessmentStatus: string;
    admissionState: string;
    threadId: string | null;
    run_id?: string;
  };
  assert.equal(firstPayload.channel, "engage");
  assert.ok(firstPayload.intakeId.startsWith("intk_"));
  assert.equal(firstPayload.admissionState, "admitted");
  assert.ok(firstPayload.threadId?.startsWith("thr_"));
  assert.equal(firstPayload.assessmentRunId, "run_demo123");
  assert.equal(firstPayload.assessmentStatus, "pending");
  assert.equal(firstPayload.run_id, "run_demo123");
  assert.equal(fetchCalls.length, 1);

  const second = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(second.status, 200);
  const secondPayload = (await second.json()) as {
    assessmentRunId: string | null;
    assessmentStatus: string;
    run_id?: string;
  };
  assert.equal(secondPayload.assessmentRunId, "run_demo123");
  assert.equal(secondPayload.assessmentStatus, "pending");
  assert.equal(secondPayload.run_id, "run_demo123");
  assert.equal(fetchCalls.length, 1);
});

test("verify-token route enforces expiry", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  const issued = await issueToken(baseDir);

  await updateIssuance(issued.issuanceId, (record) => ({
    ...record,
    expiresAt: "2000-01-01T00:00:00Z",
  }));

  const response = await POST(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(issued),
      headers: { "Content-Type": "application/json" },
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as { error: string };
  assert.match(payload.error, /expired/i);
});

test("verify-token GET route redirects to assessment results page on success", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  const issued = await issueToken(baseDir);

  const response = await GET(
    new Request(
      `https://witnessops.com/api/verify-token?issuanceId=${encodeURIComponent(issued.issuanceId)}&email=${encodeURIComponent(issued.email)}&token=${encodeURIComponent(issued.token)}`,
    ),
  );

  assert.equal(response.status, 302);
  const location = response.headers.get("location") ?? "";
  assert.ok(
    location.includes(`/assessment/${issued.issuanceId}`),
    `Expected redirect to /assessment/:issuanceId, got: ${location}`,
  );
  assert.ok(
    location.includes("email="),
    `Expected email param in redirect URL, got: ${location}`,
  );
});

test("verify-token GET route redirects support verification to the support page", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-support-verify-"),
  );
  const issued = await issueSupportToken(baseDir);

  const response = await GET(
    new Request(
      `https://witnessops.com/api/verify-token?issuanceId=${encodeURIComponent(issued.issuanceId)}&email=${encodeURIComponent(issued.email)}&token=${encodeURIComponent(issued.token)}`,
    ),
  );

  assert.equal(response.status, 302);
  const location = response.headers.get("location") ?? "";
  assert.ok(
    location.includes("/support?verified=1"),
    `Expected redirect to /support with verified=1, got: ${location}`,
  );
  assert.ok(
    location.includes("threadId=thr_"),
    `Expected redirect to include threadId, got: ${location}`,
  );
});
