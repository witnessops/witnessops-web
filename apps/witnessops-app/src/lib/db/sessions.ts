import "server-only";
import type { Pool } from "pg";
import { ApiError } from "../errors";

export type SessionKey = { issuer: string; sessionId: string; subject: string };

/** Input comes only from AuthKit's validated session, never a posted identifier. */
export function sessionKey(issuer: string, sessionId: unknown, subject: unknown): SessionKey {
  if (!issuer || issuer.length > 300 || typeof sessionId !== "string" || !/^session_[A-Za-z0-9]{1,128}$/.test(sessionId) || typeof subject !== "string" || !/^user_[A-Za-z0-9]{1,128}$/.test(subject)) {
    throw new ApiError(401, "Sign in to WitnessOps.");
  }
  return { issuer, sessionId, subject };
}

export async function requireUnrevokedSession(pool: Pool, key: SessionKey): Promise<void> {
  sessionKey(key.issuer, key.sessionId, key.subject);
  // No cache: every product request sees committed logout revocation, including
  // after pool reconnect, process restart, or another process handling logout.
  const result = await pool.query("SELECT 1 FROM revoked_sessions WHERE issuer=$1 AND session_id=$2", [key.issuer, key.sessionId]);
  if (result.rowCount) throw new ApiError(401, "Sign in to WitnessOps.");
}

export async function revokeSession(pool: Pool, key: SessionKey): Promise<void> {
  sessionKey(key.issuer, key.sessionId, key.subject);
  await pool.query("INSERT INTO revoked_sessions (issuer,session_id,subject) VALUES ($1,$2,$3) ON CONFLICT (issuer,session_id) DO NOTHING", [key.issuer, key.sessionId, key.subject]);
}
