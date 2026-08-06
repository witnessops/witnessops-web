import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";
import { buildAdminPublicUrl } from "./admin-auth-origin";

const originalNodeEnv = process.env.NODE_ENV;
const mutableEnv = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string };

test.afterEach(() => {
  if (originalNodeEnv === undefined) {
    Reflect.deleteProperty(mutableEnv, "NODE_ENV");
  } else {
    mutableEnv.NODE_ENV = originalNodeEnv;
  }
});

test("admin redirects never expose an internal production request origin", () => {
  mutableEnv.NODE_ENV = "production";
  const request = new NextRequest("https://0.0.0.0:3000/api/admin/logout");
  assert.equal(
    buildAdminPublicUrl("/admin/login", request).toString(),
    "https://witnessops.com/admin/login",
  );
});

test("admin redirects retain exact loopback origins only outside production", () => {
  mutableEnv.NODE_ENV = "development";
  const request = new NextRequest("http://localhost:3001/api/admin/logout");
  assert.equal(
    buildAdminPublicUrl("/admin/login", request).toString(),
    "http://localhost:3001/admin/login",
  );
});

test("admin redirect paths must remain root-relative", () => {
  assert.throws(() => buildAdminPublicUrl("https://evil.example/admin"));
  assert.throws(() => buildAdminPublicUrl("//evil.example/admin"));
});
