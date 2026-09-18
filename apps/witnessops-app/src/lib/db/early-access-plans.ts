import 'server-only';
import { isDeepStrictEqual } from 'node:util';
import type { Pool, PoolClient } from 'pg';
import { ApiError } from '../errors';
import { EARLY_ACCESS_PLAN_POLICY, validatePlanConsent, type EarlyAccessPlanRecord } from '../plan-policy';
import type { AppUser } from './identity';
import { transaction } from './pool';
import { requireWorkspaceMembership } from './workspaces';
import { requireLinuxSourceLimit } from './plan-admission';

type PlanRow = {
  workspace_id: string; plan_id: 'early-access'; trial_started_at: Date; trial_ends_at: Date;
  revision: number; request_id: string; accepted_by: string; accepted_at: Date;
  terms_version: string; contribution_minor: number; currency: 'EUR'; contribution_interval: 'month';
};
function project(row: PlanRow): EarlyAccessPlanRecord {
  return { workspaceId: row.workspace_id, planId: row.plan_id, trialStartedAt: row.trial_started_at.toISOString(), trialEndsAt: row.trial_ends_at.toISOString(),
    revision: row.revision, consentId: row.request_id, acceptedBy: row.accepted_by, acceptedAt: row.accepted_at.toISOString(),
    termsVersion: row.terms_version, contributionMinor: row.contribution_minor, currency: row.currency, contributionInterval: row.contribution_interval };
}
async function current(client: PoolClient, workspaceId: string): Promise<EarlyAccessPlanRecord | null> {
  const result = await client.query<PlanRow>(`SELECT p.*,c.request_id,c.accepted_by,c.accepted_at,c.terms_version,c.contribution_minor,c.currency,c.contribution_interval
    FROM early_access_plans p JOIN early_access_plan_consents c ON c.workspace_id=p.workspace_id AND c.revision=p.revision
    WHERE p.workspace_id=$1`, [workspaceId]);
  return result.rows[0] ? project(result.rows[0]) : null;
}

/** Internal persistence boundary; deliberately not wired to activation or HTTP.
 * A contribution choice is not payment authorization or an active subscription.
 * Existing cohort admission remains the product-access authority. */
export class EarlyAccessPlanStore {
  constructor(readonly pool: Pool) {}

  async read(user: AppUser, workspaceId: string): Promise<EarlyAccessPlanRecord | null> {
    return transaction(this.pool, async client => {
      const member = await requireWorkspaceMembership(client, user, workspaceId, true);
      return current(client, member.id);
    });
  }

  async recordConsent(user: AppUser, workspaceId: string, input: unknown): Promise<EarlyAccessPlanRecord> {
    const consent = validatePlanConsent(input);
    return transaction(this.pool, async client => {
      const member = await requireWorkspaceMembership(client, user, workspaceId, true);
      // Same workspace serialization convention as asset/run admission. Current
      // role and access locks remain held through the entire write transaction.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [member.id]);
      const free = await client.query('SELECT workspace_id FROM free_workspace_plans WHERE workspace_id=$1', [member.id]);
      if (free.rowCount) throw new ApiError(409, 'Free workspaces cannot enroll in the historical contribution policy.');
      const plan = await current(client, member.id);
      const retry = await client.query<PlanRow>('SELECT * FROM early_access_plan_consents WHERE workspace_id=$1 AND request_id=$2', [member.id, consent.requestId]);
      if (retry.rows[0]) {
        const old = retry.rows[0];
        if (old.accepted_by !== user.id || old.revision !== consent.expectedRevision+1 || old.terms_version !== consent.termsVersion || old.contribution_minor !== consent.contributionMinor) {
          throw new ApiError(409, 'This consent request was already used.');
        }
        if (!plan) throw new Error('Plan consent is missing its current plan.');
        // A delayed retry acknowledges the original request without reapplying
        // it over a later explicit choice. Return the current authoritative state.
        return plan;
      }
      if ((plan?.revision ?? 0) !== consent.expectedRevision) throw new ApiError(409, 'The plan changed. Read it again before choosing a contribution.');
      const policy = await client.query<{ terms: unknown }>('SELECT terms FROM early_access_plan_terms WHERE version=$1', [consent.termsVersion]);
      if (!isDeepStrictEqual(policy.rows[0]?.terms, EARLY_ACCESS_PLAN_POLICY)) throw new ApiError(503, 'The current plan terms are unavailable.');

      // Do not enroll an over-cap legacy workspace or silently select/remove its
      // sources. Existing contribution updates and idempotent retries stay valid.
      if (!plan) await requireLinuxSourceLimit(client, member.id, EARLY_ACCESS_PLAN_POLICY.limits.linuxImportSources);

      const revision = consent.expectedRevision+1;
      if (!plan) await client.query('INSERT INTO early_access_plans(workspace_id,revision) VALUES ($1,$2)', [member.id, revision]);
      await client.query(`INSERT INTO early_access_plan_consents(workspace_id,request_id,revision,accepted_by,terms_version,contribution_minor)
        VALUES ($1,$2,$3,$4,$5,$6)`, [member.id, consent.requestId, revision, user.id, consent.termsVersion, consent.contributionMinor]);
      if (plan) await client.query('UPDATE early_access_plans SET revision=$2 WHERE workspace_id=$1', [member.id, revision]);
      const saved = await current(client, member.id);
      if (!saved) throw new Error('Plan consent was not persisted.');
      return saved;
    });
  }
}
