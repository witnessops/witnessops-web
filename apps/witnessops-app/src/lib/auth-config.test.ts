import assert from "node:assert/strict";
import test from "node:test";
import { authConfiguration } from "./auth-config";

test("existing WorkOS configuration remains the default", () => {
  const value = authConfiguration({
    NODE_ENV: "test", WORKOS_API_KEY: "placeholder", WORKOS_CLIENT_ID: "client_test",
    WORKOS_COOKIE_PASSWORD: "non-secret-test-placeholder-32-characters",
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: "http://127.0.0.1:3020/callback",
  });
  assert.equal(value.origin, "http://127.0.0.1:3020");
  assert.equal(value.callback, "http://127.0.0.1:3020/callback");
});

test("Keycloak mode requires a fixed callback and no WorkOS secret", () => {
  const config = {
    NODE_ENV: "test" as const, WITNESSOPS_APP_AUTH_PROVIDER: "keycloak",
    WITNESSOPS_KEYCLOAK_ISSUER: "https://identity.example.test/realms/academy",
    WITNESSOPS_KEYCLOAK_CLIENT_ID: "app-client",
    WITNESSOPS_KEYCLOAK_CLIENT_SECRET: "placeholder",
    WITNESSOPS_KEYCLOAK_CALLBACK_URL: "https://app.example.test/auth/keycloak/callback",
    WITNESSOPS_KEYCLOAK_TOKEN_KEYRING_FILE: "/tmp/example-keyring",
  };
  assert.deepEqual(authConfiguration(config), {
    origin: "https://app.example.test", callback: config.WITNESSOPS_KEYCLOAK_CALLBACK_URL,
    issuer: config.WITNESSOPS_KEYCLOAK_ISSUER,
  });
  assert.throws(() => authConfiguration({ ...config, WITNESSOPS_KEYCLOAK_CALLBACK_URL: "https://other.example.test/callback" }), /Keycloak/);
  assert.throws(() => authConfiguration({ ...config, WITNESSOPS_KEYCLOAK_TOKEN_KEYRING_FILE: "relative/keyring" }), /Keycloak/);
});
