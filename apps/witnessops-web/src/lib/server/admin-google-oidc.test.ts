import assert from "node:assert/strict";
import test from "node:test";

import { exportJWK, generateKeyPair, SignJWT } from "jose";

import {
  GOOGLE_OIDC_ISSUER,
  GoogleAdminOidcError,
  buildGoogleOidcAuthorizationUrl,
  createGoogleOidcTransaction,
  readGoogleAdminOidcConfig,
  sanitizeAdminReturnTo,
  verifyGoogleOidcCode,
  verifyGoogleOidcTransactionCookie,
  type GoogleAdminOidcErrorCode,
} from "./admin-google-oidc";

const GOOGLE_ENV_NAMES = [
  "WITNESSOPS_ADMIN_SECRET",
  "WITNESSOPS_GOOGLE_OIDC_CLIENT_ID",
  "WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET",
  "WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI",
  "WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN",
  "WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST",
] as const;

const originalEnv = Object.fromEntries(
  GOOGLE_ENV_NAMES.map((name) => [name, process.env[name]]),
) as Record<(typeof GOOGLE_ENV_NAMES)[number], string | undefined>;
const originalFetch = globalThis.fetch;

function restoreEnvironment(): void {
  for (const name of GOOGLE_ENV_NAMES) {
    const value = originalEnv[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

function clearGoogleEnvironment(): void {
  for (const name of GOOGLE_ENV_NAMES) {
    delete process.env[name];
  }
}

function setValidGoogleEnvironment(): void {
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";
  process.env.WITNESSOPS_GOOGLE_OIDC_CLIENT_ID =
    "google-client-id.apps.googleusercontent.com";
  process.env.WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET = "google-client-secret";
  process.env.WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI =
    "https://witnessops.com/api/admin/google/callback";
  process.env.WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN = "example.com";
  process.env.WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST =
    "alice@example.com,bob@example.com";
}

function assertGoogleOidcError(
  error: unknown,
  expectedCode: GoogleAdminOidcErrorCode,
): boolean {
  assert.ok(error instanceof GoogleAdminOidcError);
  assert.equal(error.code, expectedCode);
  return true;
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnvironment();
});

test("Google OIDC config is absent only when all Google variables are absent", () => {
  clearGoogleEnvironment();
  assert.equal(readGoogleAdminOidcConfig(), null);

  process.env.WITNESSOPS_GOOGLE_OIDC_CLIENT_ID =
    "partial-client.apps.googleusercontent.com";
  assert.throws(
    () => readGoogleAdminOidcConfig(),
    (error) => assertGoogleOidcError(error, "config_invalid"),
  );
});

test("Google OIDC config normalizes the domain and email allowlist", () => {
  clearGoogleEnvironment();
  setValidGoogleEnvironment();
  process.env.WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN = "  Example.COM  ";
  process.env.WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST =
    " Alice@Example.COM , BOB@example.com ";

  const config = readGoogleAdminOidcConfig();
  assert.ok(config);
  assert.equal(config.workspaceDomain, "example.com");
  assert.deepEqual([...config.adminEmailAllowlist], [
    "alice@example.com",
    "bob@example.com",
  ]);
});

test("Google OIDC config rejects Unicode before case normalization", () => {
  clearGoogleEnvironment();
  setValidGoogleEnvironment();
  process.env.WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN = "examKle.com";
  assert.throws(
    () => readGoogleAdminOidcConfig(),
    (error) => assertGoogleOidcError(error, "config_invalid"),
  );

  setValidGoogleEnvironment();
  process.env.WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST =
    "aliKe@example.com";
  assert.throws(
    () => readGoogleAdminOidcConfig(),
    (error) => assertGoogleOidcError(error, "config_invalid"),
  );
});

test("Google OIDC config rejects non-Google and control-bearing credentials", () => {
  clearGoogleEnvironment();
  setValidGoogleEnvironment();
  process.env.WITNESSOPS_GOOGLE_OIDC_CLIENT_ID = "not-a-google-client";
  assert.throws(
    () => readGoogleAdminOidcConfig(),
    (error) => assertGoogleOidcError(error, "config_invalid"),
  );

  setValidGoogleEnvironment();
  process.env.WITNESSOPS_GOOGLE_OIDC_CLIENT_ID =
    "google-client-id.apps.googleusercontent.com\n";
  assert.throws(
    () => readGoogleAdminOidcConfig(),
    (error) => assertGoogleOidcError(error, "config_invalid"),
  );

  setValidGoogleEnvironment();
  process.env.WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET = "secret\rvalue";
  assert.throws(
    () => readGoogleAdminOidcConfig(),
    (error) => assertGoogleOidcError(error, "config_invalid"),
  );
});

test("Google OIDC config rejects malformed and duplicate allowlist entries", async (t) => {
  const invalidAllowlists = [
    "",
    "alice@example.com,",
    "alice@example.com,,bob@example.com",
    "not-an-email",
    "alice@example.com,ALICE@EXAMPLE.COM",
  ];

  for (const allowlist of invalidAllowlists) {
    await t.test(JSON.stringify(allowlist), () => {
      clearGoogleEnvironment();
      setValidGoogleEnvironment();
      process.env.WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST = allowlist;
      assert.throws(
        () => readGoogleAdminOidcConfig(),
        (error) => assertGoogleOidcError(error, "config_invalid"),
      );
    });
  }
});

test("Google OIDC config accepts only the canonical production callback", async (t) => {
  clearGoogleEnvironment();
  setValidGoogleEnvironment();
  assert.equal(
    readGoogleAdminOidcConfig()?.redirectUri,
    "https://witnessops.com/api/admin/google/callback",
  );

  const invalidRedirects = [
    "http://witnessops.com/api/admin/google/callback",
    "http://localhost:3001/api/admin/google/callback",
    "https://staging.witnessops.com/api/admin/google/callback",
    "https://witnessops.com/api/admin/google/callback/",
    "https://witnessops.com/api/admin/google/callback?next=/admin",
    "https://witnessops.com/api/admin/google/callback#fragment",
    "https://user@witnessops.com/api/admin/google/callback",
    "/api/admin/google/callback",
  ];
  for (const redirectUri of invalidRedirects) {
    await t.test(`rejects ${redirectUri}`, () => {
      clearGoogleEnvironment();
      setValidGoogleEnvironment();
      process.env.WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI = redirectUri;
      assert.throws(
        () => readGoogleAdminOidcConfig(),
        (error) => assertGoogleOidcError(error, "config_invalid"),
      );
    });
  }
});

test("sanitizeAdminReturnTo keeps only local admin destinations", () => {
  assert.equal(sanitizeAdminReturnTo("/admin"), "/admin");
  assert.equal(sanitizeAdminReturnTo("/admin/queue"), "/admin/queue");
  assert.equal(
    sanitizeAdminReturnTo("/admin/queue?state=open#current"),
    "/admin/queue?state=open#current",
  );

  for (const unsafe of [
    undefined,
    "",
    " /admin",
    "/administrator",
    "//evil.example/admin",
    "https://evil.example/admin",
    "/admin\\evil",
    "/admin/%5cevil",
    "/admin/../public",
    "/admin/%2e%2e/public",
    "/admin/%252e%252e/public",
    "/admin/..%2fpublic",
    "/admin/queue\nnext",
    `/admin/${"a".repeat(1024)}`,
  ]) {
    assert.equal(sanitizeAdminReturnTo(unsafe), "/admin");
  }
});

test("Google OIDC transactions are signed, provider-bound, and expire", async () => {
  clearGoogleEnvironment();
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";
  const fixedNow = 2_000_000_000_000;
  const originalDateNow = Date.now;

  try {
    Date.now = () => fixedNow;
    const created = await createGoogleOidcTransaction(
      "/admin/queue?state=open",
    );
    const verified = await verifyGoogleOidcTransactionCookie(
      created.cookieValue,
    );

    assert.equal(verified.provider, "google");
    assert.equal(verified.state, created.state);
    assert.equal(verified.nonce, created.nonce);
    assert.equal(verified.codeVerifier, created.codeVerifier);
    assert.equal(verified.codeChallenge, created.codeChallenge);
    assert.equal(verified.returnTo, "/admin/queue?state=open");
    assert.equal(verified.exp, fixedNow + 10 * 60 * 1000);

    const replacement = created.cookieValue.endsWith("A") ? "B" : "A";
    const tampered = `${created.cookieValue.slice(0, -1)}${replacement}`;
    await assert.rejects(
      () => verifyGoogleOidcTransactionCookie(tampered),
      (error) => assertGoogleOidcError(error, "transaction_invalid"),
    );

    Date.now = () => fixedNow + 10 * 60 * 1000 + 1;
    await assert.rejects(
      () => verifyGoogleOidcTransactionCookie(created.cookieValue),
      (error) => assertGoogleOidcError(error, "transaction_expired"),
    );
  } finally {
    Date.now = originalDateNow;
  }
});

test("Google authorization URL uses nonce, Workspace hint, and PKCE S256", async () => {
  clearGoogleEnvironment();
  setValidGoogleEnvironment();
  const config = readGoogleAdminOidcConfig();
  assert.ok(config);
  const transaction = await createGoogleOidcTransaction("/admin/reports");

  const url = new URL(buildGoogleOidcAuthorizationUrl(config, transaction));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.pathname, "/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("client_id"), config.clientId);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("redirect_uri"), config.redirectUri);
  assert.equal(url.searchParams.get("response_mode"), "form_post");
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("state"), transaction.state);
  assert.equal(url.searchParams.get("nonce"), transaction.nonce);
  assert.equal(url.searchParams.get("hd"), "example.com");
  assert.equal(
    url.searchParams.get("code_challenge"),
    transaction.codeChallenge,
  );
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.has("access_type"), false);
});

