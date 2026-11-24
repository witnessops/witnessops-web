import "server-only";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { transaction } from "./pool";
import { lockUnrevokedSession, type SessionKey } from "./sessions";
import { ApiError, requireId } from "../errors";

export type Identity = { provider: "workos" | "keycloak"; issuer: string; subject: string; email: string | null; displayName: string | null };
export type KeycloakIdentity = Identity & { provider: "keycloak" };
export type AppUser = { id: string; displayName: string | null; verifiedEmail?: boolean; session?: import("./sessions").SessionKey };
type IdentityRow = { id: string; status: string; display_name: string | null; verified_email_snapshot: string | null };

function requireKeycloakIdentity(identity: Identity): asserts identity is KeycloakIdentity {
  const issuer = identity.issuer;
  const subject = identity.subject;
  if (identity.provider !== "keycloak" || typeof issuer !== "string" || issuer.length > 300 ||
      issuer !== issuer.trim() || issuer.includes("?") || issuer.includes("#") ||
      typeof subject !== "string" || subject.length < 1 || subject.length > 255 || /\s|[\u0000-\u001f\u007f]/u.test(subject)) {
    throw new ApiError(401, "Sign in to WitnessOps.");
  }
  let url: URL;
  try { url = new URL(issuer); }
  catch { throw new ApiError(401, "Sign in to WitnessOps."); }
  if (!url.hostname || url.username || url.password ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "127.0.0.1"))) {
    throw new ApiError(401, "Sign in to WitnessOps.");
  }
}

/** A Keycloak subject must be explicitly linked before it can enter an existing workspace. */
async function resolveLinkedKeycloakIdentity(pool: Pool, identity: KeycloakIdentity): Promise<AppUser> {
  const row = (await pool.query<IdentityRow>(
    `SELECT u.id, u.status, u.display_name, i.verified_email_snapshot
     FROM identity_mappings i JOIN users u ON u.id=i.user_id
     WHERE i.provider=$1 AND i.issuer=$2 AND i.subject=$3`,
    [identity.provider, identity.issuer, identity.subject],
  )).rows[0];
  if (!row) throw new ApiError(401, "Sign in to WitnessOps.");
  if (row.status !== "active") throw new ApiError(403, "This account is not active.");
  return { id: row.id, displayName: row.display_name, verifiedEmail: Boolean(identity.email) };
}

async function linkKeycloakIdentityLocked(client: PoolClient, userId: string, identity: KeycloakIdentity,
  workosSession?: SessionKey): Promise<AppUser> {
    // Locking the target user serializes two different Keycloak subjects trying
    // to bind to the same internal account and keeps disable/link ordered.
    const user = (await client.query<{ id: string; status: string; display_name: string | null }>(
      "SELECT id, status, display_name FROM users WHERE id=$1 FOR UPDATE", [userId],
    )).rows[0];
    if (!user) throw new ApiError(404, "Account not found.");
    if (user.status !== "active") throw new ApiError(403, "This account is not active.");
    if (workosSession) {
      const mapped = await client.query(`SELECT 1 FROM identity_mappings
        WHERE provider='workos' AND issuer=$1 AND subject=$2 AND user_id=$3 FOR SHARE`,
      [workosSession.issuer, workosSession.subject, userId]);
      if (!mapped.rowCount) throw new ApiError(403, "Account link was not authorized.");
    }

    const links = (await client.query<{ subject: string }>(
      "SELECT subject FROM identity_mappings WHERE user_id=$1 AND provider=$2 AND issuer=$3 FOR UPDATE",
      [user.id, "keycloak", identity.issuer],
    )).rows;
    if (links.some(link => link.subject !== identity.subject)) throw new ApiError(409, "Identity already linked.");
    const result = (): AppUser => ({ id: user.id, displayName: user.display_name, verifiedEmail: Boolean(identity.email) });
    if (links.length) return result();

    const inserted = await client.query<{ user_id: string }>(
      `INSERT INTO identity_mappings (user_id, provider, issuer, subject, verified_email_snapshot)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (provider,issuer,subject) DO NOTHING RETURNING user_id`,
      [user.id, "keycloak", identity.issuer, identity.subject, identity.email],
    );
    if (inserted.rowCount === 1) return result();
    const existing = (await client.query<{ user_id: string }>(
      "SELECT user_id FROM identity_mappings WHERE provider=$1 AND issuer=$2 AND subject=$3",
      ["keycloak", identity.issuer, identity.subject],
    )).rows[0];
    if (existing?.user_id === user.id) return result();
    throw new ApiError(409, "Identity already linked.");
}

