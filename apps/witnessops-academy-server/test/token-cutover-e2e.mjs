// Explicit opt-in. A new isolated database; no existing database is overwritten.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { env, secret, int, isLoopback } from '../src/env.mjs';
import { assertTokenStorageReady } from '../src/session-tokens.mjs';
if (process.env.ACADEMY_E2E !== '1') process.exit(0);
assert.ok(isLoopback(env('ACADEMY_PUBLIC_ORIGIN')));
const settings = { host: env('ACADEMY_DB_HOST'), port: int('ACADEMY_DB_PORT', 5432), user: env('ACADEMY_TEST_PGADMIN_USER', 'postgres'), password: secret('ACADEMY_TEST_PGADMIN_PASSWORD') };
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(settings.host));
const admin = new pg.Client({ ...settings, database: 'postgres' });
const name = 'academy_a3_' + crypto.randomBytes(6).toString('hex');
let created = false, client;
const results = [];
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}" OWNER academy_migrator`);
  created = true;
  client = new pg.Client({ ...settings, database: name });
  await client.connect();
  await client.query('SET ROLE academy_migrator');
  await client.query(readFileSync(new URL('../migrations/001_academy_identity_and_drafts.sql', import.meta.url), 'utf8'));
  const id = (await client.query("INSERT INTO academy_identities(issuer, subject) VALUES ('https://synthetic.example.invalid', 'legacy') RETURNING id")).rows[0].id;
  const hash = 'a'.repeat(64);
  await client.query(`INSERT INTO academy_sessions(token_hash, identity_id, csrf_token, id_token, access_token, refresh_token, expires_at)
    VALUES ($1,$2,'synthetic-csrf','synthetic-legacy-id','synthetic-legacy-access','synthetic-legacy-refresh',now()+interval '1 hour')`, [hash,id]);
  await client.query(`INSERT INTO academy_lesson_drafts(owner_id, lesson_id, content, last_save_request_id)
    VALUES ($1,'report-or-evidence','Synthetic draft retained through cutover',$2)`, [id,crypto.randomUUID()]);
  await client.query(readFileSync(new URL('../migrations/003_academy_session_token_protection.sql', import.meta.url), 'utf8'));
  await assert.rejects(() => assertTokenStorageReady(client));
  let denied = false;
  try { await client.query("UPDATE academy_sessions SET access_token='raw' WHERE token_hash=$1", [hash]); }
  catch (error) { denied = error.code === '23514'; }
  assert.ok(denied);
  await client.query(readFileSync(new URL('../db/session-token-cutover.sql', import.meta.url), 'utf8'));
  await assertTokenStorageReady(client);
  const row = (await client.query('SELECT * FROM academy_sessions WHERE token_hash=$1', [hash])).rows[0];
  assert.ok(row.revoked_at && row.id_token === null && row.access_token === null && row.refresh_token === null && row.tokens_ciphertext === null);
  assert.equal((await client.query('SELECT content FROM academy_lesson_drafts')).rows[0].content, 'Synthetic draft retained through cutover');
  assert.equal((await client.query('SELECT reason FROM academy_session_revocations')).rows[0].reason, 'token_protection_upgrade');
  // Repeating the explicit cutover neither deletes drafts nor duplicates revocations.
  await client.query(readFileSync(new URL('../db/session-token-cutover.sql', import.meta.url), 'utf8'));
  assert.equal((await client.query('SELECT count(*)::int n FROM academy_session_revocations')).rows[0].n, 1);
  results.push({ name: 'Legacy plaintext removed, sessions revoked, draft preserved; constraint and startup gate enforced; cutover repeatable', result: 'PASS' });
  console.log('PASS A3 legacy cutover, draft preservation, constraints and startup gate');
} catch (error) {
  results.push({ name: 'cutover', result: 'FAIL', code: /^[A-Za-z0-9_]+$/.test(error.code || '') ? error.code : 'assertion' });
  console.error('FAIL A3 cutover (credential-safe diagnostics)');
  process.exitCode = 1;
} finally {
  if (client) await client.end();
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
  writeFileSync(join(env('ACADEMY_TEST_EVIDENCE_DIR'), 'a3-cutover-results.json'), JSON.stringify({ results }, null, 2));
}
