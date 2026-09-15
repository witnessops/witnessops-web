// Local cohort management only. No customer-accessible admin route and no email
// domain/WorkOS organization enrollment. Never send invitations from this script.
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import pg from 'pg';

let pool;
try {
  const [command, userId, state, ...extra] = process.argv.slice(2);
  if (extra.length || !['set', 'report'].includes(command) || (command === 'report' && userId)) throw new Error('Use set USER_UUID invited|paused, or report');
  if (command === 'set' && (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId ?? '') || !['invited', 'paused'].includes(state))) throw new Error('Use a named internal user UUID and invited|paused');
  const env = parseEnv(await readFile(new URL('../.env.local', import.meta.url), 'utf8'));
  const url = new URL(env.DATABASE_MIGRATION_URL);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('This helper is limited to the local development database');
  pool = new pg.Pool({ connectionString: env.DATABASE_MIGRATION_URL, max: 1, connectionTimeoutMillis: 5000 });
  if (command === 'set') {
    const result = await pool.query("UPDATE users SET early_access_state=$2,updated_at=now() WHERE id=$1 AND status='active' RETURNING id", [userId, state]);
    if (result.rowCount !== 1) throw new Error('Active internal user not found');
    console.log(`Early Access updated to ${state}. Membership was not changed; no message was sent.`);
  } else {
    const access = await pool.query("SELECT coalesce(early_access_state,'not_enrolled') AS state,count(*)::integer AS users FROM users GROUP BY early_access_state");
    const events = await pool.query('SELECT name,count(*)::integer AS object_actions,count(DISTINCT user_id)::integer AS users FROM product_events GROUP BY name ORDER BY name');
    const feedback = await pool.query('SELECT surface,response,count(*)::integer AS responses FROM product_feedback GROUP BY surface,response ORDER BY surface,response');
    console.log(JSON.stringify({ access: access.rows, events: events.rows, feedback: feedback.rows }, null, 2));
  }
} catch { console.error('Cohort operation failed. Check command, named user and local database configuration. No credentials logged.'); process.exitCode = 1; }
finally { await pool?.end(); }
