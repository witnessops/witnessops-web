import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,readFile,lstat,rm,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {archiveRetiredExecution,originatingUid} from './server-local.mjs';
import {serverCheck,retireServerCheck,listeners,fixedWindow} from './server-check.mjs';
const uuid='11111111-1111-4111-8111-111111111111',run='22222222-2222-4222-8222-222222222222',hash='a'.repeat(64);
test('sudo requires Linux UID0 and numeric originating UID; HOME is not authority',()=>{
 assert.equal(originatingUid({platform:'linux',uid:0,sudoUid:'1000'}),1000);
 for(const options of [{platform:'darwin',uid:0,sudoUid:'1000'},{platform:'linux',uid:1000,sudoUid:'1000'},{platform:'linux',uid:0,sudoUid:'0'},{platform:'linux',uid:0,sudoUid:'../1000'}])assert.throws(()=>originatingUid(options));
});
test('explicit listener policy preserves TCP/UDP and rejects inferred/arbitrary endpoints',()=>{
 assert.deepEqual(listeners('none'),[]);assert.deepEqual(listeners('tcp://127.0.0.1:22, udp://[::1]:53'),[{transport:'tcp',address:'127.0.0.1',port:22},{transport:'udp',address:'::1',port:53}]);
 for(const input of ['22','tcp://example.com:22','tcp://127.0.0.1:99999','tcp://127.0.0.1:22,tcp://127.0.0.1:22'])assert.throws(()=>listeners(input));
});
function harness(){const files=new Map(),output=[];let captures=0,uploads=0,finalizes=0,failUpload=false,failFinalize=false,cancel=false;
 const authority={operator_id:'operator-test',target:{allowed_hostnames:['demo-host']},authorization_window:{starts_at_utc:new Date(Date.now()-1000).toISOString(),ends_at_utc:new Date(Date.now()+60000).toISOString()}};
 let state='authorized';const execution=()=>({id:uuid,state,authority,collectorHash:hash,runId:state==='run_created'?run:null});
 const options={hostname:'demo-host',output:x=>output.push(x),sleep:async()=>{},remove:async file=>files.delete(file),ask:async question=>question.startsWith('Reason')?'Test':question.startsWith('Intended SSH')?'private':question.startsWith('Intended listener')?'none':cancel?'n':'y',local:{originatingUid:()=>1000,readOriginAuth:async()=>({server:'https://app.example.test',credential:'s'.repeat(43)}),trustedRuntime:async()=>hash,privateDirectory:async()=>{},privateRead:async f=>files.get(f)??null,privateWrite:async(f,b)=>files.set(f,Buffer.from(b)),privateEntries:async()=>[],findRetirementReceipt:async()=>null,archiveRetiredExecution:async()=>{},lock:async(_d,fn)=>fn(),capture:async(_a,dir)=>{captures++;files.set(dir+'/capture.json',Buffer.from(JSON.stringify({hostname:'demo-host',mode:'live_approved',collector_hash:hash,observations:{synthetic:false}})));}},fetch:async(url,request)=>{
  if(url.endsWith('/server-check-capture')){uploads++;state='uploaded';if(failUpload){failUpload=false;throw new Error('network');}return Response.json(execution());}
  if(request.headers['X-WitnessOps-Execution']){finalizes++;if(failFinalize){failFinalize=false;throw new Error('network');}state='run_created';return Response.json(execution());}
  if(request.method==='POST')return Response.json(execution());
  return Response.json({workspace:'Test',workspaceId:uuid,collectorHash:hash,assets:[]});
 }};
 return {options,output,files,counts:()=>({captures,uploads,finalizes}),failUpload:()=>failUpload=true,failFinalize:()=>failFinalize=true,cancel:()=>cancel=true};}
