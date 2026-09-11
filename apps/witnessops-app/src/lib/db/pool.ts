import "server-only";
import { Pool, type PoolClient } from "pg";

const key = Symbol.for("witnessops.app.postgres");
const state = globalThis as typeof globalThis & { [key]?: Pool };
export function database(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("Database configuration is required");
  return state[key] ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 6, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30_000, statement_timeout: 10_000 });
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
