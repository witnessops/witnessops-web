import test from "node:test";
import assert from "node:assert/strict";

import { NextRequest } from "next/server";

import { createAdminSessionCookie } from "@/lib/server/admin-session";

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

test.afterEach(() => {
  restoreEnv();
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
    }),
    { params: Promise.resolve({ runId: "run_demo123" }) },
  );

  assert.equal(response.status, 409);
  const payload = (await response.json()) as { ok: boolean; error: string };
  assert.equal(payload.ok, false);
  assert.match(payload.error, /already authorized/);
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
    assert.equal(headers["X-WitnessOps-Actor"], "entra:alice@example.com");
    assert.equal(headers["X-WitnessOps-Actor-Auth-Source"], "oidc_session");
    assert.equal(
      headers["X-WitnessOps-Actor-Session-Hash"],
      "abcd1234efgh5678",
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

  const sessionCookie = await createAdminSessionCookie({
    actor: "entra:alice@example.com",
    actorAuthSource: "oidc_session",
    actorSessionHash: "abcd1234efgh5678",
    exp: Date.now() + 60_000,
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
  assert.equal(payload.actor, "entra:alice@example.com");
  assert.equal(payload.actorAuthSource, "oidc_session");
  assert.equal(payload.actorSessionHash, "abcd1234efgh5678");
});
