import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { NextRequest } from "next/server";

import {
  createAdminSessionCookie,
  getVerifiedAdminSession,
  verifyAdminSessionCookie,
} from "./admin-session";

const originalAdminSecret = process.env.WITNESSOPS_ADMIN_SECRET;
const originalLocalBypass = process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
const originalEntraFlag = process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED;
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
  if (originalEntraFlag === undefined) {
    delete process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED;
  } else {
    process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED = originalEntraFlag;
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

test("tampering and runtime local hosts cannot establish a session", async () => {
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";
  mutableEnv.NODE_ENV = "development";
  const cookie = await createAdminSessionCookie(googlePayload());
  const replacement = cookie.endsWith("A") ? "B" : "A";
  const tampered = `${cookie.slice(0, -1)}${replacement}`;

  assert.equal(await verifyAdminSessionCookie(tampered), null);
  const payloadB64 = cookie.slice(0, cookie.lastIndexOf("."));
  assert.equal(await verifyAdminSessionCookie(`${payloadB64}.YQ==`), null);
  assert.equal(await verifyAdminSessionCookie(payloadB64), null);
  assert.equal(
    await getVerifiedAdminSession(
      new NextRequest("http://localhost:3001/admin", {
        headers: { host: "localhost:3001" },
      }),
    ),
    null,
  );
});

test("the local bypass is confined to the explicit test runner", async () => {
  process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS = "1";
  mutableEnv.NODE_ENV = "test";

  assert.deepEqual(
    await getVerifiedAdminSession(
      new NextRequest("http://localhost:3001/admin", {
        headers: { host: "localhost:3001" },
      }),
    ),
    {
      actor: "local-dev",
      actorAuthSource: "local_bypass",
      actorSessionHash: null,
      role: "Founder",
      isLocalBypass: true,
    },
  );
});

test("version 3 Google cookies stay valid and version 4 checks provider binding", async () => {
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";
  delete process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED;

  const v3 = await createAdminSessionCookie(googlePayload());
  const verifiedV3 = await verifyAdminSessionCookie(v3);
  assert.equal(verifiedV3?.version, 3);
  assert.equal(verifiedV3?.identityProvider, "google");
  assert.equal(verifiedV3?.issuer, "https://accounts.google.com");

  const tenantId = "0a1b2c3d-4e5f-4678-89ab-cdef01234567";
  const oid = "abcdefab-cdef-4abc-8def-0123456789ab";
  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const issuedAt = Date.now();
  const microsoftPayload = {
    version: 4 as const,
    identityProvider: "microsoft" as const,
    issuer,
    subject: oid,
    actor: `oidc:${issuer}#${oid}`,
    actorAuthSource: "oidc_session" as const,
    actorSessionHash: "abcd1234abcd1234",
    role: "Delegated Operator" as const,
    iat: issuedAt,
    exp: issuedAt + 60_000,
  };
  const microsoftCookie = await createAdminSessionCookie(microsoftPayload);
  assert.equal(await verifyAdminSessionCookie(microsoftCookie), null);
  assert.deepEqual(
    await verifyAdminSessionCookie(microsoftCookie, "revocation"),
    microsoftPayload,
  );

  process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED = "1";
  assert.deepEqual(await verifyAdminSessionCookie(microsoftCookie), microsoftPayload);
  const admitted = await getVerifiedAdminSession(
    new NextRequest("https://witnessops.com/admin", {
      headers: { cookie: `witnessops-admin-session=${microsoftCookie}` },
    }),
  );
  assert.equal(admitted?.actor, microsoftPayload.actor);
  assert.equal(admitted?.actorAuthSource, "oidc_session");

  const v4Google = await createAdminSessionCookie({
    ...googlePayload(),
    version: 4,
  });
  assert.equal((await verifyAdminSessionCookie(v4Google))?.version, 4);
  assert.equal((await verifyAdminSessionCookie(v4Google))?.identityProvider, "google");

  const forged: Array<[string, Record<string, unknown>]> = [
    ["provider and issuer disagree", { ...microsoftPayload, issuer: "https://accounts.google.com", actor: "oidc:https://accounts.google.com#abcdefab-cdef-4abc-8def-0123456789ab" }],
    ["google provider with Entra issuer", { ...googlePayload(), version: 4, issuer, actor: `oidc:${issuer}#google-subject-123` }],
    ["actor oid disagrees with subject", { ...microsoftPayload, actor: `oidc:${issuer}#01234567-89ab-4cde-8fab-cdef01234567` }],
    ["email actor", { ...microsoftPayload, actor: "entra:operator@example.com", subject: "operator@example.com" }],
    ["personal tenant issuer", {
      ...microsoftPayload,
      issuer: "https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a3a6521ec5/v2.0",
      subject: "9188040d-6c67-4c5b-b112-36a3a6521ec5",
      actor: "oidc:https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a3a6521ec5/v2.0#9188040d-6c67-4c5b-b112-36a3a6521ec5",
    }],
  ];
  for (const [name, payload] of forged) {
    const cookie = await signUnchecked(payload);
    assert.equal(await verifyAdminSessionCookie(cookie), null, name);
  }

  const replacement = microsoftCookie.endsWith("A") ? "B" : "A";
  assert.equal(
    await verifyAdminSessionCookie(`${microsoftCookie.slice(0, -1)}${replacement}`),
    null,
  );
  assert.equal((await verifyAdminSessionCookie(v3))?.version, 3);
});

test("the development server binds loopback and only tests enable bypass scaffolding", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
  ) as { scripts: Record<string, string> };

  assert.equal(
    packageJson.scripts.dev,
    "next dev --hostname 127.0.0.1 --port 3001",
  );
  assert.match(packageJson.scripts.test, /^NODE_ENV=test /);
});
