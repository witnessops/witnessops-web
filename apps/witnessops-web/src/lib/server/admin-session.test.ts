import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import { NextRequest } from "next/server";

import {
  createAdminSessionCookie,
  getVerifiedAdminSession,
  isLocalAdminRequest,
} from "./admin-session";

const originalNodeEnv = process.env.NODE_ENV;
const originalLocalBypass = process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
const originalAdminSecret = process.env.WITNESSOPS_ADMIN_SECRET;
const mutableEnv = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string };

afterEach(() => {
  if (originalNodeEnv === undefined) {
    Reflect.deleteProperty(mutableEnv, "NODE_ENV");
  } else {
    mutableEnv.NODE_ENV = originalNodeEnv;
  }

  if (originalLocalBypass === undefined) {
    Reflect.deleteProperty(process.env, "WITNESSOPS_LOCAL_ADMIN_BYPASS");
  } else {
    process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = originalLocalBypass;
  }

  if (originalAdminSecret === undefined) {
    Reflect.deleteProperty(process.env, "WITNESSOPS_ADMIN_SECRET");
  } else {
    process.env.WITNESSOPS_ADMIN_SECRET = originalAdminSecret;
  }
});

function makeRequest(host: string): NextRequest {
  return new NextRequest("https://example.com/admin", {
    headers: {
      host,
    },
  });
}

test("isLocalAdminRequest requires an exact localhost host", () => {
  mutableEnv.NODE_ENV = "development";
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";

  assert.equal(isLocalAdminRequest(makeRequest("localhost:3001")), true);
  assert.equal(isLocalAdminRequest(makeRequest("127.0.0.1:3001")), true);
  assert.equal(isLocalAdminRequest(makeRequest("localhost.evil.com")), false);
  assert.equal(isLocalAdminRequest(makeRequest("127.0.0.1.evil.com")), false);
});

test("getVerifiedAdminSession disables the local bypass in production", async () => {
  mutableEnv.NODE_ENV = "production";
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";

  const session = await getVerifiedAdminSession(makeRequest("localhost:3001"));
  assert.equal(session, null);
});

test("isLocalAdminRequest requires explicit bypass enablement", () => {
  mutableEnv.NODE_ENV = "development";
  delete process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;

  assert.equal(isLocalAdminRequest(makeRequest("localhost:3001")), false);
});

test("getVerifiedAdminSession accepts signed oidc admin sessions", async () => {
  mutableEnv.NODE_ENV = "production";
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";

  const cookie = await createAdminSessionCookie({
    actor: "entra:alice@example.com",
    actorAuthSource: "oidc_session",
    actorSessionHash: "abcd1234efgh5678",
    exp: Date.now() + 60_000,
  });

  const request = new NextRequest("https://witnessops.com/admin", {
    headers: {
      cookie: `witnessops-admin-session=${cookie}`,
    },
  });

  const session = await getVerifiedAdminSession(request);
  assert.deepEqual(session, {
    actor: "entra:alice@example.com",
    actorAuthSource: "oidc_session",
    actorSessionHash: "abcd1234efgh5678",
    isLocalBypass: false,
  });
});
