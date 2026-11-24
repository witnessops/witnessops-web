import test from "node:test";
import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import * as oidc from "openid-client";
import {
  beginKeycloakOidcLogin,
  buildKeycloakEndSessionUrl,
  completeKeycloakOidcLogin,
  discoverKeycloakOidc,
  keycloakSessionProvider,
  parseKeycloakOidcSettings,
  type KeycloakOidcSettings,
} from "./keycloak-oidc";

const input = {
  issuer: "https://identity.example.test/realms/witnessops",
  clientId: "witnessops-app",
  clientSecret: "synthetic-client-secret",
  callbackUrl: "https://app.example.test/auth/keycloak/callback",
};

function fixtureConfiguration(settings: KeycloakOidcSettings): oidc.Configuration {
  const base = `${settings.issuer.href}/protocol/openid-connect`;
  const configuration = new oidc.Configuration({
    issuer: settings.issuer.href,
    authorization_endpoint: `${base}/auth`,
    token_endpoint: `${base}/token`,
    jwks_uri: `${base}/certs`,
    userinfo_endpoint: `${base}/userinfo`,
    introspection_endpoint: `${base}/token/introspect`,
    end_session_endpoint: `${base}/logout`,
    response_types_supported: ["code"],
    id_token_signing_alg_values_supported: ["RS256"],
  }, settings.clientId, settings.clientSecret, oidc.ClientSecretPost(settings.clientSecret));
  configuration.timeout = 5;
  return configuration;
}

test("Keycloak settings accept only fixed secure or loopback issuer and callback URLs", () => {
  const settings = parseKeycloakOidcSettings(input);
  assert.equal(settings.issuer.href, input.issuer);
  assert.equal(settings.callback.href, input.callbackUrl);
  assert.equal(parseKeycloakOidcSettings({ ...input,
    issuer: "http://127.0.0.1:18301/realms/test",
    callbackUrl: "http://127.0.0.1:3020/auth/keycloak/callback",
  }).issuer.protocol, "http:");
  for (const change of [
    { issuer: "http://identity.example.test/realms/witnessops" },
    { issuer: "https://identity.example.test/realms/witnessops?other=1" },
    { issuer: "https://identity.example.test/.well-known/openid-configuration" },
    { callbackUrl: "http://app.example.test/auth/keycloak/callback" },
    { callbackUrl: "https://app.example.test/auth/keycloak/callback?next=/" },
    { callbackUrl: "https://user:pass@app.example.test/auth/keycloak/callback" },
    { clientId: "" },
    { clientSecret: "" },
  ]) {
    assert.throws(() => parseKeycloakOidcSettings({ ...input, ...change }), /^Error: Invalid Keycloak OIDC configuration\.$/);
  }
});

