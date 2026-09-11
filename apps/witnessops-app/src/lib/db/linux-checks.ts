import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { verifyProofpack } from '../../../../witnessops-web/src/lib/proofpack/verify.mjs';
import { LIMITS } from '../../../../witnessops-web/src/lib/proofpack/primitives.mjs';
import { pinnedRegistryInput, LOCAL_AUDIT_TRUST } from '../../../../witnessops-web/src/lib/proofpack/pinned-registry';
import { localAuditAdapter } from '../../../../witnessops-web/src/lib/proofpack/local-audit-adapter';
import { isBuyerReport } from '../../../../witnessops-web/src/lib/proofpack/report-model';
import { requireWorkspaceMembership } from './workspaces';
import { transaction } from './pool';
import type { AppUser } from './identity';
import type { LinuxCheckRun } from '../model';
import { linuxHostname } from '../linux-hostname';
import { linuxServerSnapshotFromVerifiedResult, isLinuxServerSnapshot } from '../linux-snapshot';
import { compareLinuxRuns, type LinuxComparison } from '../linux-comparison';
import { requireLinuxClassification } from '../linux-admission';
import { canonicalSource } from '../source-digest';
import { ApiError, requireId } from '../errors';

export const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export type LinuxSource = { zipName: string; zip: Buffer; signature: Buffer; registry: Buffer };
/** No caller-controlled registry, verifier or report. Never execute enclosed code. */
async function verify(source: LinuxSource, generatedAt: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,250}\.zip$/.test(source.zipName)) throw new ApiError(422, 'Choose the original ZIP filename.');
  if (source.zip.length > LIMITS.proofpack || source.signature.length > LIMITS.signature || sha256(source.registry) !== LOCAL_AUDIT_TRUST.sha256) throw new ApiError(422, 'Unaccepted Proofpack size or trust context.');
  const result = await verifyProofpack({ proofpack: { name: source.zipName, bytes: source.zip }, signature: { name: `${source.zipName}.sig.json`, bytes: source.signature }, trust_registry: { name: pinnedRegistryInput().name, bytes: source.registry } });
  const model = localAuditAdapter(result, generatedAt);
  if (result.status !== 'valid' || !result.report || !model || !isBuyerReport(model)) throw new ApiError(422, 'Local Audit package verification did not pass. No run was admitted.');
  await requireLinuxClassification(result, source.zip);
  const metadata = { proofRunId: result.proof_run_id, verifierVersion: result.verifier_version, profileId: String(result.report.scope.profile_id), outcome: result.outcome,
    synthetic: result.report.posture.synthetic, observedHostname: result.report.posture.target.hostname, observedAt: result.report.posture.observed_at_utc,
    sourceAssetId: result.report.posture.target.asset_id, machineIdentity: result.report.posture.sections.host_identity?.machine_identity ?? null };
  // Import verification context, not another copy of the source/report.
  const { report: _report, ...verification } = result;
  void _report;
  return { model, metadata, verification, snapshot: linuxServerSnapshotFromVerifiedResult(result) };
}
type Row = { id: string; asset_id: string; created_at: Date; source_digest: string; metadata: Omit<LinuxCheckRun, 'id' | 'assetId' | 'createdAt' | 'sourceDigest'> };
const projection = (r: Row): LinuxCheckRun => ({ ...r.metadata, id: r.id, assetId: r.asset_id, createdAt: r.created_at.toISOString(), sourceDigest: r.source_digest });
const select = `SELECT r.id,r.asset_id,r.created_at,r.source_digest,s.metadata FROM runs r JOIN linux_check_sources s ON s.run_id=r.id AND s.workspace_id=r.workspace_id WHERE r.workspace_id=$1 AND r.source_type='local-audit-1.2.2' AND r.status='completed'`;
export class LinuxCheckStore {
  constructor(readonly pool: Pool) {}
  async list(user: AppUser, workspaceId: string) {
    return transaction(this.pool, async client => {
      await requireWorkspaceMembership(client, user, workspaceId);
      return (await client.query<Row>(select + ' ORDER BY r.created_at,r.id', [workspaceId])).rows.map(projection);
    });
  }
  async import(user: AppUser, workspaceId: string, assetId: string, zip: Uint8Array, signature: Uint8Array, zipName: string) {
    // Own buffers prevent the request holder from changing admitted bytes during verification.
    const source = { zipName, zip: Buffer.from(zip), signature: Buffer.from(signature), registry: Buffer.from(pinnedRegistryInput().bytes) };
    return transaction(this.pool, async client => {
      await requireWorkspaceMembership(client, user, workspaceId, true);
      const asset = await client.query<{ normalized_value: string }>("SELECT normalized_value FROM assets WHERE workspace_id=$1 AND id=$2 AND type='linux_server' FOR SHARE", [workspaceId, requireId(assetId)]);
      if (!asset.rows[0]) throw new ApiError(404, 'Linux server asset not found.');
      // Admission is serialized with EE and asset capacity checks. No background jobs.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [workspaceId]);
      const count = await client.query<{ count: string }>("SELECT count(*) FROM runs WHERE workspace_id=$1 AND status IN ('running','completed')", [workspaceId]);
      const size = await client.query<{ bytes: string }>('SELECT coalesce(sum(octet_length(zip_bytes)+octet_length(signature_bytes)+octet_length(registry_bytes)),0) AS bytes FROM linux_check_sources WHERE workspace_id=$1', [workspaceId]);
      if (Number(count.rows[0].count) >= 32 || Number(size.rows[0].bytes) + source.zip.length + source.signature.length + source.registry.length > 200 * 1024 * 1024) throw new ApiError(409, 'Workspace import capacity reached.');
      const createdAt = new Date().toISOString(), checked = await verify(source, createdAt);
      if (linuxHostname(checked.metadata.observedHostname) !== asset.rows[0].normalized_value) throw new ApiError(422, 'The package hostname does not match this Linux server asset.');
      const id = randomUUID(), digest = sha256(source.zip);
      await client.query(`INSERT INTO runs (id,workspace_id,asset_id,initiated_by,source_type,status,method_id,method_version,created_at) VALUES ($1,$2,$3,$4,'local-audit-1.2.2','running',$5,$6,$7)`, [id,workspaceId,assetId,user.id,checked.metadata.profileId,checked.metadata.verifierVersion,createdAt]);
      await client.query(`INSERT INTO linux_check_sources (run_id,workspace_id,zip_bytes,signature_bytes,registry_bytes,signature_digest,registry_digest,metadata,verification,zip_name,derived_snapshot) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11::jsonb)`, [id,workspaceId,source.zip,source.signature,source.registry,sha256(source.signature),sha256(source.registry),JSON.stringify(checked.metadata),JSON.stringify(checked.verification),zipName,JSON.stringify(checked.snapshot)]);
      await client.query("UPDATE runs SET status='completed',source_digest=$3,finished_at=$4 WHERE workspace_id=$1 AND id=$2", [workspaceId,id,digest,createdAt]);
      return { ...checked.metadata, id, assetId, createdAt, sourceDigest: digest } satisfies LinuxCheckRun;
    });
  }
  async reopen(user: AppUser, workspaceId: string, runId: string) {
    return transaction(this.pool, async client => {
      await requireWorkspaceMembership(client, user, workspaceId);
      const result = await client.query<Row & { derived_snapshot: unknown; zip_name: string; zip_bytes: Buffer; signature_bytes: Buffer; registry_bytes: Buffer; signature_digest: string; registry_digest: string }>(select.replace('s.metadata FROM', 's.metadata,s.derived_snapshot,s.zip_name,s.zip_bytes,s.signature_bytes,s.registry_bytes,s.signature_digest,s.registry_digest FROM') + ' AND r.id=$2', [workspaceId,requireId(runId)]);
      const row = result.rows[0];
      if (!row) throw new ApiError(404, 'Run not found in this workspace.');
      const source = { zipName: row.zip_name, zip: row.zip_bytes, signature: row.signature_bytes, registry: row.registry_bytes };
      if (sha256(source.zip) !== row.source_digest || sha256(source.signature) !== row.signature_digest || sha256(source.registry) !== row.registry_digest) throw new ApiError(422, 'Stored source correspondence failed.');
      const checked = await verify(source, row.created_at.toISOString());
      return { run: projection(row), model: checked.model, source, snapshot: checked.snapshot,
        projectionMatches: row.derived_snapshot === null ? null : isLinuxServerSnapshot(row.derived_snapshot) && canonicalSource(row.derived_snapshot) === canonicalSource(checked.snapshot) };
    });
  }
  async comparison(user: AppUser, workspaceId: string, runId: string) {
    const current = await this.reopen(user, workspaceId, runId);
    // Never accept a baseline from the browser or fall back to hostname matching.
    const priorId = await transaction(this.pool, async client => {
      await requireWorkspaceMembership(client, user, workspaceId);
      const prior = await client.query<{id:string}>(`SELECT p.id FROM runs p JOIN runs c ON c.workspace_id=p.workspace_id AND c.asset_id=p.asset_id
        WHERE c.workspace_id=$1 AND c.id=$2 AND p.source_type='local-audit-1.2.2' AND p.status='completed'
        AND (p.created_at,p.id)<(c.created_at,c.id) ORDER BY p.created_at DESC,p.id DESC LIMIT 1`,[workspaceId,requireId(runId)]);
      return prior.rows[0]?.id;
    });
    const asRun = (value: typeof current) => ({...value.run,workspaceId,snapshot:value.snapshot});
    let comparison: LinuxComparison;
    if (!priorId) comparison=compareLinuxRuns(asRun(current));
    else {
      try { comparison=compareLinuxRuns(asRun(current),asRun(await this.reopen(user,workspaceId,priorId))); }
      catch(error) {
        if (!(error instanceof ApiError) || error.status!==422) throw error;
        comparison={baselineId:priorId,qualification:'COLLECTION_GAP',environment:[],coverage:[],uncertainty:['The nearest earlier source could not be reverified. Comparison is not established; no older run was substituted.']};
      }
    }
    if(current.projectionMatches===false)comparison.uncertainty.push('Stored derived projection differs; comparison uses the freshly verified package projection.');
    return {...current,comparison};
  }

}
