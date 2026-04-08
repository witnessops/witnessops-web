import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from "jose";

export const ADMIN_OIDC_STATE_COOKIE_NAME = "witnessops-admin-oidc-state";

interface AdminOidcConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  allowedEmails: Set<string>;
}

interface OidcStatePayload {
  state: string;
  nonce: string;
  exp: number;
}

interface VerifiedAdminOidcIdentity {
  actor: string;
  email: string;
  name: string | null;
  subject: string;
  sessionHash: string;
}

function readRequiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function readAdminOidcConfig(): AdminOidcConfig | null {
  const tenantId = readRequiredEnv("WITNESSOPS_ADMIN_OIDC_TENANT_ID");
  const clientId = readRequiredEnv("WITNESSOPS_ADMIN_OIDC_CLIENT_ID");
  const clientSecret = readRequiredEnv("WITNESSOPS_ADMIN_OIDC_CLIENT_SECRET");
  const redirectUri = readRequiredEnv("WITNESSOPS_ADMIN_OIDC_REDIRECT_URI");
  const allowedRaw = readRequiredEnv("WITNESSOPS_ADMIN_OIDC_ALLOWED_EMAILS_JSON");

  if (!tenantId || !clientId || !clientSecret || !redirectUri || !allowedRaw) {
    return null;
  }

  const parsed = JSON.parse(allowedRaw);
  if (
    !Array.isArray(parsed) ||
    !parsed.every((value) => typeof value === "string" && value.trim().length > 0)
  ) {
    throw new Error(
      "WITNESSOPS_ADMIN_OIDC_ALLOWED_EMAILS_JSON must be a JSON array of non-empty strings",
    );
  }

  return {
    tenantId,
    clientId,
    clientSecret,
    redirectUri,
    allowedEmails: new Set(parsed.map((value) => value.trim().toLowerCase())),
  };
}

function issuer(config: AdminOidcConfig): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/v2.0`;
}

function authorizeEndpoint(config: AdminOidcConfig): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/authorize`;
}

function tokenEndpoint(config: AdminOidcConfig): string {
  return `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`;
}

function jwksEndpoint(config: AdminOidcConfig): URL {
  return new URL(`${issuer(config)}/discovery/v2.0/keys`);
}

function randomBase64Url(bytes = 32): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  let text = "";
  for (const value of buffer) {
    text += String.fromCharCode(value);
  }
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signPayload(payloadB64: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payloadB64),
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function createAdminOidcStateCookie(): Promise<{
  state: string;
  nonce: string;
  cookieValue: string;
}> {
  const secret = readRequiredEnv("WITNESSOPS_ADMIN_SECRET");
  if (!secret) {
    throw new Error("WITNESSOPS_ADMIN_SECRET is not configured");
  }

  const state = randomBase64Url(24);
  const nonce = randomBase64Url(24);
  const payload: OidcStatePayload = {
    state,
    nonce,
    exp: Date.now() + 10 * 60 * 1000,
  };

  const payloadB64 = btoa(JSON.stringify(payload));
  const signature = await signPayload(payloadB64, secret);

  return {
    state,
    nonce,
    cookieValue: `${payloadB64}.${signature}`,
  };
}

export async function verifyAdminOidcStateCookie(
  cookieValue: string,
): Promise<OidcStatePayload | null> {
  const secret = readRequiredEnv("WITNESSOPS_ADMIN_SECRET");
  if (!secret) {
    return null;
  }

  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex === -1) {
    return null;
  }

  const payloadB64 = cookieValue.slice(0, dotIndex);
  const signature = cookieValue.slice(dotIndex + 1);
  const expected = await signPayload(payloadB64, secret);
  if (signature !== expected) {
    return null;
  }

  const parsed = JSON.parse(atob(payloadB64)) as Partial<OidcStatePayload>;
  if (
    typeof parsed.state !== "string" ||
    typeof parsed.nonce !== "string" ||
    typeof parsed.exp !== "number" ||
    parsed.exp < Date.now()
  ) {
    return null;
  }

  return {
    state: parsed.state,
    nonce: parsed.nonce,
    exp: parsed.exp,
  };
}

export function buildAdminOidcAuthorizationUrl(
  config: AdminOidcConfig,
  state: string,
  nonce: string,
): string {
  const url = new URL(authorizeEndpoint(config));
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  return url.toString();
}

async function exchangeCodeForIdToken(
  config: AdminOidcConfig,
  code: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    scope: "openid profile email",
  });

  const response = await fetch(tokenEndpoint(config), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "(unreadable)");
    throw new Error(`OIDC token exchange failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as { id_token?: string };
  if (!payload.id_token) {
    throw new Error("OIDC token exchange returned no id_token");
  }
  return payload.id_token;
}

function pickEmail(payload: JWTPayload): string | null {
  const candidates = [
    payload.preferred_username,
    payload.email,
    typeof payload.upn === "string" ? payload.upn : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().toLowerCase();
    }
  }

  return null;
}

export async function verifyAdminOidcCode(
  code: string,
  expectedNonce: string,
): Promise<VerifiedAdminOidcIdentity> {
  const config = readAdminOidcConfig();
  if (!config) {
    throw new Error("Admin OIDC is not configured");
  }

  const idToken = await exchangeCodeForIdToken(config, code);
  const jwks = createRemoteJWKSet(jwksEndpoint(config));
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: issuer(config),
    audience: config.clientId,
  });

  if (payload.nonce !== expectedNonce) {
    throw new Error("OIDC nonce mismatch");
  }

  const email = pickEmail(payload);
  if (!email) {
    throw new Error("OIDC identity did not include a usable email");
  }
  if (!config.allowedEmails.has(email)) {
    throw new Error("OIDC identity is not authorized for admin access");
  }

  const subject =
    typeof payload.oid === "string" && payload.oid.length > 0
      ? payload.oid
      : typeof payload.sub === "string" && payload.sub.length > 0
        ? payload.sub
        : null;

  if (!subject) {
    throw new Error("OIDC identity did not include a stable subject");
  }

  const displayName =
    typeof payload.name === "string" && payload.name.trim().length > 0
      ? payload.name.trim()
      : null;

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${subject}:${email}`),
  );
  const sessionHash = Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);

  return {
    actor: `entra:${email}`,
    email,
    name: displayName,
    subject,
    sessionHash,
  };
}
