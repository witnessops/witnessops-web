import "server-only";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { authConfiguration } from "./auth-config";
import type { Identity } from "./db/identity";

export async function authenticatedIdentity(): Promise<Identity | null> {
  const { issuer } = authConfiguration();
  // AuthKit checks the sealed session, verifies the access-token signature and
  // binds its subject to the user. Middleware handles provider token refresh.
  const { user, impersonator } = await withAuth();
  if (!user || impersonator) return null;
  return { provider: "workos", issuer, subject: user.id,
    email: user.emailVerified ? user.email : null,
    displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || null };
}
