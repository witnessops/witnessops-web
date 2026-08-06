import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { POST } from "./route";

const trackedEnv = [
  "WITNESSOPS_ADMIN_KEY_HASH",
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

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function legacyRequest(key: string): NextRequest {
  return new NextRequest("https://witnessops.com/api/admin/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}

test("legacy-key fallback remains functional when Microsoft OIDC is configured", async () => {
  const placeholderKey = "TEST_ONLY_LEGACY_KEY_PLACEHOLDER";
  process.env.WITNESSOPS_ADMIN_KEY_HASH = await sha256Hex(placeholderKey);
  process.env.WITNESSOPS_ADMIN_SECRET = "TEST_ONLY_SESSION_SECRET_PLACEHOLDER";
  process.env.WITNESSOPS_ADMIN_OIDC_TENANT_ID = "tenant-test";
  process.env.WITNESSOPS_ADMIN_OIDC_CLIENT_ID = "client-test";
  process.env.WITNESSOPS_ADMIN_OIDC_CLIENT_SECRET =
    "TEST_ONLY_PROVIDER_SECRET_PLACEHOLDER";
  process.env.WITNESSOPS_ADMIN_OIDC_REDIRECT_URI =
    "https://witnessops.com/api/admin/oidc/callback";
  process.env.WITNESSOPS_ADMIN_OIDC_ALLOWED_EMAILS_JSON =
    '["operator@example.test"]';

  const response = await POST(legacyRequest(placeholderKey));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /witnessops-admin-session=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=strict/i);
});

test("legacy-key fallback rejects an invalid key without creating a session", async () => {
  process.env.WITNESSOPS_ADMIN_KEY_HASH = await sha256Hex(
    "TEST_ONLY_EXPECTED_KEY_PLACEHOLDER",
  );
  process.env.WITNESSOPS_ADMIN_SECRET = "TEST_ONLY_SESSION_SECRET_PLACEHOLDER";

  const response = await POST(
    legacyRequest("TEST_ONLY_INVALID_KEY_PLACEHOLDER"),
  );

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});
