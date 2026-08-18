import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";
import {
  buildAdminPublicUrl,
  isTrustedAdminMutationOrigin,
} from "./admin-auth-origin";

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

test("trusted admin mutation origin accepts matching Origin or Referer", () => {
  mutableEnv.NODE_ENV = "production";
  assert.equal(
    isTrustedAdminMutationOrigin(
      new NextRequest("https://0.0.0.0:3000/api/admin/logout", {
        headers: { origin: "https://witnessops.com" },
      }),
    ),
    true,
  );
  assert.equal(
    isTrustedAdminMutationOrigin(
      new NextRequest("https://0.0.0.0:3000/api/admin/logout", {
        headers: { referer: "https://witnessops.com/admin" },
      }),
    ),
    true,
  );
});

test("trusted admin mutation origin rejects cross-site, credentialed, and empty senders", () => {
  mutableEnv.NODE_ENV = "production";
  assert.equal(
    isTrustedAdminMutationOrigin(
      new NextRequest("https://0.0.0.0:3000/api/admin/logout", {
        headers: { origin: "https://evil.example" },
      }),
    ),
    false,
  );
  assert.equal(
    isTrustedAdminMutationOrigin(
      new NextRequest("https://0.0.0.0:3000/api/admin/logout", {
        headers: { origin: "https://user:pass@witnessops.com" },
      }),
    ),
    false,
  );
  assert.equal(
    isTrustedAdminMutationOrigin(
      new NextRequest("https://0.0.0.0:3000/api/admin/logout"),
    ),
    false,
  );
});

test("trusted admin mutation origin uses the loopback origin outside production", () => {
  mutableEnv.NODE_ENV = "development";
  const request = new NextRequest("http://localhost:3001/api/admin/logout", {
    headers: { origin: "http://localhost:3001" },
  });
  assert.equal(isTrustedAdminMutationOrigin(request), true);
  assert.equal(
    isTrustedAdminMutationOrigin(
      new NextRequest("http://localhost:3001/api/admin/logout", {
        headers: { origin: "https://witnessops.com" },
      }),
    ),
    false,
  );
});
