import 'server-only';
import { isDeepStrictEqual } from 'node:util';
import type { PoolClient } from 'pg';
import { ApiError } from '../errors';
import { acceptedPlanPolicy } from '../plan-policy';

/** Admission callers hold current Owner authorization and the workspace lock.
 * No recorded plan preserves legacy admission; unrecognized terms do not. */
export async function acceptedWorkspacePlan(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ revision: number; terms_version: string | null; terms: unknown }>(`SELECT p.revision,c.terms_version,t.terms
    FROM early_access_plans p
    LEFT JOIN early_access_plan_consents c ON c.workspace_id=p.workspace_id AND c.revision=p.revision
    LEFT JOIN early_access_plan_terms t ON t.version=c.terms_version WHERE p.workspace_id=$1`, [workspaceId]);
  const plan = result.rows[0];
  if (!plan) return null;
  const policy = plan.terms_version ? acceptedPlanPolicy(plan.terms_version) : undefined;
  if (!policy || !isDeepStrictEqual(plan.terms, policy)) throw new ApiError(503, 'The accepted plan terms are unavailable.');
  return { revision: plan.revision, policy };
}

/** One registered Linux asset is one import source, including before its first
 * package. Packages and contribution changes do not create or release slots. */
export async function requireLinuxSourceLimit(client: PoolClient, workspaceId: string, limit: number, additional: 0 | 1 = 0) {
  const result = await client.query<{ count: string }>("SELECT count(*) FROM assets WHERE workspace_id=$1 AND type='linux_server'", [workspaceId]);
  if (Number(result.rows[0].count) + additional > limit) {
    throw new ApiError(409, `This plan allows ${limit} registered Linux import sources. Later packages for an existing source use the same slot.`);
  }
}

/** An active membership reserves a seat regardless of role, account status or
 * cohort state. Pausing an account does not release its workspace membership. */
export async function requireWorkspaceSeatLimit(client: PoolClient, workspaceId: string, limit: number) {
  const result = await client.query<{ count: string }>("SELECT count(*) FROM memberships WHERE workspace_id=$1 AND status='active' AND revoked_at IS NULL", [workspaceId]);
  if (Number(result.rows[0].count) > limit) {
    throw new ApiError(409, `This plan allows ${limit} active workspace member${limit === 1 ? '' : 's'}. Reconcile existing memberships before enrolling.`);
  }
}
