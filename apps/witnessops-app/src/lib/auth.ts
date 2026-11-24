import "server-only";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { authConfiguration } from "./auth-config";
import { appAuthMode } from "./auth-mode";
import type { Identity } from "./db/identity";
import { database } from "./db/pool";
import { requireUnrevokedSession, revokeSession, sessionKey } from "./db/sessions";
import { ApiError } from "./errors";
import { keycloakSessionCookieName } from "./keycloak-preauth";
import { keycloakRuntime } from "./keycloak-runtime";

export async function authenticatedWebSession(): Promise<{ identity: Identity; session: ReturnType<typeof sessionKey> } | null> {
  if (appAuthMode() === "keycloak") {
    const origin = authConfiguration().origin;
    const token = (await cookies()).get(keycloakSessionCookieName(origin))?.value;
    if (!token) return null;
    const { store, provider } = await keycloakRuntime();
    const result = await store.load(token, provider);
    if (result.status === "unavailable") throw new ApiError(503, "Sign in is temporarily unavailable.");
    if (result.status !== "authenticated") return null;
    const { issuer, subject } = result.session;
    const session = sessionKey(issuer, result.session.sessionId, subject, "keycloak");
    await requireUnrevokedSession(database(), session);
    return { session, identity: { provider: "keycloak", issuer, subject,
      email: result.profile.email, displayName: result.profile.displayName } };
  }
  const { issuer } = authConfiguration();
  // AuthKit checks the sealed session, verifies the access-token signature and
  // binds its subject to the user. Middleware handles provider token refresh.
  const { user, impersonator, sessionId } = await withAuth();
  if (!user || impersonator) return null;
  const session = sessionKey(issuer, sessionId, user.id);
  await requireUnrevokedSession(database(), session);
  return { session, identity: { provider: "workos", issuer, subject: user.id,
    email: user.emailVerified ? user.email : null,
    displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || null } };
}

export async function authenticatedIdentity(): Promise<Identity | null> {
  return (await authenticatedWebSession())?.identity ?? null;
}

export async function revokeCurrentSession(): Promise<string | null> {
  if (appAuthMode() === "keycloak") {
    const origin = authConfiguration().origin;
    const token = (await cookies()).get(keycloakSessionCookieName(origin))?.value;
    if (!token) return null;
    const { store } = await keycloakRuntime();
    return store.revoke(token);
  }
  const { issuer } = authConfiguration();
  const { user, impersonator, sessionId } = await withAuth();
  if (!user) return null; // No authenticated session to revoke; normal cookie cleanup follows.
  if (impersonator) throw new Error("This session cannot sign out here.");
  // Independent of account, Early Access and membership state. Revoked members
  // can still log out. Failure propagates before any success/redirect/cookie clear.
  const key = sessionKey(issuer, sessionId, user.id);
  try { await revokeSession(database(), key); }
  catch { throw new Error("Sign out could not complete. Try again."); }
  return null;
}
