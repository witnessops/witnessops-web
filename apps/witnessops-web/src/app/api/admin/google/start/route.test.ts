import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

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
const originalWarn = console.warn;

test.afterEach(() => {
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

test("Google start creates a state, nonce, and PKCE-bound authorization request", async () => {
  configureGoogle();

  const response = await GET(
    new NextRequest(
      "https://witnessops.com/api/admin/google/start?returnTo=%2Fadmin%2Fqueue",
    ),
  );

  assert.equal(response.status, 302);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.origin, "https://accounts.google.com");
  assert.equal(location.pathname, "/o/oauth2/v2/auth");
  assert.equal(location.searchParams.get("response_type"), "code");
  assert.equal(location.searchParams.get("response_mode"), "query");
  assert.equal(location.searchParams.get("scope"), "openid email profile");
  assert.equal(location.searchParams.get("hd"), "workspace.example");
  assert.equal(location.searchParams.get("code_challenge_method"), "S256");
  assert.match(location.searchParams.get("code_challenge") ?? "", /^[A-Za-z0-9_-]{43}$/);
  assert.match(location.searchParams.get("state") ?? "", /^[A-Za-z0-9_-]+$/);
  assert.match(location.searchParams.get("nonce") ?? "", /^[A-Za-z0-9_-]+$/);
  assert.equal(
    location.searchParams.has("client_secret"),
    false,
    "the client secret must never enter the browser redirect",
  );

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /witnessops-admin-google-oidc-transaction=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=lax/i);
  assert.match(setCookie, /Path=\/api\/admin\/google/i);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("Google start fails closed with a generic login error when configuration is absent", async () => {
  for (const name of trackedEnv) {
    delete process.env[name];
  }
  const diagnostics: string[] = [];
  console.warn = (message?: unknown) => diagnostics.push(String(message));

  const response = await GET(
    new NextRequest("https://witnessops.com/api/admin/google/start"),
  );

  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get("location"),
    "https://witnessops.com/admin/login?error=google_auth_unavailable",
  );
  assert.deepEqual(diagnostics, ["[admin-google-oidc] configuration_missing"]);
  assert.doesNotMatch(response.headers.get("location") ?? "", /secret|client/i);
});

test("Google start fails closed on partial configuration", async () => {
  for (const name of trackedEnv) {
    delete process.env[name];
  }
  process.env.WITNESSOPS_GOOGLE_OIDC_CLIENT_ID =
    "123456-test.apps.googleusercontent.com";
  console.warn = () => undefined;

  const response = await GET(
    new NextRequest("https://witnessops.com/api/admin/google/start"),
  );

  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get("location"),
    "https://witnessops.com/admin/login?error=google_auth_unavailable",
  );
  assert.equal(response.headers.get("set-cookie")?.includes("Max-Age=0"), true);
});
