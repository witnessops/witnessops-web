/**
 * Contract tests for the customer proof package disposition route (WEB-014).
 */
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { clearTokenStore, updateIssuance } from "@/lib/server/token-store";

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

async function issueVerifiedRunReady(baseDir: string, runId: string | null) {
  applyTestEnv(baseDir);
  const response = await engage(
    new Request("https://witnessops.com/api/engage", {
      method: "POST",
      body: JSON.stringify({
        email: "customer@witnessops.com",
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

  await verifyToken(
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

  if (runId !== null) {
    await updateIssuance(issuance.issuanceId, (rec) => ({
      ...rec,
      controlPlaneRunId: runId,
    }));
  }

  return { issuanceId: issuance.issuanceId, email: issuance.email };
}

afterEach(async () => {
  global.fetch = originalFetch;
  delete process.env.CONTROL_PLANE_URL;
  delete process.env.CONTROL_PLANE_API_KEY;
  await clearTokenStore();
});

function call(issuanceId: string, body: unknown) {
  return POST(
    new Request(
      `https://witnessops.com/api/package/${encodeURIComponent(issuanceId)}/disposition`,
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      },
    ),
    { params: Promise.resolve({ issuanceId }) },
  );
}

function mockCP(handler: (url: string, init?: RequestInit) => Response) {
  global.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = input instanceof Request ? input.url : input.toString();
    return handler(url, init);
  }) as typeof fetch;
}

test("WEB-014: accept disposition first-write returns ok and forwards to control-plane", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-disp-"));
  const issued = await issueVerifiedRunReady(baseDir, "run_demo123");
  applyTestEnv(baseDir);
  process.env.CONTROL_PLANE_URL = "http://control-plane.internal";
  process.env.CONTROL_PLANE_API_KEY = "cp-key";

  let captured: { url: string; body: unknown } | null = null;
  mockCP((url, init) => {
    captured = {
      url,
      body: init?.body ? JSON.parse(init.body as string) : null,
    };
    return new Response(
      JSON.stringify({
        schema: "customer_acceptance_record",
        run_id: "run_demo123",
        disposition: "accepted",
        accepted_by: issued.email,
        accepted_at: "2026-04-07T10:00:00Z",
        bundle_id: "bundle_abc",
        artifact_hash: "sha256:deadbeef",
        comment: null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });

  const response = await call(issued.issuanceId, {
    email: issued.email,
    disposition: "accepted",
  });
  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    record: { disposition: string; run_id: string };
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.record.disposition, "accepted");
  assert.equal(payload.record.run_id, "run_demo123");
  assert.ok(captured);
  assert.match(
    (captured as { url: string }).url,
    /\/v1\/runs\/run_demo123\/customer-acceptance$/,
  );
  assert.deepEqual((captured as { body: unknown }).body, {
    disposition: "accepted",
    accepted_by: issued.email,
    comment: null,
  });
});

test("WEB-014: idempotent replay returns ok with the existing record", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-disp-"));
  const issued = await issueVerifiedRunReady(baseDir, "run_demo123");
  applyTestEnv(baseDir);
  process.env.CONTROL_PLANE_URL = "http://control-plane.internal";
  process.env.CONTROL_PLANE_API_KEY = "cp-key";

  // Control-plane CP-003 service: same body returns 200 with the existing record.
  mockCP(() =>
    new Response(
      JSON.stringify({
        schema: "customer_acceptance_record",
        run_id: "run_demo123",
        disposition: "accepted",
        accepted_by: issued.email,
        accepted_at: "2026-04-07T10:00:00Z",
        bundle_id: "bundle_abc",
        artifact_hash: "sha256:deadbeef",
        comment: "looks good",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );

  const response = await call(issued.issuanceId, {
    email: issued.email,
    disposition: "accepted",
    comment: "looks good",
  });
  assert.equal(response.status, 200);
});

test("WEB-014: conflicting later write surfaces 409 from control-plane", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-disp-"));
  const issued = await issueVerifiedRunReady(baseDir, "run_demo123");
  applyTestEnv(baseDir);
  process.env.CONTROL_PLANE_URL = "http://control-plane.internal";
  process.env.CONTROL_PLANE_API_KEY = "cp-key";

  mockCP(() =>
    new Response(
      "run run_demo123 already has a customer disposition; first successful write wins",
      { status: 409 },
    ),
  );

  const response = await call(issued.issuanceId, {
    email: issued.email,
    disposition: "rejected",
  });
  assert.equal(response.status, 409);
  const payload = (await response.json()) as { ok: boolean; error: string };
  assert.equal(payload.ok, false);
  assert.match(payload.error, /first successful write wins/);
});

test("WEB-014: missing controlPlaneRunId yields 409 not-yet-available", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-disp-"));
  const issued = await issueVerifiedRunReady(baseDir, null);
  applyTestEnv(baseDir);

  let cpCalled = false;
  mockCP(() => {
    cpCalled = true;
    return new Response("{}", { status: 200 });
  });

  const response = await call(issued.issuanceId, {
    email: issued.email,
    disposition: "accepted",
  });
  assert.equal(response.status, 409);
  assert.equal(cpCalled, false);
});

test("WEB-014: email mismatch yields 403 and never calls control-plane", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-disp-"));
  const issued = await issueVerifiedRunReady(baseDir, "run_demo123");
  applyTestEnv(baseDir);
  process.env.CONTROL_PLANE_URL = "http://control-plane.internal";
  process.env.CONTROL_PLANE_API_KEY = "cp-key";

  let cpCalled = false;
  mockCP(() => {
    cpCalled = true;
    return new Response("{}", { status: 200 });
  });

  const response = await call(issued.issuanceId, {
    email: "intruder@example.com",
    disposition: "accepted",
  });
  assert.equal(response.status, 403);
  assert.equal(cpCalled, false);
});

test("WEB-014: invalid disposition value yields 422", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-disp-"));
  const issued = await issueVerifiedRunReady(baseDir, "run_demo123");
  applyTestEnv(baseDir);

  const response = await call(issued.issuanceId, {
    email: issued.email,
    disposition: "maybe",
  });
  assert.equal(response.status, 422);
});

test("WEB-014: oversized comment yields 422", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-disp-"));
  const issued = await issueVerifiedRunReady(baseDir, "run_demo123");
  applyTestEnv(baseDir);

  const response = await call(issued.issuanceId, {
    email: issued.email,
    disposition: "accepted",
    comment: "x".repeat(2001),
  });
  assert.equal(response.status, 422);
});

test("WEB-014: unknown issuance yields 404", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-disp-"));
  await issueVerifiedRunReady(baseDir, "run_demo123");
  applyTestEnv(baseDir);

  const response = await call("iss_nope", {
    email: "customer@witnessops.com",
    disposition: "accepted",
  });
  assert.equal(response.status, 404);
});

test("WEB-014: not_configured control-plane yields 503", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-disp-"));
  const issued = await issueVerifiedRunReady(baseDir, "run_demo123");
  applyTestEnv(baseDir);
  // Intentionally do NOT set CONTROL_PLANE_URL/API_KEY

  const response = await call(issued.issuanceId, {
    email: issued.email,
    disposition: "accepted",
  });
  assert.equal(response.status, 503);
});
