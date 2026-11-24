import "server-only";
import * as oidc from "openid-client";
import type { KeycloakSessionProvider } from "./keycloak-sessions";

const DISCOVERY_TIMEOUT_SECONDS = 5;
const OIDC_VALUE = /^[A-Za-z0-9_-]{32,128}$/;
const CALLBACK_PARAMETERS = new Set(["code", "state", "iss", "session_state"]);
const MAX_TOKEN_BYTES = 131_072;

export type KeycloakOidcSettings = {
  issuer: URL;
  clientId: string;
  clientSecret: string;
  callback: URL;
};

export type KeycloakOidcAttempt = {
  state: string;
  nonce: string;
  codeVerifier: string;
};

type SettingsInput = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};

function fixedUrl(value: string): URL {
  try {
    if (typeof value !== "string" || value.length > 2048) throw new Error();
    const url = new URL(value);
    if (url.href !== value || url.username || url.password || url.search || url.hash) throw new Error();
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(url.hostname))) throw new Error();
    return url;
  } catch {
    throw new Error("Invalid Keycloak OIDC configuration.");
  }
}

/** Parse only fixed server-owned values; no request Host or query can select an issuer or callback. */
export function parseKeycloakOidcSettings(input: SettingsInput): KeycloakOidcSettings {
  if (!input || typeof input.clientId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(input.clientId)
    || typeof input.clientSecret !== "string" || !input.clientSecret.trim() || input.clientSecret.length > 4096) {
    throw new Error("Invalid Keycloak OIDC configuration.");
  }
  const issuer = fixedUrl(input.issuer);
  const callback = fixedUrl(input.callbackUrl);
  if (!/(?:^|\/)realms\/[^/]+$/.test(issuer.pathname) || callback.pathname === "/"
    || callback.pathname.endsWith("/") || callback.href === issuer.href) {
    throw new Error("Invalid Keycloak OIDC configuration.");
  }
  return { issuer, clientId: input.clientId, clientSecret: input.clientSecret, callback };
}

function assertKeycloakConfiguration(configuration: oidc.Configuration, settings: KeycloakOidcSettings): void {
  const metadata = configuration.serverMetadata();
  const client = configuration.clientMetadata();
  if (metadata.issuer !== settings.issuer.href || client.client_id !== settings.clientId
    || client.client_secret !== settings.clientSecret) throw new Error();
  const base = `${settings.issuer.href}/protocol/openid-connect`;
  const endpoints: Array<[string | undefined, string, boolean]> = [
    [metadata.authorization_endpoint, `${base}/auth`, true],
    [metadata.token_endpoint, `${base}/token`, true],
    [metadata.jwks_uri, `${base}/certs`, true],
    [metadata.userinfo_endpoint, `${base}/userinfo`, false],
    [metadata.introspection_endpoint, `${base}/token/introspect`, true],
    [metadata.end_session_endpoint, `${base}/logout`, false],
  ];
  if (endpoints.some(([actual, expected, required]) => (required && !actual)
    || (actual !== undefined && actual !== expected))) throw new Error();
}

/** Discovery and subsequent token/JWKS requests share the same bounded timeout. */
export async function discoverKeycloakOidc(settings: KeycloakOidcSettings): Promise<oidc.Configuration> {
  try {
    const execute = [oidc.enableNonRepudiationChecks];
    if (settings.issuer.protocol === "http:") execute.unshift(oidc.allowInsecureRequests);
    const configuration = await oidc.discovery(settings.issuer, settings.clientId, settings.clientSecret,
      oidc.ClientSecretPost(settings.clientSecret), { timeout: DISCOVERY_TIMEOUT_SECONDS, execute });
    assertKeycloakConfiguration(configuration, settings);
    return configuration;
  } catch {
    // Provider responses can contain request details. Never pass them to route errors or logs.
    throw new Error("Keycloak OIDC discovery failed.");
  }
}

