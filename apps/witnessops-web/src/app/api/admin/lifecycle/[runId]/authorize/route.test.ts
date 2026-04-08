import test from "node:test";
import assert from "node:assert/strict";

import { NextRequest } from "next/server";

import { POST } from "./route";

const originalFetch = globalThis.fetch;
const originalControlPlaneUrl = process.env.CONTROL_PLANE_URL;
const originalControlPlaneApiKey = process.env.CONTROL_PLANE_API_KEY;

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
}

test.afterEach(() => {
  restoreEnv();
});

test("admin authorize route advances a requested run", async () => {
  process.env.CONTROL_PLANE_URL = "https://cp.example.com";
  process.env.CONTROL_PLANE_API_KEY = "test-key";
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://cp.example.com/v1/runs/run_demo123/authorize");
    assert.equal(init?.method, "POST");
    assert.equal((init?.headers as Record<string, string>)["X-API-Key"], "test-key");
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
  process.env.CONTROL_PLANE_URL = "https://cp.example.com";
  process.env.CONTROL_PLANE_API_KEY = "test-key";
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
