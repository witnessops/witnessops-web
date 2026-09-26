// Offline operator tool. Never import into the customer runtime or an HTTP route.
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const direct = ['product_feedback', 'product_events', 'workspace_invitations', 'cli_sessions',
  'cli_login_transactions', 'report_shares', 'linux_check_sources', 'runs', 'assets'];
const related = ['report_share_access', 'report_share_unlocks', 'report_share_deliveries'];
const retained = ['workspaces', 'memberships', 'free_workspace_plans', 'early_access_plans',
  'early_access_plan_consents', 'hostname_check_usage', 'server_check_executions',
  'workspace_billing', 'billing_events', 'workspace_complimentary_access'];
const tables = [...direct, ...related, ...retained, 'report_share_names', 'app_migrations'].sort();
const where = table => related.includes(table) || table === 'report_share_names'
  ? 'share_id IN (SELECT id FROM report_shares WHERE workspace_id=$1)'
  : table === 'workspaces' ? 'id=$1' : 'workspace_id=$1';
const exclusions = [
  'Account and identity-provider records; workspace identity, memberships and admission history',
  'Reserved report names (detached tombstones; names must not contain confidential data)',
  'Backups, logs, correspondence, provider records and previously downloaded/received copies',
];

async function checkMigrations(client) {
  const dir = new URL('../db/migrations/', import.meta.url);
  const names = (await readdir(dir)).filter(n => /^\d{4}_[a-z_]+\.sql$/.test(n)).sort();
  if (names.length !== 21 || names.at(-1) !== '0022_capture_admission.sql') {
    throw new Error('Removal scope needs review for this schema version');
  }
  const expected = [];
  for (const name of names) expected.push({ name, sha256: createHash('sha256').update(await readFile(new URL(name, dir))).digest('hex') });
  const actual = (await client.query('SELECT name,sha256 FROM app_migrations ORDER BY name')).rows;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Database migrations do not match reviewed source');
}

async function plan(client, workspaceId) {
  await checkMigrations(client);
  const workspace = (await client.query('SELECT status FROM workspaces WHERE id=$1', [workspaceId])).rows[0];
  if (!workspace) throw new Error('Workspace not found');
  /** @type {Record<string, number>} */
  const counts = {};
  /** @type {Record<string, string>} */
  const fingerprints = {};
  for (const table of tables.filter(t => t !== 'app_migrations')) {
    // Fixed identifiers only; workspace values are always bound parameters.
    const result = await client.query(`SELECT count(*)::integer AS count,
      encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(to_jsonb(t)::text, 'UTF8')), 'hex'), ',' ORDER BY to_jsonb(t)::text), ''), 'UTF8')), 'hex') AS fingerprint
      FROM ${table} t WHERE ${where(table)}`, [workspaceId]);
    counts[table] = result.rows[0].count;
    fingerprints[table] = result.rows[0].fingerprint;
  }
  const blockers = [];
  if (counts.server_check_executions) blockers.push('server_execution_custody_requires_separate_filesystem_reconciliation');
  if (counts.early_access_plans || counts.hostname_check_usage) blockers.push('historical_terms_and_usage_require_separate_review');
  if (counts.workspace_billing || counts.billing_events || counts.workspace_complimentary_access) blockers.push('billing_or_grant_records_require_separate_review');
  if ((await client.query("SELECT 1 FROM runs WHERE workspace_id=$1 AND status='running' LIMIT 1", [workspaceId])).rowCount) blockers.push('running_work_requires_reconciliation');
  if ((await client.query("SELECT 1 FROM report_share_deliveries WHERE workspace_id=$1 AND state<>'draft' LIMIT 1", [workspaceId])).rowCount) blockers.push('report_delivery_copies_require_separate_reconciliation');
  if ((await client.query("SELECT 1 FROM workspace_invitations WHERE workspace_id=$1 AND delivery_state<>'not_sent' LIMIT 1", [workspaceId])).rowCount) blockers.push('invitation_delivery_copies_require_separate_reconciliation');
  const triggers = (await client.query(`SELECT tgname,tgenabled FROM pg_trigger
    WHERE (tgrelid='runs'::regclass AND tgname='runs_immutable')
       OR (tgrelid='linux_check_sources'::regclass AND tgname='linux_source_immutable') ORDER BY tgname`)).rows;
  if (triggers.length !== 2 || triggers.some(t => t.tgenabled !== 'O')) throw new Error('Source immutability guards are not in their expected state');
  return { scope: 'workspace-content-removal-v1', workspaceId, workspaceStatus: workspace.status,
    counts, blockers, exclusions, planDigest: digest({ workspaceId, fingerprints, blockers }) };
}

