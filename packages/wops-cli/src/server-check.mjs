import {hostname} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {isIP} from 'node:net';
import {createInterface} from 'node:readline/promises';
import {unlink} from 'node:fs/promises';
import path from 'node:path';
import * as local from './server-local.mjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const safe=value=>String(value??'').replace(/[\x00-\x1f\x7f-\x9f]/g,'').slice(0,256);
export function listeners(input){if(input==='none')return [];const items=input.split(',').map(x=>{const m=/^(tcp|udp):\/\/(?:\[([^\]]+)\]|([^:]+)):(\d+)$/.exec(x.trim());if(!m||!isIP(m[2]??m[3])||Number(m[4])<1||Number(m[4])>65535)throw new Error('Use exact tcp://address:port or udp://[IPv6]:port endpoints, separated by commas; or none.');return {transport:m[1],address:m[2]??m[3],port:Number(m[4])};});if(items.length>200||new Set(items.map(x=>JSON.stringify(x))).size!==items.length)throw new Error('Listener policy is duplicated or too large.');return items;}
export function fixedWindow(args){
 if(args.length===2)return undefined;
 if(args.length!==6||args[2]!=='--starts-at'||args[4]!=='--ends-at')throw new Error('Use paired --starts-at and --ends-at UTC timestamps. No remote, runtime, profile or signer overrides are supported.');
 const valid=x=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().replace('.000Z','Z')===x;
 if(!valid(args[3])||!valid(args[5])||Date.parse(args[5])<=Date.parse(args[3])||Date.parse(args[5])-Date.parse(args[3])>30*60_000)throw new Error('Use a valid UTC window of at most 30 minutes.');
 return {starts_at_utc:args[3],ends_at_utc:args[5]};
}
export async function serverCheck(args,options={}){
 if(args[0]!=='server'||args[1]!=='check')throw new Error('Use sudo wops server check. No remote, runtime, profile or signer overrides are supported.');
 const window=fixedWindow(args);
 const io=options.local??local,output=options.output??console.log,uid=io.originatingUid();
 let auth;try{auth=await io.readOriginAuth(uid);}catch{throw new Error('No safe originating-user session. Run wops auth login as your normal account using the default config directory.');}
 const fetcher=options.fetch??fetch;
 const request=async(endpoint,{body,id,hash}={})=>{
  try{const response=await fetcher(auth.server+'/api/cli/'+endpoint,{method:body===undefined?'GET':'POST',redirect:'error',signal:AbortSignal.timeout(150_000),headers:{Origin:auth.server,Authorization:'Bearer '+auth.credential,...(body===undefined?{}:{'Content-Type':'application/json'}),...(id?{'X-WitnessOps-Execution':id}:{}),...(hash?{'X-WitnessOps-Capture-SHA256':hash}:{})},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});const reader=response.body?.getReader();if(!reader)throw new Error();let size=0;const chunks=[];try{for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>65536)throw new Error();chunks.push(p.value);}}finally{await reader.cancel();}const data=JSON.parse(Buffer.concat(chunks).toString());if(!response.ok){const messages={window_inactive:'Run this command inside the approved collection window; no execution was created.',invalid_window:'Run with a valid approved UTC window of at most 30 minutes.',server_scope_required:'Run wops auth logout, then wops auth login and explicitly authorize server checks.',access_denied:'This action requires current Workspace Owner access.',wrong_hostname:'Observed hostname does not match the selected Linux asset.',finalization_failed:'Capture was received, but issuance requires operator review. No accepted run is claimed.',invalid_capture:'Capture was rejected. No Proofpack was issued.',capture_binding_failed:'Capture does not match its approved execution. No Proofpack was issued.'};const e=new Error(response.status===401?'Session unavailable. Run wops auth login as your normal account.':messages[data.code]??'Server check unavailable. Retained capture can be reconciled by retrying this command.');e.busy=response.status===429&&data.code==='busy';throw e;}return data;}catch(e){if(e.busy||e.message?.startsWith('Run ')||e.message?.startsWith('Capture ')||e.message?.startsWith('Session ')||e.message?.startsWith('Observed ')||e.message?.startsWith('This action')||e.message?.startsWith('Server check unavailable'))throw e;throw new Error('Connection interrupted. Capture remains local. Retry this command to reconcile; do not recollect manually.');}
 };
 const context=await request('server-checks'),host=options.hostname??hostname();
 const fingerprint=await io.trustedRuntime();if(context.collectorHash!==fingerprint)throw new Error('Local Audit runtime identity differs from the approved server runtime.');
 if(!/^[a-f0-9-]{36}$/.test(context.workspaceId))throw new Error('Invalid workspace response.');
 await io.privateDirectory(local.ROOT+'/staging');await io.privateDirectory(local.ROOT+'/staging/wops');
 const base=local.ROOT+'/staging/wops/'+digest(Buffer.from(uid+':'+auth.server+':'+context.workspaceId+':'+host));await io.privateDirectory(base);
 return io.lock(base,async()=>{
  const journal=path.join(base,'pending.json');let saved=await io.privateRead(journal,65536);let state=saved?JSON.parse(saved):null;
  if(!state){
   const candidates=context.assets.filter(x=>x.hostname===host);if(candidates.length>1)throw new Error('Multiple matching assets. Resolve the asset selection in WitnessOps before running this check.');
   output(`WitnessOps One Server Security Check\nServer: ${safe(host)}\nWorkspace: ${safe(context.workspace)}\nCollects read-only local state and uploads it for off-host signing. No permanent agent, patches or configuration changes.`);
   if(window)output(`Approved collection window: ${window.starts_at_utc} to ${window.ends_at_utc} (UTC)`);
   const rl=options.ask?null:createInterface({input:process.stdin,output:process.stdout});const ask=options.ask??(question=>rl.question(question));
   try{const purpose=await ask('Reason for this authorized check: '),sshExposure=await ask('Intended SSH exposure (public/private/none): '),expectedListeners=listeners(await ask('Intended listener endpoints (tcp://IP:port, udp://[IPv6]:port), or none: '));
    if(!purpose||purpose.length>256||!['public','private','none'].includes(sshExposure))throw new Error('Provide a reason and explicit SSH policy.');
    if((await ask('I control this server and authorize one read-only check within the displayed window, or a new 30-minute window if none was supplied, including capture upload. Proceed? [y/N] ')).toLowerCase()!=='y'){output('Cancelled. No collection.');return 0;}
    state={request:{requestId:randomUUID(),assetId:candidates[0]?.id??null,hostname:host,purpose,sshExposure,expectedListeners,...(window?{window}:{})}};await io.privateWrite(journal,JSON.stringify(state));
   }finally{rl?.close();}
  }
  if(window&&JSON.stringify(state.request.window)!==JSON.stringify(window))throw new Error('Approved window differs from retained request. No collection or upload.');
  if(state.request.hostname!==host)throw new Error('Observed hostname does not match the selected Linux asset.');
  const execution=await request('server-checks',{body:state.request});
  if(!/^[a-f0-9-]{36}$/.test(execution.id)||execution.authority?.target?.allowed_hostnames?.[0]!==host||execution.collectorHash!==fingerprint)throw new Error('Execution authority does not match this host/runtime.');
  if(state.request.window&&(execution.authority?.authorization_window?.starts_at_utc!==state.request.window.starts_at_utc||execution.authority?.authorization_window?.ends_at_utc!==state.request.window.ends_at_utc))throw new Error('Returned authority window differs from the approved window. No collection or upload.');
  let status=execution.state==='run_created'?await request('server-checks',{id:execution.id}):execution;const dir=path.join(base,execution.id);await io.privateDirectory(dir);const file=path.join(dir,'capture.json');
  if(status.state==='authorized'){
   let bytes=await io.privateRead(file);
   if(!bytes){if(state.captureStarted)throw new Error('Previous collection was interrupted. Ask the operator to review retained files before authorizing another capture.');
    const now=Date.now();if(now<Date.parse(execution.authority.authorization_window.starts_at_utc)||now>=Date.parse(execution.authority.authorization_window.ends_at_utc))throw new Error('Collection window expired. Ask the operator to review this uncollected request before authorizing a new one.');
    state.captureStarted=true;await io.privateWrite(journal,JSON.stringify(state));output('Collecting…');await io.capture(execution.authority,dir);bytes=await io.privateRead(file);if(!bytes)throw new Error('Collection did not produce a frozen capture.');}
   const capture=JSON.parse(bytes.toString('utf8'));if(capture.hostname!==host||capture.mode!=='live_approved'||capture.observations?.synthetic!==false||capture.collector_hash!==fingerprint)throw new Error('Capture identity/classification mismatch. No upload performed.');
   const hash=digest(bytes);if(state.captureDigest&&state.captureDigest!==hash)throw new Error('Capture correspondence changed. No upload performed.');state.captureDigest=hash;await io.privateWrite(journal,JSON.stringify(state));output('✓ Capture complete');status=await request('server-check-capture',{body:bytes,id:execution.id,hash});output('✓ Uploaded');
  }
  for(let attempt=0;status.state==='uploaded'&&attempt<4;attempt++){try{status=await request('server-checks',{id:execution.id});}catch(e){if(!e.busy)throw e;await(options.sleep??(ms=>new Promise(r=>setTimeout(r,ms))))(5000);}}
  if(status.state!=='run_created'||!/^[a-f0-9-]{36}$/.test(status.runId))throw new Error('Check is not yet accepted. Retry this command to reconcile the retained capture.');
  if(status.outcome==='partial')output('Result: Partial. Some evidence could not be determined.');
  else if(status.outcome)output('Collection outcome: '+safe(status.outcome)+'. Package verification does not establish server security.');
  output(`✓ Proofpack finalized\n✓ Verification valid\n✓ Run saved\nView: ${auth.server}/runs/${status.runId}`);
  await(options.remove??unlink)(journal);return 0;
 });
}
