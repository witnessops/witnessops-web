import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {writeFile,readFile,mkdir,stat} from 'node:fs/promises';
import {parseEnv,promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {Pool} from 'pg';
import {migrate} from '../../../scripts/migrate.mjs';
import {resolveIdentity,type AppUser} from './identity';
import {WorkspaceStore} from './workspaces';
import {CliAuthStore,type WebCliIdentity} from './cli-auth';
import {LinuxCheckStore,sha256} from './linux-checks';
import {ServerCheckStore} from '../server-check/store';
import {LocalAuditFinalizer} from '../server-check/runtime';
import {createServerCheckService} from '../server-check/service';
const exec=promisify(execFile);
const env=parseEnv(readFileSync(new URL('../../../.env.test.local',import.meta.url),'utf8'));
const target=new URL(env.TEST_DATABASE_URL??'');if(!['127.0.0.1','localhost'].includes(target.hostname)||!target.pathname.endsWith('_test'))throw new Error('Isolated local test DB required');
const base=process.env.WOPS_SERVER_TEST_DIRECTORY!;if(!base)throw new Error('Disposable producer test environment required');
const custody=base+'/custody/'+randomUUID();
const python=process.env.WOPS_TEST_PYTHON??base+'/runtime/bin/python';
const schema='server_test_'+randomUUID().replaceAll('-',''),admin=new Pool({connectionString:env.TEST_DATABASE_URL,max:1});
let pool:Pool,auth:CliAuthStore,user:AppUser,workspace:string,foreign:string,store:ServerCheckStore,finalizer:LocalAuditFinalizer;
const web:WebCliIdentity={identity:{provider:'workos',issuer:'https://workos.test/client_fixture',subject:'user_serverOwner',email:'owner@example.test',displayName:'Test Owner'},session:{issuer:'https://workos.test/client_fixture',subject:'user_serverOwner',sessionId:'session_serverOwner'}};
before(async()=>{await mkdir(custody,{mode:0o700});await admin.query(`CREATE SCHEMA ${schema}`);pool=new Pool({connectionString:env.TEST_DATABASE_URL,options:`-c search_path=${schema},public`,max:5});await migrate(pool);auth=new CliAuthStore(pool);user=await resolveIdentity(pool,web.identity);await pool.query("UPDATE users SET early_access_state='active'");const ws=new WorkspaceStore(pool);workspace=await ws.create(user,'Test Workspace',randomUUID());foreign=await ws.create(user,'Other Workspace',randomUUID());finalizer=new LocalAuditFinalizer({python:python,key:base+'/key.hex',signer:'disposable_cli_test',root:custody});store=new ServerCheckStore(pool,finalizer);});
after(async()=>{await pool?.end();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();});
async function credential(scope='cli:session server_check:create',ws=workspace){const login=await auth.create();await auth.bind(web,{code:login.userCode,workspaceId:ws,displayedUserId:user.id,action:'authorize',scope});const issued=await auth.poll(login.device);assert.equal(issued.state,'active');return issued.credential;}
const request=()=>({requestId:randomUUID(),assetId:null,hostname:'demo-host',purpose:'Disposable test baseline',sshExposure:'private',expectedListeners:[{transport:'tcp',address:'127.0.0.1',port:22}]});
async function frozen(authority:unknown,partial=false){const dir=base+'/'+randomUUID();await mkdir(dir,{mode:0o700});await writeFile(dir+'/authority.json',JSON.stringify(authority),{mode:0o600});await exec(python,['-I',path.resolve('../../tests/server-check/capture-fixture.py'),dir+'/authority.json',dir+'/capture.json',...(partial?['partial']:[])],{timeout:10000});return readFile(dir+'/capture.json');}
test('product scope explicitly granted; old session scope and invalid credential denied',async()=>{await assert.rejects(store.context('invalid'));await assert.rejects(store.context(await credential('cli:session')),/server_scope_required/);assert.equal((await store.context(await credential())).workspaceId,workspace);});
test('Viewer cannot receive product scope; role changes/revocation respected',async()=>{const token=await credential();await pool.query("UPDATE memberships SET role='viewer' WHERE workspace_id=$1 AND user_id=$2",[workspace,user.id]);await assert.rejects(store.context(token));await assert.rejects(credential());await pool.query("UPDATE memberships SET role='owner',status='revoked',revoked_at=now() WHERE workspace_id=$1 AND user_id=$2",[workspace,user.id]);await assert.rejects(store.context(token));await pool.query("UPDATE memberships SET status='active',revoked_at=NULL WHERE workspace_id=$1 AND user_id=$2",[workspace,user.id]);await auth.logout(token);await assert.rejects(store.context(token));});
test('authority is immutable, request retry idempotent, wrong asset/hostname denied',async()=>{const token=await credential(),input=request(),one=await store.authorize(token,input),two=await store.authorize(token,input);assert.equal(one.id,two.id);await assert.rejects(store.authorize(token,{...input,purpose:'changed'}),/request_conflict/);await assert.rejects(store.authorize(token,{...request(),assetId:randomUUID()}));await assert.rejects(pool.query("UPDATE server_check_executions SET authority='{}' WHERE id=$1",[one.id]));});
test('real producer freeze -> disposable off-host finalization -> independent app verification -> exactly one immutable run; reopen and retry',async()=>{
 const token=await credential(),execution=await store.authorize(token,request()),bytes=await frozen(execution.authority),digest=sha256(bytes);
 const uploaded=await store.upload(token,execution.id,bytes,digest);assert.equal(uploaded.state,'uploaded');assert.equal((await store.upload(token,execution.id,bytes,digest)).id,execution.id);
 const saved=await store.status(token,execution.id);assert.equal(saved.state,'run_created');const retry=await store.status(token,execution.id);assert.equal(retry.runId,saved.runId);
 const row=(await pool.query('SELECT * FROM server_check_executions WHERE id=$1',[execution.id])).rows[0];const reopened=await new LinuxCheckStore(pool).reopen(user,workspace,saved.runId!);assert.equal(reopened.run.synthetic,false);assert.equal(reopened.run.assetId,row.asset_id);assert.equal(reopened.run.sourceDigest,sha256(reopened.source.zip));assert.equal(reopened.snapshot.source.synthetic,false);assert.ok(reopened.projectionMatches);assert.equal(reopened.model.identity.productName,'Local Audit');
 assert.equal((await pool.query('SELECT count(*) FROM runs WHERE id=$1',[saved.runId])).rows[0].count,'1');assert.ok(row.capture_bytes.equals(bytes));assert.equal(row.capture_digest,digest);
 const marker=await stat(custody+'/'+execution.id+'/started');const pack=await finalizer.finalize(execution.id,bytes);assert.ok(pack.zip.equals(reopened.source.zip));assert.ok(pack.signature.equals(reopened.source.signature));assert.equal((await stat(custody+'/'+execution.id+'/started')).mtimeMs,marker.mtimeMs);
 await assert.rejects(store.status(await credential('cli:session server_check:create',foreign),execution.id));await assert.rejects(pool.query("UPDATE server_check_executions SET state='uploaded',run_id=NULL WHERE id=$1",[execution.id]));
});
test('second admitted run uses same asset and exact nearest baseline',async()=>{const token=await credential(),execution=await store.authorize(token,request()),bytes=await frozen(execution.authority);await store.upload(token,execution.id,bytes,sha256(bytes));const prior=(await pool.query("SELECT run_id FROM server_check_executions WHERE state='run_created' ORDER BY created_at DESC LIMIT 1")).rows[0].run_id;const saved=await store.status(token,execution.id);const result=await new LinuxCheckStore(pool).comparison(user,workspace,saved.runId!);assert.equal(result.comparison.baselineId,prior);});
test('malformed, synthetic, altered authority, digest mismatch and oversized capture rejected without run',async()=>{
 const token=await credential();for(const variant of ['malformed','synthetic','authority','digest','oversized']){const e=await store.authorize(token,request());let bytes=await frozen(e.authority);if(variant==='malformed')bytes=Buffer.from('{}');if(variant==='synthetic'||variant==='authority'){const v=JSON.parse(bytes.toString());if(variant==='synthetic')v.observations.synthetic=true;else v.authority.target.asset_id=randomUUID();bytes=Buffer.from(JSON.stringify(v));}if(variant==='oversized')bytes=Buffer.alloc(26214401);await assert.rejects(store.upload(token,e.id,bytes,variant==='digest'?'0'.repeat(64):sha256(bytes)));assert.equal((await store.status(token,e.id)).runId,null);}
});
test('cross-workspace upload and different capture replay denied; true concurrency remains bounded',async()=>{const token=await credential(),other=await credential('cli:session server_check:create',foreign),e=await store.authorize(token,request()),bytes=await frozen(e.authority);await assert.rejects(store.upload(other,e.id,bytes,sha256(bytes)));await store.upload(token,e.id,bytes,sha256(bytes));const different=Buffer.from('{}');await assert.rejects(store.upload(token,e.id,different,sha256(different)),/capture_conflict/);const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(941071,10)');await assert.rejects(store.status(token,e.id),/busy/);}finally{await client.query('ROLLBACK');client.release();}});
test('unfinished issuance marker cannot sign again; no accepted run',async()=>{const token=await credential(),e=await store.authorize(token,request()),bytes=await frozen(e.authority);await store.upload(token,e.id,bytes,sha256(bytes));await writeFile(custody+'/'+e.id+'/started',sha256(bytes),{mode:0o600});await assert.rejects(store.status(token,e.id),/finalization_failed/);assert.equal((await pool.query('SELECT run_id FROM server_check_executions WHERE id=$1',[e.id])).rows[0].run_id,null);});
test('normal API rejects missing credentials and wrong Origin before upload',async()=>{const service=createServerCheckService(store,'http://127.0.0.1:3020');assert.equal((await service(new Request('http://127.0.0.1:3020/api/cli/server-checks',{headers:{Host:'127.0.0.1:3020',Origin:'http://127.0.0.1:3020'}}))).status,401);assert.equal((await service(new Request('http://127.0.0.1:3020/api/cli/server-checks',{headers:{Host:'127.0.0.1:3020',Origin:'https://attacker.test'}}))).status,403);});

test('partial updates survive finalization, independent verification, snapshot and report',async()=>{const token=await credential(),e=await store.authorize(token,request()),bytes=await frozen(e.authority,true);await store.upload(token,e.id,bytes,sha256(bytes));const saved=await store.status(token,e.id);assert.ok('outcome' in saved);assert.equal(saved.outcome,'partial');const reopened=await new LinuxCheckStore(pool).reopen(user,workspace,saved.runId!);assert.equal(reopened.snapshot.values.securityUpdates,null);assert.equal(reopened.snapshot.updates.securityClassification,'unavailable');assert.ok(reopened.model.collectionGaps.length);});
test('CLI command uses normal Owner service, frozen fixture and real finalizer/import; concise partial result',async()=>{
 const {serverCheck}=await import('../../../../../packages/wops-cli/src/server-check.mjs');
 const token=await credential(),origin='http://127.0.0.1:3020',service=createServerCheckService(store,origin),files=new Map<string,Buffer>(),lines:string[]=[];
 let captures=0;const beforeCount=Number((await pool.query("SELECT count(*) FROM runs WHERE workspace_id=$1",[workspace])).rows[0].count);
 const code=await serverCheck(['server','check'],{hostname:'demo-host',output:(s:string)=>lines.push(s),remove:async(f:string)=>{files.delete(f);},ask:async(q:string)=>q.startsWith('Reason')?'CLI fixture acceptance':q.startsWith('Intended SSH')?'private':q.startsWith('Intended listener')?'tcp://127.0.0.1:22':'y',
  fetch:async(url:string,init:RequestInit)=>{const headers=new Headers(init.headers);headers.set('host','127.0.0.1:3020');return service(new Request(url,{...init,headers}),url.endsWith('/server-check-capture'));},
  local:{originatingUid:()=>1000,readOriginAuth:async()=>({server:origin,credential:token}),trustedRuntime:()=>finalizer.preflight(),privateDirectory:async()=>{},privateRead:async(f:string)=>files.get(f)??null,privateWrite:async(f:string,b:string)=>{files.set(f,Buffer.from(b));},lock:async(_d:string,action:()=>Promise<number>)=>action(),capture:async(a:unknown,d:string)=>{captures++;files.set(d+'/capture.json',await frozen(a,true));}}
 });
 assert.equal(code,0);assert.equal(captures,1);assert.equal(Number((await pool.query('SELECT count(*) FROM runs WHERE workspace_id=$1',[workspace])).rows[0].count),beforeCount+1);assert.match(lines.join('\n'),/Result: Partial/);assert.match(lines.join('\n'),/Verification valid/);assert.ok(!lines.join().includes(token));console.log(lines.join('\n'));
});

test('fixed window preserved without extending end; inactive/malformed bounds create no execution',async()=>{
 const token=await credential(),now=Date.now(),utc=(t:number)=>new Date(Math.floor(t/1000)*1000).toISOString().replace('.000Z','Z');
 const window={starts_at_utc:utc(now-60000),ends_at_utc:utc(now+60000)};
 const input={...request(),window},one=await store.authorize(token,input);
 const authority=one.authority as {authorization_window:typeof window;authority_source:{approved_at_utc:string}};
 assert.deepEqual(authority.authorization_window,window);
 assert.notEqual(authority.authority_source.approved_at_utc,window.starts_at_utc);
 assert.equal((await store.authorize(token,input)).id,one.id);
 await assert.rejects(store.authorize(token,{...input,window:{...window,ends_at_utc:utc(now+120000)}}),/request_conflict/);
 const count=(await pool.query('SELECT count(*) FROM server_check_executions')).rows[0].count;
 for(const w of [{starts_at_utc:utc(now+60000),ends_at_utc:utc(now+120000)},{starts_at_utc:utc(now-120000),ends_at_utc:utc(now-60000)},{starts_at_utc:utc(now),ends_at_utc:utc(now+1801000)},{starts_at_utc:'2026-02-30T00:00:00Z',ends_at_utc:'2026-03-01T00:00:00Z'},null])await assert.rejects(store.authorize(token,{...request(),window:w}));
 assert.equal((await pool.query('SELECT count(*) FROM server_check_executions')).rows[0].count,count);
});

test('qualified listener policy round-trips unchanged and shares producer matching identities',async()=>{
 const {listeners}=await import('../../../../../packages/wops-cli/src/server-check.mjs');
 const input=listeners('tcp://127.0.0.53%lo:53, udp://172.26.9.158%ens5:68, tcp://[fe80::1%eth0]:443');
 const token=await credential(),e=await store.authorize(token,{...request(),expectedListeners:JSON.parse(JSON.stringify(input))});
 const stored=(await pool.query('SELECT authority FROM server_check_executions WHERE id=$1',[e.id])).rows[0].authority;
 assert.deepEqual(stored.target.expected_listeners,input);
 const output=await exec(python,['-I','-c','import json,sys; from witnessops_local_audit.authority import normalize_expected_listeners; print(json.dumps(normalize_expected_listeners(json.loads(sys.argv[1]))))',JSON.stringify(input)]);
 assert.deepEqual(JSON.parse(output.stdout),[{transport:'tcp',address:'127.0.0.53',port:53},{transport:'tcp',address:'fe80::1%eth0',port:443},{transport:'udp',address:'172.26.9.158',port:68}]);
 for(const addresses of [['127.0.0.53','127.0.0.53%lo'],['127.0.0.53%lo','127.0.0.53%ens5'],['fe80::1%eth0','FE80:0::1%eth0'],['127.0.0.1%'],['127.0.0.1%lo;id']])await assert.rejects(store.authorize(token,{...request(),expectedListeners:addresses.map(address=>({transport:'tcp',address,port:53}))}),/invalid_listeners/);
 const distinct=listeners('tcp://[fe80::1%eth0]:53,tcp://[fe80::1%ETH0]:53');
 await store.authorize(token,{...request(),expectedListeners:distinct});
});

test('real HTTP lost upload acknowledgement reconciles the same execution and one run',async()=>{
 const {createServer}=await import('node:http');
 const {serverCheck}=await import('../../../../../packages/wops-cli/src/server-check.mjs');
 const token=await credential(),files=new Map<string,Buffer>();let captures=0,drop=true,closed=false;
 const count=async(table:string)=>Number((await pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count);
 const beforeExecutions=await count('server_check_executions'),beforeRuns=await count('runs');
 let origin='';
 const server=createServer(async(req,res)=>{
  const request=new Request(origin+req.url,{method:req.method,headers:req.headers,
   ...(req.method==='POST'?{body:req,duplex:'half'}:{})} as unknown as RequestInit);
  const response=await service(request,req.url?.endsWith('/server-check-capture'));
  if(req.url?.endsWith('/server-check-capture')&&drop&&response.ok){drop=false;res.on('close',()=>{closed=true;});return;}
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert(address&&typeof address!=='string');origin='http://127.0.0.1:'+address.port;
 const service=createServerCheckService(store,origin);
 const options={hostname:'demo-host',output:()=>{},remove:async(f:string)=>{files.delete(f);},
  ask:async(q:string)=>q.startsWith('Reason')?'Timeout test':q.startsWith('Intended SSH')?'private':q.startsWith('Intended listener')?'tcp://127.0.0.1:22':'y',
  fetch:(url:string,init:RequestInit)=>fetch(url,{...init,signal:AbortSignal.timeout(5000)}),
  local:{originatingUid:()=>1000,readOriginAuth:async()=>({server:origin,credential:token}),trustedRuntime:()=>finalizer.preflight(),privateDirectory:async()=>{},
   privateRead:async(f:string)=>files.get(f)??null,privateWrite:async(f:string,b:string)=>{files.set(f,Buffer.from(b));},
   lock:async(_d:string,action:()=>Promise<number>)=>action(),capture:async(a:unknown,d:string)=>{captures++;files.set(d+'/capture.json',await frozen(a,true));}}};
 try{
  await assert.rejects(serverCheck(['server','check'],options),/reconcile/);
  await new Promise(resolve=>setTimeout(resolve,100));assert.equal(closed,true);
  assert.equal(await count('server_check_executions'),beforeExecutions+1);assert.equal(await count('runs'),beforeRuns);
  await serverCheck(['server','check'],options);
  assert.equal(captures,1);assert.equal(await count('server_check_executions'),beforeExecutions+1);assert.equal(await count('runs'),beforeRuns+1);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
