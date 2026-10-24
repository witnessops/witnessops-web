import { ADMIN_ROLES, type AdminRole } from "./admin-authorization";
import { isAdminEntraEnabled, parseCanonicalEntraIssuer } from "./admin-entra-contract";

/**
 * Length-checked constant-time compare that stays off `node:crypto`.
 * Middleware imports this module, so Node-scheme imports fail the webpack build.
 */
function signaturesMatch(expectedB64: string, actualB64: string): boolean {
  if (expectedB64.length !== actualB64.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < expectedB64.length; i += 1) {
    mismatch |= expectedB64.charCodeAt(i) ^ actualB64.charCodeAt(i);
  }
  return mismatch === 0;
}

interface AdminSessionCommon {
  subject: string;
  actor: string;
  actorAuthSource: "oidc_session";
  actorSessionHash: string;
  role: AdminRole;
  iat: number;
  exp: number;
}

export interface GoogleAdminSessionClaimsV3 extends AdminSessionCommon {
  version: 3;
  identityProvider: "google";
  issuer: "https://accounts.google.com";
}

export interface GoogleAdminSessionClaimsV4 extends AdminSessionCommon {
  version: 4;
  identityProvider: "google";
  issuer: "https://accounts.google.com";
}

export interface MicrosoftAdminSessionClaimsV4 extends AdminSessionCommon {
  version: 4;
  identityProvider: "microsoft";
  issuer: string;
}

export type AdminSessionCookieClaims =
  | GoogleAdminSessionClaimsV3
  | GoogleAdminSessionClaimsV4
  | MicrosoftAdminSessionClaimsV4;

export const ADMIN_SESSION_COOKIE_NAME = "witnessops-admin-session";
const GOOGLE_OIDC_ISSUER = "https://accounts.google.com" as const;
const GOOGLE_ADMIN_ACTOR_PREFIX = `oidc:${GOOGLE_OIDC_ISSUER}#`;
const SESSION_HASH_PATTERN = /^[a-f0-9]{16}$/;
const SESSION_ABSOLUTE_LIFETIME_MS = 8 * 60 * 60 * 1000;

function testAdminBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "test" &&
    process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS === "1"
  );
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

