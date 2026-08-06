import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { POST } from "./route";

test("logout clears the admin session and every OIDC transaction", async () => {
  const response = await POST(
    new NextRequest("https://witnessops.com/api/admin/logout?ignored=value", {
      method: "POST",
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
      "witnessops-admin-oidc-state",
      "witnessops-admin-session",
    ],
  );
  assert.ok(cookies.every((cookie) => cookie.value === ""));

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /Max-Age=0/i);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
});
