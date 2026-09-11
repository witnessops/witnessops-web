import "server-only";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { authConfiguration } from "./auth-config";
import type { Identity } from "./db/identity";
import { database } from "./db/pool";
import { requireUnrevokedSession, revokeSession, sessionKey } from "./db/sessions";

export async function authenticatedIdentity(): Promise<Identity | null> {
  const { issuer } = authConfiguration();
  // AuthKit checks the sealed session, verifies the access-token signature and
  // binds its subject to the user. Middleware handles provider token refresh.
  const { user, impersonator, sessionId } = await withAuth();
  if (!user || impersonator) return null;
  await requireUnrevokedSession(database(), sessionKey(issuer, sessionId, user.id));
  return { provider: "workos", issuer, subject: user.id,
    email: user.emailVerified ? user.email : null,
    displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || null };
}

export async function revokeCurrentSession(): Promise<void> {
  const { issuer } = authConfiguration();
  const { user, impersonator, sessionId } = await withAuth();
  if (!user) return; // No authenticated session to revoke; normal cookie cleanup follows.
  if (impersonator) throw new Error("This session cannot sign out here.");
  // Independent of account, Early Access and membership state. Revoked members
  // can still log out. Failure propagates before any success/redirect/cookie clear.
  const key = sessionKey(issuer, sessionId, user.id);
  try { await revokeSession(database(), key); }
  catch { throw new Error("Sign out could not complete. Try again."); }
}
