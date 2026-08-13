import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";

import { createAdminSessionCookie } from "@/lib/server/admin-session";
import {
  clearTokenStore,
  saveIntake,
  saveIssuance,
  type IntakeRecord,
  type TokenIssuanceRecord,
} from "@/lib/server/token-store";

import { POST } from "./route";

const originalFetch = globalThis.fetch;
const originalControlPlaneUrl = process.env.CONTROL_PLANE_URL;
const originalControlPlaneApiKey = process.env.CONTROL_PLANE_API_KEY;
const originalControlPlaneServiceIdentitySecret =
  process.env.CONTROL_PLANE_SERVICE_IDENTITY_SECRET;
const originalControlPlaneServiceIdentitySubject =
  process.env.CONTROL_PLANE_SERVICE_IDENTITY_SUBJECT;
const originalLocalAdminBypass = process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
const originalAdminSecret = process.env.WITNESSOPS_ADMIN_SECRET;

function restoreEnv() {
  globalThis.fetch = originalFetch;
  if (originalControlPlaneUrl === undefined) {
    delete process.env.CONTROL_PLANE_URL;
  } else {
    process.env.CONTROL_PLANE_URL = originalControlPlaneUrl;
  }
  if (originalControlPlaneApiKey === undefined) {
    delete process.env.CONTROL_PLANE_API_KEY;
  } else {
    process.env.CONTROL_PLANE_API_KEY = originalControlPlaneApiKey;
  }
  if (originalControlPlaneServiceIdentitySecret === undefined) {
    delete process.env.CONTROL_PLANE_SERVICE_IDENTITY_SECRET;
  } else {
    process.env.CONTROL_PLANE_SERVICE_IDENTITY_SECRET =
      originalControlPlaneServiceIdentitySecret;
  }
  if (originalControlPlaneServiceIdentitySubject === undefined) {
    delete process.env.CONTROL_PLANE_SERVICE_IDENTITY_SUBJECT;
  } else {
    process.env.CONTROL_PLANE_SERVICE_IDENTITY_SUBJECT =
      originalControlPlaneServiceIdentitySubject;
  }
  if (originalLocalAdminBypass === undefined) {
    delete process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
  } else {
    process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = originalLocalAdminBypass;
  }
  if (originalAdminSecret === undefined) {
    delete process.env.WITNESSOPS_ADMIN_SECRET;
  } else {
    process.env.WITNESSOPS_ADMIN_SECRET = originalAdminSecret;
  }
}

test.beforeEach(async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-authorize-"));
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  const intake: IntakeRecord = {
    intakeId: "intk_demo123",
    channel: "engage",
    email: "buyer@example.com",
    state: "admitted",
    createdAt: "2026-08-13T08:00:00Z",
    updatedAt: "2026-08-13T08:00:00Z",
    latestIssuanceId: "iss_demo123",
    threadId: "thr_demo123",
    submission: {},
  };
  const issuance: TokenIssuanceRecord = {
    issuanceId: "iss_demo123",
    intakeId: intake.intakeId,
    channel: intake.channel,
    email: intake.email,
    tokenDigest: "sha256:test",
    createdAt: intake.createdAt,
    expiresAt: "2026-08-13T08:15:00Z",
    status: "verified",
    controlPlaneRunId: "run_demo123",
    delivery: {
      mailbox: "engage@witnessops.com",
      alias: null,
      templateVersion: "test-v1",
      provider: "file",
      providerMessageId: null,
      deliveredAt: intake.createdAt,
    },
  };
  await saveIntake(intake);
  await saveIssuance(issuance);
});

test.afterEach(async () => {
  restoreEnv();
  delete process.env.WITNESSOPS_TOKEN_STORE_DIR;
  await clearTokenStore();
});

