import assert from "node:assert/strict";
import test from "node:test";

import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { createGoogleOidcTransaction } from "./admin-google-oidc";
import {
  ENTRA_OIDC_REDIRECT_URI,
  PERSONAL_ACCOUNT_TENANT_ID,
  EntraAdminOidcError,
  buildEntraOidcAuthorizationUrl,
  createEntraOidcTransaction,
  readEntraAdminOidcConfig,
  verifyEntraOidcCode,
  verifyEntraOidcTransactionCookie,
  type EntraAdminOidcErrorCode,
} from "./admin-entra-oidc";

const TENANT_ID = "0a1b2c3d-4e5f-4678-89ab-cdef01234567";
const CLIENT_ID = "fedcba98-7654-4321-8fed-cba987654321";
const ALLOWED_OID = "abcdefab-cdef-4abc-8def-0123456789ab";
const OTHER_OID = "01234567-89ab-4cde-8fab-cdef01234567";
const CLIENT_SECRET = "synthetic-entra-client-secret";
const ISSUER = `https://login.microsoftonline.com/${TENANT_ID}/v2.0`;

const ENTRA_ENV_NAMES = [
  "WITNESSOPS_ADMIN_SECRET",
  "WITNESSOPS_ADMIN_ENTRA_ENABLED",
  "WITNESSOPS_ENTRA_OIDC_TENANT_ID",
  "WITNESSOPS_ENTRA_OIDC_CLIENT_ID",
  "WITNESSOPS_ENTRA_OIDC_CLIENT_SECRET",
  "WITNESSOPS_ENTRA_OIDC_REDIRECT_URI",
  "WITNESSOPS_ENTRA_ADMIN_OID_ALLOWLIST",
] as const;

const originalEnv = Object.fromEntries(
  ENTRA_ENV_NAMES.map((name) => [name, process.env[name]]),
) as Record<(typeof ENTRA_ENV_NAMES)[number], string | undefined>;
const originalFetch = globalThis.fetch;

