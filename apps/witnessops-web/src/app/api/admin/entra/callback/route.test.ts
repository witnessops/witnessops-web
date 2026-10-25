import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { NextRequest } from "next/server";

import {
  ENTRA_OIDC_REDIRECT_URI,
  ENTRA_OIDC_TRANSACTION_COOKIE_NAME,
  createEntraOidcTransaction,
} from "@/lib/server/admin-entra-oidc";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionCookie,
} from "@/lib/server/admin-session";

import { POST } from "./route";

const TENANT_ID = "0a1b2c3d-4e5f-4678-89ab-cdef01234567";
const CLIENT_ID = "fedcba98-7654-4321-8fed-cba987654321";
const ALLOWED_OID = "abcdefab-cdef-4abc-8def-0123456789ab";
const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;

const trackedEnv = [
  "WITNESSOPS_ADMIN_SECRET",
  "WITNESSOPS_ADMIN_ENTRA_ENABLED",
  "WITNESSOPS_ENTRA_OIDC_TENANT_ID",
  "WITNESSOPS_ENTRA_OIDC_CLIENT_ID",
  "WITNESSOPS_ENTRA_OIDC_CLIENT_SECRET",
  "WITNESSOPS_ENTRA_OIDC_REDIRECT_URI",
  "WITNESSOPS_ENTRA_ADMIN_OID_ALLOWLIST",
  "WITNESSOPS_ADMIN_ROLE",
  "WITNESSOPS_ADMIN_CORE_STORE_DIR",
] as const;

