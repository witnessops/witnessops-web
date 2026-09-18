import 'server-only';
import type { Pool, PoolClient } from 'pg';
import { ApiError } from '../errors';
import type { EarlyAccessState } from '../early-access';
import type { AppUser } from './identity';
import { transaction } from './pool';
import { freeWorkspaceCeiling } from '../free-workspace';

export async function requireWorkspaceAccess(client: Pool | PoolClient, user: AppUser, lock = false) {
  const result = await client.query<{ early_access_state: EarlyAccessState; early_access_activated_at: Date | null; free_workspace_access: boolean }>(`SELECT early_access_state,early_access_activated_at,free_workspace_access FROM users WHERE id=$1 AND status='active'${lock ? ' FOR SHARE' : ''}`, [user.id]);
  const account = result.rows[0];
  if (!account) throw new ApiError(403, 'This account is not active.');
  // A pause always wins. A formerly activated account cannot regain access by
  // having its historical cohort state cleared. Membership revocation is separate.
  if (account.early_access_state === 'paused') throw new ApiError(403, 'Workspace access is paused. Your saved data has not been deleted.', 'paused');
  if (account.early_access_state === null && account.early_access_activated_at) throw new ApiError(403, 'Workspace access is not available for this account.', null);
  if (account.free_workspace_access || account.early_access_state === 'active') return;
  if (account.early_access_state === null && !account.early_access_activated_at && freeWorkspaceCeiling() !== null) {
    if (!user.verifiedEmail) throw new ApiError(403, 'Verify your email and sign in again to create a workspace.', 'verify_email');
    return;
  }
  throw new ApiError(403, 'Workspace access is not available for this account.', account.early_access_state);
}

export async function earlyAccess(client: Pool | PoolClient, user: AppUser, lock = false): Promise<EarlyAccessState> {
  const result = await client.query<{ early_access_state: EarlyAccessState }>(`SELECT early_access_state FROM users WHERE id=$1 AND status='active'${lock ? ' FOR SHARE' : ''}`, [user.id]);
  if (!result.rows[0]) throw new ApiError(403, 'This account is not active.');
  return result.rows[0].early_access_state;
}
export async function requireEarlyAccess(client: Pool | PoolClient, user: AppUser, lock = false) {
  const state = await earlyAccess(client, user, lock);
  if (state !== 'active') throw new ApiError(403, state === 'paused' ? 'Your Early Access is paused. Your saved data has not been deleted.' : 'Early Access is required to open a workspace.', state);
}
export async function activateEarlyAccess(pool: Pool, user: AppUser) {
  return transaction(pool, async client => {
    const result = await client.query("UPDATE users SET early_access_state='active', early_access_activated_at=coalesce(early_access_activated_at,now()) WHERE id=$1 AND status='active' AND early_access_state='invited' RETURNING id", [user.id]);
    if (!result.rowCount) await requireEarlyAccess(client, user, true);
  });
}