/** Explicit database-owner operation, not a new application capability. Preview is read-only.
 * Apply locks the affected tables before rechecking the preview, removes only the named
 * workspace's content, and archives its retained identity. No account-erasure claim.
 * @param {import('pg').Pool} pool
 * @param {{workspaceId: string, expectedDigest?: string, requestReference?: string, apply?: boolean}} options
 */
export async function removeWorkspaceContent(pool, { workspaceId, expectedDigest, requestReference, apply = false }) {
  if (!uuid.test(workspaceId ?? '')) throw new Error('Expected one workspace UUID');
  if (apply && (!/^[a-f0-9]{64}$/.test(expectedDigest ?? '') || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(requestReference ?? ''))) {
    throw new Error('Apply requires the preview digest and a non-sensitive request reference');
  }
  const client = await pool.connect();
  try {
    await client.query(apply ? 'BEGIN' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL statement_timeout='30s'");
    if (apply) {
      // Table-wide maintenance lock also protects the brief trigger suspension from
      // other tenants/writers. Locks and DDL are rolled back together on any failure.
      await client.query(`LOCK TABLE ${tables.join(',')} IN ACCESS EXCLUSIVE MODE`);
    }
    const preview = await plan(client, workspaceId);
    if (!apply) { await client.query('COMMIT'); return { ...preview, outcome: 'preview_only' }; }
    if (preview.blockers.length) throw new Error(`Removal blocked: ${preview.blockers.join(', ')}`);
    if (preview.planDigest !== expectedDigest) throw new Error('Preview is stale; inspect a fresh preview');
    await client.query('ALTER TABLE runs DISABLE TRIGGER runs_immutable');
    await client.query('ALTER TABLE linux_check_sources DISABLE TRIGGER linux_source_immutable');
    const removed = {};
    for (const table of direct) {
      removed[table] = (await client.query(`DELETE FROM ${table} WHERE workspace_id=$1`, [workspaceId])).rowCount;
    }
    await client.query('ALTER TABLE linux_check_sources ENABLE TRIGGER linux_source_immutable');
    await client.query('ALTER TABLE runs ENABLE TRIGGER runs_immutable');
    await client.query("UPDATE workspaces SET status='archived',updated_at=now() WHERE id=$1", [workspaceId]);
    const after = await plan(client, workspaceId);
    if ([...direct, ...related].some(t => after.counts[t] !== 0)) throw new Error('Post-removal counts are not empty');
    await client.query('COMMIT');
    return { ...after, requestReference, approvedPlanDigest: expectedDigest,
      outcome: 'database_content_removed_workspace_archived', removed, exclusions,
      completedAt: new Date().toISOString(), limitation: 'Not account erasure or confirmation of deletion from backups, providers or recipient copies' };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function main() {
  let pool;
  try {
    const [command, workspaceId, expectedDigest, requestReference, ...extra] = process.argv.slice(2);
    if (extra.length || !['preview', 'apply'].includes(command) || (command === 'preview' && (expectedDigest || requestReference))) throw new Error('Invalid arguments');
    const local = parseEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
    const url = new URL(local.DATABASE_MIGRATION_URL);
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Only an explicitly configured loopback operator connection is supported');
    const { default: pg } = await import('pg');
    pool = new pg.Pool({ connectionString: local.DATABASE_MIGRATION_URL, max: 1, connectionTimeoutMillis: 5000 });
    console.log(JSON.stringify(await removeWorkspaceContent(pool, { workspaceId, expectedDigest, requestReference, apply: command === 'apply' }), null, 2));
  } catch {
    console.error('Workspace content removal failed. No completion claim. Check the reviewed procedure, preview, scope and operator connection; credentials and source data are not logged.');
    process.exitCode = 1;
  } finally { await pool?.end(); }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) void main();
