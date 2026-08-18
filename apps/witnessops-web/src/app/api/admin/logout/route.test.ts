import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { POST } from "./route";

function logoutRequest(
  url: string,
  headers?: Record<string, string>,
): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers,
  });
}

test("logout clears the Google admin session and uses the canonical origin", async () => {
  const response = await POST(
    logoutRequest("https://0.0.0.0:3000/api/admin/logout?ignored=value", {
      origin: "https://witnessops.com",
    }),
  );

  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get("location"),
    "https://witnessops.com/admin/login",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");

  const cookies = response.cookies.getAll();
  assert.deepEqual(
    cookies.map((cookie) => cookie.name).sort(),
    [
      "witnessops-admin-google-oidc-transaction",
      "witnessops-admin-session",
    ],
  );
  assert.ok(cookies.every((cookie) => cookie.value === ""));

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /Max-Age=0/i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
});

test("logout accepts a same-origin Referer when Origin is absent", async () => {
  const response = await POST(
    logoutRequest("https://witnessops.com/api/admin/logout", {
      referer: "https://witnessops.com/admin",
    }),
  );

  assert.equal(response.status, 303);
  assert.ok((response.headers.get("set-cookie") ?? "").includes("Max-Age=0"));
});

test("logout does not clear cookies on a cross-site POST", async () => {
  const response = await POST(
    logoutRequest("https://0.0.0.0:3000/api/admin/logout", {
      origin: "https://evil.example",
    }),
  );

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.cookies.getAll().length, 0);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Invalid request origin.",
  });
});

test("logout does not clear cookies when Origin and Referer are missing", async () => {
  const response = await POST(
    logoutRequest("https://0.0.0.0:3000/api/admin/logout"),
  );

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.cookies.getAll().length, 0);
});
