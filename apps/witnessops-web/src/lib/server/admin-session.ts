import "server-only";

import type { NextRequest } from "next/server";
import type { AdminActorAuthSource } from "@/lib/token-contract";
import type { AdminRole } from "./admin-authorization";
import {
  ADMIN_SESSION_COOKIE_NAME,
  isTestAdminRequest,
  verifyAdminSessionCookie,
} from "./admin-session-cookie";
import { isAdminSessionRevoked } from "./admin-session-revocation";

export {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSessionCookie,
  isTestAdminRequest,
  verifyAdminSessionCookie,
} from "./admin-session-cookie";

export interface VerifiedAdminSession {
  actor: string;
  actorAuthSource: AdminActorAuthSource;
  actorSessionHash: string | null;
  role: AdminRole;
  isLocalBypass: boolean;
}

export async function getVerifiedAdminSession(
  request: NextRequest,
): Promise<VerifiedAdminSession | null> {
  if (isTestAdminRequest()) {
    return {
      actor: "local-dev",
      actorAuthSource: "local_bypass",
      actorSessionHash: null,
      role: "Founder",
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

  try {
    if (await isAdminSessionRevoked(sessionCookie, payload.exp)) return null;
  } catch {
    // Unavailable durable state must never turn a revoked cookie into access.
    return null;
  }

  return {
    actor: payload.actor,
    actorAuthSource: "oidc_session",
    actorSessionHash: payload.actorSessionHash,
    role: payload.role,
    isLocalBypass: false,
  };
}
