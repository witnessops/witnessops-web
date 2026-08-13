import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  clearTokenStore,
  getIssuanceById,
  updateIssuance,
  withIssuanceLock,
} from "@/lib/server/token-store";
import {
  claimantSessionCookieName,
  createClaimantSessionCookieValue,
} from "@/lib/server/claimant-session";

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

function claimantSessionCookie(issuanceId: string, email: string): string {
  return `${claimantSessionCookieName(issuanceId)}=${createClaimantSessionCookieValue({
    issuanceId,
    email,
  })}`;
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
      {
        headers: {
          Cookie: claimantSessionCookie(issued.issuanceId, issued.email),
        },
      },
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

test("assessment polling cannot overwrite lifecycle state written under the issuance lock", async () => {
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
  }));

  let assessmentRequested = false;
  global.fetch = (async () => {
    assessmentRequested = true;
    return new Response(
      JSON.stringify({
        ok: true,
        run_id: "run_demo123",
        status: "completed",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  const request = new Request(
    `https://witnessops.com/api/assessment/${encodeURIComponent(issued.issuanceId)}?email=${encodeURIComponent(issued.email)}`,
    {
      headers: {
        Cookie: claimantSessionCookie(issued.issuanceId, issued.email),
      },
    },
  );

  let pollingSettled = false;
  let pollingPromise: Promise<Response> | undefined;
  await withIssuanceLock(issued.issuanceId, async () => {
    pollingPromise = GET(request, {
      params: Promise.resolve({ issuanceId: issued.issuanceId }),
    }).finally(() => {
      pollingSettled = true;
    });

    for (let attempt = 0; attempt < 50 && !assessmentRequested; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    assert.equal(assessmentRequested, true);

    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(
      pollingSettled,
      false,
      "assessment polling must wait for the lifecycle lock",
    );

    await updateIssuance(issued.issuanceId, (record) => ({
      ...record,
      approvalStatus: "approval_denied",
    }));
  });

  assert.ok(pollingPromise);
  const response = await pollingPromise;
  assert.equal(response.status, 200);

  const stored = await getIssuanceById(issued.issuanceId);
  assert.equal(stored?.approvalStatus, "approval_denied");
  assert.equal(stored?.assessmentStatus, "completed");
});

test("assessment route rejects issuance and email without claimant session", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-assessment-"));
  const issued = await issueToken(baseDir);
  await updateIssuance(issued.issuanceId, (record) => ({
    ...record,
    status: "verified",
    verifiedAt: "2026-03-28T12:00:00Z",
    consumedAt: "2026-03-28T12:00:00Z",
    assessmentRunId: "run_demo123",
    assessmentStatus: "pending",
  }));

  const response = await GET(
    new Request(
      `https://witnessops.com/api/assessment/${encodeURIComponent(issued.issuanceId)}?email=${encodeURIComponent(issued.email)}`,
    ),
    { params: Promise.resolve({ issuanceId: issued.issuanceId }) },
  );

  assert.equal(response.status, 401);
});
