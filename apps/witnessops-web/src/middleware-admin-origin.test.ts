import assert from "node:assert/strict";
import test from "node:test";

import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server.js";
import { NextRequest } from "next/server";

import { config, middleware } from "./middleware";

const originalNodeEnv = process.env.NODE_ENV;
const mutableEnv = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string };

test.afterEach(() => {
  if (originalNodeEnv === undefined) {
    Reflect.deleteProperty(mutableEnv, "NODE_ENV");
  } else {
    mutableEnv.NODE_ENV = originalNodeEnv;
  }
});

function adminRequest(
  path: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: BodyInit;
  } = {},
): NextRequest {
  return new NextRequest(`https://witnessops.com${path}`, {
    method: init.method,
    headers: init.headers,
    body: init.body,
  });
}

test("middleware centrally matches admin API mutations", () => {
  assert.equal(
    unstable_doesMiddlewareMatch({
      config,
      url: "https://witnessops.com/api/admin/core/deliveries/customer.receipt.v1",
    }),
    true,
  );
});

test("admin mutations reject a same-site sibling simple request", async () => {
  mutableEnv.NODE_ENV = "production";
  const response = await middleware(
    adminRequest("/api/admin/core/products", {
      method: "POST",
      headers: {
        origin: "https://evil.witnessops.com",
        "content-type": "text/plain",
      },
      body: JSON.stringify({}),
    }),
  );

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Invalid request origin.",
  });
});

test("admin mutations fail closed when Origin and Referer are absent", async () => {
  mutableEnv.NODE_ENV = "production";
  const response = await middleware(
    adminRequest("/api/admin/queue/command", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }),
  );

  assert.equal(response.status, 403);
});

test("admin mutations accept the exact apex Origin or Referer", async () => {
  mutableEnv.NODE_ENV = "production";

  const trustedHeaders: Array<Record<string, string>> = [
    { origin: "https://witnessops.com" },
    { referer: "https://witnessops.com/admin/queue" },
  ];
  for (const headers of trustedHeaders) {
    const response = await middleware(
      adminRequest("/api/admin/queue/command", {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      }),
    );

    assert.equal(response.headers.get("x-middleware-next"), "1");
  }
});

test("OIDC callback remains exempt from the admin mutation origin gate", async () => {
  mutableEnv.NODE_ENV = "production";
  const response = await middleware(
    adminRequest("/api/admin/google/callback", {
      method: "POST",
      headers: {
        origin: "https://accounts.google.com",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "state=test&code=test",
    }),
  );

  assert.equal(response.headers.get("x-middleware-next"), "1");
});

test("safe admin API reads do not require mutation-origin headers", async () => {
  mutableEnv.NODE_ENV = "production";
  const response = await middleware(
    adminRequest("/api/admin/intake/reconciliation-report"),
  );

  assert.equal(response.headers.get("x-middleware-next"), "1");
});
