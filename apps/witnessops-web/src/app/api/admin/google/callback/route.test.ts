import assert from "node:assert/strict";
import test from "node:test";

import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { NextRequest } from "next/server";

import {
  GOOGLE_OIDC_ISSUER,
  GOOGLE_OIDC_TRANSACTION_COOKIE_NAME,
  createGoogleOidcTransaction,
} from "@/lib/server/admin-google-oidc";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionCookie,
} from "@/lib/server/admin-session";

import { GET } from "./route";

const trackedEnv = [
  "WITNESSOPS_ADMIN_SECRET",
  "WITNESSOPS_GOOGLE_OIDC_CLIENT_ID",
  "WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET",
  "WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI",
  "WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN",
  "WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST",
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
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

function configureGoogle(): void {
  process.env.WITNESSOPS_ADMIN_SECRET = "TEST_ONLY_SESSION_SECRET_PLACEHOLDER";
  process.env.WITNESSOPS_GOOGLE_OIDC_CLIENT_ID =
    "123456-test.apps.googleusercontent.com";
  process.env.WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET =
    "TEST_ONLY_PROVIDER_SECRET_PLACEHOLDER";
  process.env.WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI =
    "https://witnessops.com/api/admin/google/callback";
  process.env.WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN = "workspace.example";
  process.env.WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST =
    "operator@workspace.example";
}

function callbackRequest(
  state: string,
  transactionCookie: string,
  query: string,
  existingSession?: string,
): NextRequest {
  const cookies = [
    `${GOOGLE_OIDC_TRANSACTION_COOKIE_NAME}=${transactionCookie}`,
    ...(existingSession
      ? [`${ADMIN_SESSION_COOKIE_NAME}=${existingSession}`]
      : []),
  ];
  return new NextRequest(
    `https://witnessops.com/api/admin/google/callback?state=${encodeURIComponent(state)}&${query}`,
    { headers: { cookie: cookies.join("; ") } },
  );
}

test("Google callback verifies identity, rotates the session, and returns safely", async () => {
  configureGoogle();
  const transaction = await createGoogleOidcTransaction("/admin/queue");
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "callback-success-key";

  const idToken = await new SignJWT({
    nonce: transaction.nonce,
    email: "operator@workspace.example",
    email_verified: true,
    hd: "workspace.example",
    name: "Test Operator",
  })
    .setProtectedHeader({ alg: "RS256", kid: "callback-success-key" })
    .setIssuer(GOOGLE_OIDC_ISSUER)
    .setAudience("123456-test.apps.googleusercontent.com")
    .setSubject("google-subject-callback")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  globalThis.fetch = async (input, init) => {
    const url =
      input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.toString()
          : String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      assert.equal(init?.method, "POST");
      const body = init?.body;
      assert.ok(body instanceof URLSearchParams);
      assert.equal(body.get("code"), "single-use-code");
      assert.equal(body.get("code_verifier"), transaction.codeVerifier);
      return Response.json({ id_token: idToken });
    }
    if (url === "https://www.googleapis.com/oauth2/v3/certs") {
      return Response.json({ keys: [publicJwk] });
    }
    throw new Error("Unexpected mocked endpoint");
  };

  const response = await GET(
    callbackRequest(
      transaction.state,
      transaction.cookieValue,
      "code=single-use-code",
      "attacker-fixed-session",
    ),
  );

  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get("location"),
    "https://witnessops.com/admin/queue",
  );
  const sessionCookie = response.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  assert.ok(sessionCookie);
  assert.notEqual(sessionCookie, "attacker-fixed-session");
  const verified = await verifyAdminSessionCookie(sessionCookie);
  assert.equal(
    verified?.actor,
    "oidc:https://accounts.google.com#google-subject-callback",
  );
  assert.equal(verified?.actorAuthSource, "oidc_session");
  assert.match(verified?.actorSessionHash ?? "", /^[a-f0-9]{16}$/);

  const encodedPayload = sessionCookie.slice(0, sessionCookie.lastIndexOf("."));
  const sessionPayload = JSON.parse(atob(encodedPayload)) as Record<string, unknown>;
  assert.equal("role" in sessionPayload, false);
  assert.equal("email" in sessionPayload, false);
  assert.equal("id_token" in sessionPayload, false);

  assert.equal(
    response.cookies.get(GOOGLE_OIDC_TRANSACTION_COOKIE_NAME)?.value,
    "",
  );
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=strict/i);
  assert.match(setCookie, /Max-Age=28800/i);
});

test("Google callback validates provider denial without exposing provider details", async () => {
  configureGoogle();
  const transaction = await createGoogleOidcTransaction("/admin");
  const diagnostics: string[] = [];
  console.warn = (message?: unknown) => diagnostics.push(String(message));

  const response = await GET(
    callbackRequest(
      transaction.state,
      transaction.cookieValue,
      "error=access_denied&error_description=PRIVATE_PROVIDER_DETAIL",
    ),
  );

  assert.equal(response.status, 303);
  const location = response.headers.get("location") ?? "";
  assert.equal(
    location,
    "https://witnessops.com/admin/login?error=google_auth_failed",
  );
  assert.doesNotMatch(location, /PRIVATE_PROVIDER_DETAIL|access_denied|state=/);
  assert.deepEqual(diagnostics, ["[admin-google-oidc] provider_access_denied"]);
  assert.equal(response.cookies.has(ADMIN_SESSION_COOKIE_NAME), false);
  assert.equal(
    response.cookies.get(GOOGLE_OIDC_TRANSACTION_COOKIE_NAME)?.value,
    "",
  );
});