/** The caller must supply an already authenticated, existing internal user ID. Email is never a linking key. */
export async function linkKeycloakIdentity(pool: Pool, existingUserId: string, identity: KeycloakIdentity): Promise<AppUser> {
  requireKeycloakIdentity(identity);
  const userId = requireId(existingUserId);
  return transaction(pool, client => linkKeycloakIdentityLocked(client, userId, identity));
}

/** Session revocation, WorkOS mapping and Keycloak link share one commit. */
export async function linkKeycloakIdentityFromWorkosSession(pool: Pool, session: SessionKey,
  existingUserId: string, identity: KeycloakIdentity): Promise<AppUser> {
  requireKeycloakIdentity(identity);
  if (session.provider && session.provider !== "workos") throw new ApiError(403, "Account link was not authorized.");
  const userId = requireId(existingUserId);
  return transaction(pool, async client => {
    await lockUnrevokedSession(client, session);
    return linkKeycloakIdentityLocked(client, userId, identity, session);
  });
}

/**
 * Read-only when the stored profile already matches. The user row is locked
 * only to apply a change or to reject a disabled account. First sign-in still
 * takes the per-identity advisory lock so concurrent creates share one user.
 */
export async function resolveIdentity(pool: Pool, identity: Identity): Promise<AppUser> {
  if (identity.provider === "keycloak") {
    requireKeycloakIdentity(identity);
    return resolveLinkedKeycloakIdentity(pool, identity);
  }
  if (identity.provider !== "workos" || !identity.issuer || !identity.subject) throw new ApiError(401, "Sign in to WitnessOps.");
  return transaction(pool, async client => {
    const load = (lock: boolean) => client.query<IdentityRow>(
      `SELECT u.id, u.status, u.display_name, i.verified_email_snapshot
       FROM identity_mappings i JOIN users u ON u.id=i.user_id
       WHERE i.provider=$1 AND i.issuer=$2 AND i.subject=$3${lock ? " FOR UPDATE OF u" : ""}`,
      [identity.provider, identity.issuer, identity.subject],
    );
    const matches = (row: IdentityRow) => row.status !== "disabled" && row.display_name === identity.displayName && row.verified_email_snapshot === identity.email;
    const result = (id: string): AppUser => ({ id, displayName: identity.displayName, verifiedEmail: Boolean(identity.email) });
    let row = (await load(false)).rows[0];
    if (row?.status === "disabled" || (row && !matches(row))) {
      row = (await load(true)).rows[0];
      if (!row || row.status === "disabled") throw new ApiError(403, "This account is not active.");
    }
    if (row && matches(row)) return result(row.id);
    if (!row) {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [JSON.stringify([identity.provider, identity.issuer, identity.subject])]);
      row = (await load(false)).rows[0];
      if (row?.status === "disabled") {
        row = (await load(true)).rows[0];
        if (!row || row.status === "disabled") throw new ApiError(403, "This account is not active.");
      }
      if (row && matches(row)) return result(row.id);
    }
    if (!row) {
      const id = randomUUID();
      await client.query("INSERT INTO users (id, display_name) VALUES ($1, $2)", [id, identity.displayName]);
      await client.query(`INSERT INTO identity_mappings (user_id, provider, issuer, subject, verified_email_snapshot)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT (provider,issuer,subject) DO UPDATE
        SET verified_email_snapshot=EXCLUDED.verified_email_snapshot, updated_at=now()`, [id, identity.provider, identity.issuer, identity.subject, identity.email]);
      return result(id);
    }
    if (row.display_name !== identity.displayName) await client.query("UPDATE users SET display_name=$2, updated_at=now() WHERE id=$1", [row.id, identity.displayName]);
    if (row.verified_email_snapshot !== identity.email) await client.query(`INSERT INTO identity_mappings (user_id, provider, issuer, subject, verified_email_snapshot)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT (provider,issuer,subject) DO UPDATE
        SET verified_email_snapshot=EXCLUDED.verified_email_snapshot, updated_at=now()`, [row.id, identity.provider, identity.issuer, identity.subject, identity.email]);
    return result(row.id);
  });
}
