import 'server-only';
import type { PoolClient } from 'pg';
import { ApiError } from '../errors';
import { acceptedWorkspacePlan } from './plan-admission';

/** Called only after current Owner authorization and the workspace advisory lock.
 * The reservation and run must be inserted in this same transaction. */
export async function admitHostnameCheck(client: PoolClient, workspaceId: string) {
  const plan = await acceptedWorkspacePlan(client, workspaceId);
  if (!plan) return null; // Preserve admission for the existing unenrolled cohort.
  const { policy } = plan;

  // A new statement AFTER acquiring the lock, not transaction-start now(). A
  // request waiting across midnight must reserve the month when it is admitted.
  const clock = (await client.query<{ admitted_at: Date; period_start: string; resets_on: string }>(`SELECT statement_timestamp() AS admitted_at,
    to_char(statement_timestamp() AT TIME ZONE 'UTC','YYYY-MM-01') AS period_start,
    to_char(date_trunc('month',statement_timestamp() AT TIME ZONE 'UTC')+interval '1 month','YYYY-MM-DD') AS resets_on`)).rows[0];
  const usage = await client.query<{ count: string }>(`SELECT count(*) FROM hostname_check_usage u
    JOIN runs r ON r.workspace_id=u.workspace_id AND r.id=u.run_id
    WHERE u.workspace_id=$1 AND u.period_start=$2::date AND r.status IN ('running','completed')`, [workspaceId, clock.period_start]);
  if (Number(usage.rows[0].count) >= policy.limits.hostnameChecksPerMonth) {
    throw new ApiError(429, `This workspace has used or reserved its ${policy.limits.hostnameChecksPerMonth} hostname checks for this UTC calendar month. The allowance resets on ${clock.resets_on} at 00:00 UTC.`);
  }
  return { revision: plan.revision, admittedAt: clock.admitted_at };
}
