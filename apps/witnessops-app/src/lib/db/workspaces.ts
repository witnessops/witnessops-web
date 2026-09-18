import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { transaction } from "./pool";
import { ApiError, requireId } from "../errors";
import { normalizeExternalHostname } from "../../../../witnessops-web/src/lib/external-exposure/input";
import { validateExternalSnapshot } from "../../../../witnessops-web/src/lib/external-exposure/adapter";
import { RECOMMENDED_PROFILE, type Workspace, type Run, type Asset, type WorkspaceSummary } from "../model";
import { linuxHostname } from "../linux-hostname";
import { canonicalSource } from "../source-digest";
import type { AppUser } from "./identity";
import { requireWorkspaceAccess } from './access';
import { FREE_WORKSPACE_POLICY, freeWorkspaceCeiling } from '../free-workspace';
import { admitHostnameCheck } from './hostname-usage';
import { acceptedWorkspacePlan, requireLinuxSourceLimit } from './plan-admission';

type MemberRow = { id: string; name: string; slug: string; role: "owner" | "viewer" };
type AssetRow = { id: string; normalized_value: string; type: Asset["type"]; created_at: Date };
type RunRow = { id: string; asset_id: string; created_at: Date; source_snapshot: unknown; source_digest: string; method_id: string; method_version: string };
const assetProjection = (row: AssetRow): Asset => ({ id: row.id, hostname: row.normalized_value, type: row.type, createdAt: row.created_at.toISOString() });
function runProjection(row: RunRow): Run {
  const snapshot = validateExternalSnapshot(row.source_snapshot);
  if (digest(canonicalSource(snapshot)) !== row.source_digest) throw new Error("Stored source correspondence mismatch");
  return { id: row.id, assetId: row.asset_id, createdAt: row.created_at.toISOString(), sourceDigest: row.source_digest,
    profile: { id: row.method_id, version: row.method_version, checkIds: snapshot.checks.map(c => c.check_id) }, snapshot };
}
const digest = (source: string) => createHash("sha256").update(source, "utf8").digest("hex");

/** App authorization is the tenancy fence in this slice. RLS is deferred.
 * Every resource query below has a workspace predicate after current membership.
 * Shared membership/user/workspace locks prevent revocation racing a transaction. */
