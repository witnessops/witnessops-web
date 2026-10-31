/** Explicit attended operator command. No automatic .env loading, identity
 * seeding, native sign-in, provider calls or runtime build-profile override. */
import { closeSync, constants, existsSync, fstatSync, fsyncSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { Pool } from 'pg';
import { readStagingAssignmentFile } from '../src/lib/aasr-fixture/assignment';
import { applyAssignment, inspectAssignment, parseAssignmentPlan, rollbackAssignment, verifyStagingDatabaseRoles } from '../src/lib/aasr-fixture/assignment-operator';
import { stagingDatabaseTargetDigest, validStagingOrigin } from '../src/lib/aasr-staging/build-profile';

function refuse(message: string): never { throw new Error(message); }
function readPrivateJson(path: string): string {
  if (!isAbsolute(path)) return refuse('Receipt paths must be absolute.');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 65536 || (stat.mode & 0o077)) return refuse('Use a private regular receipt file.');
    return readFileSync(fd, 'utf8');
  } finally { closeSync(fd); }
}
function writeReceipt(path: string, value: unknown) {
  if (!isAbsolute(path)) return refuse('Receipt paths must be absolute.');
  const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fsyncSync(fd); }
  finally { closeSync(fd); }
}
async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (!['dry-run', 'apply', 'rollback'].includes(mode ?? '')) refuse('Choose dry-run, apply or rollback.');
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--manifest', '--receipt', '--reviewed-dry-run', '--apply-receipt'].includes(args[i]) || !args[i + 1] || flags[args[i]]) refuse('Invalid command arguments.');
    flags[args[i]] = args[i + 1];
  }
  const wanted = mode === 'dry-run' ? ['--manifest', '--receipt'] : mode === 'apply' ? ['--manifest', '--receipt', '--reviewed-dry-run'] : ['--manifest', '--receipt', '--apply-receipt'];
  if (Object.keys(flags).sort().join() !== wanted.sort().join()) refuse('Supply exactly the documented arguments for this command.');
  const receiptPath = flags['--receipt'];
  if (!isAbsolute(receiptPath) || existsSync(receiptPath) || existsSync(receiptPath + '.commit.json')) refuse('Choose a new absolute private receipt path.');
  if (process.env.WITNESSOPS_DEPLOYMENT_ENV !== 'staging') refuse('Explicit staging deployment marker required.');
  const runtimeUrl = process.env.DATABASE_URL ?? '';
  const migrationUrl = process.env.DATABASE_MIGRATION_URL ?? '';
  const runtimeDigest = stagingDatabaseTargetDigest(runtimeUrl);
  stagingDatabaseTargetDigest(migrationUrl); // Same restrictive staging naming and URL policy.
  const runtime = new URL(runtimeUrl), migration = new URL(migrationUrl);
  const database = decodeURIComponent(runtime.pathname.slice(1));
  const runtimeRole = decodeURIComponent(runtime.username);
  if (runtime.hostname !== migration.hostname || (runtime.port || '5432') !== (migration.port || '5432')
    || runtime.pathname !== migration.pathname || runtime.username === migration.username) refuse('Separate runtime and migration identities must target the same dedicated staging database.');
  const callback = new URL(process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? '');
  if (!validStagingOrigin(callback.origin) || callback.href !== `${callback.origin}/callback`) refuse('Exact staging callback required.');
  const assignment = readStagingAssignmentFile(flags['--manifest'], { origin: callback.origin, workosClientId: process.env.WORKOS_CLIENT_ID ?? '', databaseTargetSha256: runtimeDigest });
  let reviewed;
  if (mode === 'apply') reviewed = parseAssignmentPlan(readPrivateJson(flags['--reviewed-dry-run']), assignment);
  if (mode === 'rollback') {
    const receipt = JSON.parse(readPrivateJson(flags['--apply-receipt']));
    if (receipt?.schema !== 'witnessops.aasr-staging-assignment-operation.v1' || receipt.mode !== 'apply' || receipt.databaseTargetSha256 !== runtimeDigest) refuse('An exact staging apply receipt is required.');
    reviewed = parseAssignmentPlan(JSON.stringify(receipt.plan), assignment);
  }
  // All binding/input checks finish before opening a database connection.
  const pool = new Pool({ connectionString: migrationUrl, max: 1, connectionTimeoutMillis: 5000, statement_timeout: 10000, idle_in_transaction_session_timeout: 15000 });
  let committed = false;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await verifyStagingDatabaseRoles(client, runtimeRole, database, decodeURIComponent(migration.username));
      if (mode === 'dry-run') {
        const plan = await inspectAssignment(client, assignment);
        await client.query('ROLLBACK');
        writeReceipt(receiptPath, plan);
        console.log('Dry run complete; no database mutation. Review the private plan before apply.');
      } else {
        // Durable rollback data is written before any mutation. It intentionally
        // is not commit evidence; the sibling marker records observed COMMIT.
        writeReceipt(receiptPath, { schema: 'witnessops.aasr-staging-assignment-operation.v1', mode,
          status: 'PREPARED_NOT_COMMIT_PROOF', databaseTargetSha256: runtimeDigest, plan: reviewed });
        const result = mode === 'apply' ? await applyAssignment(client, assignment, reviewed!) : await rollbackAssignment(client, assignment, reviewed!);
        await client.query('COMMIT');
        committed = true;
        writeReceipt(receiptPath + '.commit.json', { schema: 'witnessops.aasr-staging-assignment-commit.v1', mode, committedAt: new Date().toISOString(), result });
        console.log(`${mode} committed and read back. Private rollback data and commit receipt retained.`);
      }
    } catch (error) { if (!committed) await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  } finally { await pool.end(); }
}
main().catch(() => {
  // Do not print connection strings, provider identities or database errors.
  // A prepared receipt without a commit marker is an uncertain result; the
  // exact-state checks make a reviewed retry/rollback safe without guessing.
  console.error('Assignment command failed. No successful completion is claimed. Preserve any prepared receipt and reconcile its exact database state before retrying.');
  process.exitCode = 1;
});