const originals = Object.fromEntries(
  trackedEnv.map((name) => [name, process.env[name]]),
) as Record<(typeof trackedEnv)[number], string | undefined>;
const originalFetch = globalThis.fetch;
const originalWarn = console.warn;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  for (const name of trackedEnv) {
    const value = originals[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

function configureEntra(): void {
  process.env.WITNESSOPS_ADMIN_SECRET = "synthetic-admin-session-secret";
  process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED = "1";
  process.env.WITNESSOPS_ADMIN_ROLE = "Delegated Operator";
  process.env.WITNESSOPS_ENTRA_OIDC_TENANT_ID = TENANT_ID;
  process.env.WITNESSOPS_ENTRA_OIDC_CLIENT_ID = CLIENT_ID;
  process.env.WITNESSOPS_ENTRA_OIDC_CLIENT_SECRET = "synthetic-entra-client-secret";
  process.env.WITNESSOPS_ENTRA_OIDC_REDIRECT_URI = ENTRA_OIDC_REDIRECT_URI;
  process.env.WITNESSOPS_ENTRA_ADMIN_OID_ALLOWLIST = ALLOWED_OID;
}

function callbackRequest(
  state: string,
  transactionCookie: string,
  formFields: string,
): NextRequest {
  const body = new URLSearchParams(formFields);
  body.set("state", state);
  return new NextRequest("https://0.0.0.0:3000/api/admin/entra/callback", {
    method: "POST",
    body,
    headers: {
      cookie: `${ENTRA_OIDC_TRANSACTION_COOKIE_NAME}=${transactionCookie}`,
      "content-type": "application/x-www-form-urlencoded",
    },
  });
}

test("Entra callback issues a version 4 Microsoft session and clears the transaction", async () => {
  configureEntra();
  const directory = await mkdtemp(path.join(tmpdir(), "entra-callback-"));
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = directory;
  const transaction = await createEntraOidcTransaction("/admin/queue");
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "synthetic-callback-key";
  const idToken = await new SignJWT({
    nonce: transaction.nonce,
    tid: TENANT_ID,
    oid: ALLOWED_OID,
    email: "should-not-authorize@example.com",
    preferred_username: "should-not-authorize@example.com",
  })
    .setProtectedHeader({ alg: "RS256", kid: "synthetic-callback-key" })
    .setIssuer(ISSUER)
    .setAudience(CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  const diagnostics: string[] = [];
  console.warn = (message?: unknown) => diagnostics.push(String(message));
  globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`) {
      return Response.json({ id_token: idToken });
    }
    if (url === `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`) {
      return Response.json({ keys: [publicJwk] });
    }
    throw new Error("Unexpected mocked endpoint");
  };

  try {
    const response = await POST(
      callbackRequest(transaction.state, transaction.cookieValue, "code=synthetic-code"),
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "https://witnessops.com/admin/queue");
    const sessionCookie = response.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    assert.ok(sessionCookie);
    const verified = await verifyAdminSessionCookie(sessionCookie);
    assert.equal(verified?.version, 4);
    assert.equal(verified?.identityProvider, "microsoft");
    assert.equal(verified?.issuer, ISSUER);
    assert.equal(verified?.subject, ALLOWED_OID);
    assert.equal(verified?.actor, `oidc:${ISSUER}#${ALLOWED_OID}`);
    assert.equal(verified?.role, "Delegated Operator");
    assert.equal(verified?.exp !== undefined && verified.iat !== undefined, true);
    if (verified) assert.equal(verified.exp - verified.iat, 8 * 60 * 60 * 1000);
    const encodedPayload = sessionCookie.slice(0, sessionCookie.lastIndexOf("."));
    const sessionPayload = JSON.parse(atob(encodedPayload)) as Record<string, unknown>;
    assert.equal("email" in sessionPayload, false);
    assert.equal("id_token" in sessionPayload, false);
    assert.equal(
      response.cookies.get(ENTRA_OIDC_TRANSACTION_COOKIE_NAME)?.value,
      "",
    );
    const setCookie = response.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /Max-Age=28800/i);
    assert.match(setCookie, /SameSite=lax/i);
    assert.deepEqual(diagnostics, []);
    assert.equal(setCookie.includes(idToken), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Entra callback rejects a missing or mismatched transaction without calling the provider", async () => {
  configureEntra();
  const diagnostics: string[] = [];
  console.warn = (message?: unknown) => diagnostics.push(String(message));
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("must not be called");
  };
  const transaction = await createEntraOidcTransaction("/admin");
  const mismatched = await POST(
    callbackRequest(`${transaction.state}x`, transaction.cookieValue, "code=unused"),
  );
  assert.equal(
    mismatched.headers.get("location"),
    "https://witnessops.com/admin/login?error=entra_auth_failed",
  );
  assert.equal(mismatched.cookies.has(ADMIN_SESSION_COOKIE_NAME), false);
  assert.equal(mismatched.cookies.get(ENTRA_OIDC_TRANSACTION_COOKIE_NAME)?.value, "");

  const wrongType = await POST(
    new NextRequest("https://0.0.0.0:3000/api/admin/entra/callback", {
      method: "POST",
      body: JSON.stringify({ state: transaction.state, code: "unused" }),
      headers: {
        cookie: `${ENTRA_OIDC_TRANSACTION_COOKIE_NAME}=${transaction.cookieValue}`,
        "content-type": "application/json",
      },
    }),
  );
  assert.equal(wrongType.status, 303);
  assert.equal(fetchCalled, false);
  assert.deepEqual(diagnostics, [
    "[admin-entra-oidc] callback_state_invalid",
    "[admin-entra-oidc] callback_request_invalid",
  ]);
});

test("Entra callback fails closed when the flag is off", async () => {
  configureEntra();
  delete process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED;
  const transaction = await createEntraOidcTransaction("/admin");
  console.warn = () => undefined;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("must not be called");
  };
  const response = await POST(
    callbackRequest(transaction.state, transaction.cookieValue, "code=unused"),
  );
  assert.equal(
    response.headers.get("location"),
    "https://witnessops.com/admin/login?error=entra_auth_failed",
  );
  assert.equal(response.cookies.has(ADMIN_SESSION_COOKIE_NAME), false);
  assert.equal(fetchCalled, false);
});
