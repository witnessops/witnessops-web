import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { transaction } from './pool';
import { membershipLock } from './membership-lock';
import { requireWorkspaceMembership } from './workspaces';
import type { AppUser } from './identity';
import { ApiError, requireId } from '../errors';
import { invitationEmail } from '../invitation-email';
import { reportEmail, messageDigest } from '../share-email';
import type { RecipientReport } from '../share-projection';
import type { InvitationSender } from './members';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
type Access = {id:string; snapshot:RecipientReport; digest:string; token_hash:string; expires_at:Date; version:number; state:string};
async function access(client: PoolClient, workspace:string, id:unknown) {
 const row = (await client.query<Access>(`SELECT s.id,s.snapshot,s.digest,s.state,a.token_hash,a.expires_at,a.version FROM report_shares s JOIN report_share_access a ON a.share_id=s.id WHERE s.id=$1 AND s.workspace_id=$2 FOR UPDATE OF s,a`,[requireId(id),workspace])).rows[0];
 if (!row || row.state !== 'published') throw new ApiError(404,'Published share unavailable.');
 return row;
}
function version(value:unknown) {if (!Number.isSafeInteger(value) || Number(value)<1) throw new ApiError(400,'Refresh link settings.');return Number(value);}
function requireToken(row:Access, token:unknown): asserts token is string {
 if (typeof token!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(token) || hash(token)!==row.token_hash || row.expires_at.getTime()<=Date.now()) throw new ApiError(409,'Link changed or expired. Refresh its settings.');
}
export class ShareAccessStore {
 constructor(readonly pool:Pool) {}
 async change(user:AppUser, workspace:string, id:unknown, expected:unknown, expires:unknown, rotate:boolean) {
  const v=version(expected), until=typeof expires==='string' ? new Date(expires) : new Date(NaN);
  if (!Number.isFinite(until.getTime()) || until.getTime()<=Date.now() || until.getTime()>Date.now()+30*86400000) throw new ApiError(400,'Choose an expiry in the next 30 days.');
  return transaction(this.pool,async client=>{
   await membershipLock(client,workspace,true);await requireWorkspaceMembership(client,user,workspace,true);
   const row=await access(client,workspace,id);
   if(row.version!==v) throw new ApiError(409,'Link settings changed. Refresh before trying again.');
   const token=rotate ? randomBytes(32).toString('base64url') : undefined;
   await client.query('UPDATE report_share_access SET token_hash=$2,expires_at=$3,version=version+1 WHERE share_id=$1',[row.id,token?hash(token):row.token_hash,until]);
   return {id:row.id,token,expiresAt:until.toISOString(),version:v+1,digest:row.digest};
  });
 }
 async draft(user:AppUser, workspace:string, input:{id:unknown;token:unknown;email:unknown;requestId:unknown}, origin:string) {
  const recipient=invitationEmail(input.email), key=requireId(input.requestId);
  return transaction(this.pool,async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::uuid::text, 39819))',[user.id]);
   await membershipLock(client,workspace,true);const member=await requireWorkspaceMembership(client,user,workspace,true);
   const row=await access(client,workspace,input.id);requireToken(row,input.token);
   const message=reportEmail(origin,input.token,recipient,row.snapshot,row.expires_at,key), digest=messageDigest(message);
   const prior=(await client.query('SELECT * FROM report_share_deliveries WHERE id=$1',[key])).rows[0];
   if(prior) {
    if(prior.actor_id!==user.id || prior.workspace_id!==workspace || prior.share_id!==row.id || prior.membership_generation!==member.generation || prior.access_version!==row.version || prior.message_digest!==digest) throw new ApiError(409,'This email request was already used.');
   } else {
    await client.query("DELETE FROM report_share_deliveries WHERE workspace_id=$1 AND created_at<now()-interval '30 days'",[workspace]);
    const count=(await client.query("SELECT count(*) FILTER(WHERE actor_id=$1 AND created_at>now()-interval '1 hour') AS actor,count(*) FILTER(WHERE workspace_id=$2 AND created_at>now()-interval '1 hour') AS recent,count(*) FILTER(WHERE workspace_id=$2) AS retained FROM report_share_deliveries WHERE actor_id=$1 OR workspace_id=$2",[user.id,workspace])).rows[0];
    if(Number(count.actor)>=10 || Number(count.recent)>=10 || Number(count.retained)>=120) throw new ApiError(429,'Report email limit reached. Try later.');
    await client.query('INSERT INTO report_share_deliveries(id,share_id,workspace_id,actor_id,membership_generation,recipient,access_version,message_digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[key,row.id,workspace,user.id,member.generation,recipient,row.version,digest]);
   }
   return {id:key,message,digest,state:prior?.state??'draft'};
  });
 }
 async send(user:AppUser, workspace:string, input:{id:unknown;token:unknown;digest:unknown;confirmed:unknown}, origin:string, sender:InvitationSender) {
  if(input.confirmed!==true) throw new ApiError(400,'Review and confirm the recipient and email.');
  const id=requireId(input.id);
  const message=await transaction(this.pool,async client=>{
   await membershipLock(client,workspace,true);const member=await requireWorkspaceMembership(client,user,workspace,true);
   const draft=(await client.query('SELECT * FROM report_share_deliveries WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[id,workspace])).rows[0];
   if(!draft || draft.actor_id!==user.id || draft.membership_generation!==member.generation) throw new ApiError(404,'Email draft unavailable.');
   const row=await access(client,workspace,draft.share_id);requireToken(row,input.token);
   if(row.version!==draft.access_version) throw new ApiError(409,'Access settings changed. Review a new email.');
   const payload=reportEmail(origin,input.token,draft.recipient,row.snapshot,row.expires_at,id);
   if(input.digest!==draft.message_digest || messageDigest(payload)!==draft.message_digest) throw new ApiError(409,'Email changed. Review a new draft.');
   if(draft.state!=='draft') return null; // Never retry an uncertain provider call automatically.
   if(Date.now()-draft.created_at.getTime()>3600000) throw new ApiError(409,'Email preview expired. Prepare a new draft.');
   await client.query("UPDATE report_share_deliveries SET state='sending' WHERE id=$1",[id]);return payload;
  });
  if(message) {
   try {
    const result=await sender(message);
    await this.pool.query('UPDATE report_share_deliveries SET state=$2,provider=$3,provider_message_id=$4,provider_accepted_at=$5 WHERE id=$1',[id,result.provider==='file'?'file_saved':'accepted',result.provider,result.providerMessageId,result.providerAcceptedAt]);
   } catch {await this.pool.query("UPDATE report_share_deliveries SET state='unknown' WHERE id=$1",[id]);}
  }
  return {recorded:true};
 }
 async deliveries(user:AppUser,workspace:string,id:unknown) {
  return transaction(this.pool,async client=>{await requireWorkspaceMembership(client,user,workspace,true);
   return (await client.query(`SELECT id,recipient,CASE WHEN state='sending' THEN 'unknown' ELSE state END AS state,created_at AS "createdAt",provider,provider_accepted_at AS "providerAcceptedAt" FROM report_share_deliveries WHERE share_id=$1 AND workspace_id=$2 ORDER BY created_at DESC LIMIT 120`,[requireId(id),workspace])).rows;
  });
 }
}
