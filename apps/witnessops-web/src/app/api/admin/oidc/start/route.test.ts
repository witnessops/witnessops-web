import test from "node:test";
import assert from "node:assert/strict";

import { NextRequest } from "next/server";

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

test.afterEach(() => {
  for (const name of trackedEnv) {
    const value = originals[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

test("admin oidc start redirects to the Entra authorize endpoint", async () => {
  process.env.WITNESSOPS_ADMIN_SECRET = "admin-secret";
  process.env.WITNESSOPS_ADMIN_OIDC_TENANT_ID = "tenant-123";
  process.env.WITNESSOPS_ADMIN_OIDC_CLIENT_ID = "client-123";
  process.env.WITNESSOPS_ADMIN_OIDC_CLIENT_SECRET = "secret-123";
  process.env.WITNESSOPS_ADMIN_OIDC_REDIRECT_URI =
    "https://witnessops.com/api/admin/oidc/callback";
  process.env.WITNESSOPS_ADMIN_OIDC_ALLOWED_EMAILS_JSON =
    '["alice@example.com"]';

  const response = await GET(
    new NextRequest("https://witnessops.com/api/admin/oidc/start"),
  );

  assert.equal(response.status, 302);
  const location = response.headers.get("location") ?? "";
  assert.match(
    location,
    /^https:\/\/login\.microsoftonline\.com\/tenant-123\/oauth2\/v2\.0\/authorize\?/,
  );
  assert.match(location, /client_id=client-123/);
  assert.match(
    response.headers.get("set-cookie") ?? "",
    /witnessops-admin-oidc-state=/,
  );
});
