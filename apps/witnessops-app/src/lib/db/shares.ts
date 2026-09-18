import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction } from './pool';
import { requireWorkspaceMembership, WorkspaceStore } from './workspaces';
import { LinuxCheckStore } from './linux-checks';
import { membershipLock } from './membership-lock';
import type { AppUser } from './identity';
import { ApiError, requireId } from '../errors';
import { recipientReport, validateReportName, type RecipientReport } from '../share-projection';
import { savedRunReport } from '../report-model';
import { canonicalSource } from '../source-digest';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
function tokenHash(value: unknown) { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value))
    throw new ApiError(404, 'Shared report unavailable.'); return hash(value); }
type Row = {
    id: string;
    snapshot: RecipientReport;
    published_at: Date | null;
    digest: string;
    expires_at: Date;
    state: string;
    created_by: string;
    membership_generation: number;
    token_hash: string;
    created_at: Date;
};
export class ShareStore {
    constructor(readonly pool: Pool) { }
    async preview(user: AppUser, workspace: string, runId: unknown, name?: unknown) {
        let title: string | undefined;
        try { title = validateReportName(name); } catch { throw new ApiError(400, 'Use a report name of 1–120 characters without control characters.'); }
        const id = requireId(runId);
        const start = await transaction(this.pool, async (client) => {
            const m = await requireWorkspaceMembership(client, user, workspace);
            if (m.role === 'viewer')
                throw new ApiError(403, 'An Owner or Contributor can preview sharing.');
            const row = (await client.query("SELECT source_type FROM runs WHERE id=$1 AND workspace_id=$2 AND status='completed'", [id, workspace])).rows[0];
            if (!row)
                throw new ApiError(404, 'Completed report not found.');
            return { generation: m.generation, type: row.source_type };
        });
        const source = start.type === 'external-snapshot-v1' ? savedRunReport(await new WorkspaceStore(this.pool).run(user, workspace, id)) :
            start.type === 'local-audit-1.2.2' ? (await new LinuxCheckStore(this.pool).reopen(user, workspace, id)).model : null;
        if (!source)
            throw new ApiError(400, 'This report type cannot be shared.');
        const snapshot = recipientReport(source, title), bytes = canonicalSource(snapshot);
        if (Buffer.byteLength(bytes) > 256 * 1024)
            throw new ApiError(413, 'This report is too large to share.');
        return transaction(this.pool, async (client) => {
            await membershipLock(client, workspace, true);
            const m = await requireWorkspaceMembership(client, user, workspace);
            if (m.role === 'viewer' || m.generation !== start.generation)
                throw new ApiError(403, 'Workspace access changed.');
            // Bound storage under the same workspace lock as insertion. Expired
            // previews cannot publish; expired/revoked links retain 30 days of history.
            await client.query("DELETE FROM report_shares WHERE workspace_id=$1 AND ((state='preview' AND created_at<now()-interval '1 hour') OR expires_at<now()-interval '30 days' OR revoked_at<now()-interval '30 days')", [workspace]);
            const count = (await client.query("SELECT count(*) AS retained,coalesce(sum(octet_length(snapshot::text)),0) AS bytes,count(*) FILTER (WHERE created_at>now()-interval '1 hour') AS recent FROM report_shares WHERE workspace_id=$1", [workspace])).rows[0];
            if (Number(count.retained) >= 128 || Number(count.bytes) + Buffer.byteLength(bytes) * 2 > 16 * 1024 * 1024)
                throw new ApiError(429, 'Workspace share storage limit reached. Existing links can still be revoked.');
            if (Number(count.recent) >= 20)
                throw new ApiError(429, 'Share preview limit reached. Try again later.');
            const token = randomBytes(32).toString('base64url'), shareId = randomUUID(), digest = hash(bytes);
            const row = (await client.query<Row>('INSERT INTO report_shares(id,workspace_id,run_id,created_by,membership_generation,token_hash,snapshot,digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [shareId, workspace, id, user.id, m.generation, hash(token), snapshot, digest])).rows[0];
            return { id: shareId, token, digest, snapshot, expiresAt: row.expires_at.toISOString(), canPublish: m.role === 'owner' };
        });
    }
    async publish(user: AppUser, workspace: string, input: {
        id: unknown;
        token: unknown;
        digest: unknown;
        audience: unknown;
    }) {
        if (input.audience !== 'anyone_with_link')
            throw new ApiError(400, 'Confirm that anyone with the link can read.');
        const hashed = tokenHash(input.token);
        return transaction(this.pool, async (client) => {
            await requireWorkspaceMembership(client, user, workspace, true);
            const row = (await client.query<Row>('SELECT * FROM report_shares WHERE id=$1 AND workspace_id=$2 FOR UPDATE', [requireId(input.id), workspace])).rows[0];
            const m = await requireWorkspaceMembership(client, user, workspace, true);
            if (!row || row.created_by !== user.id || row.membership_generation !== m.generation || row.token_hash !== hashed || row.digest !== input.digest)
                throw new ApiError(404, 'Preview unavailable.');
            if (row.state === 'revoked' || row.expires_at.getTime() <= Date.now())
                throw new ApiError(410, 'Share expired or revoked.');
            if (row.state === 'preview') {
                if (Date.now() - row.created_at.getTime() > 3600000)
                    throw new ApiError(409, 'Preview expired. Preview the report again.');
                await client.query("UPDATE report_shares SET state='published',published_at=now() WHERE id=$1", [row.id]);
            }
            return { id: row.id, token: input.token, expiresAt: row.expires_at.toISOString(), digest: row.digest };
        });
    }
    async list(user: AppUser, workspace: string, run: unknown) {
        return transaction(this.pool, async (client) => {
            await requireWorkspaceMembership(client, user, workspace);
            return (await client.query("SELECT id,digest,expires_at AS \"expiresAt\",CASE WHEN state='published' AND expires_at<=now() THEN 'expired' ELSE state END AS state FROM report_shares WHERE workspace_id=$1 AND run_id=$2 AND state<>'preview' ORDER BY created_at DESC LIMIT 128", [workspace, requireId(run)])).rows;
        });
    }
    async revoke(user: AppUser, workspace: string, id: unknown) {
        return transaction(this.pool, async (client) => {
            await requireWorkspaceMembership(client, user, workspace, true);
            const row = (await client.query<Row>('SELECT * FROM report_shares WHERE id=$1 AND workspace_id=$2 FOR UPDATE', [requireId(id), workspace])).rows[0];
            if (!row || row.state === 'preview')
                throw new ApiError(404, 'Published link not found.');
            if (row.state !== 'revoked')
                await client.query("UPDATE report_shares SET state='revoked',revoked_at=now() WHERE id=$1", [row.id]);
            return { revoked: true };
        });
    }
    async read(token: unknown) {
        const result = await this.pool.query<Row>("SELECT s.snapshot,s.digest,s.expires_at,s.published_at FROM report_shares s JOIN workspaces w ON w.id=s.workspace_id WHERE s.token_hash=$1 AND s.state='published' AND s.expires_at>now() AND w.status='active'", [tokenHash(token)]);
        const row = result.rows[0];
        if (!row || hash(canonicalSource(row.snapshot)) !== row.digest)
            throw new ApiError(404, 'Shared report unavailable.');
        return { snapshot: row.snapshot, digest: row.digest, expiresAt: row.expires_at.toISOString(), publishedAt: row.published_at?.toISOString() ?? null };
    }
}
