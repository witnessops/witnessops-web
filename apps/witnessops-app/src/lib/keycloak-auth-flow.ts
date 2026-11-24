import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { Pool } from "pg";
import { appAuthMode } from "./auth-mode";
import { authConfiguration } from "./auth-config";
import { authenticatedWebSession } from "./auth";
import { database } from "./db/pool";
import { linkKeycloakIdentityFromWorkosSession, resolveIdentity } from "./db/identity";
import type { SessionKey } from "./db/sessions";
import {
  beginKeycloakOidcLogin, completeKeycloakOidcLogin,
} from "./keycloak-oidc";
import {
  consumeKeycloakPreauth, createKeycloakPreauth, keycloakPreauthCookieName,
  keycloakSessionCookieName, matchesKeycloakLinkBinding, workosSessionBindingHash,
  KEYCLOAK_PREAUTH_MAX_AGE_SECONDS,
  type KeycloakPreauthBinding,
} from "./keycloak-preauth";
import { KEYCLOAK_SESSION_MAX_AGE_SECONDS } from "./keycloak-sessions";
import { keycloakRuntime } from "./keycloak-runtime";
import { ApiError } from "./errors";

function cookieOptions(origin: string, maxAge: number) {
  return { httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax" as const,
    path: "/", maxAge };
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

function failure(status: number, origin: string): NextResponse {
  const response = NextResponse.json({ error: "Keycloak sign-in could not complete. Start again from /login." }, { status });
  response.cookies.set(keycloakPreauthCookieName(origin), "", cookieOptions(origin, 0));
  return noStore(response);
}

/** Only a verified WorkOS identity mapping may initiate or finish linking. */
async function existingWorkosUser(pool: Pool, session: SessionKey): Promise<string | null> {
  const row = (await pool.query<{ id: string }>(`SELECT u.id FROM identity_mappings i
    JOIN users u ON u.id=i.user_id
    WHERE i.provider='workos' AND i.issuer=$1 AND i.subject=$2 AND u.status='active'`,
  [session.issuer, session.subject])).rows[0];
  return row?.id ?? null;
}

export async function startKeycloakLogin(returnPath: string): Promise<NextResponse> {
  if (appAuthMode() !== "keycloak") return noStore(NextResponse.json({ error: "Keycloak sign-in is unavailable." }, { status: 404 }));
  try {
    const { settings, configuration } = await keycloakRuntime();
    const { authorizationUrl, attempt } = await beginKeycloakOidcLogin(configuration, settings);
    const token = await createKeycloakPreauth(database(), { purpose: "login", attempt, returnPath });
    const response = NextResponse.redirect(authorizationUrl, { status: 303 });
    response.cookies.set(keycloakPreauthCookieName(settings.callback.origin), token,
      cookieOptions(settings.callback.origin, KEYCLOAK_PREAUTH_MAX_AGE_SECONDS));
    return noStore(response);
  } catch {
    return noStore(NextResponse.json({ error: "Keycloak sign-in is temporarily unavailable." }, { status: 503 }));
  }
}

export async function startKeycloakLink(request: Request): Promise<NextResponse> {
  if (appAuthMode() !== "workos" || process.env.WITNESSOPS_KEYCLOAK_LINK_ENABLED !== "1") {
    return noStore(NextResponse.json({ error: "Account linking is unavailable." }, { status: 404 }));
  }
  try {
    const { origin } = authConfiguration();
    if (request.headers.get("origin") !== origin
      || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site"))) {
      return noStore(NextResponse.json({ error: "Use the app origin." }, { status: 403 }));
    }
    const web = await authenticatedWebSession();
    if (!web || web.identity.provider !== "workos") {
      return noStore(NextResponse.json({ error: "Sign in to WitnessOps." }, { status: 401 }));
    }
    const pool = database();
    const userId = await existingWorkosUser(pool, web.session);
    if (!userId) return noStore(NextResponse.json({ error: "An active account is required." }, { status: 403 }));
    const { settings, configuration } = await keycloakRuntime();
    const { authorizationUrl, attempt } = await beginKeycloakOidcLogin(configuration, settings);
    const binding: KeycloakPreauthBinding = { userId, sessionHash: workosSessionBindingHash(web.session) };
    const token = await createKeycloakPreauth(pool, { purpose: "link", attempt, returnPath: "/", binding });
    const response = NextResponse.redirect(authorizationUrl, { status: 303 });
    response.cookies.set(keycloakPreauthCookieName(origin), token, cookieOptions(origin, KEYCLOAK_PREAUTH_MAX_AGE_SECONDS));
    return noStore(response);
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      return noStore(NextResponse.json({ error: "Account linking was not authorized." }, { status: error.status }));
    }
    return noStore(NextResponse.json({ error: "Account linking is temporarily unavailable." }, { status: 503 }));
  }
}

