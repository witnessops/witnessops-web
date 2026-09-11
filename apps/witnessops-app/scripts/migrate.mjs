import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import pg from 'pg';

export async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(941071, 1)");
    await client.query('CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const dir = new URL('../db/migrations/', import.meta.url);
    for (const name of (await readdir(dir)).filter(n => /^\d{4}_[a-z_]+\.sql$/.test(n)).sort()) {
      const sql = await readFile(new URL(name, dir), 'utf8');
      const digest = createHash('sha256').update(sql, 'utf8').digest('hex');
      const prior = await client.query('SELECT sha256 FROM app_migrations WHERE name=$1', [name]);
      if (prior.rows.length) {
        if (prior.rows[0].sha256 !== digest) throw new Error('Previously applied migration changed');
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO app_migrations (name, sha256) VALUES ($1, $2)', [name, digest]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
async function main() {
  let pool;
  try {
    const local = parseEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
    const connectionString = local.DATABASE_MIGRATION_URL;
    if (!connectionString) throw new Error('DATABASE_MIGRATION_URL required');
    pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
    await migrate(pool);
    console.log('Application SQL migrations: PASS');
  } catch { console.error('Migration failed. Check the local migration connection and schema; no credentials logged.'); process.exitCode = 1; }
  finally { await pool?.end(); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) void main();
