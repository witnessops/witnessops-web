import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import type { KeycloakOidcAttempt } from "./keycloak-oidc";
import type { SessionKey } from "./db/sessions";
import { transaction } from "./db/pool";

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const OIDC_VALUE = /^[A-Za-z0-9_-]{32,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const INVITATION = /^\/invitations\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export const KEYCLOAK_PREAUTH_MAX_AGE_SECONDS = 300;
export const KEYCLOAK_PREAUTH_MAX_PENDING = 5000;

export type KeycloakPreauthBinding = { userId: string; sessionHash: string };
export type KeycloakPreauthInput = {
  purpose: "login" | "link";
  attempt: KeycloakOidcAttempt;
  returnPath: string;
  binding?: KeycloakPreauthBinding;
};
export type KeycloakPreauthRecord = KeycloakPreauthInput & { binding?: KeycloakPreauthBinding };

function validReturnPath(value: string): boolean {
  return value === "/" || value === "/cli/authorize" || INVITATION.test(value);
}

function cookieName(origin: string, suffix: string): string {
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password || url.search || url.hash || url.pathname !== "/"
    || (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "127.0.0.1"))) {
    throw new Error("Invalid app origin.");
  }
  return `${url.protocol === "https:" ? "__Host-" : ""}wops-keycloak-${suffix}`;
}

export function keycloakSessionCookieName(origin: string): string { return cookieName(origin, "session"); }
export function keycloakPreauthCookieName(origin: string): string { return cookieName(origin, "preauth"); }

/** Never store a raw WorkOS session identifier in the preauth record. */
export function workosSessionBindingHash(key: SessionKey): string {
  if (typeof key.issuer !== "string" || !key.issuer || typeof key.sessionId !== "string" || !key.sessionId
    || typeof key.subject !== "string" || !key.subject) throw new Error("Invalid WorkOS session binding.");
  return createHash("sha256").update(JSON.stringify([key.issuer, key.sessionId, key.subject])).digest("hex");
}

export function matchesKeycloakLinkBinding(binding: KeycloakPreauthBinding,
  session: SessionKey, existingUserId: string): boolean {
  return (!session.provider || session.provider === "workos") && binding.userId === existingUserId
    && binding.sessionHash === workosSessionBindingHash(session);
}

/** The database supplies the replay boundary; no process-local state is trusted. */
export async function createKeycloakPreauth(pool: Pool, input: KeycloakPreauthInput): Promise<string> {
  const { purpose, attempt, returnPath, binding } = input;
  if ((purpose !== "login" && purpose !== "link") || !attempt || !OIDC_VALUE.test(attempt.state)
    || !OIDC_VALUE.test(attempt.nonce) || !OIDC_VALUE.test(attempt.codeVerifier) || !validReturnPath(returnPath)
    || (purpose === "login" && binding !== undefined)
    || (purpose === "link" && (!binding || !UUID.test(binding.userId) || !HASH.test(binding.sessionHash)))) {
    throw new Error("Invalid Keycloak preauth attempt.");
  }
  const cookieToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(cookieToken).digest("hex");
  await transaction(pool, async client => {
    // A transaction-level lock makes cleanup, count and insert a single
    // cross-replica capacity decision for anonymous login starts.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 782640))", ["keycloak_auth_attempts"]);
    await client.query("DELETE FROM keycloak_auth_attempts WHERE expires_at <= now()");
    const count = Number((await client.query<{ count: string }>("SELECT count(*) AS count FROM keycloak_auth_attempts")).rows[0]?.count);
    if (!Number.isSafeInteger(count) || count < 0 || count >= KEYCLOAK_PREAUTH_MAX_PENDING) {
      throw new Error("Keycloak sign-in is temporarily unavailable.");
    }
    await client.query(`INSERT INTO keycloak_auth_attempts
        (token_hash,purpose,state,nonce,code_verifier,return_path,bound_user_id,bound_session_hash,expires_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now() + interval '5 minutes')`,
      [tokenHash, purpose, attempt.state, attempt.nonce, attempt.codeVerifier, returnPath,
        binding?.userId ?? null, binding?.sessionHash ?? null]);
  });
  return cookieToken;
}

/** DELETE ... RETURNING atomically consumes this state once across replicas. */
export async function consumeKeycloakPreauth(pool: Pool, cookieToken: unknown, state: unknown): Promise<KeycloakPreauthRecord | null> {
  if (typeof cookieToken !== "string" || !TOKEN.test(cookieToken) || typeof state !== "string" || !OIDC_VALUE.test(state)) return null;
  const tokenHash = createHash("sha256").update(cookieToken).digest("hex");
  const result = await pool.query<{
    purpose: "login" | "link"; state: string; nonce: string; code_verifier: string;
    return_path: string; bound_user_id: string | null; bound_session_hash: string | null;
  }>(`DELETE FROM keycloak_auth_attempts
      WHERE token_hash=$1 AND state=$2 AND expires_at > now()
      RETURNING purpose,state,nonce,code_verifier,return_path,bound_user_id,bound_session_hash`,
    [tokenHash, state]);
  const row = result.rows[0];
  if (!row || !OIDC_VALUE.test(row.state) || !OIDC_VALUE.test(row.nonce) || !OIDC_VALUE.test(row.code_verifier)
    || !validReturnPath(row.return_path)) return null;
  if (row.purpose === "login" && row.bound_user_id === null && row.bound_session_hash === null) {
    return { purpose: "login", attempt: { state: row.state, nonce: row.nonce, codeVerifier: row.code_verifier }, returnPath: row.return_path };
  }
  if (row.purpose === "link" && row.bound_user_id && UUID.test(row.bound_user_id)
    && row.bound_session_hash && HASH.test(row.bound_session_hash)) {
    return { purpose: "link", attempt: { state: row.state, nonce: row.nonce, codeVerifier: row.code_verifier },
      returnPath: row.return_path, binding: { userId: row.bound_user_id, sessionHash: row.bound_session_hash } };
  }
  return null;
}