test("admin authorize route advances a requested run", async () => {
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";
  process.env.CONTROL_PLANE_URL = "https://cp.example.com";
  process.env.CONTROL_PLANE_SERVICE_IDENTITY_SECRET = "service-secret";
  process.env.CONTROL_PLANE_SERVICE_IDENTITY_SUBJECT = "witnessops-web";
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://cp.example.com/v1/runs/run_demo123/authorize");
    assert.equal(init?.method, "POST");
    const headers = init?.headers as Record<string, string>;
    assert.ok(headers["X-WitnessOps-Service-Assertion"]);
    assert.equal(headers["X-WitnessOps-Actor"], "local-dev");
    assert.equal(headers["X-WitnessOps-Actor-Auth-Source"], "local_bypass");
    assert.equal(headers["X-API-Key"], undefined);
    return new Response(
      JSON.stringify({
        run_id: "run_demo123",
        state: "authorized",
        bundle_present: false,
        delivery_present: false,
        acknowledgment_present: false,
        completion_present: false,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  const response = await POST(
    new NextRequest("http://localhost:3001/api/admin/lifecycle/run_demo123/authorize", {
      method: "POST",
      headers: { host: "localhost:3001" },
    }),
    { params: Promise.resolve({ runId: "run_demo123" }) },
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    actor: string;
    actorAuthSource: string;
    actorSessionHash: string | null;
    note: string;
    run: { state: string };
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.actor, "local-dev");
  assert.equal(payload.actorAuthSource, "local_bypass");
  assert.equal(payload.actorSessionHash, null);
  assert.equal(payload.run.state, "authorized");
  assert.match(payload.note, /Execution may proceed/);
});

test("admin authorize route returns explicit control-plane conflicts", async () => {
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";
  process.env.CONTROL_PLANE_URL = "https://cp.example.com";
  process.env.CONTROL_PLANE_SERVICE_IDENTITY_SECRET = "service-secret";
  process.env.CONTROL_PLANE_SERVICE_IDENTITY_SUBJECT = "witnessops-web";
  globalThis.fetch = async () =>
    new Response("run is already authorized", { status: 409 });

  const response = await POST(
    new NextRequest("http://localhost:3001/api/admin/lifecycle/run_demo123/authorize", {
      method: "POST",
      headers: { host: "localhost:3001" },
    }),
    { params: Promise.resolve({ runId: "run_demo123" }) },
  );

  assert.equal(response.status, 409);
  const payload = (await response.json()) as { ok: boolean; error: string };
  assert.equal(payload.ok, false);
  assert.equal(payload.error, "Control-plane run authorization conflicts with its current state.");
  assert.doesNotMatch(payload.error, /already authorized/);
});

test("admin authorize route does not expose upstream error bodies", async () => {
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";
  process.env.CONTROL_PLANE_URL = "https://cp.example.com";
  process.env.CONTROL_PLANE_SERVICE_IDENTITY_SECRET = "service-secret";
  process.env.CONTROL_PLANE_SERVICE_IDENTITY_SUBJECT = "witnessops-web";
  globalThis.fetch = async () =>
    new Response("secret=upstream-token internal=http://cp.private/trace", {
      status: 500,
    });

  const response = await POST(
    new NextRequest("http://localhost:3001/api/admin/lifecycle/run_demo123/authorize", {
      method: "POST",
      headers: { host: "localhost:3001" },
    }),
    { params: Promise.resolve({ runId: "run_demo123" }) },
  );
  const payload = (await response.json()) as { error: string };
  assert.equal(response.status, 502);
  assert.equal(payload.error, "Unable to authorize control-plane run.");
  assert.doesNotMatch(payload.error, /upstream-token|cp\.private/);
});

test("admin authorize route requires admin authentication outside local development", async () => {
  const response = await POST(
    new NextRequest("https://witnessops.com/api/admin/lifecycle/run_demo123/authorize", {
      method: "POST",
    }),
    { params: Promise.resolve({ runId: "run_demo123" }) },
  );

  assert.equal(response.status, 401);
});

test("admin authorize route preserves named oidc actor context", async () => {
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";
  process.env.CONTROL_PLANE_URL = "https://cp.example.com";
  process.env.CONTROL_PLANE_SERVICE_IDENTITY_SECRET = "service-secret";
  process.env.CONTROL_PLANE_SERVICE_IDENTITY_SUBJECT = "witnessops-web";
  globalThis.fetch = async (_input, init) => {
    const headers = init?.headers as Record<string, string>;
    assert.ok(headers["X-WitnessOps-Service-Assertion"]);
    assert.equal(
      headers["X-WitnessOps-Actor"],
      "oidc:https://accounts.google.com#google-subject-authorize",
    );
    assert.equal(headers["X-WitnessOps-Actor-Auth-Source"], "oidc_session");
    assert.equal(
      headers["X-WitnessOps-Actor-Session-Hash"],
      "abcd1234abcd5678",
    );
    return new Response(
      JSON.stringify({
        run_id: "run_demo123",
        state: "authorized",
        bundle_present: false,
        delivery_present: false,
        acknowledgment_present: false,
        completion_present: false,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  const issuedAt = Date.now();
  const sessionCookie = await createAdminSessionCookie({
    version: 3,
    identityProvider: "google",
    issuer: "https://accounts.google.com",
    subject: "google-subject-authorize",
    actor: "oidc:https://accounts.google.com#google-subject-authorize",
    actorAuthSource: "oidc_session",
    actorSessionHash: "abcd1234abcd5678",
    role: "Founder",
    iat: issuedAt,
    exp: issuedAt + 60_000,
  });

  const response = await POST(
    new NextRequest("https://witnessops.com/api/admin/lifecycle/run_demo123/authorize", {
      method: "POST",
      headers: {
        cookie: `witnessops-admin-session=${sessionCookie}`,
      },
    }),
    { params: Promise.resolve({ runId: "run_demo123" }) },
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    actor: string;
    actorAuthSource: string;
    actorSessionHash: string | null;
  };
  assert.equal(
    payload.actor,
    "oidc:https://accounts.google.com#google-subject-authorize",
  );
  assert.equal(payload.actorAuthSource, "oidc_session");
  assert.equal(payload.actorSessionHash, "abcd1234abcd5678");
});
