import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import { NextRequest } from "next/server";

import { middleware } from "@/middleware";

import { POST as reconcileIntake } from "./intake/reconcile/route";
import { GET as reconciliationReport } from "./intake/reconciliation-report/route";
import { POST as rejectIntake } from "./intake/reject/route";
import { POST as requestClarification } from "./intake/request-clarification/route";
import { POST as rescindRejection } from "./intake/rescind-rejection/route";
import { POST as respondToIntake } from "./intake/respond/route";
import { POST as authorizeRun } from "./lifecycle/[runId]/authorize/route";
import { POST as retryRequest } from "./lifecycle/[runId]/retry-request/route";
import { POST as queueCommand } from "./queue/command/route";
import { POST as verifyQueueProjection } from "./queue/verify-projection/route";

const originalLocalBypass = process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
const originalNodeEnv = process.env.NODE_ENV;
const mutableEnv = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string };

afterEach(() => {
  if (originalLocalBypass === undefined) {
    Reflect.deleteProperty(process.env, "WITNESSOPS_LOCAL_ADMIN_BYPASS");
  } else {
    process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = originalLocalBypass;
  }

  if (originalNodeEnv === undefined) {
    Reflect.deleteProperty(mutableEnv, "NODE_ENV");
  } else {
    mutableEnv.NODE_ENV = originalNodeEnv;
  }
});

function spoofedAdminRequest(
  path: string,
  init: {
    method?: string;
    body?: BodyInit;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  return new NextRequest(`https://staging.example.test${path}`, {
    method: init.method,
    body: init.body,
    headers: {
      host: "staging.example.test",
      "x-forwarded-host": "localhost",
      ...init.headers,
    },
  });
}

function directLocalhostRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3001${path}`, {
    headers: { host: "localhost:3001" },
  });
}

test("spoofed forwarded localhost does not bypass protected admin API routes", async () => {
  mutableEnv.NODE_ENV = "development";
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";

  const body = JSON.stringify({});
  const postHeaders = { "Content-Type": "application/json" };
  const runContext = { params: Promise.resolve({ runId: "run_demo123" }) };

  const cases: Array<{
    name: string;
    call: () => Promise<Response>;
  }> = [
    {
      name: "intake reconcile",
      call: () =>
        reconcileIntake(
          spoofedAdminRequest("/api/admin/intake/reconcile", {
            method: "POST",
            body,
            headers: postHeaders,
          }),
        ),
    },
    {
      name: "intake reconciliation report",
      call: () =>
        reconciliationReport(
          spoofedAdminRequest("/api/admin/intake/reconciliation-report"),
        ),
    },
    {
      name: "intake reject",
      call: () =>
        rejectIntake(
          spoofedAdminRequest("/api/admin/intake/reject", {
            method: "POST",
            body,
            headers: postHeaders,
          }),
        ),
    },
    {
      name: "intake request clarification",
      call: () =>
        requestClarification(
          spoofedAdminRequest("/api/admin/intake/request-clarification", {
            method: "POST",
            body,
            headers: postHeaders,
          }),
        ),
    },
    {
      name: "intake rescind rejection",
      call: () =>
        rescindRejection(
          spoofedAdminRequest("/api/admin/intake/rescind-rejection", {
            method: "POST",
            body,
            headers: postHeaders,
          }),
        ),
    },
    {
      name: "intake respond",
      call: () =>
        respondToIntake(
          spoofedAdminRequest("/api/admin/intake/respond", {
            method: "POST",
            body,
            headers: postHeaders,
          }),
        ),
    },
    {
      name: "lifecycle authorize",
      call: () =>
        authorizeRun(
          spoofedAdminRequest("/api/admin/lifecycle/run_demo123/authorize", {
            method: "POST",
            headers: postHeaders,
          }),
          runContext,
        ),
    },
    {
      name: "lifecycle retry request",
      call: () =>
        retryRequest(
          spoofedAdminRequest("/api/admin/lifecycle/run_demo123/retry-request", {
            method: "POST",
            body,
            headers: postHeaders,
          }),
          runContext,
        ),
    },
    {
      name: "queue command",
      call: () =>
        queueCommand(
          spoofedAdminRequest("/api/admin/queue/command", {
            method: "POST",
            body,
            headers: postHeaders,
          }),
        ),
    },
    {
      name: "queue verify projection",
      call: () =>
        verifyQueueProjection(
          spoofedAdminRequest("/api/admin/queue/verify-projection", {
            method: "POST",
            body,
            headers: postHeaders,
          }),
        ),
    },
  ];

  for (const routeCase of cases) {
    const response = await routeCase.call();
    assert.equal(response.status, 401, routeCase.name);
  }
});

test("spoofed forwarded localhost does not bypass admin page middleware", async () => {
  mutableEnv.NODE_ENV = "development";
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";

  const response = await middleware(
    spoofedAdminRequest("/admin/queue?customer=private-value"),
  );

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location")!);
  assert.equal(location.pathname, "/admin/login");
  assert.equal(location.searchParams.get("returnTo"), "/admin/queue");
  assert.equal(location.searchParams.has("customer"), false);
});

test("direct localhost Host does not bypass admin page middleware in development", async () => {
  mutableEnv.NODE_ENV = "development";
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";

  const response = await middleware(directLocalhostRequest("/admin/queue"));

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location")!);
  assert.equal(location.pathname, "/admin/login");
  assert.equal(location.searchParams.get("returnTo"), "/admin/queue");
});