export async function createAdminSessionCookie(
  payload: AdminSessionCookieClaims,
): Promise<string> {
  const secret = process.env.WITNESSOPS_ADMIN_SECRET;
  if (!secret) {
    throw new Error("WITNESSOPS_ADMIN_SECRET is not configured");
  }

  const payloadB64 = btoa(JSON.stringify(payload));
  const signature = await signPayload(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

/** Test scaffolding only; runtime development and production always use sessions. */
export function isTestAdminRequest(): boolean {
  return testAdminBypassEnabled();
}

interface LooseSessionClaims {
  version?: unknown;
  identityProvider?: unknown;
  issuer?: unknown;
  subject?: unknown;
  actor?: unknown;
  actorAuthSource?: unknown;
  actorSessionHash?: unknown;
  role?: unknown;
  iat?: unknown;
  exp?: unknown;
}

function sessionWindowValid(payload: LooseSessionClaims, now: number): boolean {
  return (
    typeof payload.iat === "number" &&
    Number.isSafeInteger(payload.iat) &&
    typeof payload.exp === "number" &&
    Number.isSafeInteger(payload.exp) &&
    payload.iat <= now + 60_000 &&
    payload.exp > now &&
    payload.exp > payload.iat &&
    payload.exp - payload.iat <= SESSION_ABSOLUTE_LIFETIME_MS
  );
}

function subjectIsGoogleSafe(subject: unknown): subject is string {
  return (
    typeof subject === "string" &&
    subject.length > 0 &&
    subject.length <= 255 &&
    /^[\x20-\x7e]+$/.test(subject)
  );
}

function roleAndHashValid(
  payload: LooseSessionClaims,
): payload is LooseSessionClaims & {
  actorSessionHash: string;
  role: AdminRole;
} {
  return (
    typeof payload.actorSessionHash === "string" &&
    SESSION_HASH_PATTERN.test(payload.actorSessionHash) &&
    ADMIN_ROLES.includes(payload.role as AdminRole)
  );
}

function googleBindingValid(payload: LooseSessionClaims): payload is LooseSessionClaims & {
  subject: string;
  actor: string;
  actorSessionHash: string;
  role: AdminRole;
  iat: number;
  exp: number;
} {
  return (
    payload.issuer === GOOGLE_OIDC_ISSUER &&
    payload.identityProvider === "google" &&
    payload.actorAuthSource === "oidc_session" &&
    subjectIsGoogleSafe(payload.subject) &&
    payload.actor === `${GOOGLE_ADMIN_ACTOR_PREFIX}${payload.subject}` &&
    roleAndHashValid(payload)
  );
}

function microsoftBindingValid(payload: LooseSessionClaims): payload is LooseSessionClaims & {
  issuer: string;
  subject: string;
  actor: string;
  actorSessionHash: string;
  role: AdminRole;
  iat: number;
  exp: number;
} {
  if (
    payload.identityProvider !== "microsoft" ||
    payload.actorAuthSource !== "oidc_session" ||
    typeof payload.issuer !== "string" ||
    typeof payload.subject !== "string" ||
    typeof payload.actor !== "string"
  ) {
    return false;
  }
  const issuer = parseCanonicalEntraIssuer(payload.issuer);
  if (!issuer || payload.issuer !== issuer) return false;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(payload.subject)) {
    return false;
  }
  if (payload.actor !== `oidc:${issuer}#${payload.subject}`) return false;
  return roleAndHashValid(payload);
}

function googleSession(
  version: 3 | 4,
  payload: LooseSessionClaims & {
    subject: string;
    actor: string;
    actorSessionHash: string;
    role: AdminRole;
    iat: number;
    exp: number;
  },
): GoogleAdminSessionClaimsV3 | GoogleAdminSessionClaimsV4 {
  const session = {
    identityProvider: "google" as const,
    issuer: GOOGLE_OIDC_ISSUER,
    subject: payload.subject,
    actor: payload.actor,
    actorAuthSource: "oidc_session" as const,
    actorSessionHash: payload.actorSessionHash,
    role: payload.role,
    iat: payload.iat,
    exp: payload.exp,
  };
  if (version === 3) return { version: 3, ...session };
  return { version: 4, ...session };
}

/**
 * Cryptographic prefilter only. Node page/API guards also check revocation.
 * `revocation` still parses a structurally valid Entra cookie while the flag
 * is off, so logout can tombstone it. Access checks reject that cookie.
 */
export async function verifyAdminSessionCookie(
  cookie: string,
  purpose: "access" | "revocation" = "access",
): Promise<AdminSessionCookieClaims | null> {
  const secret = process.env.WITNESSOPS_ADMIN_SECRET;
  if (!secret) return null;

  const dotIndex = cookie.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payloadB64 = cookie.slice(0, dotIndex);
  const signatureB64 = cookie.slice(dotIndex + 1);

  try {
    const expectedB64 = await signPayload(payloadB64, secret);

    if (!signaturesMatch(expectedB64, signatureB64)) {
      return null;
    }

    const payload = JSON.parse(atob(payloadB64)) as LooseSessionClaims;
    const now = Date.now();
    if (!sessionWindowValid(payload, now)) return null;

    if (payload.version === 3) {
      if (!googleBindingValid(payload)) return null;
      return googleSession(3, payload);
    }

    if (payload.version === 4) {
      const provider = payload.identityProvider;
      if (provider !== "google" && provider !== "microsoft") return null;
      switch (provider) {
        case "google": {
          if (!googleBindingValid(payload)) return null;
          return googleSession(4, payload);
        }
        case "microsoft": {
          if (!microsoftBindingValid(payload)) return null;
          if (purpose !== "revocation" && !isAdminEntraEnabled()) return null;
          return {
            version: 4,
            identityProvider: "microsoft",
            issuer: payload.issuer,
            subject: payload.subject,
            actor: payload.actor,
            actorAuthSource: "oidc_session",
            actorSessionHash: payload.actorSessionHash,
            role: payload.role,
            iat: payload.iat,
            exp: payload.exp,
          };
        }
        default: {
          const unreachable: never = provider;
          return unreachable;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