function restoreEnvironment(): void {
  for (const name of ENTRA_ENV_NAMES) {
    const value = originalEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function clearEntraEnvironment(): void {
  for (const name of ENTRA_ENV_NAMES) delete process.env[name];
}

function setValidEntraEnvironment(): void {
  process.env.WITNESSOPS_ADMIN_SECRET = "synthetic-admin-session-secret";
  process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED = "1";
  process.env.WITNESSOPS_ENTRA_OIDC_TENANT_ID = TENANT_ID;
  process.env.WITNESSOPS_ENTRA_OIDC_CLIENT_ID = CLIENT_ID;
  process.env.WITNESSOPS_ENTRA_OIDC_CLIENT_SECRET = CLIENT_SECRET;
  process.env.WITNESSOPS_ENTRA_OIDC_REDIRECT_URI = ENTRA_OIDC_REDIRECT_URI;
  process.env.WITNESSOPS_ENTRA_ADMIN_OID_ALLOWLIST = ALLOWED_OID;
}

function assertEntraError(error: unknown, expectedCode: EntraAdminOidcErrorCode): boolean {
  assert.ok(error instanceof EntraAdminOidcError);
  assert.equal(error.code, expectedCode);
  assert.equal(error.message.includes(CLIENT_SECRET), false);
  assert.equal(error.message.includes(TENANT_ID), false);
  return true;
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnvironment();
});

test("Entra stays disabled unless the flag is exactly 1", () => {
  clearEntraEnvironment();
  setValidEntraEnvironment();
  for (const flag of [undefined, "", "0", "true", "yes", "1 ", " 1"]) {
    if (flag === undefined) delete process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED;
    else process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED = flag;
    assert.equal(readEntraAdminOidcConfig(), null, JSON.stringify(flag));
  }
});

test("Entra config fails closed when the flag is on and config is absent or partial", () => {
  clearEntraEnvironment();
  process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED = "1";
  assert.throws(
    () => readEntraAdminOidcConfig(),
    (error) => assertEntraError(error, "config_invalid"),
  );

  setValidEntraEnvironment();
  delete process.env.WITNESSOPS_ENTRA_OIDC_CLIENT_SECRET;
  assert.throws(
    () => readEntraAdminOidcConfig(),
    (error) => assertEntraError(error, "config_invalid"),
  );
});

test("Entra config accepts only the canonical redirect and a real tenant guid", async (t) => {
  clearEntraEnvironment();
  setValidEntraEnvironment();
  const config = readEntraAdminOidcConfig();
  assert.ok(config);
  assert.equal(config.redirectUri, "https://witnessops.com/api/admin/entra/callback");
  assert.equal(config.issuer, ISSUER);
  assert.equal(config.tenantId, TENANT_ID);
  assert.equal(PERSONAL_ACCOUNT_TENANT_ID, "9188040d-6c67-4c5b-b112-36a3a6521ec5");

  const invalid = [
    "http://witnessops.com/api/admin/entra/callback",
    "http://localhost:3001/api/admin/entra/callback",
    "https://staging.witnessops.com/api/admin/entra/callback",
    "https://witnessops.com/api/admin/entra/callback/",
    "https://witnessops.com/api/admin/entra/callback?next=/admin",
    "https://user@witnessops.com/api/admin/entra/callback",
    "/api/admin/entra/callback",
  ];
  for (const redirectUri of invalid) {
    await t.test(`rejects ${redirectUri}`, () => {
      setValidEntraEnvironment();
      process.env.WITNESSOPS_ENTRA_OIDC_REDIRECT_URI = redirectUri;
      assert.throws(
        () => readEntraAdminOidcConfig(),
        (error) => assertEntraError(error, "config_invalid"),
      );
    });
  }

  for (const tenant of ["common", "organizations", "consumers", PERSONAL_ACCOUNT_TENANT_ID, "not-a-guid"]) {
    await t.test(`rejects tenant ${tenant}`, () => {
      setValidEntraEnvironment();
      process.env.WITNESSOPS_ENTRA_OIDC_TENANT_ID = tenant;
      assert.throws(
        () => readEntraAdminOidcConfig(),
        (error) => assertEntraError(error, "config_invalid"),
      );
    });
  }
});

test("Entra allowlist is object-id GUIDs only", () => {
  clearEntraEnvironment();
  setValidEntraEnvironment();
  process.env.WITNESSOPS_ENTRA_OIDC_CLIENT_ID = CLIENT_ID.toUpperCase();
  process.env.WITNESSOPS_ENTRA_ADMIN_OID_ALLOWLIST =
    ` ${ALLOWED_OID.toUpperCase()} `;
  const config = readEntraAdminOidcConfig();
  assert.ok(config);
  assert.equal(config.clientId, CLIENT_ID);
  assert.deepEqual([...config.adminOidAllowlist], [ALLOWED_OID]);

  for (const allowlist of [
    "",
    ALLOWED_OID + ",",
    "operator@example.com",
    `${ALLOWED_OID},${ALLOWED_OID}`,
    "not-a-guid",
  ]) {
    setValidEntraEnvironment();
    process.env.WITNESSOPS_ENTRA_ADMIN_OID_ALLOWLIST = allowlist;
    assert.throws(
      () => readEntraAdminOidcConfig(),
      (error) => assertEntraError(error, "config_invalid"),
      JSON.stringify(allowlist),
    );
  }
});

test("Entra transactions are signed, expire, and reject tampering or Google cookies", async () => {
  clearEntraEnvironment();
  process.env.WITNESSOPS_ADMIN_SECRET = "synthetic-admin-session-secret";
  const fixedNow = 2_000_000_000_000;
  const originalDateNow = Date.now;
  try {
    Date.now = () => fixedNow;
    const created = await createEntraOidcTransaction("/admin/queue?state=open");
    const verified = await verifyEntraOidcTransactionCookie(created.cookieValue);
    assert.equal(verified.provider, "microsoft");
    assert.equal(verified.state, created.state);
    assert.equal(verified.nonce, created.nonce);
    assert.equal(verified.codeVerifier, created.codeVerifier);
    assert.equal(verified.returnTo, "/admin/queue?state=open");
    assert.equal(verified.exp, fixedNow + 10 * 60 * 1000);

    const replacement = created.cookieValue.endsWith("A") ? "B" : "A";
    await assert.rejects(
      () => verifyEntraOidcTransactionCookie(`${created.cookieValue.slice(0, -1)}${replacement}`),
      (error) => assertEntraError(error, "transaction_invalid"),
    );

    const google = await createGoogleOidcTransaction("/admin");
    await assert.rejects(
      () => verifyEntraOidcTransactionCookie(google.cookieValue),
      (error) => assertEntraError(error, "transaction_invalid"),
    );

    Date.now = () => fixedNow + 10 * 60 * 1000 + 1;
    await assert.rejects(
      () => verifyEntraOidcTransactionCookie(created.cookieValue),
      (error) => assertEntraError(error, "transaction_expired"),
    );
  } finally {
    Date.now = originalDateNow;
  }
});

test("Entra authorization URL is tenant-scoped PKCE form_post", async () => {
  clearEntraEnvironment();
  setValidEntraEnvironment();
  const config = readEntraAdminOidcConfig();
  assert.ok(config);
  const transaction = await createEntraOidcTransaction("https://evil.example/admin");
  assert.equal(transaction.returnTo, "/admin");
  const url = new URL(buildEntraOidcAuthorizationUrl(config, transaction));
  assert.equal(url.origin, "https://login.microsoftonline.com");
  assert.equal(url.pathname, `/${TENANT_ID}/oauth2/v2.0/authorize`);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("response_mode"), "form_post");
  assert.equal(url.searchParams.get("scope"), "openid profile email");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), transaction.state);
  assert.equal(url.searchParams.get("nonce"), transaction.nonce);
  assert.equal(url.searchParams.get("redirect_uri"), ENTRA_OIDC_REDIRECT_URI);
  assert.equal(url.searchParams.get("client_id"), CLIENT_ID);
  assert.equal(url.searchParams.has("client_secret"), false);
  assert.match(url.toString(), new RegExp(`https://login\\.microsoftonline\\.com/${TENANT_ID}/`));
});

