import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import type {Pool} from 'pg';
import {transaction} from './pool';
import {requireWorkspaceMembership} from './workspaces';
import {membershipLock} from './membership-lock';
import type {AppUser} from './identity';
import {ApiError,requireId} from '../errors';
import {hashSharePassword,checkSharePassword,passwordInput,PasswordChallenge} from '../share-password';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export class SharePasswordStore {
 constructor(readonly pool:Pool){}
 async set(user:AppUser,workspace:string,id:unknown,expected:unknown,password:unknown) {
  const share=requireId(id);passwordInput(password);
  if(!Number.isSafeInteger(expected)||Number(expected)<1)throw new ApiError(400,'Refresh share settings.');
  const authorize=async(client:import('pg').PoolClient)=>{
   await membershipLock(client,workspace,true);const member=await requireWorkspaceMembership(client,user,workspace,true);
   const row=(await client.query('SELECT s.state,s.created_by,s.membership_generation,a.version,a.expires_at FROM report_shares s JOIN report_share_access a ON a.share_id=s.id WHERE s.id=$1 AND s.workspace_id=$2 FOR UPDATE OF s,a',[share,workspace])).rows[0];
   if(!row||row.state==='revoked'||row.expires_at.getTime()<=Date.now())throw new ApiError(404,'Share unavailable.');
   if(row.version!==expected)throw new ApiError(409,'Share settings changed. Refresh before trying again.');
   if(row.state==='preview'&&(row.created_by!==user.id||row.membership_generation!==member.generation))throw new ApiError(403,'Preview ownership changed.');
   return {generation:member.generation,expiresAt:row.expires_at.toISOString()};
  };
  const before=await transaction(this.pool,authorize);
  const encoded=await hashSharePassword(password); // outside DB locks
  return transaction(this.pool,async client=>{
   const current=await authorize(client);if(current.generation!==before.generation)throw new ApiError(403,'Workspace access changed.');
   await client.query('UPDATE report_share_access SET password_hash=$2,version=version+1,password_attempts=0,password_window=now() WHERE share_id=$1',[share,encoded]);
   await client.query('DELETE FROM report_share_unlocks WHERE share_id=$1',[share]);
   return {passwordProtected:true,version:Number(expected)+1,expiresAt:current.expiresAt};
  });
 }
 async unlock(token:unknown,password:unknown,name?:string) {
  if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw new ApiError(404,'Shared report unavailable.');
  if(typeof password!=='string'||Buffer.byteLength(password,'utf8')>256||!password.length)throw new PasswordChallenge(401,'Password did not unlock this report.');
  const hashed=hash(token);
  const reserve=await transaction(this.pool,async client=>{
   const row=(await client.query(`SELECT a.*,s.state,w.status FROM report_share_access a JOIN report_shares s ON s.id=a.share_id JOIN workspaces w ON w.id=s.workspace_id WHERE a.token_hash=$1 AND ($2::text IS NULL OR EXISTS(SELECT 1 FROM report_share_names n WHERE n.share_id=s.id AND n.name=$2)) FOR UPDATE OF a`,[hashed,name??null])).rows[0];
   if(!row||row.state!=='published'||row.status!=='active'||row.expires_at.getTime()<=Date.now()||!row.password_hash)throw new ApiError(404,'Shared report unavailable.');
   const count=Date.now()-row.password_window.getTime()>=15*60000?0:row.password_attempts;
   if(count>=5)throw new PasswordChallenge(429,'Too many password attempts for this link. Try again after 15 minutes.');
   await client.query('UPDATE report_share_access SET password_attempts=$2,password_window=CASE WHEN $2=1 THEN now() ELSE password_window END WHERE share_id=$1',[row.share_id,count+1]);
   return row;
  });
  if(!await checkSharePassword(password,reserve.password_hash))throw new PasswordChallenge(401,'Password did not unlock this report.');
  return transaction(this.pool,async client=>{
   const current=(await client.query(`SELECT a.*,s.state,w.status FROM report_share_access a JOIN report_shares s ON s.id=a.share_id JOIN workspaces w ON w.id=s.workspace_id WHERE a.share_id=$1 FOR UPDATE OF a`,[reserve.share_id])).rows[0];
   if(!current||current.version!==reserve.version||current.token_hash!==hashed||current.state!=='published'||current.status!=='active'||current.expires_at.getTime()<=Date.now())throw new ApiError(404,'Shared report unavailable.');
   await client.query('DELETE FROM report_share_unlocks WHERE share_id=$1 AND (expires_at<=now() OR access_version<>$2)',[current.share_id,current.version]);
   if(Number((await client.query('SELECT count(*) FROM report_share_unlocks WHERE share_id=$1',[current.share_id])).rows[0].count)>=32)throw new PasswordChallenge(429,'Too many open sessions. Try later.');
   const unlock=randomBytes(32).toString('base64url'),expires=new Date(Math.min(Date.now()+30*60000,current.expires_at.getTime()));
   await client.query('INSERT INTO report_share_unlocks(token_hash,share_id,access_version,expires_at) VALUES($1,$2,$3,$4)',[hash(unlock),current.share_id,current.version,expires]);
   return {unlock,expiresAt:expires.toISOString()};
  });
 }
}
