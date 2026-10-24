import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import {
  ENTRA_OIDC_REDIRECT_URI,
  verifyEntraOidcTransactionCookie,
} from "@/lib/server/admin-entra-oidc";

import { GET } from "./route";

const TENANT_ID = "0a1b2c3d-4e5f-4678-89ab-cdef01234567";
const CLIENT_ID = "fedcba98-7654-4321-8fed-cba987654321";
const CLIENT_SECRET = "synthetic-entra-client-secret-do-not-leak";

const trackedEnv = [
  "WITNESSOPS_ADMIN_SECRET",
  "WITNESSOPS_ADMIN_ENTRA_ENABLED",
  "WITNESSOPS_ENTRA_OIDC_TENANT_ID",
  "WITNESSOPS_ENTRA_OIDC_CLIENT_ID",
  "WITNESSOPS_ENTRA_OIDC_CLIENT_SECRET",
  "WITNESSOPS_ENTRA_OIDC_REDIRECT_URI",
  "WITNESSOPS_ENTRA_ADMIN_OID_ALLOWLIST",
] as const;

const originals = Object.fromEntries(
  trackedEnv.map((name) => [name, process.env[name]]),
) as Record<(typeof trackedEnv)[number], string | undefined>;
const originalWarn = console.warn;

test.afterEach(() => {
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
  process.env.WITNESSOPS_ENTRA_OIDC_TENANT_ID = TENANT_ID;
  process.env.WITNESSOPS_ENTRA_OIDC_CLIENT_ID = CLIENT_ID;
  process.env.WITNESSOPS_ENTRA_OIDC_CLIENT_SECRET = CLIENT_SECRET;
  process.env.WITNESSOPS_ENTRA_OIDC_REDIRECT_URI = ENTRA_OIDC_REDIRECT_URI;
  process.env.WITNESSOPS_ENTRA_ADMIN_OID_ALLOWLIST =
    "abcdefab-cdef-4abc-8def-0123456789ab";
}

test("Entra start redirects to Microsoft with a signed transaction cookie", async () => {
  configureEntra();
  const response = await GET(
    new NextRequest(
      "https://witnessops.com/api/admin/entra/start?returnTo=%2Fadmin%2Fqueue",
    ),
  );

  assert.equal(response.status, 302);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.origin, "https://login.microsoftonline.com");
  assert.equal(location.pathname, `/${TENANT_ID}/oauth2/v2.0/authorize`);
  assert.equal(location.searchParams.get("response_mode"), "form_post");
  assert.equal(location.searchParams.get("code_challenge_method"), "S256");
  assert.equal(location.searchParams.get("nonce") !== null, true);
  assert.equal(location.searchParams.get("state") !== null, true);
  assert.equal(location.searchParams.has("client_secret"), false);
  assert.equal(location.toString().includes(CLIENT_SECRET), false);

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /witnessops-admin-entra-oidc-transaction=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=none/i);
  assert.match(setCookie, /Path=\/api\/admin\/entra/i);
  assert.match(setCookie, /Max-Age=600/i);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const cookie = response.cookies.get("witnessops-admin-entra-oidc-transaction")?.value;
  assert.ok(cookie);
  const transaction = await verifyEntraOidcTransactionCookie(cookie);
  assert.equal(transaction.returnTo, "/admin/queue");
  assert.equal(transaction.state, location.searchParams.get("state"));
});

test("flag off and invalid config redirect to the fixed not-configured error", async () => {
  const diagnostics: string[] = [];
  console.warn = (message?: unknown) => diagnostics.push(String(message));

  for (const name of trackedEnv) delete process.env[name];
  const disabled = await GET(
    new NextRequest("https://0.0.0.0:3000/api/admin/entra/start"),
  );
  assert.equal(disabled.status, 303);
  assert.equal(
    disabled.headers.get("location"),
    "https://witnessops.com/admin/login?error=entra_not_configured",
  );
  assert.equal(disabled.headers.get("location")?.includes(CLIENT_SECRET), false);
  assert.equal(disabled.headers.get("location")?.includes(TENANT_ID), false);

  process.env.WITNESSOPS_ADMIN_ENTRA_ENABLED = "1";
  process.env.WITNESSOPS_ENTRA_OIDC_TENANT_ID = TENANT_ID;
  const partial = await GET(
    new NextRequest("https://0.0.0.0:3000/api/admin/entra/start?returnTo=https://evil.example"),
  );
  assert.equal(
    partial.headers.get("location"),
    "https://witnessops.com/admin/login?error=entra_not_configured",
  );
  assert.equal(partial.headers.get("set-cookie")?.includes("Max-Age=0"), true);
  assert.deepEqual(diagnostics, [
    "[admin-entra-oidc] flag_disabled",
    "[admin-entra-oidc] config_invalid",
  ]);
  assert.equal(diagnostics.join("\n").includes(CLIENT_SECRET), false);
});
