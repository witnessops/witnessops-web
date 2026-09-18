import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { transaction } from './pool';
import { requireActiveAccount } from './access';
import { requireWorkspaceMembership } from './workspaces';
import { membershipLock } from './membership-lock';
import { acceptedWorkspacePlan } from './plan-admission';
import type { AppUser } from './identity';
import { ApiError, requireId } from '../errors';
import { isWorkspaceRole, type WorkspaceRole } from '../workspace-role-policy';
import { invitationEmail } from '../invitation-email';
import type { TextEmailPayload, TextEmailDeliveryResult } from '../../../../witnessops-web/src/lib/server/send-verification-email';

type Invitation = { id: string; workspace_id: string; recipient: string; role: WorkspaceRole; inviter_id: string; request_id: string; revision: number; expires_at: Date; state: string; accepted_user: string | null; accepted_generation: number | null; delivery_state: string; delivery_started_at: Date | null; replaces: string | null };
export type InvitationSender = (payload: TextEmailPayload) => Promise<TextEmailDeliveryResult>;
function role(value: unknown) { if (!isWorkspaceRole(value)) throw new ApiError(400, 'Choose Owner, Contributor or Viewer.'); return value; }
const notFound = () => new ApiError(404, 'This invitation is unavailable for this account.');
async function expire(client: PoolClient, workspace: string) { await client.query("UPDATE workspace_invitations SET state='expired',closed_at=now() WHERE workspace_id=$1 AND state='pending' AND expires_at<=now()", [workspace]); }
async function capacity(client: PoolClient, workspace: string, extra: number) {
  await expire(client, workspace);
  const plan = await acceptedWorkspacePlan(client, workspace);
  const limit = plan?.kind === 'historical' ? Math.min(10, plan.policy.limits.seats) : 10;
  const row = (await client.query("SELECT (SELECT count(*) FROM memberships WHERE workspace_id=$1 AND status='active' AND revoked_at IS NULL)+(SELECT count(*) FROM workspace_invitations WHERE workspace_id=$1 AND state='pending' AND expires_at>now()) AS occupied", [workspace])).rows[0];
  if (Number(row.occupied) + extra > limit) throw new ApiError(409, `This workspace has reached its ${limit}-place invitation limit.`);
}
export class MembersStore {
  constructor(readonly pool: Pool) {}
  async list(user: AppUser, workspace: string) {
    return transaction(this.pool, async client => {
      const actor = await requireWorkspaceMembership(client, user, workspace);
      const members = (await client.query('SELECT m.user_id AS id,u.display_name AS "displayName",m.role,m.generation FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=$1 AND m.status=\'active\' AND m.revoked_at IS NULL ORDER BY m.joined_at,m.user_id', [workspace])).rows;
      const invitations = actor.role === 'owner' ? (await client.query(`SELECT id,recipient,role,revision,provider,expires_at AS "expiresAt",CASE WHEN state='pending' AND expires_at<=now() THEN 'expired' ELSE state END AS state,CASE WHEN delivery_state='sending' THEN 'unknown' ELSE delivery_state END AS "deliveryState" FROM workspace_invitations WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100`, [workspace])).rows : [];
      return { members, invitations, role: actor.role };
    });
  }
  async invite(user: AppUser, workspace: string, input: { email: unknown; role: unknown; requestId: unknown; replaces?: unknown }) {
    const recipient = invitationEmail(input.email), selectedRole = role(input.role), key = requireId(input.requestId);
    const replaces = input.replaces === undefined || input.replaces === null ? null : requireId(input.replaces);
    return transaction(this.pool, async client => {
      // Per-sender bound serializes sends across workspaces/processes as well.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::uuid::text, 39116))', [user.id]);
      await membershipLock(client, workspace, true);
      await requireWorkspaceMembership(client, user, workspace, 'invitations:manage');
      const prior = (await client.query<Invitation>('SELECT * FROM workspace_invitations WHERE workspace_id=$1 AND inviter_id=$2 AND request_id=$3', [workspace,user.id,key])).rows[0];
      if (prior) { if (prior.recipient !== recipient || prior.role !== selectedRole || prior.replaces !== replaces) throw new ApiError(409, 'This invitation request was already used.'); return prior.id; }
      await expire(client, workspace);
      const existing = await client.query("SELECT 1 FROM memberships m JOIN identity_mappings i ON i.user_id=m.user_id WHERE m.workspace_id=$1 AND m.status='active' AND m.revoked_at IS NULL AND i.verified_email_snapshot=$2", [workspace,recipient]);
      if (existing.rowCount) throw new ApiError(409, 'This person is already a member. Use Change role.');
      const sends = (await client.query("SELECT count(*) FILTER (WHERE inviter_id=$1) AS actor,count(*) FILTER (WHERE workspace_id=$2) AS workspace FROM workspace_invitations WHERE created_at>now()-interval '1 hour'", [user.id,workspace])).rows[0];
      if (Number(sends.actor)>=10 || Number(sends.workspace)>=10) throw new ApiError(429, 'Invitation limit reached. Try again in an hour.');
      let revision = 1;
      if (replaces) {
        const old = (await client.query<Invitation>('SELECT * FROM workspace_invitations WHERE id=$1 AND workspace_id=$2 FOR UPDATE', [replaces,workspace])).rows[0];
        if (!old || !['pending','expired'].includes(old.state) || old.recipient !== recipient || old.role !== selectedRole) throw new ApiError(409, 'Refresh the invitation before resending.');
        revision = old.revision + 1;
        await client.query("UPDATE workspace_invitations SET state='superseded',closed_at=now() WHERE id=$1", [replaces]);
      }
      if ((await client.query("SELECT 1 FROM workspace_invitations WHERE workspace_id=$1 AND recipient=$2 AND state='pending'", [workspace,recipient])).rowCount) throw new ApiError(409, 'A pending invitation already exists. Use Resend or Cancel.');
      await capacity(client, workspace, 1);
      const id=randomUUID();
      await client.query('INSERT INTO workspace_invitations(id,workspace_id,recipient,role,inviter_id,request_id,revision,replaces) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id,workspace,recipient,selectedRole,user.id,key,revision,replaces]);
      return id;
    });
  }
  async deliver(user: AppUser, workspace: string, id: string, origin: string, send: InvitationSender) {
    const row = await transaction(this.pool, async client => {
      await membershipLock(client, workspace, true);
      await requireWorkspaceMembership(client, user, workspace, 'invitations:manage');
      return (await client.query<Invitation>("UPDATE workspace_invitations SET delivery_state='sending',delivery_started_at=now() WHERE id=$1 AND workspace_id=$2 AND state='pending' AND expires_at>now() AND delivery_state='not_sent' RETURNING *", [requireId(id),workspace])).rows[0];
    });
    if (!row) return; // Retry never sends twice. Unknown outcomes require explicit resend.
    try {
      const result = await send({ from: 'WitnessOps <invitations@send.witnessops.com>', replyTo: 'engage@mail.witnessops.com', to: row.recipient, subject: 'WitnessOps workspace invitation', text: `You have been invited to a WitnessOps workspace as ${row.role}. Sign in with this email address to preview and explicitly accept. Joining does not authorize a check or create a payment obligation.\n\n${origin}/invitations/${row.id}\n\nThis invitation expires after seven days. If unexpected, ignore it.`, signatureProfile: 'none', deliveryAttemptId: row.id });
      await this.pool.query("UPDATE workspace_invitations SET delivery_state='accepted',provider=$2,provider_message_id=$3,provider_accepted_at=$4 WHERE id=$1", [id,result.provider,result.providerMessageId,result.providerAcceptedAt]);
    } catch { await this.pool.query("UPDATE workspace_invitations SET delivery_state='unknown' WHERE id=$1", [id]); }
  }
  async cancel(user: AppUser, workspace: string, id: unknown) {
    return transaction(this.pool, async client => {
      await membershipLock(client, workspace, true);
      await requireWorkspaceMembership(client,user,workspace,'invitations:manage');
      const result = await client.query("UPDATE workspace_invitations SET state='cancelled',closed_at=now() WHERE id=$1 AND workspace_id=$2 AND state IN ('pending','expired','cancelled')", [requireId(id),workspace]);
      if (!result.rowCount) throw new ApiError(409,'Invitation cannot be cancelled.');
    });
  }
  async preview(user: AppUser, email: string | null, id: unknown) {
    return this.acceptOrPreview(user,email,id);
  }
  async accept(user: AppUser, email: string | null, id: unknown, revision: unknown, selectedRole: unknown) {
    if (!Number.isSafeInteger(revision) || Number(revision)<1) throw new ApiError(400,'Refresh invitation.');
    return this.acceptOrPreview(user,email,id,{revision:Number(revision),role:role(selectedRole)});
  }
  private async acceptOrPreview(user: AppUser, email: string | null, id: unknown, choice?: {revision:number;role:WorkspaceRole}) {
    if (!email) throw new ApiError(403,'Sign in with the verified invited email.');
    const recipient = invitationEmail(email), inviteId=requireId(id);
    return transaction(this.pool, async client => {
      const locator=(await client.query<{workspace_id:string}>('SELECT workspace_id FROM workspace_invitations WHERE id=$1 AND recipient=$2',[inviteId,recipient])).rows[0];
      if (!locator) throw notFound();
      await membershipLock(client,locator.workspace_id,Boolean(choice));
      await requireActiveAccount(client,user,true);
      const row=(await client.query<Invitation>('SELECT * FROM workspace_invitations WHERE id=$1 AND recipient=$2',[inviteId,recipient])).rows[0];
      if (!row || !['pending','accepted'].includes(row.state)) throw notFound();
      const workspace=(await client.query<{name:string}>("SELECT name FROM workspaces WHERE id=$1 AND status='active' FOR SHARE",[row.workspace_id])).rows[0];
      if (!workspace) throw notFound();
      const membership=(await client.query<{role:WorkspaceRole;generation:number}>("SELECT role,generation FROM memberships WHERE user_id=$1 AND workspace_id=$2 AND status='active' AND revoked_at IS NULL",[user.id,row.workspace_id])).rows[0];
      if (choice && (choice.revision!==row.revision || choice.role!==row.role)) throw new ApiError(409,'Invitation changed. Preview it again.');
      if (row.state==='accepted') {
        if(row.accepted_user!==user.id || !membership || membership.generation!==row.accepted_generation) throw notFound();
        return {id:row.id,workspaceId:row.workspace_id,workspaceName:workspace.name,role:membership.role,revision:row.revision,state:'accepted',expiresAt:row.expires_at.toISOString()};
      }
      if (row.expires_at.getTime()<=Date.now()) throw notFound();
      try { await requireWorkspaceMembership(client,{id:row.inviter_id,displayName:null},row.workspace_id,'invitations:manage'); } catch { throw notFound(); }
      const inviter=(await client.query<{display_name:string|null}>('SELECT display_name FROM users WHERE id=$1',[row.inviter_id])).rows[0];
      if (choice) {
        if(membership) throw new ApiError(409,'Already a member. An Owner must change your role.');
        await capacity(client,row.workspace_id,0); // Pending reservation becomes one membership.
        const joined=(await client.query<{generation:number}>("INSERT INTO memberships(user_id,workspace_id,role) VALUES($1,$2,$3) ON CONFLICT(user_id,workspace_id) DO UPDATE SET role=EXCLUDED.role,status='active',revoked_at=NULL,joined_at=now(),generation=memberships.generation+1 RETURNING generation",[user.id,row.workspace_id,row.role])).rows[0];
        await client.query("UPDATE workspace_invitations SET state='accepted',accepted_user=$2,accepted_generation=$3,accepted_at=now() WHERE id=$1",[row.id,user.id,joined.generation]);
      }
      return {id:row.id,workspaceId:row.workspace_id,workspaceName:workspace.name,inviter:inviter.display_name||'Workspace Owner',role:row.role,revision:row.revision,state:choice?'accepted':'pending',expiresAt:row.expires_at.toISOString()};
    });
  }
  async change(user: AppUser, workspace: string, target: unknown, next: unknown, generation: unknown) {
    const userId=requireId(target), nextRole=next===null?null:role(next);
    return transaction(this.pool,async client=>{
      await membershipLock(client,workspace,true);
      await requireWorkspaceMembership(client,user,workspace,'members:manage');
      const member=(await client.query<{role:WorkspaceRole;generation:number}>("SELECT role,generation FROM memberships WHERE workspace_id=$1 AND user_id=$2 AND status='active' AND revoked_at IS NULL FOR UPDATE",[workspace,userId])).rows[0];
      if(!member || member.generation!==generation) throw new ApiError(409,'Membership changed. Refresh the member list.');
      if(member.role==='owner' && nextRole!=='owner') {
        const others=await client.query("SELECT 1 FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=$1 AND m.user_id<>$2 AND m.role='owner' AND m.status='active' AND m.revoked_at IS NULL AND u.status='active' AND u.early_access_state IS DISTINCT FROM 'paused' AND NOT(u.early_access_state IS NULL AND u.early_access_activated_at IS NOT NULL) FOR SHARE OF u",[workspace,userId]);
        if(!others.rowCount) throw new ApiError(409,'Keep at least one active Owner.');
      }
      if(nextRole===member.role) return;
      await client.query("UPDATE memberships SET role=coalesce($3,role),status=CASE WHEN $3::text IS NULL THEN 'revoked' ELSE 'active' END,revoked_at=CASE WHEN $3::text IS NULL THEN now() ELSE NULL END,generation=generation+1 WHERE workspace_id=$1 AND user_id=$2",[workspace,userId,nextRole]);
    });
  }
}
