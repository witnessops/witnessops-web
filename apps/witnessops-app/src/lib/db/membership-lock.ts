import type { PoolClient } from 'pg';
import { requireId } from '../errors';
/** Acquire before user/membership row locks. Work holds a shared lock;
 * membership mutations take exclusive ownership. Capacity uses a separate key. */
export async function membershipLock(client: PoolClient, workspace: string, exclusive = false) {
  await client.query(`SELECT pg_advisory_xact_lock${exclusive ? '' : '_shared'}(hashtextextended($1::uuid::text, 39115))`, [requireId(workspace)]);
}
