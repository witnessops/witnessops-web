import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import { NextRequest } from "next/server";

import {
  createAdminSessionCookie,
  getVerifiedAdminSession,
  verifyAdminSessionCookie,
} from "./admin-session";

const originalAdminSecret = process.env.WITNESSOPS_ADMIN_SECRET;
const originalLocalBypass = process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
const originalNodeEnv = process.env.NODE_ENV;
const mutableEnv = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string };

afterEach(() => {
  if (originalAdminSecret === undefined) {
    delete process.env.WITNESSOPS_ADMIN_SECRET;
  } else {
    process.env.WITNESSOPS_ADMIN_SECRET = originalAdminSecret;
  }
  if (originalLocalBypass === undefined) {
    delete process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
  } else {
    process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = originalLocalBypass;
  }
  if (originalNodeEnv === undefined) {
    Reflect.deleteProperty(mutableEnv, "NODE_ENV");
  } else {
    mutableEnv.NODE_ENV = originalNodeEnv;
  }
});

function googlePayload() {
  const issuedAt = Date.now();
  return {
    version: 3 as const,
    identityProvider: "google" as const,
    issuer: "https://accounts.google.com" as const,
    subject: "google-subject-123",
    actor: "oidc:https://accounts.google.com#google-subject-123",
    actorAuthSource: "oidc_session" as const,
    actorSessionHash: "abcd1234abcd1234",
    role: "Delegated Operator" as const,
    iat: issuedAt,
    exp: issuedAt + 60_000,
  };
}

async function signUnchecked(payload: Record<string, unknown>): Promise<string> {
  return createAdminSessionCookie(
    payload as unknown as Parameters<typeof createAdminSessionCookie>[0],
  );
}

test("getVerifiedAdminSession accepts only a provider-bound Google session", async () => {
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";
  const cookie = await createAdminSessionCookie(googlePayload());
  const request = new NextRequest("https://witnessops.com/admin", {
    headers: {
      cookie: `witnessops-admin-session=${cookie}`,
    },
  });

  assert.deepEqual(await getVerifiedAdminSession(request), {
    actor: "oidc:https://accounts.google.com#google-subject-123",
    actorAuthSource: "oidc_session",
    actorSessionHash: "abcd1234abcd1234",
    role: "Delegated Operator",
    isLocalBypass: false,
  });
});

test("signed Microsoft, legacy, providerless, expired, and malformed sessions fail", async () => {
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";
  const valid = googlePayload();
  const cases: Array<[string, Record<string, unknown>]> = [
    ["Microsoft actor", { ...valid, actor: "entra:operator@example.com" }],
    ["legacy hash", { hash: "legacy-hash", exp: valid.exp }],
    ["providerless", { ...valid, identityProvider: undefined }],
    ["wrong issuer", { ...valid, issuer: "https://issuer.invalid" }],
    ["expired", { ...valid, exp: Date.now() - 1 }],
    ["overlong lifetime", { ...valid, exp: valid.iat + 8 * 60 * 60 * 1000 + 1 }],
    ["bad session hash", { ...valid, actorSessionHash: "not-a-hash" }],
    ["missing role", { ...valid, role: undefined }],
    ["unknown role", { ...valid, role: "Super Admin" }],
  ];

  for (const [name, payload] of cases) {
    const cookie = await signUnchecked(payload);
    assert.equal(await verifyAdminSessionCookie(cookie), null, name);
  }
});

test("tampering and the production-disabled local bypass cannot establish a session", async () => {
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";
  mutableEnv.NODE_ENV = "production";
  const cookie = await createAdminSessionCookie(googlePayload());
  const replacement = cookie.endsWith("A") ? "B" : "A";
  const tampered = `${cookie.slice(0, -1)}${replacement}`;

  assert.equal(await verifyAdminSessionCookie(tampered), null);
  assert.equal(
    await getVerifiedAdminSession(
      new NextRequest("http://localhost:3001/admin", {
        headers: { host: "localhost:3001" },
      }),
    ),
    null,
  );
});