function retirementHarness(initialState='authorized'){
 const files=new Map(),output=[],events=[],id='33333333-3333-4333-8333-333333333333',requestId='44444444-4444-4444-8444-444444444444',userId='55555555-5555-4555-8555-555555555555',workspaceId=uuid,host='demo-host',reason='Founder rehearsal',server='https://app.example.test';
 const base='/opt/witnessops/local-audit-1.2.2/staging/wops/'+createHash('sha256').update(`1000:${server}:${workspaceId}:${host}`).digest('hex');
 const pending=Buffer.from(JSON.stringify({request:{requestId,assetId:null,hostname:host,purpose:reason,sshExposure:'none',expectedListeners:[]},captureStarted:true}));
 // A first check can be requested before an asset exists. The service creates
 // one during authorization and records its generated ID in the authority.
 const authority={authorization_id:id,target:{asset_id:'66666666-6666-4666-8666-666666666666',allowed_hostnames:[host],expected_listeners:[]},authority_source:{operator_declaration:{customer:'Test Workspace',purpose:reason,expected_ssh_exposure:'none'}}};
 files.set(base+'/pending.json',pending);files.set(base+'/'+id+'/authority.json',Buffer.from(JSON.stringify(authority)));
 let serverState=initialState,captures=0,uploads=0,authorizeRequests=[];const retiredAt='2026-09-29T00:00:00.000Z';
 const execution=()=>({id,state:serverState,requestId,authority,captureDigest:['uploaded','run_created'].includes(serverState)?hash:null,runId:serverState==='run_created'?run:null,retiredAt:serverState==='retired'?retiredAt:null,retiredBy:serverState==='retired'?userId:null});
 const local={originatingUid:()=>1000,readOriginAuth:async()=>({server,credential:'s'.repeat(43)}),privateRead:async file=>files.get(file)??null,privateEntries:async()=>[{name:'pending.json',type:'file'},{name:id,type:'directory'}],privateDirectory:async()=>{},privateWrite:async(file,bytes)=>files.set(file,Buffer.from(bytes)),findRetirementReceipt:async()=>null,archiveRetiredExecution:async(_base,executionId,receipt)=>{assert.equal(executionId,id);assert.equal(receipt.state,'retired');const originalPending=files.get(base+'/pending.json'),originalAuthority=files.get(base+'/'+id+'/authority.json');events.push('archive');files.set(base+'/retired/'+id+'/pending.json',Buffer.from(originalPending));files.set(base+'/retired/'+id+'/'+id+'/authority.json',Buffer.from(originalAuthority));files.delete(base+'/pending.json');files.delete(base+'/'+id+'/authority.json');},lock:async(_dir,action)=>action(),trustedRuntime:async()=>hash,remove:async file=>files.delete(file),capture:async(_authority,dir)=>{captures++;files.set(dir+'/capture.json',Buffer.from(JSON.stringify({hostname:host,mode:'live_approved',collector_hash:hash,observations:{synthetic:false}})));}};
 const fetch=async(url,init={})=>{
  const parsed=new URL(url),path=parsed.pathname,method=init.method??'GET';events.push(method+':'+path);
  if(path.endsWith('/server-check-retirement')){
   if(method==='GET'&&!parsed.search)return Response.json({workspace:'Test Workspace',workspaceId});
   if(method==='GET')return Response.json(execution());
   if(method==='POST'){serverState='retired';return Response.json(execution());}
  }
  if(path.endsWith('/server-checks')&&method==='GET'&&!init.headers?.['X-WitnessOps-Execution'])return Response.json({workspace:'Test Workspace',workspaceId,collectorHash:hash,assets:[]});
  if(path.endsWith('/server-checks')&&method==='POST'){const input=JSON.parse(init.body);authorizeRequests.push(input);serverState='authorized';return Response.json({id:run,state:'authorized',authority:{operator_id:'operator-test',target:{allowed_hostnames:[host]},authorization_window:{starts_at_utc:new Date(Date.now()-1000).toISOString(),ends_at_utc:new Date(Date.now()+60_000).toISOString()}},collectorHash:hash,runId:null});}
  if(path.endsWith('/server-check-capture')){uploads++;serverState='uploaded';return Response.json({id:run,state:'uploaded',authority:{},collectorHash:hash,runId:null});}
  if(path.endsWith('/server-checks')&&init.headers?.['X-WitnessOps-Execution'])return Response.json({id:run,state:'run_created',authority:{},collectorHash:hash,runId:run,outcome:'pass'});
  throw new Error('Unexpected fixture request: '+path);
 };
 const options={hostname:host,output:value=>output.push(value),fetch,local,remove:async file=>files.delete(file),ask:async question=>question.startsWith('Retire this')?'y':question.startsWith('Reason')?'Fresh request after retirement':question.startsWith('Intended SSH')?'none':question.startsWith('Intended listener')?'none':'y',sleep:async()=>{}};
 return {options,files,output,events,id,requestId,base,pending,counts:()=>({captures,uploads}),authorizeRequests:()=>authorizeRequests,serverState:()=>serverState};
}
test('retirement reads status, confirms exact target, archives identical evidence, and never collects',async()=>{
 const h=retirementHarness(),pendingHash=createHash('sha256').update(h.pending).digest('hex'),authorityBefore=h.files.get(h.base+'/'+h.id+'/authority.json');
 assert.equal(await retireServerCheck(h.options),0);assert.equal(h.events[0],'GET:/api/cli/server-check-retirement');assert.equal(h.events[1],'GET:/api/cli/server-check-retirement');assert.equal(h.events[2],'POST:/api/cli/server-check-retirement');
 assert.ok(h.output.join('\n').includes('Execution: '+h.id));assert.ok(h.output.join('\n').includes('Hostname: demo-host'));assert.ok(h.output.join('\n').includes('Workspace: Test Workspace'));assert.ok(h.output.join('\n').includes('Reason: Founder rehearsal'));
 assert.equal(h.files.has(h.base+'/pending.json'),false);assert.equal(createHash('sha256').update(h.files.get(h.base+'/retired/'+h.id+'/pending.json')).digest('hex'),pendingHash);assert.deepEqual(h.files.get(h.base+'/retired/'+h.id+'/'+h.id+'/authority.json'),authorityBefore);assert.deepEqual(h.counts(),{captures:0,uploads:0});
});
test('retirement refuses uploaded/captured executions before confirmation or local archival',async()=>{
 const h=retirementHarness('uploaded');await assert.rejects(retireServerCheck(h.options),/capture or run state/);assert.equal(h.events.filter(x=>x.startsWith('POST:')).length,0);assert.ok(h.files.has(h.base+'/pending.json'));assert.deepEqual(h.counts(),{captures:0,uploads:0});
});
test('already retired execution is readable/idempotent and local archival resumes without prompting',async()=>{
 const h=retirementHarness('retired');h.options.ask=async()=>{throw new Error('should not prompt again');};await retireServerCheck(h.options);assert.ok(h.output.join('\n').includes('already retired'));assert.equal(h.files.has(h.base+'/pending.json'),false);assert.deepEqual(h.counts(),{captures:0,uploads:0});
});
test('normal check recovers a local retirement receipt and normalizes it before resuming archival',async()=>{
 const h=retirementHarness('retired');h.options.local.findRetirementReceipt=async()=>({schema:'witnessops.cli.execution-retirement.v1',executionId:h.id,requestId:h.requestId,retiredAt:'2026-09-29T00:00:00.000Z',retiredBy:'55555555-5555-4555-8555-555555555555'});
 await serverCheck(['server','check'],h.options);assert.equal(h.events.filter(value=>value==='archive').length,1);assert.equal(h.authorizeRequests().length,1);assert.notEqual(h.authorizeRequests()[0].requestId,h.requestId);assert.deepEqual(h.counts(),{captures:1,uploads:1});
});
test('filesystem retirement archive preserves original evidence bytes and records their hashes',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'wops-retire-test-')),uid=process.getuid(),id='33333333-3333-4333-8333-333333333333',requestId='44444444-4444-4444-8444-444444444444',base=path.join(root,'staging','wops','a'.repeat(64)),attempt=path.join(base,id),pending=Buffer.from(JSON.stringify({request:{requestId},captureStarted:true})),authority=Buffer.from(JSON.stringify({authorization_id:id})),receipt={id,state:'retired',requestId,retiredAt:'2026-09-29T00:00:00.000Z',retiredBy:'55555555-5555-4555-8555-555555555555'};
 try{await mkdir(attempt,{recursive:true,mode:0o700});await chmod(base,0o700);await chmod(attempt,0o700);await writeFile(path.join(base,'pending.json'),pending,{mode:0o600});await writeFile(path.join(attempt,'authority.json'),authority,{mode:0o600});
  await archiveRetiredExecution(base,id,receipt,{root,ownerUid:uid});await archiveRetiredExecution(base,id,receipt,{root,ownerUid:uid});const archived=path.join(base,'retired',id),savedPending=await readFile(path.join(archived,'pending.json')),savedAuthority=await readFile(path.join(archived,id,'authority.json')),metadata=await lstat(path.join(archived,'retirement.json'));
  assert.deepEqual(savedPending,pending);assert.deepEqual(savedAuthority,authority);assert.equal(metadata.uid,uid);assert.equal(metadata.mode&0o777,0o600);const savedReceipt=JSON.parse(await readFile(path.join(archived,'retirement.json'),'utf8'));assert.equal(savedReceipt.pendingSha256,createHash('sha256').update(pending).digest('hex'));assert.equal(savedReceipt.authoritySha256,createHash('sha256').update(authority).digest('hex'));assert.equal(await lstat(path.join(base,'pending.json')).then(()=>true,()=>false),false);assert.equal(await lstat(attempt).then(()=>true,()=>false),false);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('filesystem retirement archive safely recovers a stale partial receipt temp file',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'wops-retire-recovery-test-')),uid=process.getuid(),id='33333333-3333-4333-8333-333333333333',requestId='44444444-4444-4444-8444-444444444444',base=path.join(root,'staging','wops','a'.repeat(64)),attempt=path.join(base,id),bucket=path.join(base,'retired',id),pending=Buffer.from(JSON.stringify({request:{requestId},captureStarted:true})),authority=Buffer.from(JSON.stringify({authorization_id:id})),receipt={id,state:'retired',requestId,retiredAt:'2026-09-29T00:00:00.000Z',retiredBy:'55555555-5555-4555-8555-555555555555'};
 try{await mkdir(attempt,{recursive:true,mode:0o700});await mkdir(bucket,{recursive:true,mode:0o700});for(const dir of [base,attempt,path.dirname(bucket),bucket])await chmod(dir,0o700);await writeFile(path.join(base,'pending.json'),pending,{mode:0o600});await writeFile(path.join(attempt,'authority.json'),authority,{mode:0o600});await writeFile(path.join(bucket,'retirement.json.new'),'{partial', {mode:0o600});
  await archiveRetiredExecution(base,id,receipt,{root,ownerUid:uid});assert.equal(await lstat(path.join(bucket,'retirement.json.new')).then(()=>true,()=>false),false);const saved=JSON.parse(await readFile(path.join(bucket,'retirement.json'),'utf8'));assert.equal(saved.executionId,id);assert.equal(saved.requestId,requestId);assert.deepEqual(await readFile(path.join(bucket,'pending.json')),pending);assert.deepEqual(await readFile(path.join(bucket,id,'authority.json')),authority);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('fresh server check after retirement creates a new request instead of reconciling old journal',async()=>{
 const h=retirementHarness();await retireServerCheck(h.options);const retiredPending=Buffer.from(h.files.get(h.base+'/retired/'+h.id+'/pending.json'));
 await serverCheck(['server','check'],h.options);assert.equal(h.authorizeRequests().length,1);assert.notEqual(h.authorizeRequests()[0].requestId,h.requestId);assert.deepEqual(h.files.get(h.base+'/retired/'+h.id+'/pending.json'),retiredPending);assert.deepEqual(h.counts(),{captures:1,uploads:1});
});
test('successful capture/upload/reconcile, no credential in output or persisted journal',async()=>{const h=harness();assert.equal(await serverCheck(['server','check'],h.options),0);assert.deepEqual(h.counts(),{captures:1,uploads:1,finalizes:1});assert.ok(h.output.join('\n').includes('/runs/'+run));assert.ok(!h.output.join().includes('s'.repeat(43)));for(const b of h.files.values())assert.ok(!b.toString().includes('s'.repeat(43)));});
test('timeout after upload resumes by status without another capture/upload',async()=>{const h=harness();h.failUpload();await assert.rejects(serverCheck(['server','check'],h.options));await serverCheck(['server','check'],h.options);assert.equal(h.counts().captures,1);assert.equal(h.counts().uploads,1);});
test('timeout during finalization reconciles without recollection',async()=>{const h=harness();h.failFinalize();await assert.rejects(serverCheck(['server','check'],h.options));await serverCheck(['server','check'],h.options);assert.equal(h.counts().captures,1);assert.equal(h.counts().uploads,1);});
test('explicit cancellation does not collect or authorize',async()=>{const h=harness();h.cancel();await serverCheck(['server','check'],h.options);assert.equal(h.counts().captures,0);assert.equal(h.files.size,0);});
test('runtime mismatch and unsupported flags fail before collection',async()=>{const h=harness();h.options.local.trustedRuntime=async()=> 'b'.repeat(64);await assert.rejects(serverCheck(['server','check'],h.options),/identity differs/);assert.equal(h.counts().captures,0);await assert.rejects(serverCheck(['server','check','--signing-key','x'],h.options),/No remote/);});
test('capture failure reports only its safe category, does not upload, and retry never recollects',async()=>{const h=harness();let calls=0;h.options.local.capture=async()=>{calls++;throw new Error('Collection failed (producer_exit_nonzero). Review retained local diagnostic: /root/private/collection-failure.json. No token '+ 's'.repeat(43));};await assert.rejects(serverCheck(['server','check'],h.options),/producer_exit_nonzero/);await assert.rejects(serverCheck(['server','check'],h.options),/interrupted/);assert.equal(calls,1);assert.equal(h.counts().uploads,0);assert.ok(!h.output.join('\n').includes('s'.repeat(43)));});
test('wrong observed capture hostname fails before upload',async()=>{const h=harness();h.options.local.capture=async(_a,dir)=>h.files.set(dir+'/capture.json',Buffer.from(JSON.stringify({hostname:'wrong',mode:'live_approved',collector_hash:hash,observations:{synthetic:false}})));await assert.rejects(serverCheck(['server','check'],h.options),/identity/);assert.equal(h.counts().uploads,0);});
test('origin auth uses account database, private permissions and no symlink handoff',async()=>{
 const {mkdtemp,mkdir,writeFile,chmod,rm,realpath,symlink}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {readOriginAuth}=await import('./server-local.mjs');
 const home=await realpath(await mkdtemp(tmpdir()+'/wops-origin-')),uid=process.getuid();const directory=home+'/.config/witnessops';await mkdir(directory,{recursive:true,mode:0o700});const auth={server:'https://app.example.test',credential:'z'.repeat(43),expiresAt:new Date(Date.now()+1000).toISOString()};const file=directory+'/auth.json';await writeFile(file,JSON.stringify(auth),{mode:0o600});
 const lookup=async()=>`fixture:x:${uid}:20:Test:${home}:/bin/sh`;
 try{assert.deepEqual(await readOriginAuth(uid,lookup),auth);await chmod(file,0o644);await assert.rejects(readOriginAuth(uid,lookup));await chmod(file,0o600);await rm(file);await symlink(home+'/elsewhere',file);await assert.rejects(readOriginAuth(uid,lookup));}finally{await rm(home,{recursive:true,force:true});}
});

test('fixed window grammar rejects missing, malformed, reversed and oversized bounds',()=>{
 const args=['server','check','--starts-at','2026-09-12T00:00:00Z','--ends-at','2026-09-12T00:30:00Z'];
 assert.deepEqual(fixedWindow(args),{starts_at_utc:args[3],ends_at_utc:args[5]});
 for(const bad of [args.slice(0,4),[...args.slice(0,5),'2026-09-12T00:31:00Z'],[...args.slice(0,5),args[3]],[...args.slice(0,3),'2026-02-30T00:00:00Z',...args.slice(4)]])assert.throws(()=>fixedWindow(bad));
});
test('server expansion of an explicitly approved window stops before capture or upload',async()=>{
 const h=harness();const start=new Date(Date.now()-10000).toISOString().replace(/\.\d{3}Z$/,'Z'),end=new Date(Date.now()+600000).toISOString().replace(/\.\d{3}Z$/,'Z');
 await assert.rejects(serverCheck(['server','check','--starts-at',start,'--ends-at',end],h.options),/authority window differs/);
 assert.deepEqual(h.counts(),{captures:0,uploads:0,finalizes:0});
});
test('exact fixed authority window is preserved and a retry cannot replace it',async()=>{
 const h=harness(),original=h.options.fetch;const start=new Date(Date.now()-10000).toISOString().replace(/\.\d{3}Z$/,'Z'),end=new Date(Date.now()+600000).toISOString().replace(/\.\d{3}Z$/,'Z');
 h.options.fetch=async(url,request)=>{const response=await original(url,request);const d=await response.json();if(d.authority)d.authority.authorization_window={starts_at_utc:start,ends_at_utc:end};return Response.json(d);};
 h.failUpload();await assert.rejects(serverCheck(['server','check','--starts-at',start,'--ends-at',end],h.options));
 const later=new Date(Date.parse(end)+1000).toISOString().replace('.000Z','Z');await assert.rejects(serverCheck(['server','check','--starts-at',start,'--ends-at',later],h.options),/differs from retained/);
 await serverCheck(['server','check','--starts-at',start,'--ends-at',end],h.options);assert.equal(h.counts().captures,1);assert.equal(h.counts().uploads,1);
});


test('real HTTP response timeout aborts the socket and retry preserves upload identity', async () => {
 const {createServer}=await import('node:http');
 const h=harness(),original=h.options.fetch;let uploadClosed=false,first=true;const ids=[];
 const server=createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const init={method:req.method,headers:Object.fromEntries(Object.entries(req.headers).map(([k,v])=>[k==='x-witnessops-execution'?'X-WitnessOps-Execution':k,v]))};
  if(req.url.endsWith('server-check-capture')){ids.push(req.headers['x-witnessops-execution']);}
  const response=await original('http://fixture'+req.url,init);
  if(req.url.endsWith('server-check-capture')&&first){first=false;res.on('close',()=>{uploadClosed=true;});return;}
  res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 h.options.local.readOriginAuth=async()=>({server:origin,credential:'s'.repeat(43)});
 // Replace only the clock signal in the test adapter; real fetch/body/socket cancellation is retained.
 h.options.fetch=(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(5000)});
 try {
  const start=Date.now();await assert.rejects(serverCheck(['server','check'],h.options),/reconcile/);
  assert(Date.now()-start>=4500&&Date.now()-start<10000);
  await new Promise(resolve=>setTimeout(resolve,100));assert.equal(uploadClosed,true);
  await serverCheck(['server','check'],h.options);
  assert.deepEqual(ids,[uuid]);assert.equal(h.counts().captures,1);assert.equal(h.counts().uploads,1);assert.equal(h.counts().finalizes,1);
 } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
