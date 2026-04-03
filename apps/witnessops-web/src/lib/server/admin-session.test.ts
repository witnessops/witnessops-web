import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import { NextRequest } from "next/server";

import {
  getVerifiedAdminSession,
  isLocalAdminRequest,
} from "./admin-session";

const originalNodeEnv = process.env.NODE_ENV;
const mutableEnv = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string };

afterEach(() => {
  if (originalNodeEnv === undefined) {
    Reflect.deleteProperty(mutableEnv, "NODE_ENV");
  } else {
    mutableEnv.NODE_ENV = originalNodeEnv;
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

  assert.equal(isLocalAdminRequest(makeRequest("localhost:3001")), true);
  assert.equal(isLocalAdminRequest(makeRequest("127.0.0.1:3001")), true);
  assert.equal(isLocalAdminRequest(makeRequest("localhost.evil.com")), false);
  assert.equal(isLocalAdminRequest(makeRequest("127.0.0.1.evil.com")), false);
});

test("getVerifiedAdminSession disables the local bypass in production", async () => {
  mutableEnv.NODE_ENV = "production";

  const session = await getVerifiedAdminSession(makeRequest("localhost:3001"));
  assert.equal(session, null);
});
