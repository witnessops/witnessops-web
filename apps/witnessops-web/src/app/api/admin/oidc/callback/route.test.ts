import test from "node:test";
import assert from "node:assert/strict";

import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { NextRequest } from "next/server";

import { createAdminOidcStateCookie } from "@/lib/server/admin-oidc";

import { GET } from "./route";

const trackedEnv = [
  "WITNESSOPS_ADMIN_SECRET",
  "WITNESSOPS_ADMIN_OIDC_TENANT_ID",
  "WITNESSOPS_ADMIN_OIDC_CLIENT_ID",
  "WITNESSOPS_ADMIN_OIDC_CLIENT_SECRET",
  "WITNESSOPS_ADMIN_OIDC_REDIRECT_URI",
  "WITNESSOPS_ADMIN_OIDC_ALLOWED_EMAILS_JSON",
] as const;

const originals = Object.fromEntries(
  trackedEnv.map((name) => [name, process.env[name]]),
) as Record<(typeof trackedEnv)[number], string | undefined>;

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of trackedEnv) {
    const value = originals[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

test("admin oidc callback creates an oidc-backed admin session", async () => {
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";
  process.env.WITNESSOPS_ADMIN_OIDC_TENANT_ID = "tenant-123";
  process.env.WITNESSOPS_ADMIN_OIDC_CLIENT_ID = "client-123";
  process.env.WITNESSOPS_ADMIN_OIDC_CLIENT_SECRET = "secret-123";
  process.env.WITNESSOPS_ADMIN_OIDC_REDIRECT_URI =
    "https://witnessops.com/api/admin/oidc/callback";
  process.env.WITNESSOPS_ADMIN_OIDC_ALLOWED_EMAILS_JSON =
    '["alice@example.com"]';

  const { state, nonce, cookieValue } = await createAdminOidcStateCookie();
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "kid-123";

  const idToken = await new SignJWT({
    nonce,
    preferred_username: "alice@example.com",
    email: "alice@example.com",
    name: "Alice Admin",
    oid: "entra-oid-123",
  })
    .setProtectedHeader({ alg: "RS256", kid: "kid-123" })
    .setIssuer("https://login.microsoftonline.com/tenant-123/v2.0")
    .setAudience("client-123")
    .setSubject("entra-oid-123")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/oauth2/v2.0/token")) {
      assert.equal(init?.method, "POST");
      return new Response(JSON.stringify({ id_token: idToken }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.endsWith("/discovery/v2.0/keys")) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`unexpected fetch ${url}`);
  };

  const response = await GET(
    new NextRequest(
      `https://witnessops.com/api/admin/oidc/callback?state=${encodeURIComponent(state)}&code=test-code`,
      {
        headers: {
          cookie: `witnessops-admin-oidc-state=${cookieValue}`,
        },
      },
    ),
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://witnessops.com/admin");
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /witnessops-admin-session=/);
});
