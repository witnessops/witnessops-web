"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@workos-inc/authkit-nextjs";
import { authConfiguration } from "../../lib/auth-config";
import { revokeCurrentSession } from "../../lib/auth";
import { appAuthMode } from "../../lib/auth-mode";
import { keycloakSessionCookieName, keycloakPreauthCookieName } from "../../lib/keycloak-preauth";
import { keycloakRuntime } from "../../lib/keycloak-runtime";
import { buildKeycloakEndSessionUrl } from "../../lib/keycloak-oidc";
export async function logout() {
  const { origin } = authConfiguration(), incoming = await headers();
  if (incoming.get("origin") !== origin || ![null, "same-origin", "none"].includes(incoming.get("sec-fetch-site"))) throw new Error("Use the app origin.");
  if (appAuthMode() === "keycloak") {
    const idToken = await revokeCurrentSession();
    const jar = await cookies();
    const options = { httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax" as const, path: "/", maxAge: 0 };
    jar.set(keycloakSessionCookieName(origin), "", options);
    jar.set(keycloakPreauthCookieName(origin), "", options);
    let endSession: string | null = null;
    if (idToken) {
      try {
        const { configuration, settings } = await keycloakRuntime();
        endSession = buildKeycloakEndSessionUrl(configuration, settings, idToken);
      } catch { /* Durable local revocation already completed. */ }
    }
    redirect(endSession ?? `${origin}/`);
  }
  await revokeCurrentSession();
  // Durable local revocation precedes cookie deletion/provider redirect. Next
  // server actions use a 303 after POST. AuthKit terminates the provider
  // session and deletes its host-only cookie without deleting workspace data.
  await signOut({ returnTo: `${origin}/` });
}