test("Entra ID token verification authorizes oid and rejects claim mismatches", async () => {
  clearEntraEnvironment();
  setValidEntraEnvironment();
  const transaction = await createEntraOidcTransaction("/admin");
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const { privateKey: untrustedPrivateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "synthetic-entra-test-key";
  const tokenEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const jwksEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`;

  interface SignOptions {
    claims?: Record<string, unknown>;
    issuer?: string;
    audience?: string | string[];
    expiration?: string | number;
    issuedAt?: number;
    signingKey?: CryptoKey;
  }

  async function signIdentity({
    claims = {},
    issuer = ISSUER,
    audience = CLIENT_ID,
    expiration = "5m",
    issuedAt,
    signingKey = privateKey,
  }: SignOptions = {}): Promise<string> {
    let builder = new SignJWT({
      nonce: transaction.nonce,
      tid: TENANT_ID,
      oid: ALLOWED_OID,
      email: "should-not-authorize@example.com",
      preferred_username: "should-not-authorize@example.com",
      ...claims,
    })
      .setProtectedHeader({ alg: "RS256", kid: "synthetic-entra-test-key" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime(expiration);
    builder = issuedAt === undefined ? builder.setIssuedAt() : builder.setIssuedAt(issuedAt);
    return builder.sign(signingKey);
  }

  let currentIdToken = await signIdentity();
  let tokenResponse: "ok" | "non_ok" | "timeout" | "missing" = "ok";
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === tokenEndpoint) {
      assert.equal(init?.method, "POST");
      const body = init?.body;
      assert.ok(body instanceof URLSearchParams);
      assert.equal(body.get("client_secret"), CLIENT_SECRET);
      assert.equal(body.get("code_verifier"), transaction.codeVerifier);
      assert.equal(body.get("redirect_uri"), ENTRA_OIDC_REDIRECT_URI);
      if (tokenResponse === "timeout") {
        throw new DOMException("request timed out", "TimeoutError");
      }
      if (tokenResponse === "non_ok") {
        return new Response(null, { status: 400 });
      }
      if (tokenResponse === "missing") {
        return Response.json({ token_type: "Bearer" });
      }
      return Response.json({ id_token: currentIdToken });
    }
    if (url === jwksEndpoint) {
      return Response.json({ keys: [publicJwk] });
    }
    throw new Error(`Unexpected fetch target: ${url}`);
  };

  const identity = await verifyEntraOidcCode("synthetic-code", transaction);
  assert.equal(identity.provider, "microsoft");
  assert.equal(identity.issuer, ISSUER);
  assert.equal(identity.subject, ALLOWED_OID);
  assert.equal(identity.actor, `oidc:${ISSUER}#${ALLOWED_OID}`);
  assert.match(identity.sessionHash, /^[a-f0-9]{16}$/);
  assert.equal("email" in identity, false);
  assert.equal("preferred_username" in identity, false);

  const nowSeconds = Math.floor(Date.now() / 1000);
  currentIdToken = await signIdentity({
    issuedAt: nowSeconds - 90,
    expiration: nowSeconds - 30,
  });
  assert.equal(
    (await verifyEntraOidcCode("synthetic-code", transaction)).subject,
    ALLOWED_OID,
  );

  async function expectCode(expected: EntraAdminOidcErrorCode): Promise<void> {
    await assert.rejects(
      () => verifyEntraOidcCode("synthetic-code", transaction),
      (error) => assertEntraError(error, expected),
    );
  }

  currentIdToken = await signIdentity({ issuer: "https://login.microsoftonline.com/common/v2.0" });
  await expectCode("id_token_issuer_invalid");

  currentIdToken = await signIdentity({ audience: OTHER_OID });
  await expectCode("id_token_audience_invalid");

  currentIdToken = await signIdentity({
    claims: { tid: PERSONAL_ACCOUNT_TENANT_ID },
  });
  await expectCode("id_token_tenant_invalid");

  currentIdToken = await signIdentity({ claims: { tid: OTHER_OID } });
  await expectCode("id_token_tenant_invalid");

  currentIdToken = await signIdentity({ claims: { nonce: "wrong-nonce-value" } });
  await expectCode("nonce_mismatch");

  currentIdToken = await signIdentity({
    issuedAt: nowSeconds - 300,
    expiration: nowSeconds - 120,
  });
  await expectCode("id_token_expired");

  currentIdToken = await signIdentity({
    issuedAt: nowSeconds + 180,
    expiration: nowSeconds + 600,
  });
  await expectCode("id_token_invalid");

  currentIdToken = await signIdentity({ signingKey: untrustedPrivateKey });
  await expectCode("id_token_signature_invalid");

  currentIdToken = await signIdentity({ claims: { oid: OTHER_OID } });
  await expectCode("oid_not_allowlisted");

  currentIdToken = await signIdentity({ claims: { oid: undefined } });
  await expectCode("identity_invalid");

  currentIdToken = await signIdentity({
    claims: {
      oid: undefined,
      email: "operator@example.com",
      preferred_username: "operator@example.com",
    },
  });
  await expectCode("identity_invalid");

  tokenResponse = "missing";
  await expectCode("id_token_missing");
  tokenResponse = "non_ok";
  await expectCode("provider_error");
  tokenResponse = "timeout";
  await expectCode("provider_unavailable");
});
