import type { NextRequest } from "next/server";

import type { AdminActorAuthSource } from "@/lib/token-contract";

interface AdminSessionPayload {
  hash: string;
  exp: number;
}

export interface VerifiedAdminSession {
  actor: string;
  actorAuthSource: AdminActorAuthSource;
  actorSessionHash: string | null;
  isLocalBypass: boolean;
}

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function normalizeHost(host: string | null): string {
  const candidate = host?.split(",")[0]?.trim() ?? "";
  if (!candidate) {
    return "";
  }

  try {
    return new URL(`http://${candidate}`).hostname.toLowerCase();
  } catch {
    return candidate.toLowerCase();
  }
}

function isLocalHost(host: string): boolean {
  return LOCAL_DEV_HOSTS.has(normalizeHost(host));
}

export function isLocalAdminRequest(request: Request | NextRequest): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;

  return isLocalHost(host);
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
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const expectedSig = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payloadB64),
    );

    const expectedB64 = btoa(
      String.fromCharCode(...new Uint8Array(expectedSig)),
    );

    if (signatureB64 !== expectedB64) {
      return null;
    }

    const payload = JSON.parse(
      atob(payloadB64),
    ) as Partial<AdminSessionPayload>;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }
    if (typeof payload.hash !== "string" || payload.hash.length === 0) {
      return null;
    }

    return {
      hash: payload.hash,
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

  const sessionCookie = request.cookies.get("witnessops-admin-session")?.value;
  if (!sessionCookie) {
    return null;
  }

  const payload = await verifyAdminSessionCookie(sessionCookie);
  if (!payload) {
    return null;
  }

  return {
    actor: `admin:${payload.hash}`,
    actorAuthSource: "session_cookie",
    actorSessionHash: payload.hash,
    isLocalBypass: false,
  };
}