export async function requireWorkspaceMembership(client: PoolClient, user: AppUser, workspaceId: string, owner = false): Promise<MemberRow> {
  await requireWorkspaceAccess(client, user, true);
  const result = await client.query<MemberRow>(`SELECT w.id, w.name, w.slug, m.role FROM memberships m
    JOIN workspaces w ON w.id=m.workspace_id JOIN users u ON u.id=m.user_id
    WHERE m.user_id=$1 AND m.workspace_id=$2 AND m.status='active' AND m.revoked_at IS NULL
    AND u.status='active' AND w.status='active' FOR SHARE OF m,w,u`, [user.id, requireId(workspaceId)]);
  if (!result.rows[0]) throw new ApiError(404, "Workspace not found.");
  if (owner && result.rows[0].role !== "owner") throw new ApiError(403, "An Owner is required for this action.");
  return result.rows[0];
}
export class WorkspaceStore {
  constructor(readonly pool: Pool) {}
  async list(user: AppUser): Promise<WorkspaceSummary[]> {
    await requireWorkspaceAccess(this.pool, user);
    const result = await this.pool.query<MemberRow>(`SELECT w.id,w.name,w.slug,m.role FROM memberships m
      JOIN workspaces w ON w.id=m.workspace_id JOIN users u ON u.id=m.user_id
      WHERE m.user_id=$1 AND m.status='active' AND m.revoked_at IS NULL AND w.status='active' AND u.status='active'
      AND u.early_access_state IS DISTINCT FROM 'paused' AND (u.early_access_state='active' OR u.free_workspace_access)
      AND NOT (u.early_access_state IS NULL AND u.early_access_activated_at IS NOT NULL)
      ORDER BY w.created_at,w.id`, [user.id]);
    return result.rows;
  }
  async create(user: AppUser, name: unknown, requestId: unknown): Promise<string> {
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100) throw new ApiError(400, "Enter a workspace name of 1–100 characters.");
    const key = requireId(requestId), displayName = name.trim();
    return transaction(this.pool, async client => {
      const active = await client.query("SELECT id FROM users WHERE id=$1 AND status='active' FOR UPDATE", [user.id]);
      if (!active.rowCount) throw new ApiError(403, "This account is not active.");
      await requireWorkspaceAccess(client, user);
      const retry = await client.query<{ id: string; name: string }>("SELECT id,name FROM workspaces WHERE created_by=$1 AND creation_key=$2", [user.id, key]);
      if (retry.rows[0]) {
        await requireWorkspaceMembership(client, user, retry.rows[0].id, true);
        if (retry.rows[0].name !== displayName) throw new ApiError(409, "This creation request was already used.");
        return retry.rows[0].id;
      }
      const ceiling = freeWorkspaceCeiling();
      if (ceiling !== null) {
        if (!user.verifiedEmail) throw new ApiError(403, 'Verify your email before creating a workspace.');
        const count = await client.query<{ count: string }>('SELECT count(*) FROM workspaces WHERE created_by=$1', [user.id]);
        if (Number(count.rows[0].count) >= ceiling) throw new ApiError(409, `You can create up to ${ceiling} workspaces in this environment.`);
      } else {
        // Closing self-service must not permit existing free users to create
        // unrecorded legacy workspaces through the old cohort path.
        const free = await client.query('SELECT id FROM users WHERE id=$1 AND free_workspace_access', [user.id]);
        if (free.rowCount) throw new ApiError(403, 'New workspace creation is currently unavailable.');
      }
      const id = randomUUID();
      // Stable unique route identifier; the name/slug is not company verification.
      await client.query("INSERT INTO workspaces (id,name,slug,created_by,creation_key) VALUES ($1,$2,$3,$4,$5)", [id, displayName, `workspace-${id}`, user.id, key]);
      await client.query("INSERT INTO memberships (user_id,workspace_id,role) VALUES ($1,$2,'owner')", [user.id, id]);
      if (ceiling !== null) {
        await client.query('INSERT INTO free_workspace_plans(workspace_id,policy_version) VALUES ($1,$2)', [id, FREE_WORKSPACE_POLICY.version]);
        await client.query('UPDATE users SET free_workspace_access=true WHERE id=$1', [user.id]);
      }
      return id;
    });
  }
  private async within<T>(user: AppUser, workspaceId: string, owner: boolean, action: (client: PoolClient, member: MemberRow) => Promise<T>) {
    return transaction(this.pool, async client => action(client, await requireWorkspaceMembership(client, user, workspaceId, owner)));
  }
  async read(user: AppUser, workspaceId: string): Promise<Workspace> {
    return this.within(user, workspaceId, false, async (client, member) => {
      const assets = await client.query<AssetRow>("SELECT * FROM assets WHERE workspace_id=$1 ORDER BY created_at,id", [member.id]);
      const runs = await client.query<RunRow>("SELECT * FROM runs WHERE workspace_id=$1 AND status='completed' AND source_type='external-snapshot-v1' ORDER BY created_at,id", [member.id]);
      const members = await client.query<{ id: string; displayName: string | null; role: "owner" | "viewer" }>(`SELECT u.id,u.display_name AS "displayName",m.role FROM memberships m JOIN users u ON u.id=m.user_id
        WHERE m.workspace_id=$1 AND m.status='active' AND m.revoked_at IS NULL AND u.status='active' ORDER BY m.joined_at,u.id`, [member.id]);
      return { ...member, assets: assets.rows.map(assetProjection), runs: runs.rows.map(runProjection), members: members.rows };
    });
  }
  async asset(user: AppUser, workspaceId: string, assetId: unknown, owner = false): Promise<Asset> {
    return this.within(user, workspaceId, owner, async client => {
      const result = await client.query<AssetRow>("SELECT * FROM assets WHERE workspace_id=$1 AND id=$2", [workspaceId, requireId(assetId)]);
      if (!result.rows[0]) throw new ApiError(404, "Asset not found in this workspace.");
      return assetProjection(result.rows[0]);
    });
  }
  async run(user: AppUser, workspaceId: string, runId: unknown): Promise<Run> {
    return this.within(user, workspaceId, false, async client => {
      const result = await client.query<RunRow>("SELECT * FROM runs WHERE workspace_id=$1 AND id=$2 AND status='completed' AND source_type='external-snapshot-v1'", [workspaceId, requireId(runId)]);
      if (!result.rows[0]) throw new ApiError(404, "Run not found in this workspace.");
      return runProjection(result.rows[0]);
    });
  }
  async addAsset(user: AppUser, workspaceId: string, input: unknown, type: unknown): Promise<Asset> {
    let hostname: string;
    try { hostname = type === "linux_server" ? linuxHostname(input) : normalizeExternalHostname(input); } catch { throw new ApiError(400, "Enter one public hostname, without a URL, IP address, path, credentials or port."); }
    if (type !== "hostname" && type !== "domain" && type !== "linux_server") throw new ApiError(400, "Choose a hostname, domain or Linux server asset.");
    return this.within(user, workspaceId, true, async client => {
      // Serialize asset additions to enforce the bounded workspace capacity.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::uuid::text, 0))", [workspaceId]);
      if (type === "linux_server") {
        const plan = await acceptedWorkspacePlan(client, workspaceId);
        if (plan) await requireLinuxSourceLimit(client, workspaceId, plan.policy.limits.linuxImportSources, 1);
      }
      const count = await client.query<{ count: string }>("SELECT count(*) FROM assets WHERE workspace_id=$1", [workspaceId]);
      if (Number(count.rows[0].count) >= 20) throw new ApiError(409, "This workspace is limited to 20 assets.");
      const result = await client.query<AssetRow>(`INSERT INTO assets (id,workspace_id,type,normalized_value) VALUES ($1,$2,$3,$4)
        ON CONFLICT (workspace_id,normalized_value) DO NOTHING RETURNING *`, [randomUUID(), workspaceId, type, hostname]);
      if (!result.rows[0]) throw new ApiError(409, "This hostname is already an asset.");
      return assetProjection(result.rows[0]);
    });
  }
  async beginRun(user: AppUser, workspaceId: string, assetId: string): Promise<string> {
    return this.within(user, workspaceId, true, async client => {
      const asset = await client.query("SELECT id FROM assets WHERE workspace_id=$1 AND id=$2 AND type IN ('hostname','domain')", [workspaceId, assetId]);
      if (!asset.rowCount) throw new ApiError(404, "Asset not found in this workspace.");
      // UUID casing must not select a different lock for the same workspace.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1::uuid::text, 0))", [workspaceId]);
      const allowance = await admitHostnameCheck(client, workspaceId);
      const capacity = await client.query<{ count: string; bytes: string }>("SELECT count(*),coalesce(sum(octet_length(source_snapshot::text)),0) AS bytes FROM runs WHERE workspace_id=$1 AND status IN ('completed','running')", [workspaceId]);
      // Enrolled hostname checks use monthly admission instead of the legacy
      // lifetime run count. Keep the independent storage/collector safeguards.
      if ((!allowance && Number(capacity.rows[0].count) >= 32) || Number(capacity.rows[0].bytes) >= 8 * 1024 * 1024) throw new ApiError(409, "Workspace run capacity reached.");
      const id = randomUUID();
      await client.query(`INSERT INTO runs (id,workspace_id,asset_id,initiated_by,source_type,status,method_id,method_version,started_at,created_at)
        VALUES ($1,$2,$3,$4,'external-snapshot-v1','running',$5,$6,coalesce($7::timestamptz,now()),coalesce($7::timestamptz,now()))`,
      [id, workspaceId, assetId, user.id, RECOMMENDED_PROFILE.id, RECOMMENDED_PROFILE.version, allowance?.admittedAt ?? null]);
      if (allowance?.revision != null) await client.query(`INSERT INTO hostname_check_usage(run_id,workspace_id,consent_revision,admitted_at)
        VALUES ($1,$2,$3,$4)`, [id, workspaceId, allowance.revision, allowance.admittedAt]);
      return id;
    });
  }
  async completeRun(user: AppUser, workspaceId: string, runId: string, input: unknown): Promise<Run> {
    const snapshot = validateExternalSnapshot(input), source = canonicalSource(snapshot);
    if (Buffer.byteLength(source, "utf8") > 1024 * 1024) throw new ApiError(422, "The source exceeds the bounded run size.");
    return this.within(user, workspaceId, true, async client => {
      const record = await client.query<{ normalized_value: string }>(`SELECT a.normalized_value FROM runs r JOIN assets a ON a.id=r.asset_id AND a.workspace_id=r.workspace_id
        WHERE r.workspace_id=$1 AND r.id=$2 AND r.initiated_by=$3 AND r.status='running' FOR UPDATE OF r`, [workspaceId, runId, user.id]);
      if (!record.rows[0] || snapshot.target !== record.rows[0].normalized_value || snapshot.checks.some(c => c.target !== snapshot.target)) throw new ApiError(422, "Run source does not match its asset.");
      const result = await client.query<RunRow>(`UPDATE runs SET status='completed',source_snapshot=$4::jsonb,source_digest=$5,finished_at=$6
        WHERE workspace_id=$1 AND id=$2 AND initiated_by=$3 AND status='running' RETURNING *`, [workspaceId, runId, user.id, source, digest(source), snapshot.finished_at]);
      return runProjection(result.rows[0]);
    });
  }
  async failRun(workspaceId: string, runId: string, user: AppUser): Promise<void> {
    // Internal completion cleanup for an already authorized execution. Revocation
    // may have happened while it ran; no source is returned or retained here.
    await this.pool.query("UPDATE runs SET status='failed',finished_at=now() WHERE workspace_id=$1 AND id=$2 AND initiated_by=$3 AND status='running'", [workspaceId, runId, user.id]);
  }
}