test("Google callback rejects missing, mismatched, tampered, and expired state", async () => {
  configureGoogle();
  const diagnostics: string[] = [];
  console.warn = (message?: unknown) => diagnostics.push(String(message));
  const transaction = await createGoogleOidcTransaction("/admin");
  const changedLastCharacter = transaction.cookieValue.endsWith("A") ? "B" : "A";
  const tamperedCookie = `${transaction.cookieValue.slice(0, -1)}${changedLastCharacter}`;
  const originalDateNow = Date.now;

  const cases: Array<{ name: string; request: () => NextRequest }> = [
    {
      name: "missing cookie",
      request: () =>
        new NextRequest(
          `https://witnessops.com/api/admin/google/callback?state=${transaction.state}&code=placeholder`,
        ),
    },
    {
      name: "mismatched state",
      request: () =>
        callbackRequest(
          `${transaction.state}different`,
          transaction.cookieValue,
          "code=placeholder",
        ),
    },
    {
      name: "tampered transaction",
      request: () =>
        callbackRequest(transaction.state, tamperedCookie, "code=placeholder"),
    },
    {
      name: "expired transaction",
      request: () => {
        Date.now = () => originalDateNow() + 11 * 60 * 1000;
        return callbackRequest(
          transaction.state,
          transaction.cookieValue,
          "code=placeholder",
        );
      },
    },
  ];

  try {
    for (const routeCase of cases) {
      Date.now = originalDateNow;
      const response = await GET(routeCase.request());
      assert.equal(response.status, 303, routeCase.name);
      assert.equal(
        response.headers.get("location"),
        "https://witnessops.com/admin/login?error=google_auth_failed",
        routeCase.name,
      );
      assert.equal(
        response.cookies.has(ADMIN_SESSION_COOKIE_NAME),
        false,
        routeCase.name,
      );
      assert.equal(
        response.cookies.get(GOOGLE_OIDC_TRANSACTION_COOKIE_NAME)?.value,
        "",
        routeCase.name,
      );
    }
    assert.deepEqual(diagnostics, [
      "[admin-google-oidc] callback_state_missing",
      "[admin-google-oidc] callback_state_invalid",
      "[admin-google-oidc] transaction_invalid",
      "[admin-google-oidc] transaction_expired",
    ]);
  } finally {
    Date.now = originalDateNow;
  }
});

test("Google callback rejects a reused or expired authorization code", async () => {
  configureGoogle();
  const transaction = await createGoogleOidcTransaction("/admin");
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = "callback-replay-key";
  const idToken = await new SignJWT({
    nonce: transaction.nonce,
    email: "operator@workspace.example",
    email_verified: true,
    hd: "workspace.example",
  })
    .setProtectedHeader({ alg: "RS256", kid: "callback-replay-key" })
    .setIssuer(GOOGLE_OIDC_ISSUER)
    .setAudience("123456-test.apps.googleusercontent.com")
    .setSubject("google-replay-subject")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  const usedCodes = new Set<string>();

  globalThis.fetch = async (input, init) => {
    const url =
      input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.toString()
          : String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      const body = init?.body;
      assert.ok(body instanceof URLSearchParams);
      const code = body.get("code") ?? "";
      if (usedCodes.has(code)) {
        return new Response(null, { status: 400 });
      }
      usedCodes.add(code);
      return Response.json({ id_token: idToken });
    }
    if (url === "https://www.googleapis.com/oauth2/v3/certs") {
      return Response.json({ keys: [publicJwk] });
    }
    throw new Error("Unexpected mocked endpoint");
  };
  console.warn = () => undefined;

  const first = await GET(
    callbackRequest(
      transaction.state,
      transaction.cookieValue,
      "code=replay-once",
    ),
  );
  assert.ok(first.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value);

  const replay = await GET(
    callbackRequest(
      transaction.state,
      transaction.cookieValue,
      "code=replay-once",
    ),
  );
  assert.equal(replay.status, 303);
  assert.equal(replay.cookies.has(ADMIN_SESSION_COOKIE_NAME), false);
  assert.equal(
    replay.headers.get("location"),
    "https://witnessops.com/admin/login?error=google_auth_failed",
  );
});

test("Google callback fails closed without required server configuration", async () => {
  for (const name of trackedEnv) {
    delete process.env[name];
  }
  process.env.WITNESSOPS_ADMIN_SECRET = "TEST_ONLY_SESSION_SECRET_PLACEHOLDER";
  const transaction = await createGoogleOidcTransaction("/admin");
  console.warn = () => undefined;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("must not be called");
  };

  const response = await GET(
    callbackRequest(
      transaction.state,
      transaction.cookieValue,
      "code=unused-placeholder",
    ),
  );

  assert.equal(response.status, 303);
  assert.equal(response.cookies.has(ADMIN_SESSION_COOKIE_NAME), false);
  assert.equal(fetchCalled, false);
  assert.equal(
    response.headers.get("location"),
    "https://witnessops.com/admin/login?error=google_auth_failed",
  );
});
