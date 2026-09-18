import "server-only";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { transaction } from "./pool";
import { ApiError } from "../errors";

export type Identity = { provider: "workos"; issuer: string; subject: string; email: string | null; displayName: string | null };
export type AppUser = { id: string; displayName: string | null; verifiedEmail?: boolean };

/** Only the server's authenticated provider adapter supplies this identity. */
export async function resolveIdentity(pool: Pool, identity: Identity): Promise<AppUser> {
  if (identity.provider !== "workos" || !identity.issuer || !identity.subject) throw new ApiError(401, "Sign in to WitnessOps.");
  return transaction(pool, async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [JSON.stringify([identity.provider, identity.issuer, identity.subject])]);
    const previous = await client.query<{ id: string; status: string }>(
      "SELECT u.id, u.status FROM identity_mappings i JOIN users u ON u.id=i.user_id WHERE i.provider=$1 AND i.issuer=$2 AND i.subject=$3 FOR UPDATE OF u",
      [identity.provider, identity.issuer, identity.subject],
    );
    if (previous.rows[0]?.status === "disabled") throw new ApiError(403, "This account is not active.");
    const id = previous.rows[0]?.id ?? randomUUID();
    if (!previous.rowCount) await client.query("INSERT INTO users (id, display_name) VALUES ($1, $2)", [id, identity.displayName]);
    else await client.query("UPDATE users SET display_name=$2, updated_at=now() WHERE id=$1", [id, identity.displayName]);
    await client.query(`INSERT INTO identity_mappings (user_id, provider, issuer, subject, verified_email_snapshot)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (provider,issuer,subject) DO UPDATE
      SET verified_email_snapshot=EXCLUDED.verified_email_snapshot, updated_at=now()`, [id, identity.provider, identity.issuer, identity.subject, identity.email]);
    return { id, displayName: identity.displayName, verifiedEmail: Boolean(identity.email) };
  });
}