test("discovery confines confidential-client endpoints to the configured Keycloak realm", async () => {
  const settings = parseKeycloakOidcSettings(input);
  const base = `${settings.issuer.href}/protocol/openid-connect`;
  const originalFetch = globalThis.fetch;
  const goodMetadata = {
    issuer: settings.issuer.href,
    authorization_endpoint: `${base}/auth`,
    token_endpoint: `${base}/token`,
    jwks_uri: `${base}/certs`,
    userinfo_endpoint: `${base}/userinfo`,
    introspection_endpoint: `${base}/token/introspect`,
    end_session_endpoint: `${base}/logout`,
    response_types_supported: ["code"],
    id_token_signing_alg_values_supported: ["RS256"],
  };
  let metadata = goodMetadata;
  globalThis.fetch = (async () => new Response(JSON.stringify(metadata), {
    status: 200, headers: { "content-type": "application/json" },
  })) as typeof fetch;
  try {
    const discovered = await discoverKeycloakOidc(settings);
    assert.equal(discovered.timeout, 5);
    for (const change of [
      { authorization_endpoint: "https://other.example.test/authorize" },
      { token_endpoint: "https://other.example.test/token" },
      { jwks_uri: "https://other.example.test/certs" },
      { userinfo_endpoint: "https://other.example.test/userinfo" },
      { introspection_endpoint: "https://other.example.test/introspect" },
      { end_session_endpoint: "https://other.example.test/logout" },
      { token_endpoint: `${settings.issuer.origin}/realms/other/protocol/openid-connect/token` },
    ]) {
      metadata = { ...goodMetadata, ...change };
      await assert.rejects(discoverKeycloakOidc(settings), /^Error: Keycloak OIDC discovery failed\.$/);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("authorization uses an exact callback, fresh state and nonce, and S256 PKCE", async () => {
  const settings = parseKeycloakOidcSettings(input);
  const configuration = fixtureConfiguration(settings);
  const first = await beginKeycloakOidcLogin(configuration, settings);
  const second = await beginKeycloakOidcLogin(configuration, settings);
  const url = new URL(first.authorizationUrl);
  assert.equal(url.origin, settings.issuer.origin);
  assert.equal(url.searchParams.get("redirect_uri"), settings.callback.href);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("code_challenge"), await oidc.calculatePKCECodeChallenge(first.attempt.codeVerifier));
  assert.equal(url.searchParams.get("state"), first.attempt.state);
  assert.equal(url.searchParams.get("nonce"), first.attempt.nonce);
  assert.notEqual(first.attempt.state, second.attempt.state);
  assert.notEqual(first.attempt.nonce, second.attempt.nonce);
});

test("callback refuses changed origin, path, parameters and state before any provider request", async () => {
  const settings = parseKeycloakOidcSettings(input);
  const configuration = fixtureConfiguration(settings);
  let requests = 0;
  configuration[oidc.customFetch] = async () => { requests += 1; throw new Error("Provider must not be contacted"); };
  const { attempt } = await beginKeycloakOidcLogin(configuration, settings);
  const query = `code=synthetic-code&state=${attempt.state}`;
  for (const callback of [
    `https://other.example.test/auth/keycloak/callback?${query}`,
    `https://app.example.test/callback?${query}`,
    `${settings.callback.href}?${query}&next=https://other.example.test`,
    `${settings.callback.href}?${query}&state=${attempt.state}`,
    `${settings.callback.href}?code=synthetic-code&state=wrong`,
    `${settings.callback.href}?${query}&iss=https%3A%2F%2Fother.example.test`,
    `${settings.callback.href}?${query}&iss=`,
    `${settings.callback.href}?${query}#fragment`,
  ]) {
    await assert.rejects(completeKeycloakOidcLogin(configuration, settings, callback, attempt),
      /^Error: Keycloak OIDC callback rejected\.$/);
  }
  assert.equal(requests, 0);
});

test("real OIDC library validates a signed ID token and returns only verified identity claims", async () => {
  const settings = parseKeycloakOidcSettings(input);
  const configuration = fixtureConfiguration(settings);
  const { attempt } = await beginKeycloakOidcLogin(configuration, settings);
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "fixture", alg: "RS256", use: "sig" };
  const jwtPart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const signedIdToken = (subject: string) => {
    const now = Math.floor(Date.now() / 1000);
    const body = `${jwtPart({ alg: "RS256", typ: "JWT", kid: "fixture" })}.${jwtPart({
      iss: settings.issuer.href, sub: subject, aud: settings.clientId, exp: now + 300, iat: now,
      nonce: attempt.nonce, email: "learner@example.test", email_verified: true, name: "Fixture Learner",
    })}`;
    const signer = createSign("RSA-SHA256");
    signer.update(body);
    signer.end();
    return `${body}.${signer.sign(privateKey).toString("base64url")}`;
  };
  const idToken = signedIdToken("user_fixture");
  let returnedIdToken = idToken;
  configuration[oidc.customFetch] = async (url) => {
    if (url.endsWith("/token")) return new Response(JSON.stringify({
      access_token: "synthetic-access", token_type: "Bearer", expires_in: 300,
      refresh_token: "synthetic-refresh", id_token: returnedIdToken,
    }), { status: 200, headers: { "content-type": "application/json" } });
    if (url.endsWith("/certs")) return new Response(JSON.stringify({ keys: [jwk] }),
      { status: 200, headers: { "content-type": "application/json" } });
    throw new Error("Unexpected provider URL");
  };
  const callback = `${settings.callback.href}?code=synthetic-code&state=${attempt.state}&iss=${encodeURIComponent(settings.issuer.href)}`;
  const result = await completeKeycloakOidcLogin(configuration, settings, callback, attempt);
  assert.deepEqual(result.identity, {
    provider: "keycloak", issuer: settings.issuer.href, subject: "user_fixture",
    email: "learner@example.test", displayName: "Fixture Learner",
  });
  assert.equal(result.tokens.idToken, idToken);
  assert.equal(result.tokens.accessToken, "synthetic-access");
  assert.equal(result.tokens.refreshToken, "synthetic-refresh");
  assert.equal(result.tokens.expiresInSeconds, 300);

  const parts = idToken.split(".");
  const changedClaims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  changedClaims.sub = "unverified_subject";
  returnedIdToken = `${parts[0]}.${jwtPart(changedClaims)}.${parts[2]}`;
  await assert.rejects(completeKeycloakOidcLogin(configuration, settings, callback, attempt), error => {
    assert.equal((error as Error).message, "Keycloak OIDC sign-in failed.");
    assert.ok(!(error as Error).message.includes(returnedIdToken));
    return true;
  });
});

test("session introspection binds issuer, client and audience and exposes only verified current email", async () => {
  const settings = parseKeycloakOidcSettings(input);
  const configuration = fixtureConfiguration(settings);
  let body: Record<string, unknown> = {
    active: true, iss: settings.issuer.href, sub: "account-123", client_id: settings.clientId,
    aud: ["account", settings.clientId], email: "learner@example.test", email_verified: true,
    name: "Current Learner",
  };
  configuration[oidc.customFetch] = async url => {
    assert.equal(url, `${settings.issuer.href}/protocol/openid-connect/token/introspect`);
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };
  const provider = keycloakSessionProvider(configuration, settings);
  assert.deepEqual(await provider.introspect("synthetic-access"), {
    status: "active", issuer: settings.issuer.href, subject: "account-123",
    email: "learner@example.test", displayName: "Current Learner",
  });
  body = { ...body, email_verified: false };
  assert.deepEqual(await provider.introspect("synthetic-access"), {
    status: "active", issuer: settings.issuer.href, subject: "account-123",
    email: null, displayName: "Current Learner",
  });
  body = { ...body, client_id: "another-client" };
  assert.deepEqual(await provider.introspect("synthetic-access"), { status: "inactive" });
  body = { active: false };
  assert.deepEqual(await provider.introspect("synthetic-access"), { status: "inactive" });
  body = { active: true };
  assert.deepEqual(await provider.introspect("synthetic-access"), { status: "unavailable" });
});

test("refresh accepts signed identity only after the new access token is introspected", async () => {
  const settings = parseKeycloakOidcSettings(input);
  const configuration = fixtureConfiguration(settings);
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "refresh-fixture", alg: "RS256", use: "sig" };
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = `${part({ alg: "RS256", typ: "JWT", kid: "refresh-fixture" })}.${part({
    iss: settings.issuer.href, sub: "account-123", aud: settings.clientId, exp: now + 300, iat: now,
  })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(body);
  signer.end();
  const idToken = `${body}.${signer.sign(privateKey).toString("base64url")}`;
  let introspectedSubject = "account-123";
  configuration[oidc.customFetch] = async url => {
    if (url.endsWith("/token")) return new Response(JSON.stringify({
      id_token: idToken, access_token: "fresh-access", refresh_token: "fresh-refresh",
      token_type: "Bearer", expires_in: 300,
    }), { status: 200, headers: { "content-type": "application/json" } });
    if (url.endsWith("/certs")) return new Response(JSON.stringify({ keys: [jwk] }),
      { status: 200, headers: { "content-type": "application/json" } });
    if (url.endsWith("/token/introspect")) return new Response(JSON.stringify({
      active: true, iss: settings.issuer.href, sub: introspectedSubject, client_id: settings.clientId,
      aud: settings.clientId, email: "learner@example.test", email_verified: true,
    }), { status: 200, headers: { "content-type": "application/json" } });
    throw new Error("Unexpected provider URL");
  };
  const provider = keycloakSessionProvider(configuration, settings);
  assert.deepEqual(await provider.refresh("old-refresh"), {
    status: "ok", issuer: settings.issuer.href, subject: "account-123",
    email: "learner@example.test", displayName: null,
    tokens: { id_token: idToken, access_token: "fresh-access", refresh_token: "fresh-refresh" },
  });
  introspectedSubject = "different-account";
  assert.deepEqual(await provider.refresh("old-refresh"), { status: "invalid_grant" });
});

test("refresh distinguishes rejected grants from provider outage without exposing details", async () => {
  const settings = parseKeycloakOidcSettings(input);
  const configuration = fixtureConfiguration(settings);
  let failed = false;
  configuration[oidc.customFetch] = async () => {
    if (failed) throw new Error("Sensitive provider transport detail");
    return new Response(JSON.stringify({ error: "invalid_grant", error_description: "Sensitive provider message" }),
      { status: 400, headers: { "content-type": "application/json" } });
  };
  const provider = keycloakSessionProvider(configuration, settings);
  assert.deepEqual(await provider.refresh("old-refresh"), { status: "invalid_grant" });
  failed = true;
  assert.deepEqual(await provider.refresh("old-refresh"), { status: "unavailable" });
});

test("RP logout URL uses fixed client and app-origin return with no network request", () => {
  const settings = parseKeycloakOidcSettings(input);
  const configuration = fixtureConfiguration(settings);
  configuration[oidc.customFetch] = async () => { throw new Error("No network expected"); };
  const result = buildKeycloakEndSessionUrl(configuration, settings, "header.payload.signature");
  assert.ok(result);
  const url = new URL(result);
  assert.equal(url.href.split("?")[0], `${settings.issuer.href}/protocol/openid-connect/logout`);
  assert.equal(url.searchParams.get("client_id"), settings.clientId);
  assert.equal(url.searchParams.get("id_token_hint"), "header.payload.signature");
  assert.equal(url.searchParams.get("post_logout_redirect_uri"), `${settings.callback.origin}/`);
  assert.equal(buildKeycloakEndSessionUrl(configuration, settings, null), null);
});
