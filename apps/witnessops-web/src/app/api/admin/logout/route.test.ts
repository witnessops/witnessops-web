import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test, { beforeEach, afterEach } from "node:test";

import { NextRequest } from "next/server";

import { POST } from "./route";
import { GET } from "../core/[...path]/route";
import {
  createAdminSessionCookie,
  getVerifiedAdminSession,
  verifyAdminSessionCookie,
} from "@/lib/server/admin-session";

const envNames = ["WITNESSOPS_ADMIN_SECRET", "WITNESSOPS_ADMIN_CORE_STORE_DIR", "WITNESSOPS_LOCAL_ADMIN_BYPASS"] as const;
let previous: Array<string | undefined>;
let directory: string;

beforeEach(async () => {
  previous = envNames.map((name) => process.env[name]);
  directory = await mkdtemp(path.join(tmpdir(), "admin-logout-revocation-"));
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = directory;
  process.env.WITNESSOPS_ADMIN_SECRET = "synthetic-logout-test-secret";
  delete process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
});

afterEach(async () => {
  envNames.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name];
    else process.env[name] = previous[index];
  });
  await rm(directory, { recursive: true, force: true });
});

function sessionCookie(issuedAt = Date.now(), expiresAt = issuedAt + 60_000) {
  return createAdminSessionCookie({
    version: 3,
    identityProvider: "google",
    issuer: "https://accounts.google.com",
    subject: "synthetic-operator",
    actor: "oidc:https://accounts.google.com#synthetic-operator",
    actorAuthSource: "oidc_session",
    actorSessionHash: "abcd1234abcd1234",
    role: "Founder",
    iat: issuedAt,
    exp: expiresAt,
  });
}

function requestWithCookie(cookie: string, origin = "https://witnessops.com") {
  return logoutRequest("https://witnessops.com/api/admin/logout", {
    origin,
    cookie: `witnessops-admin-session=${cookie}`,
  });
}

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

test("logout rejects copied cookies at the shared page guard and actual API, preserving another session for the same actor", async () => {
  const now = Date.now();
  const cookie = await sessionCookie(now);
  const otherCookie = await sessionCookie(now - 1000);
  const pageRequest = new NextRequest("https://witnessops.com/admin", {
    headers: { cookie: `witnessops-admin-session=${cookie}` },
  });
  const apiRequest = new NextRequest("https://witnessops.com/api/admin/core/products", {
    headers: { cookie: `witnessops-admin-session=${cookie}` },
  });
  const apiContext = () => ({ params: Promise.resolve({ path: ["products"] }) });
  assert.ok(await getVerifiedAdminSession(pageRequest));
  assert.equal((await GET(apiRequest, apiContext())).status, 200);

  assert.equal((await POST(requestWithCookie(cookie))).status, 303);
  assert.ok(await verifyAdminSessionCookie(cookie), "the signature is still valid, so revocation is what blocks replay");
  assert.equal(await getVerifiedAdminSession(pageRequest), null);
  assert.equal((await GET(apiRequest, apiContext())).status, 401);
  assert.ok(await getVerifiedAdminSession(requestWithCookie(otherCookie)));
  assert.equal((await POST(requestWithCookie(cookie))).status, 303, "repeat logout is idempotent");

  const markers = await readdir(path.join(directory, "revoked-sessions"));
  assert.equal(markers.length, 1);
  assert.match(markers[0]!, /^\d+-[a-f0-9]{64}$/);

  // A new process has no module state from logout. It must still reject replay.
  const replay = spawnSync(process.execPath, [
    "--import", "./scripts/register-server-only-test-stub.mjs", "--import", "tsx",
    "--input-type=module", "-e",
    `import session from './src/lib/server/admin-session.ts';
     import { NextRequest } from 'next/server.js';
     const request = (cookie) => new NextRequest('https://witnessops.com/admin', {
       headers: {cookie: 'witnessops-admin-session=' + cookie}
     });
     if (await session.getVerifiedAdminSession(request(process.env.SYNTHETIC_SESSION_COOKIE))) process.exit(1);
     if (!(await session.getVerifiedAdminSession(request(process.env.SYNTHETIC_OTHER_COOKIE)))) process.exit(2);`,
  ], { env: { ...process.env, SYNTHETIC_SESSION_COOKIE: cookie, SYNTHETIC_OTHER_COOKIE: otherCookie }, encoding: "utf8" });
  assert.equal(replay.status, 0, replay.stderr);
});

test("cross-site logout cannot revoke a valid session", async () => {
  const cookie = await sessionCookie();
  assert.equal((await POST(requestWithCookie(cookie, "https://evil.example"))).status, 403);
  assert.ok(await getVerifiedAdminSession(requestWithCookie(cookie)));
  assert.deepEqual(await readdir(path.join(directory, "revoked-sessions")), []);
});

test("invalid and expired cookies clear locally without creating revocation state", async () => {
  const expired = await sessionCookie(Date.now() - 2000, Date.now() - 1000);
  for (const cookie of ["invalid", expired, `${await sessionCookie()}extra`]) {
    assert.equal((await POST(requestWithCookie(cookie))).status, 303);
  }
  assert.deepEqual(await readdir(directory), []);
});

test("unavailable storage denies access and cannot report successful logout", async () => {
  const cookie = await sessionCookie();
  const badRoot = path.join(directory, "not-a-directory");
  await writeFile(badRoot, "unavailable");
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = badRoot;
  assert.equal(await getVerifiedAdminSession(requestWithCookie(cookie)), null);
  const response = await POST(requestWithCookie(cookie));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("set-cookie"), null, "retain the cookie so revocation can be retried");
});

test("concurrent logouts preserve every live marker and clean only expired markers", async () => {
  const now = Date.now();
  const cookies = await Promise.all([sessionCookie(now), sessionCookie(now - 1)]);
  assert.ok(await getVerifiedAdminSession(requestWithCookie(cookies[0]!)));
  const expiredMarker = `${now - 1000}-${"0".repeat(64)}`;
  await writeFile(path.join(directory, "revoked-sessions", expiredMarker), "");
  const responses = await Promise.all(cookies.map((cookie) => POST(requestWithCookie(cookie))));
  assert.ok(responses.every((response) => response.status === 303));
  for (const cookie of cookies) assert.equal(await getVerifiedAdminSession(requestWithCookie(cookie)), null);
  const markers = await readdir(path.join(directory, "revoked-sessions"));
  assert.equal(markers.length, 2);
  assert.ok(!markers.includes(expiredMarker));
});
