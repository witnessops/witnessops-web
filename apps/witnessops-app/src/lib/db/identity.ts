import "server-only";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { transaction } from "./pool";
import { ApiError } from "../errors";

export type Identity = { provider: "workos"; issuer: string; subject: string; email: string | null; displayName: string | null };
export type AppUser = { id: string; displayName: string | null; verifiedEmail?: boolean; session?: import("./sessions").SessionKey };
type IdentityRow = { id: string; status: string; display_name: string | null; verified_email_snapshot: string | null };

/**
 * Read-only when the stored profile already matches. The user row is locked
 * only to apply a change or to reject a disabled account. First sign-in still
 * takes the per-identity advisory lock so concurrent creates share one user.
 */
export async function resolveIdentity(pool: Pool, identity: Identity): Promise<AppUser> {
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