/** The caller must keep this attempt in a short-lived, sealed, one-use preauth context. */
export async function beginKeycloakOidcLogin(configuration: oidc.Configuration, settings: KeycloakOidcSettings): Promise<{
  authorizationUrl: string;
  attempt: KeycloakOidcAttempt;
}> {
  try { assertKeycloakConfiguration(configuration, settings); }
  catch { throw new Error("Keycloak OIDC configuration is unavailable."); }
  const attempt = { state: oidc.randomState(), nonce: oidc.randomNonce(), codeVerifier: oidc.randomPKCECodeVerifier() };
  const codeChallenge = await oidc.calculatePKCECodeChallenge(attempt.codeVerifier);
  const authorizationUrl = oidc.buildAuthorizationUrl(configuration, {
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: settings.callback.href,
    state: attempt.state,
    nonce: attempt.nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return { authorizationUrl: authorizationUrl.href, attempt };
}

function exactCallback(value: string, settings: KeycloakOidcSettings, attempt: KeycloakOidcAttempt): URL {
  try {
    if (typeof value !== "string" || value.length > 8192 || !OIDC_VALUE.test(attempt.state)
      || !OIDC_VALUE.test(attempt.nonce) || !OIDC_VALUE.test(attempt.codeVerifier)) throw new Error();
    const url = new URL(value);
    if (url.origin !== settings.callback.origin || url.pathname !== settings.callback.pathname
      || url.username || url.password || url.hash) throw new Error();
    const names = [...url.searchParams.keys()];
    if (names.some(name => !CALLBACK_PARAMETERS.has(name) || url.searchParams.getAll(name).length !== 1)) throw new Error();
    const code = url.searchParams.get("code"), state = url.searchParams.get("state"), issuer = url.searchParams.get("iss");
    if (!code || code.length > 4096 || state !== attempt.state
      || (url.searchParams.has("iss") && issuer !== settings.issuer.href)) throw new Error();
    return url;
  } catch {
    throw new Error("Keycloak OIDC callback rejected.");
  }
}

/** No route, cookie, database or production setting invokes this helper automatically. */
export async function completeKeycloakOidcLogin(
  configuration: oidc.Configuration,
  settings: KeycloakOidcSettings,
  callbackUrl: string,
  attempt: KeycloakOidcAttempt,
): Promise<{
  identity: { provider: "keycloak"; issuer: string; subject: string; email: string | null; displayName: string | null };
  tokens: { idToken: string; accessToken: string; refreshToken: string | null; expiresInSeconds: number | null };
}> {
  const callback = exactCallback(callbackUrl, settings, attempt);
  try {
    assertKeycloakConfiguration(configuration, settings);
    // Also enforce signature validation if a caller passes a Configuration created elsewhere.
    oidc.enableNonRepudiationChecks(configuration);
    const tokens = await oidc.authorizationCodeGrant(configuration, callback, {
      pkceCodeVerifier: attempt.codeVerifier,
      expectedState: attempt.state,
      expectedNonce: attempt.nonce,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    const audience = claims?.aud;
    if (!claims || claims.iss !== settings.issuer.href || typeof claims.sub !== "string" || !claims.sub
      || !expectedAudience(audience, settings.clientId, claims.azp)
      || claims.nonce !== attempt.nonce || typeof tokens.id_token !== "string") throw new Error();
    const { email, displayName } = currentProfile(claims);
    return {
      identity: { provider: "keycloak", issuer: claims.iss, subject: claims.sub, email, displayName },
      tokens: { idToken: tokens.id_token, accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null, expiresInSeconds: tokens.expiresIn() ?? null },
    };
  } catch {
    throw new Error("Keycloak OIDC sign-in failed.");
  }
}

function validToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Buffer.byteLength(value) <= MAX_TOKEN_BYTES;
}

function expectedAudience(audience: unknown, clientId: string, authorizedParty?: unknown): boolean {
  return audience === clientId || (Array.isArray(audience) && audience.includes(clientId)
    && (audience.length === 1 || authorizedParty === clientId));
}

function introspectionAudience(audience: unknown, clientId: string): boolean {
  return audience === clientId || (Array.isArray(audience) && audience.includes(clientId));
}

function currentProfile(value: unknown): {
  email: string | null; displayName: string | null;
} {
  if (!value || typeof value !== "object") return { email: null, displayName: null };
  const claims = value as Record<string, unknown>;
  const email = claims.email_verified === true && typeof claims.email === "string"
    && claims.email.length <= 320 && claims.email === claims.email.trim()
    && claims.email.includes("@") && !/\s|[\x00-\x1f\x7f]/u.test(claims.email) ? claims.email : null;
  const displayName = typeof claims.name === "string" && claims.name.length <= 200
    && claims.name.trim() && !/[\x00-\x1f\x7f]/.test(claims.name) ? claims.name : null;
  return { email, displayName };
}

/** The store checks the returned identity against its bound session row on every read. */
export function keycloakSessionProvider(configuration: oidc.Configuration, settings: KeycloakOidcSettings): KeycloakSessionProvider {
  try { assertKeycloakConfiguration(configuration, settings); }
  catch { throw new Error("Keycloak OIDC configuration is unavailable."); }
  configuration.timeout = DISCOVERY_TIMEOUT_SECONDS;
  oidc.enableNonRepudiationChecks(configuration);

  const introspect: KeycloakSessionProvider["introspect"] = async accessToken => {
    if (!validToken(accessToken)) return { status: "unavailable" };
    try {
      const result = await oidc.tokenIntrospection(configuration, accessToken, { token_type_hint: "access_token" });
      if (result.active === false) return { status: "inactive" };
      if (result.active !== true || typeof result.iss !== "string" || typeof result.sub !== "string" || !result.sub
        || typeof result.client_id !== "string" || result.aud === undefined) return { status: "unavailable" };
      if (result.iss !== settings.issuer.href || result.client_id !== settings.clientId
        || !introspectionAudience(result.aud, settings.clientId)) return { status: "inactive" };
      return { status: "active", issuer: result.iss, subject: result.sub, ...currentProfile(result) };
    } catch (error) {
      if (error instanceof oidc.ResponseBodyError && error.error === "invalid_token") return { status: "inactive" };
      return { status: "unavailable" };
    }
  };

  const refresh: KeycloakSessionProvider["refresh"] = async refreshToken => {
    if (!validToken(refreshToken)) return { status: "unavailable" };
    try {
      const granted = await oidc.refreshTokenGrant(configuration, refreshToken);
      const claims = granted.claims();
      const nextRefreshToken = granted.refresh_token ?? refreshToken;
      if (!claims || claims.iss !== settings.issuer.href || typeof claims.sub !== "string" || !claims.sub
        || !expectedAudience(claims.aud, settings.clientId, claims.azp)
        || !validToken(granted.id_token) || !validToken(granted.access_token) || !validToken(nextRefreshToken)) {
        return { status: "unavailable" };
      }
      const access = await introspect(granted.access_token);
      if (access.status === "unavailable") return { status: "unavailable" };
      if (access.status !== "active" || access.issuer !== claims.iss || access.subject !== claims.sub) {
        return { status: "invalid_grant" };
      }
      return { status: "ok", issuer: claims.iss, subject: claims.sub,
        email: access.email, displayName: access.displayName,
        tokens: { id_token: granted.id_token, access_token: granted.access_token, refresh_token: nextRefreshToken } };
    } catch (error) {
      if (error instanceof oidc.ResponseBodyError && error.error === "invalid_grant") return { status: "invalid_grant" };
      return { status: "unavailable" };
    }
  };

  return { introspect, refresh };
}

/** Uses only an ID token recovered from a locally revoked, previously verified session. */
export function buildKeycloakEndSessionUrl(
  configuration: oidc.Configuration, settings: KeycloakOidcSettings, idToken: string | null,
): string | null {
  try {
    assertKeycloakConfiguration(configuration, settings);
    if (!configuration.serverMetadata().end_session_endpoint || !validToken(idToken)
      || idToken.split(".").length !== 3) return null;
    const url = oidc.buildEndSessionUrl(configuration, {
      client_id: settings.clientId,
      id_token_hint: idToken,
      post_logout_redirect_uri: new URL("/", settings.callback).href,
    });
    return url.href;
  } catch {
    return null;
  }
}
