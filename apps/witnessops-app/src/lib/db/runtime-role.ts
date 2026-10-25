import { Pool } from 'pg';

/** Disposable test role. NOLOGIN, so it is reached with SET ROLE, not a password login. */
export const RUNTIME_ROLE = 'witnessops_app_runtime';

const schemaName = /^[a-z][a-z0-9_]*$/;

function duplicateRole(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === '42710';
}

export async function ensureRuntimeRole(admin: Pool, schema: string): Promise<void> {
  if (!schemaName.test(schema)) throw new Error('Refusing an unexpected test schema name');
  const existing = await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [RUNTIME_ROLE]);
  if (!existing.rowCount) {
    try {
      await admin.query(`CREATE ROLE ${RUNTIME_ROLE} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
    } catch (error) {
      if (!duplicateRole(error)) throw error;
    }
  }
  const role = await admin.query(
    'SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname=$1',
    [RUNTIME_ROLE],
  );
  const row = role.rows[0];
  if (!row || row.rolsuper || row.rolcreatedb || row.rolcreaterole || row.rolbypassrls || row.rolcanlogin) {
    throw new Error(`${RUNTIME_ROLE} must be NOLOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE and NOBYPASSRLS`);
  }
  await admin.query(`GRANT USAGE ON SCHEMA ${schema} TO ${RUNTIME_ROLE}`);
  await admin.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${RUNTIME_ROLE}`);
  await admin.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO ${RUNTIME_ROLE}`);
  await admin.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ${schema} TO ${RUNTIME_ROLE}`);
}

export function runtimePool(connectionString: string, schema: string): Pool {
  if (!schemaName.test(schema)) throw new Error('Refusing an unexpected test schema name');
  return new Pool({
    connectionString,
    max: 4,
    options: `-c search_path=${schema},public -c role=${RUNTIME_ROLE}`,
  });
}
