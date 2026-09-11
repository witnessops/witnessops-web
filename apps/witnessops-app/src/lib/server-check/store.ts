import 'server-only';
import { randomUUID, createHash } from 'node:crypto';
import { isIP } from 'node:net';
import type { Pool } from 'pg';
import { CliAuthStore, CliError } from '../db/cli-auth';
import { LinuxCheckStore, sha256 } from '../db/linux-checks';
import { linuxHostname } from '../linux-hostname';
import { requireId } from '../errors';
import { canonicalSource } from '../source-digest';
import type { Finalizer } from './runtime';
const equal=(a:unknown,b:unknown)=>canonicalSource(a)===canonicalSource(b);
const clean=(x:unknown)=>typeof x==='string'&&x.length>0&&x.length<=256&&!/[\x00-\x1f\x7f]/.test(x);
export function checkRequest(value: unknown) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new CliError('invalid_request');
  const v=value as Record<string,unknown>;
  if(Object.keys(v).sort().join(',')!=='assetId,expectedListeners,hostname,purpose,requestId,sshExposure')throw new CliError('invalid_request');
  const hostname=linuxHostname(v.hostname); if(hostname!==v.hostname)throw new CliError('wrong_hostname');
  requireId(v.requestId as string);if(v.assetId!==null)requireId(v.assetId as string);
  if(!clean(v.purpose)||!['public','private','none'].includes(v.sshExposure as string)||!Array.isArray(v.expectedListeners)||v.expectedListeners.length>200)throw new CliError('invalid_authority');
  for(const item of v.expectedListeners){if(!item||Object.keys(item).sort().join(',')!=='address,port,transport'||!['tcp','udp'].includes(item.transport)||typeof item.address!=='string'||!isIP(item.address.split('%')[0])||!Number.isInteger(item.port)||item.port<1||item.port>65535)throw new CliError('invalid_listeners');}
  if(new Set(v.expectedListeners.map(x=>JSON.stringify(x))).size!==v.expectedListeners.length)throw new CliError('invalid_listeners');
  return v as {requestId:string;assetId:string|null;hostname:string;purpose:string;sshExposure:string;expectedListeners:{transport:string;address:string;port:number}[]};
}
export class ServerCheckStore {
 constructor(private pool:Pool,private finalizer:Finalizer,private now=Date.now){}
 async authenticate(credential:unknown){return this.auth().withServerOwner(credential,async()=>undefined);}
 private auth(){return new CliAuthStore(this.pool,this.now);}
 async context(credential:unknown){return this.auth().withServerOwner(credential,async(client,_user,workspace)=>{
  const fingerprint=await this.finalizer.preflight();
  return {workspace:(await client.query('SELECT name FROM workspaces WHERE id=$1',[workspace])).rows[0].name,workspaceId:workspace,collectorHash:fingerprint,assets:(await client.query("SELECT id,normalized_value AS hostname FROM assets WHERE workspace_id=$1 AND type='linux_server' ORDER BY created_at,id",[workspace])).rows};
 });}
 async authorize(credential:unknown,input:unknown){const request=checkRequest(input);return this.auth().withServerOwner(credential,async(client,user,workspace)=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[workspace]);
  const previous=(await client.query('SELECT * FROM server_check_executions WHERE workspace_id=$1 AND user_id=$2 AND request_id=$3',[workspace,user.id,request.requestId])).rows[0];
  if(previous){if(!equal(previous.request,request))throw new CliError('request_conflict',409);return this.view(previous);}
  const count=(await client.query('SELECT count(*) FROM server_check_executions WHERE workspace_id=$1',[workspace])).rows[0].count;
  if(Number(count)>=32)throw new CliError('execution_capacity',409);
  const fingerprint=await this.finalizer.preflight();
  let asset=(await client.query("SELECT id,normalized_value,type FROM assets WHERE workspace_id=$1 AND "+(request.assetId?'id=$2':'normalized_value=$2')+' FOR SHARE',[workspace,request.assetId??request.hostname])).rows[0];
  if(asset&&(asset.type!=='linux_server'||asset.normalized_value!==request.hostname))throw new CliError('wrong_hostname',409);
  if(!asset){if(request.assetId)throw new CliError('asset_not_found',404);if(Number((await client.query('SELECT count(*) FROM assets WHERE workspace_id=$1',[workspace])).rows[0].count)>=20)throw new CliError('asset_capacity',409);asset={id:randomUUID()};await client.query("INSERT INTO assets(id,workspace_id,type,normalized_value) VALUES($1,$2,'linux_server',$3)",[asset.id,workspace,request.hostname]);}
  const id=randomUUID(),time=Math.floor(this.now()/1000)*1000,start=new Date(time).toISOString().replace('.000Z','Z'),end=new Date(time+30*60_000).toISOString().replace('.000Z','Z');
  const customer=(await client.query('SELECT name FROM workspaces WHERE id=$1',[workspace])).rows[0].name;
  const declaration={customer,purpose:request.purpose,expected_ssh_exposure:request.sshExposure};
  const operator='operator-'+createHash('sha256').update(workspace+':'+user.id).digest('hex').slice(0,32);
  const authority={schema:'witnessops.local_server_audit.authority.v1',authorization_id:id,case_id:id,authority_source:{kind:'operator_declared_scope',authority_identity:operator,artifact_sha256:sha256(Buffer.from(canonicalSource(declaration))),approved_at_utc:start,operator_declaration:declaration},operator_id:operator,target:{asset_id:asset.id,allowed_hostnames:[request.hostname],expected_listeners:request.expectedListeners},profile_id:'linux_baseline_v1',authorization_window:{starts_at_utc:start,ends_at_utc:end},execution_mode:'operator_present_local',allowed_actions:['read_only_posture_collection'],prohibited_artifact_classes:['browser_cookies','clipboard','credentials','full_memory_dump','full_user_documents','oauth_tokens','password_manager_data','private_keys','process_command_lines','process_environment','screenshots']};
  const row=(await client.query('INSERT INTO server_check_executions(id,workspace_id,asset_id,user_id,request_id,request,authority,collector_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[id,workspace,asset.id,user.id,request.requestId,request,authority,fingerprint])).rows[0];return this.view(row);
 });}
 private view(row:{id:string;state:string;authority:unknown;collector_hash:string;capture_digest:string|null;run_id:string|null;failure:string|null}){return {id:row.id,state:row.state,authority:row.authority,collectorHash:row.collector_hash,captureDigest:row.capture_digest,runId:row.run_id,failure:row.failure};}
 async upload(credential:unknown,id:string,bytes:Buffer,digest:string){requireId(id);if(sha256(bytes)!==digest)throw new CliError('capture_digest_mismatch',422);return this.auth().withServerOwner(credential,async(client,user,workspace)=>{
  // Cross-process global work bound; do not queue unbounded validation/finalization jobs.
  if(!(await client.query('SELECT pg_try_advisory_xact_lock(941071,10) AS acquired')).rows[0].acquired)throw new CliError('busy',429);
  const row=(await client.query('SELECT * FROM server_check_executions WHERE id=$1 AND workspace_id=$2 AND user_id=$3 FOR UPDATE',[id,workspace,user.id])).rows[0];if(!row)throw new CliError('execution_not_found',404);
  if(row.capture_digest){if(row.capture_digest!==digest||!row.capture_bytes.equals(bytes))throw new CliError('capture_conflict',409);return this.view(row);}
  const metadata=await this.finalizer.validate(id,bytes);
  if(!equal(metadata.authority,row.authority)||metadata.hostname!==row.authority.target.allowed_hostnames[0]||metadata.collectorHash!==row.collector_hash)throw new CliError('capture_binding_failed',422);
  const size=(await client.query('SELECT coalesce(sum(octet_length(capture_bytes)),0) AS size FROM server_check_executions WHERE workspace_id=$1',[workspace])).rows[0].size;
  if(Number(size)+bytes.length>200*1024*1024)throw new CliError('execution_capacity',409);
  const saved=(await client.query("UPDATE server_check_executions SET state='uploaded',capture_bytes=$2,capture_digest=$3 WHERE id=$1 RETURNING *",[id,bytes,digest])).rows[0];return this.view(saved);
 });}
 async status(credential:unknown,id:string){requireId(id);return this.auth().withServerOwner(credential,async(client,user,workspace)=>{
  if(!(await client.query('SELECT pg_try_advisory_xact_lock(941071,10) AS acquired')).rows[0].acquired)throw new CliError('busy',429);
  const row=(await client.query('SELECT * FROM server_check_executions WHERE id=$1 AND workspace_id=$2 AND user_id=$3 FOR UPDATE',[id,workspace,user.id])).rows[0];if(!row)throw new CliError('execution_not_found',404);
  if(row.state==='run_created'){const source=(await client.query('SELECT metadata FROM linux_check_sources WHERE run_id=$1 AND workspace_id=$2',[row.run_id,workspace])).rows[0];return {...this.view(row),outcome:source?.metadata.outcome};}
  if(row.state!=='uploaded')return this.view(row);
  // Same transaction as normal Linux admission: a crash cannot commit a run without its execution link.
  const pack=await this.finalizer.finalize(id,row.capture_bytes);
  const run=await new LinuxCheckStore(this.pool).importWithin(client,user,workspace,row.asset_id,pack.zip,pack.signature,pack.zipName);
  const saved=(await client.query("UPDATE server_check_executions SET state='run_created',run_id=$2 WHERE id=$1 RETURNING *",[id,run.id])).rows[0];return {...this.view(saved),outcome:run.outcome};
 });}
}
