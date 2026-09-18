import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { transaction } from './pool';
import { requireWorkspaceMembership, WorkspaceStore } from './workspaces';
import { resolveIdentity, type Identity } from './identity';
import { sessionKey, type SessionKey } from './sessions';
import { ApiError } from '../errors';

export const LOGIN_TTL = 600_000, SESSION_TTL = 3_600_000, POLL_MS = 5_000;
export class CliError extends ApiError {
  constructor(public code: string, status = 400) { super(status, code); }
}
export type WebCliIdentity = { identity: Identity; session: SessionKey };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function secret(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new CliError('invalid_credential', 401);
  return value;
}
function code(value: unknown) {
  if (typeof value !== 'string' || !/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(value)) throw new CliError('invalid_code');
  return value;
}
type Binding = { user_id: string; workspace_id: string; web_issuer: string; web_session_id: string; scope: string; membership_generation: number };
async function parentActive(client: PoolClient, issuer: string, session: string) {
  if ((await client.query('SELECT 1 FROM revoked_sessions WHERE issuer=$1 AND session_id=$2', [issuer, session])).rowCount) throw new CliError('revoked', 401);
}
async function current(client: PoolClient, binding: Binding) {
  await parentActive(client, binding.web_issuer, binding.web_session_id);
  const member = await requireWorkspaceMembership(client, { id: binding.user_id, displayName: null }, binding.workspace_id);
  if (member.generation !== binding.membership_generation) throw new CliError('revoked', 401);
  const user = (await client.query('SELECT display_name FROM users WHERE id=$1', [binding.user_id])).rows[0];
  return { displayName: user.display_name || 'WitnessOps account', workspace: member.name, role: member.role, scope: binding.scope };
}
export class CliAuthStore {
  constructor(readonly pool: Pool, readonly now = Date.now) {}
  async create() {
    return transaction(this.pool, async client => {
      // Shared DB cap across processes; expired transactions are unusable even before cleanup.
      await client.query('SELECT pg_advisory_xact_lock(941071, 9)');
      const time = this.now();
      await client.query('DELETE FROM cli_login_transactions WHERE expires_at < $1', [new Date(time)]);
      await client.query('DELETE FROM cli_sessions WHERE expires_at < $1', [new Date(time - 86_400_000)]);
      const counts = (await client.query(`SELECT count(*) FILTER (WHERE created_at > $1) AS recent, count(*) AS total FROM cli_login_transactions`, [new Date(time - 60_000)])).rows[0];
      if (Number(counts.recent) >= 30 || Number(counts.total) >= 1000) throw new CliError('busy', 429);
      const device = randomBytes(32).toString('base64url');
      const userCode = randomBytes(6).toString('hex').toUpperCase().match(/.{4}/g)!.join('-');
      const expiresAt = new Date(time + LOGIN_TTL).toISOString();
      await client.query('INSERT INTO cli_login_transactions(device_hash,code_hash,created_at,expires_at) VALUES($1,$2,$3,$4)', [hash(device), hash(userCode), new Date(time), expiresAt]);
      return { device, userCode, expiresAt, interval: POLL_MS / 1000 };
    });
  }
  async context(web: WebCliIdentity) {
    sessionKey(web.session.issuer, web.session.sessionId, web.session.subject);
    if (web.identity.issuer !== web.session.issuer || web.identity.subject !== web.session.subject) throw new CliError('unauthorized', 401);
    const user = await resolveIdentity(this.pool, web.identity);
    return { user, workspaces: await new WorkspaceStore(this.pool).list(user) };
  }
  async bind(web: WebCliIdentity, input: { code: unknown; workspaceId: unknown; displayedUserId: unknown; action: unknown; scope?: unknown }) {
    const userCode = code(input.code), { user } = await this.context(web);
    if (input.displayedUserId !== user.id) throw new CliError('identity_changed', 409);
    if (input.action !== 'authorize' && input.action !== 'deny') throw new CliError('invalid_action');
    return transaction(this.pool, async client => {
      await parentActive(client, web.session.issuer, web.session.sessionId);
      const row = (await client.query('SELECT * FROM cli_login_transactions WHERE code_hash=$1 FOR UPDATE', [hash(userCode)])).rows[0];
      if (!row || row.expires_at.getTime() <= this.now() || row.state !== 'pending') throw new CliError('invalid_or_used_code', 409);
      if (input.action === 'deny') {
        await client.query("UPDATE cli_login_transactions SET state='denied' WHERE device_hash=$1", [row.device_hash]);
        return { state: 'denied' };
      }
      if (typeof input.workspaceId !== 'string') throw new CliError('select_workspace');
      const scope = input.scope ?? 'cli:session';
      if (scope !== 'cli:session' && scope !== 'cli:session server_check:create') throw new CliError('invalid_scope');
      const member = await requireWorkspaceMembership(client, user, input.workspaceId, scope === 'cli:session' ? false : 'cli:authorize-server-check');
      await client.query(`UPDATE cli_login_transactions SET state='authenticated',user_id=$2,workspace_id=$3,web_issuer=$4,web_session_id=$5,scope=$6,membership_generation=$7 WHERE device_hash=$1`, [row.device_hash, user.id, input.workspaceId, web.session.issuer, web.session.sessionId, scope, member.generation]);
      return { state: 'authenticated' };
    });
  }
  async poll(device: unknown) {
    const deviceHash = hash(secret(device));
    return transaction(this.pool, async client => {
      const row = (await client.query('SELECT * FROM cli_login_transactions WHERE device_hash=$1 FOR UPDATE', [deviceHash])).rows[0];
      const time = this.now();
      if (!row || row.expires_at.getTime() <= time) throw new CliError('expired', 410);
      if (row.state === 'redeemed') throw new CliError('already_redeemed', 409);
      if (row.state === 'denied') throw new CliError('denied', 403);
      if (row.last_poll_at && time - row.last_poll_at.getTime() < POLL_MS) throw new CliError('slow_down', 429);
      await client.query('UPDATE cli_login_transactions SET last_poll_at=$2 WHERE device_hash=$1', [deviceHash, new Date(time)]);
      if (row.state === 'pending') return { state: 'pending' as const };
      const status = await current(client, row);
      const credential = randomBytes(32).toString('base64url'), expiresAt = new Date(time + SESSION_TTL).toISOString();
      await client.query(`INSERT INTO cli_sessions(credential_hash,user_id,workspace_id,web_issuer,web_session_id,issued_at,expires_at,scope,membership_generation) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [hash(credential), row.user_id, row.workspace_id, row.web_issuer, row.web_session_id, new Date(time), expiresAt, row.scope, row.membership_generation]);
      await client.query("UPDATE cli_login_transactions SET state='redeemed' WHERE device_hash=$1", [deviceHash]);
      return { state: 'active' as const, credential, expiresAt, ...status };
    });
  }
  async status(credential: unknown) {
    return transaction(this.pool, async client => {
      const row = (await client.query('SELECT * FROM cli_sessions WHERE credential_hash=$1 FOR SHARE', [hash(secret(credential))])).rows[0];
      if (!row) throw new CliError('invalid_credential', 401);
      if (row.revoked_at) throw new CliError('revoked', 401);
      if (row.expires_at.getTime() <= this.now()) throw new CliError('expired', 401);
      return { state: 'active', expiresAt: row.expires_at.toISOString(), ...await current(client, row) };
    });
  }
  async withServerWork<T>(credential: unknown, action: (client: PoolClient, user: { id: string; displayName: null; membershipGeneration: number }, workspaceId: string) => Promise<T>): Promise<T> {
    return transaction(this.pool, async client => {
      const row = (await client.query('SELECT * FROM cli_sessions WHERE credential_hash=$1 FOR SHARE', [hash(secret(credential))])).rows[0];
      if (!row || row.revoked_at || row.expires_at.getTime() <= this.now()) throw new CliError('revoked', 401);
      if (row.scope !== 'cli:session server_check:create') throw new CliError('server_scope_required', 403);
      await parentActive(client, row.web_issuer, row.web_session_id);
      const user = { id: row.user_id, displayName: null, membershipGeneration: row.membership_generation };
      const member = await requireWorkspaceMembership(client, user, row.workspace_id, 'cli:authorize-server-check');
      if (member.generation !== row.membership_generation) throw new CliError('revoked', 401);
      return action(client, user, row.workspace_id);
    });
  }
  async logout(credential: unknown) {
    await this.pool.query('UPDATE cli_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE credential_hash=$1', [hash(secret(credential))]);
    return { state: 'signed_out' };
  }
}
