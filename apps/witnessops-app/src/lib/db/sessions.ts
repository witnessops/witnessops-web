import "server-only";
import type { Pool, PoolClient } from "pg";
import { ApiError } from "../errors";
import { logSecurityEvent } from "../security-log";

export type SessionKey = { issuer: string; sessionId: string; subject: string; provider?: "workos" | "keycloak" };

/** Input comes from a provider-validated session, never a posted identifier. */
export function sessionKey(issuer: string, sessionId: unknown, subject: unknown, provider: "workos" | "keycloak" = "workos"): SessionKey {
  const validSubject = provider === "workos"
    ? typeof subject === "string" && /^user_[A-Za-z0-9]{1,128}$/.test(subject)
    : typeof subject === "string" && subject.length >= 1 && subject.length <= 255 && !/\s|[\u0000-\u001f\u007f]/u.test(subject);
  const validKeycloakIssuer = provider !== "keycloak" || (() => {
    try {
      const value = new URL(issuer);
      return /(?:^|\/)realms\/[^/]+$/.test(value.pathname) && !value.search && !value.hash && !value.username && !value.password &&
        (value.protocol === "https:" || (value.protocol === "http:" && value.hostname === "127.0.0.1"));
    } catch { return false; }
  })();
  if (!issuer || issuer.length > 300 || typeof sessionId !== "string" || !/^session_[A-Za-z0-9]{1,128}$/.test(sessionId) || typeof subject !== "string" || !validSubject || !validKeycloakIssuer) {
    const error = new ApiError(401, "Sign in to WitnessOps.");
    logSecurityEvent("auth_rejected", 401, "invalid_session", error);
    throw error;
  }
  return { issuer, sessionId, subject, provider };
}

export async function requireUnrevokedSession(pool: Pool | PoolClient, key: SessionKey): Promise<void> {
  sessionKey(key.issuer, key.sessionId, key.subject, key.provider);
  // No cache: every product request sees committed logout revocation, including
  // after pool reconnect, process restart, or another process handling logout.
  const result = await pool.query("SELECT 1 FROM revoked_sessions WHERE issuer=$1 AND session_id=$2", [key.issuer, key.sessionId]);
  if (result.rowCount) {
    const error = new ApiError(401, "Sign in to WitnessOps.");
    logSecurityEvent("auth_rejected", 401, "revoked_session", error);
    throw error;
  }
}

/** Hold until the caller's transaction commits. Logout takes the matching
 * exclusive lock, so a protected fixture transition and revocation have a
 * single database ordering instead of racing after a revocation read. */
export async function lockUnrevokedSession(client: PoolClient, key: SessionKey): Promise<void> {
  sessionKey(key.issuer, key.sessionId, key.subject, key.provider);
  await client.query('SELECT pg_advisory_xact_lock_shared(hashtextextended($1, 39116))', [JSON.stringify([key.issuer, key.sessionId])]);
  await requireUnrevokedSession(client, key);
}

export async function revokeSession(pool: Pool, key: SessionKey): Promise<void> {
  sessionKey(key.issuer, key.sessionId, key.subject, key.provider);
  // One statement retains the pool API and makes lock + insert atomic even
  // outside an explicit transaction. All native logout callers use this path.
  await pool.query(`WITH session_lock AS MATERIALIZED (
    SELECT pg_advisory_xact_lock(hashtextextended($1, 39116))
  ) INSERT INTO revoked_sessions (issuer,session_id,subject)
    SELECT $2,$3,$4 FROM session_lock ON CONFLICT (issuer,session_id) DO NOTHING`,
  [JSON.stringify([key.issuer, key.sessionId]), key.issuer, key.sessionId, key.subject]);
}
