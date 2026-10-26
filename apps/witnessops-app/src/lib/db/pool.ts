import "server-only";
import { Pool, type PoolClient } from "pg";

/**
 * Reclaim a pooled session that stays inside a transaction without running a
 * statement. 150s is above the finalizer process timeout (120s). Upload
 * validation still runs inside its transaction, so a shorter value would
 * abort that work. This is a startup parameter of this app pool only. It
 * does not change a database role setting.
 */
export const IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS = 150_000;

const key = Symbol.for("witnessops.app.postgres");
const state = globalThis as typeof globalThis & { [key]?: Pool };
export function database(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("Database configuration is required");
  return state[key] ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 6,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
    idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS,
  });
}
export async function transaction<T>(pool: Pool, action: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
