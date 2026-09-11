import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { transaction } from './pool';
import { requireWorkspaceMembership } from './workspaces';
import { requireEarlyAccess } from './access';
import type { AppUser } from './identity';
import { ApiError, requireId } from '../errors';
import type { FeedbackDecision, FeedbackSurface, ProductEvent } from '../early-access';
import { CHECK_IDS } from '../model';

type RunRef = { id: string; asset_id: string; status: string; prior: boolean; first: boolean; check_ids: string[] };
async function runRef(client: PoolClient, workspaceId: string, runId: unknown): Promise<RunRef> {
  const result = await client.query<RunRef>(`SELECT r.id,r.asset_id,r.status,
    EXISTS (SELECT 1 FROM runs p WHERE p.workspace_id=r.workspace_id AND p.asset_id=r.asset_id AND p.status='completed' AND (p.created_at,p.id)<(r.created_at,r.id)) AS prior,
    NOT EXISTS (SELECT 1 FROM runs p WHERE p.workspace_id=r.workspace_id AND p.status='completed' AND (p.created_at,p.id)<(r.created_at,r.id)) AS first,
    ARRAY(SELECT c->>'check_id' FROM jsonb_array_elements(coalesce(r.source_snapshot->'checks','[]'::jsonb)) c) AS check_ids
    FROM runs r WHERE r.workspace_id=$1 AND r.id=$2`, [workspaceId, requireId(runId)]);
  if (!result.rows[0]) throw new ApiError(404, 'Run not found in this workspace.');
  return result.rows[0];
}
/** Behavioral research only, not evidence. No free-form event metadata, URLs,
 * hostnames or source bodies. Event uniqueness counts adoption per saved object,
 * not every re-render or repeated download click. */
export class ActivityStore {
  constructor(readonly pool: Pool) {}
  async record(user: AppUser, workspaceId: string | null, name: ProductEvent, refs: { runId?: string; assetId?: string; checkId?: string } = {}) {
    return transaction(this.pool, async client => {
      // Bounded best-effort work; primary collection/persistence never depends
      // on this transaction succeeding. Client endpoints still deny bad access.
      await client.query("SET LOCAL statement_timeout='750ms'");
      await client.query("SET LOCAL lock_timeout='200ms'");
      if (workspaceId) await requireWorkspaceMembership(client, user, workspaceId);
      else if (name === 'early_access_activated') await requireEarlyAccess(client, user, true);
      else throw new ApiError(400, 'A workspace is required.');
      let assetId: string | null = null;
      if (refs.runId && workspaceId) {
        const run = await runRef(client, workspaceId, refs.runId);
        const lifecycle = ['observation_started', 'observation_completed', 'observation_failed', 'rerun_started'];
        if (!lifecycle.includes(name) && run.status !== 'completed') throw new ApiError(404, 'Completed run not found.');
        if ((name === 'comparison_viewed' || name === 'rerun_started') && !run.prior) return;
        if (refs.checkId && !run.check_ids.includes(refs.checkId)) throw new ApiError(404, 'Observation not found.');
        assetId = run.asset_id;
      } else if (refs.assetId && workspaceId && name === 'asset_added') {
        const asset = await client.query('SELECT id FROM assets WHERE workspace_id=$1 AND id=$2', [workspaceId, requireId(refs.assetId)]);
        if (!asset.rowCount) throw new ApiError(404, 'Asset not found.');
        assetId = refs.assetId;
      } else if (name !== 'early_access_activated') throw new ApiError(400, 'A saved object is required.');
      if (refs.checkId && !CHECK_IDS.includes(refs.checkId as typeof CHECK_IDS[number])) throw new ApiError(400, 'Unknown check.');
      const key = [user.id, workspaceId ?? '', name, refs.runId ?? assetId ?? '', refs.checkId ?? ''].join(':');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`activity:${user.id}`]);
      if ((await client.query('SELECT 1 FROM product_events WHERE dedupe_key=$1', [key])).rowCount) return;
      const count = await client.query<{ count: string }>("SELECT count(*) FROM product_events WHERE user_id=$1 AND created_at>now()-interval '1 hour'", [user.id]);
      if (Number(count.rows[0].count) >= 250) throw new ApiError(429, 'Product event limit reached.');
      await client.query(`INSERT INTO product_events (id,user_id,workspace_id,asset_id,run_id,name,check_id,dedupe_key)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (dedupe_key) DO NOTHING`, [randomUUID(), user.id, workspaceId, assetId, refs.runId ?? null, name, refs.checkId ?? null, key]);
    });
  }
  async decisions(user: AppUser, workspaceId: string): Promise<FeedbackDecision[]> {
    return transaction(this.pool, async client => {
      await requireWorkspaceMembership(client, user, workspaceId);
      // The customer endpoint returns only their own suppression state, never
      // other members' comments or an internal cohort review feed.
      return (await client.query<FeedbackDecision>('SELECT surface,run_id AS "runId" FROM product_feedback WHERE workspace_id=$1 AND user_id=$2', [workspaceId, user.id])).rows;
    });
  }
  async feedback(user: AppUser, workspaceId: string, input: { surface: unknown; runId: unknown; response: unknown; comment: unknown }) {
    if (typeof input.surface !== 'string' || !['first_run', 'comparison'].includes(input.surface) || typeof input.response !== 'string' || !['yes', 'not_really', 'dismissed'].includes(input.response) || (input.comment !== null && (typeof input.comment !== 'string' || input.comment.length > 500))) throw new ApiError(400, 'Use a listed response and at most 500 comment characters.');
    if (input.response === 'dismissed' && input.comment !== null) throw new ApiError(400, 'Dismissal does not include a comment.');
    return transaction(this.pool, async client => {
      await requireWorkspaceMembership(client, user, workspaceId);
      const run = await runRef(client, workspaceId, input.runId);
      if (run.status !== 'completed' || (input.surface === 'first_run' ? !run.first : !run.prior)) throw new ApiError(400, 'This run does not match the feedback context.');
      // One immutable answer or dismissal per user/workspace/context. A retry
      // acknowledges the first answer without overwriting it or adding spam.
      const inserted = await client.query(`INSERT INTO product_feedback (id,workspace_id,user_id,run_id,surface,response,comment)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (workspace_id,user_id,surface) DO NOTHING RETURNING id`, [randomUUID(), workspaceId, user.id, run.id, input.surface, input.response, typeof input.comment === 'string' ? input.comment.trim() || null : null]);
      const stored = await client.query<{ run_id: string }>('SELECT run_id FROM product_feedback WHERE workspace_id=$1 AND user_id=$2 AND surface=$3', [workspaceId, user.id, input.surface]);
      return { surface: input.surface as FeedbackSurface, runId: stored.rows[0].run_id, created: Boolean(inserted.rowCount) };
    });
  }
}