export async function finishKeycloakCallback(request: NextRequest): Promise<NextResponse> {
  let origin: string;
  try { origin = authConfiguration().origin; }
  catch { return noStore(NextResponse.json({ error: "App authentication is unavailable." }, { status: 503 })); }
  try {
    const { settings, configuration, store } = await keycloakRuntime();
    const incoming = new URL(request.url);
    if (incoming.pathname !== settings.callback.pathname || incoming.hash) return failure(400, origin);
    const pool = database();
    const cookieToken = request.cookies.get(keycloakPreauthCookieName(origin))?.value;
    const state = incoming.searchParams.get("state");
    const preauth = await consumeKeycloakPreauth(pool, cookieToken, state);
    if (!preauth || (preauth.purpose === "login" && appAuthMode() !== "keycloak")
      || (preauth.purpose === "link" && (appAuthMode() !== "workos"
        || process.env.WITNESSOPS_KEYCLOAK_LINK_ENABLED !== "1"))) return failure(400, origin);

    // A link callback must still be attached to the exact WorkOS session that
    // created the attempt, before any code exchange or local mapping write.
    if (preauth.purpose === "link") {
      const web = await authenticatedWebSession();
      if (!web || web.identity.provider !== "workos" || !preauth.binding
        || !matchesKeycloakLinkBinding(preauth.binding, web.session,
          await existingWorkosUser(pool, web.session) ?? "")) return failure(403, origin);
    }

    // Never feed a request-derived Host to OIDC. Only its exact query string is
    // appended to the configured callback URL for code/state validation.
    const completed = await completeKeycloakOidcLogin(configuration, settings,
      `${settings.callback.href}${incoming.search}`, preauth.attempt);

    if (preauth.purpose === "link") {
      const web = await authenticatedWebSession();
      if (!web || web.identity.provider !== "workos" || !preauth.binding
        || !matchesKeycloakLinkBinding(preauth.binding, web.session,
          await existingWorkosUser(pool, web.session) ?? "")) return failure(403, origin);
      await linkKeycloakIdentityFromWorkosSession(pool, web.session, preauth.binding.userId, completed.identity);
      const response = NextResponse.redirect(new URL(preauth.returnPath, origin), { status: 303 });
      response.cookies.set(keycloakPreauthCookieName(origin), "", cookieOptions(origin, 0));
      return noStore(response);
    }

    const user = await resolveIdentity(pool, completed.identity); // Explicit mapping only.
    if (!completed.tokens.refreshToken) return failure(400, origin);
    const created = await store.create({ issuer: completed.identity.issuer, subject: completed.identity.subject,
      userId: user.id,
      tokens: { id_token: completed.tokens.idToken, access_token: completed.tokens.accessToken,
        refresh_token: completed.tokens.refreshToken },
      expiresAt: new Date(Date.now() + (KEYCLOAK_SESSION_MAX_AGE_SECONDS - 60) * 1000) });
    const response = NextResponse.redirect(new URL(preauth.returnPath, origin), { status: 303 });
    response.cookies.set(keycloakPreauthCookieName(origin), "", cookieOptions(origin, 0));
    response.cookies.set(keycloakSessionCookieName(origin), created.cookieToken,
      cookieOptions(origin, KEYCLOAK_SESSION_MAX_AGE_SECONDS - 60));
    return noStore(response);
  } catch (error) {
    if (error instanceof ApiError && [401, 403, 404, 409].includes(error.status)) return failure(error.status, origin);
    if (error instanceof Error && error.message === "Keycloak OIDC callback rejected.") return failure(400, origin);
    // Database, provider and keyring uncertainty must not appear as a bad
    // credential; the attempt remains one-use and response stays generic.
    return failure(503, origin);
  }
}
