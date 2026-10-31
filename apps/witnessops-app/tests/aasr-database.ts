/** Test-only disposable native membership fixtures. Never imported by app runtime. */
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { migrate } from '../scripts/migrate.mjs';
import { ensureRuntimeRole, runtimePool } from '../src/lib/db/runtime-role';
import { sessionKey } from '../src/lib/db/sessions';
import type { Identity } from '../src/lib/db/identity';
import { AASR_FIXTURE_WORKSPACE_ID } from '../src/lib/aasr-fixture/contract';
import { AASR_FIXTURE_REVIEWER_ID } from '../src/lib/aasr-fixture/server';

export const AASR_TEST_USERS = {
  owner: '22000000-0000-4000-8000-000000000001',
  reviewer: AASR_FIXTURE_REVIEWER_ID,
  viewer: '22000000-0000-4000-8000-000000000003',
  stranger: '22000000-0000-4000-8000-000000000004',
  contributor: '22000000-0000-4000-8000-000000000005',
} as const;
export type AasrTestActor = keyof typeof AASR_TEST_USERS;
const issuer = 'https://api.workos.com/user_management/client_aasr_fixture';
export function aasrTestSession(actor: AasrTestActor) {
  const identity: Identity = { provider: 'workos', issuer, subject: `user_aasr${actor}`, email: `${actor}@example.test`, displayName: `Synthetic ${actor}` };
  return { identity, session: sessionKey(issuer, `session_aasr${actor}`, identity.subject) };
}
export async function createAasrTestDatabase() {
  const env = parseEnv(readFileSync(new URL('../.env.test.local', import.meta.url), 'utf8'));
  const connectionString = env.TEST_DATABASE_URL;
  if (!connectionString) throw new Error('TEST_DATABASE_URL is required');
  const target = new URL(connectionString);
  if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !/^\/[a-z0-9_]+_test$/.test(target.pathname)) throw new Error('Refusing a non-local or non-test database');
  const schema = `aasr_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString, max: 1 });
  const control = new Pool({ connectionString, options: `-c search_path=${schema},public`, max: 1 });
  let pool: Pool | undefined;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    await migrate(control);
    await ensureRuntimeRole(admin, schema);
    for (const [actor, id] of Object.entries(AASR_TEST_USERS)) {
      const { identity } = aasrTestSession(actor as AasrTestActor);
      await control.query("INSERT INTO users(id,display_name,early_access_state) VALUES ($1,$2,'active')", [id, identity.displayName]);
      await control.query('INSERT INTO identity_mappings(user_id,provider,issuer,subject,verified_email_snapshot) VALUES ($1,$2,$3,$4,$5)', [id, identity.provider, identity.issuer, identity.subject, identity.email]);
    }
    await control.query("INSERT INTO workspaces(id,name,slug,created_by,creation_key) VALUES ($1,'SYN-NORTHSTAR','syn-northstar',$2,$3)", [AASR_FIXTURE_WORKSPACE_ID, AASR_TEST_USERS.owner, randomUUID()]);
    for (const [actor, role] of [['owner', 'owner'], ['reviewer', 'contributor'], ['viewer', 'viewer'], ['contributor', 'contributor']] as const) {
      await control.query('INSERT INTO memberships(user_id,workspace_id,role) VALUES ($1,$2,$3)', [AASR_TEST_USERS[actor], AASR_FIXTURE_WORKSPACE_ID, role]);
    }
    pool = runtimePool(connectionString, schema);
    return {
      pool,
      control,
      async close() {
        await pool?.end();
        await control.end();
        await admin.query(`DROP SCHEMA ${schema} CASCADE`);
        await admin.end();
      },
    };
  } catch (error) {
    await pool?.end();
    await control.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
    throw error;
  }
}