test("Google code verification enforces verified Workspace claims and allowlist", async () => {
  clearGoogleEnvironment();
  setValidGoogleEnvironment();
  const transaction = await createGoogleOidcTransaction("/admin");
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const { privateKey: untrustedPrivateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "google-test-key";

  interface SignIdentityOptions {
    claims?: Record<string, unknown>;
    issuer?: string;
    audience?: string | string[];
    subject?: string | null;
    expiration?: string | number;
    signingKey?: CryptoKey;
  }

  async function signIdentity({
    claims = {},
    issuer = GOOGLE_OIDC_ISSUER,
    audience = "google-client-id.apps.googleusercontent.com",
    subject = "google-subject-123",
    expiration = "5m",
    signingKey = privateKey,
  }: SignIdentityOptions = {}): Promise<string> {
    let token = new SignJWT({
      nonce: transaction.nonce,
      email: "Alice@Example.COM",
      email_verified: true,
      hd: "example.com",
      name: "Alice Admin",
      ...claims,
    })
      .setProtectedHeader({ alg: "RS256", kid: "google-test-key" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime(expiration);
    if (subject !== null) {
      token = token.setSubject(subject);
    }
    return token.sign(signingKey);
  }

  let currentIdToken = await signIdentity();
  let tokenResponse: "ok" | "non_ok" | "timeout" = "ok";
  let expectedAuthorizationCode = "authorization-code";
  let tokenRequests = 0;
  let jwksRequests = 0;
  let providerErrorBodyReads = 0;
  globalThis.fetch = async (input, init) => {
    const url =
      input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.toString()
          : String(input);

    if (url === "https://oauth2.googleapis.com/token") {
      tokenRequests += 1;
      assert.equal(init?.method, "POST");
      assert.ok(init?.signal);
      const body = init?.body;
      assert.ok(body instanceof URLSearchParams);
      assert.equal(
        body.get("client_id"),
        "google-client-id.apps.googleusercontent.com",
      );
      assert.equal(body.get("client_secret"), "google-client-secret");
      assert.equal(body.get("code"), expectedAuthorizationCode);
      assert.equal(body.get("grant_type"), "authorization_code");
      assert.equal(
        body.get("redirect_uri"),
        "https://witnessops.com/api/admin/google/callback",
      );
      assert.equal(body.get("code_verifier"), transaction.codeVerifier);
      if (tokenResponse === "timeout") {
        throw new DOMException("request timed out", "TimeoutError");
      }
      if (tokenResponse === "non_ok") {
        return {
          ok: false,
          status: 400,
          json: async () => {
            providerErrorBodyReads += 1;
            throw new Error("provider error body must not be read");
          },
          text: async () => {
            providerErrorBodyReads += 1;
            throw new Error("provider error body must not be read");
          },
        } as unknown as Response;
      }
      return new Response(JSON.stringify({ id_token: currentIdToken }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url === "https://www.googleapis.com/oauth2/v3/certs") {
      jwksRequests += 1;
      return new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch target: ${url}`);
  };

  const identity = await verifyGoogleOidcCode(
    "authorization-code",
    transaction,
  );
  assert.deepEqual(identity, {
    provider: "google",
    issuer: GOOGLE_OIDC_ISSUER,
    actor: `oidc:${GOOGLE_OIDC_ISSUER}#google-subject-123`,
    subject: "google-subject-123",
    email: "alice@example.com",
    name: "Alice Admin",
    workspaceDomain: "example.com",
    sessionHash: await expectedSessionHash("google-subject-123"),
  });
  assert.equal(tokenRequests, 1);
  assert.equal(jwksRequests, 1);

  async function expectVerificationError(
    expectedCode: GoogleAdminOidcErrorCode,
    authorizationCode = "authorization-code",
  ): Promise<void> {
    expectedAuthorizationCode = authorizationCode;
    await assert.rejects(
      () => verifyGoogleOidcCode(authorizationCode, transaction),
      (error) => assertGoogleOidcError(error, expectedCode),
    );
  }

  currentIdToken = await signIdentity({
    claims: { email_verified: false },
  });
  await expectVerificationError("email_unverified");

  currentIdToken = await signIdentity({ claims: { hd: "other.example" } });
  await expectVerificationError("workspace_domain_mismatch");

  currentIdToken = await signIdentity({
    claims: { email: "mallory@example.com" },
  });
  await expectVerificationError("email_not_authorized");

  currentIdToken = await signIdentity({ claims: { email: undefined } });
  await expectVerificationError("identity_invalid");

  currentIdToken = await signIdentity({ claims: { hd: undefined } });
  await expectVerificationError("workspace_domain_mismatch");

  currentIdToken = await signIdentity({ subject: null });
  await expectVerificationError("identity_invalid");

  currentIdToken = await signIdentity({ subject: "x".repeat(256) });
  await expectVerificationError("identity_invalid");

  currentIdToken = await signIdentity({ claims: { nonce: "wrong-nonce" } });
  await expectVerificationError("nonce_mismatch");

  currentIdToken = await signIdentity({
    signingKey: untrustedPrivateKey,
  });
  await expectVerificationError("id_token_signature_invalid");

  currentIdToken = await signIdentity({ issuer: "https://issuer.invalid" });
  await expectVerificationError("id_token_issuer_invalid");

  currentIdToken = await signIdentity({ audience: "wrong-client-id" });
  await expectVerificationError("id_token_audience_invalid");

  currentIdToken = await signIdentity({
    claims: { azp: "different-client.apps.googleusercontent.com" },
  });
  await expectVerificationError("id_token_audience_invalid");

  currentIdToken = await signIdentity({ claims: { azp: 123 } });
  await expectVerificationError("id_token_audience_invalid");

  currentIdToken = await signIdentity({ claims: { azp: "" } });
  await expectVerificationError("id_token_audience_invalid");

  currentIdToken = await signIdentity({
    claims: { azp: "google-client-id.apps.googleusercontent.com" },
  });
  assert.equal(
    (await verifyGoogleOidcCode("authorization-code", transaction)).email,
    "alice@example.com",
  );

  currentIdToken = await signIdentity({
    claims: { email: "aliKe@example.com" },
  });
  await expectVerificationError("identity_invalid");

  currentIdToken = await signIdentity({
    claims: { hd: "examKle.com" },
  });
  await expectVerificationError("workspace_domain_mismatch");

  currentIdToken = await signIdentity({
    audience: [
      "google-client-id.apps.googleusercontent.com",
      "different-client.apps.googleusercontent.com",
    ],
  });
  await expectVerificationError("id_token_audience_invalid");

  currentIdToken = await signIdentity({
    expiration: Math.floor(Date.now() / 1000) - 60,
  });
  await expectVerificationError("id_token_expired");

  tokenResponse = "non_ok";
  await expectVerificationError("provider_error", "provider-error-code");
  await expectVerificationError("provider_error", "reused-code");
  assert.equal(providerErrorBodyReads, 0);

  tokenResponse = "timeout";
  await expectVerificationError("provider_unavailable", "timeout-code");
});

async function expectedSessionHash(subject: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${GOOGLE_OIDC_ISSUER}#${subject}`),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
