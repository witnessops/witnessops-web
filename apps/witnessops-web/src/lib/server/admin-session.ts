import type { NextRequest } from "next/server";

import type { AdminActorAuthSource } from "@/lib/token-contract";

interface AdminSessionPayload {
  version: 2;
  identityProvider: "google";
  issuer: "https://accounts.google.com";
  subject: string;
  actor: string;
  actorAuthSource: "oidc_session";
  actorSessionHash: string;
  iat: number;
  exp: number;
}

export interface VerifiedAdminSession {
  actor: string;
  actorAuthSource: AdminActorAuthSource;
  actorSessionHash: string | null;
  isLocalBypass: boolean;
}

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
export const ADMIN_SESSION_COOKIE_NAME = "witnessops-admin-session";
const GOOGLE_OIDC_ISSUER = "https://accounts.google.com";
const GOOGLE_ADMIN_ACTOR_PREFIX = `oidc:${GOOGLE_OIDC_ISSUER}#`;
const SESSION_HASH_PATTERN = /^[a-f0-9]{16}$/;

function localAdminBypassEnabled(): boolean {
  return process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS === "1";
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
  payload: AdminSessionPayload,
): Promise<string> {
  const secret = process.env.WITNESSOPS_ADMIN_SECRET;
  if (!secret) {
    throw new Error("WITNESSOPS_ADMIN_SECRET is not configured");
  }

  const payloadB64 = btoa(JSON.stringify(payload));
  const signature = await signPayload(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

function normalizeHost(host: string | null): string {
  const candidate = host?.trim() ?? "";
  if (!candidate) return "";
  if (
    candidate.includes(",") ||
    candidate.includes("@") ||
    candidate.includes("/") ||
    candidate.includes("\\")
  ) {
    return "";
  }

  try {
    return new URL(`http://${candidate}`).hostname.toLowerCase();
  } catch {
    return candidate.toLowerCase();
  }
}

export function isLocalAdminRequest(request: Request | NextRequest): boolean {
  if (
    process.env.NODE_ENV === "production" ||
    !localAdminBypassEnabled()
  ) {
    return false;
  }
  return LOCAL_DEV_HOSTS.has(normalizeHost(request.headers.get("host")));
}

export async function verifyAdminSessionCookie(
  cookie: string,
): Promise<AdminSessionPayload | null> {
  const secret = process.env.WITNESSOPS_ADMIN_SECRET;
  if (!secret) return null;

  const dotIndex = cookie.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payloadB64 = cookie.slice(0, dotIndex);
  const signatureB64 = cookie.slice(dotIndex + 1);

  try {
    const expectedB64 = await signPayload(payloadB64, secret);

    if (signatureB64 !== expectedB64) {
      return null;
    }

    const payload = JSON.parse(
      atob(payloadB64),
    ) as Partial<AdminSessionPayload>;
    const now = Date.now();
    if (
      payload.version !== 2 ||
      typeof payload.iat !== "number" ||
      !Number.isSafeInteger(payload.iat) ||
      typeof payload.exp !== "number" ||
      !Number.isSafeInteger(payload.exp) ||
      payload.iat > now + 60_000 ||
      payload.exp <= now ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > 8 * 60 * 60 * 1000
    ) {
      return null;
    }

    if (
      payload.issuer !== GOOGLE_OIDC_ISSUER ||
      payload.identityProvider !== "google" ||
      payload.actorAuthSource !== "oidc_session" ||
      typeof payload.subject !== "string" ||
      !payload.subject ||
      payload.subject.length > 255 ||
      !/^[\x20-\x7e]+$/.test(payload.subject) ||
      typeof payload.actor !== "string" ||
      payload.actor !== `${GOOGLE_ADMIN_ACTOR_PREFIX}${payload.subject}` ||
      typeof payload.actorSessionHash !== "string" ||
      !SESSION_HASH_PATTERN.test(payload.actorSessionHash)
    ) {
      return null;
    }

    return {
      version: 2,
      identityProvider: "google",
      issuer: GOOGLE_OIDC_ISSUER,
      subject: payload.subject,
      actor: payload.actor,
      actorAuthSource: "oidc_session",
      actorSessionHash: payload.actorSessionHash,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function getVerifiedAdminSession(
  request: NextRequest,
): Promise<VerifiedAdminSession | null> {
  if (isLocalAdminRequest(request)) {
    return {
      actor: "local-dev",
      actorAuthSource: "local_bypass",
      actorSessionHash: null,
      isLocalBypass: true,
    };
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return null;
  }

  const payload = await verifyAdminSessionCookie(sessionCookie);
  if (!payload) {
    return null;
  }

  return {
    actor: payload.actor,
    actorAuthSource: "oidc_session",
    actorSessionHash: payload.actorSessionHash,
    isLocalBypass: false,
  };
}
