import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { migrate } from '../../../scripts/migrate.mjs';
import { CliAuthStore, CliError, LOGIN_TTL, SESSION_TTL, type WebCliIdentity } from './cli-auth';
import { resolveIdentity, type AppUser } from './identity';
import { WorkspaceStore } from './workspaces';
import { revokeSession } from './sessions';
import { createCliAuthService } from '../cli-auth-service';
const env = parseEnv(readFileSync(new URL('../../../.env.test.local', import.meta.url), 'utf8'));
if (!env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL required");
const target = new URL(env.TEST_DATABASE_URL);
if (!['127.0.0.1','localhost'].includes(target.hostname) || !/^\/[a-z0-9_]+_test$/.test(target.pathname)) throw new Error('Local test database required');
const schema = `cli_test_${randomUUID().replaceAll('-','')}`;
const admin = new Pool({ connectionString: env.TEST_DATABASE_URL, max: 1 });
let pool: Pool, store: CliAuthStore, user: AppUser, viewer: AppUser, workspace: string, second: string, time: number;
const web: WebCliIdentity = { identity: { provider:'workos',issuer:'https://workos.test/client_fixture',subject:'user_cliOwner',email:'owner@example.test',displayName:'Test Owner' }, session: { issuer:'https://workos.test/client_fixture',subject:'user_cliOwner',sessionId:'session_cliOwner' } };
const view: WebCliIdentity = { identity: {...web.identity,subject:'user_cliViewer',displayName:'Test Viewer'}, session:{...web.session,subject:'user_cliViewer',sessionId:'session_cliViewer'} };
before(async()=>{
 await admin.query(`CREATE SCHEMA ${schema}`); pool=new Pool({connectionString:env.TEST_DATABASE_URL,options:`-c search_path=${schema},public`,max:4});await migrate(pool);
 user=await resolveIdentity(pool,web.identity);viewer=await resolveIdentity(pool,view.identity);await pool.query("UPDATE users SET early_access_state='active'");
 const workspaces=new WorkspaceStore(pool);workspace=await workspaces.create(user,'CLI Test Workspace',randomUUID());second=await workspaces.create(user,'Second Workspace',randomUUID());
 await pool.query("INSERT INTO memberships(user_id,workspace_id,role) VALUES($1,$2,'viewer')",[viewer.id,workspace]);
});
beforeEach(async()=>{
 time=Date.now();store=new CliAuthStore(pool,()=>time);
 await pool.query('DELETE FROM cli_sessions');await pool.query('DELETE FROM cli_login_transactions');await pool.query('DELETE FROM revoked_sessions');
 await pool.query("UPDATE users SET status='active',early_access_state='active'");await pool.query("UPDATE workspaces SET status='active'");
 await pool.query("UPDATE memberships SET status='active',revoked_at=NULL,role=CASE WHEN user_id=$1 THEN 'viewer' ELSE 'owner' END",[viewer.id]);
});
after(async()=>{await pool?.end();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();});
async function authorize(w=web,id=user.id,ws=workspace){const login=await store.create();await store.bind(w,{code:login.userCode,workspaceId:ws,displayedUserId:id,action:'authorize'});return login;}
async function issued(){const data=await store.poll((await authorize()).device);assert.equal(data.state,'active');return data.credential;}
const rejectsCode=async(action:Promise<unknown>,code:string)=>assert.rejects(action,(error:unknown)=>error instanceof CliError && error.code === code);
test('creation: unique 256-bit device secrets, 48-bit codes, hashes only, bounded issuance',async()=>{
 const all=await Promise.all(Array.from({length:30},()=>store.create()));assert.equal(new Set(all.map(x=>x.device)).size,30);assert.equal(new Set(all.map(x=>x.userCode)).size,30);
 const rows=JSON.stringify((await pool.query('SELECT * FROM cli_login_transactions')).rows);for(const x of all){assert.equal(x.device.length,43);assert.ok(!rows.includes(x.device));assert.ok(!rows.includes(x.userCode));}
 await rejectsCode(store.create(),'busy');
});
test('pending poll is bounded and expired transactions cannot bind/redeem',async()=>{
 const x=await store.create();assert.equal((await store.poll(x.device)).state,'pending');await rejectsCode(store.poll(x.device),'slow_down');time+=LOGIN_TTL;
 await rejectsCode(store.poll(x.device),'expired');await rejectsCode(store.bind(web,{code:x.userCode,workspaceId:workspace,displayedUserId:user.id,action:'authorize'}),'invalid_or_used_code');
});
test('browser resolves same internal subject, changed email does not change identity; multiple workspace choices',async()=>{
 const c=await store.context({...web,identity:{...web.identity,email:'new@example.test'}});assert.equal(c.user.id,user.id);assert.equal(c.workspaces.length,2);
 const other=await resolveIdentity(pool,{...web.identity,subject:'user_distinctSameEmail'});assert.notEqual(other.id,user.id);
});
test('one-time binding and atomic double redemption; fresh credential status',async()=>{
 const x=await authorize();await rejectsCode(store.bind(web,{code:x.userCode,workspaceId:second,displayedUserId:user.id,action:'authorize'}),'invalid_or_used_code');
 const outcomes=await Promise.allSettled([store.poll(x.device),store.poll(x.device)]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 const winner=outcomes.find(x=>x.status==='fulfilled')!;assert.equal(winner.status,'fulfilled');assert.equal(winner.value.state,'active');const credential=winner.value.credential;
 assert.equal((await store.status(credential)).role,'owner');await rejectsCode(store.poll(x.device),'already_redeemed');
 assert.ok(!JSON.stringify((await pool.query('SELECT * FROM cli_sessions')).rows).includes(credential));
});
test('Viewer stays Viewer and cannot bind a foreign workspace',async()=>{
 const x=await authorize(view,viewer.id);const session=await store.poll(x.device);assert.equal(session.state,'active');assert.equal(session.role,'viewer');
 await assert.rejects(authorize(view,viewer.id,second));
});
test('browser identity changes and malformed/stale codes rejected',async()=>{
 const x=await store.create();await rejectsCode(store.bind(web,{code:x.userCode,workspaceId:workspace,displayedUserId:viewer.id,action:'authorize'}),'identity_changed');
 await rejectsCode(store.bind(web,{code:'bad',workspaceId:workspace,displayedUserId:user.id,action:'authorize'}),'invalid_code');
});
test('decline is terminal; no session issued',async()=>{
 const x=await store.create();await store.bind(web,{code:x.userCode,workspaceId:workspace,displayedUserId:user.id,action:'deny'});await rejectsCode(store.poll(x.device),'denied');assert.equal((await pool.query('SELECT count(*) FROM cli_sessions')).rows[0].count,'0');
});
test('session expires and logout revokes replay idempotently',async()=>{
 const credential=await issued();await store.logout(credential);await store.logout(credential);await rejectsCode(store.status(credential),'revoked');
 const next=await issued();time+=SESSION_TTL;await rejectsCode(store.status(next),'expired');await store.logout(next);
});
test('originating web logout invalidates pending grant and issued CLI session',async()=>{
 const credential=await issued(),pending=await authorize();await revokeSession(pool,web.session);await rejectsCode(store.status(credential),'revoked');await rejectsCode(store.poll(pending.device),'revoked');
});
test('current role is rechecked and membership removal denies credential',async()=>{
 const credential=await issued();await pool.query("UPDATE memberships SET role='viewer' WHERE user_id=$1",[user.id]);await rejectsCode(store.status(credential),'revoked');
 const fresh=await issued();assert.equal((await store.status(fresh)).role,'viewer');
 await pool.query("UPDATE memberships SET status='revoked',revoked_at=now() WHERE user_id=$1",[user.id]);await assert.rejects(store.status(fresh));await store.logout(credential);
 await pool.query("UPDATE memberships SET status='active',revoked_at=NULL WHERE user_id=$1",[user.id]);await rejectsCode(store.status(fresh),'revoked');
});
for(const [name,sql] of [['account disabled',"UPDATE users SET status='disabled'"],['workspace archived',"UPDATE workspaces SET status='archived'"],['cohort paused',"UPDATE users SET early_access_state='paused'"]] as const)test(name+' denies session',async()=>{const credential=await issued();await pool.query(sql);await assert.rejects(store.status(credential));});
test('HTTP boundary: unauthenticated bind, cross-origin, bad bodies and cookie-only session fail',async()=>{
 const origin='http://127.0.0.1:3020';const service=createCliAuthService({pool,origin,identity:async()=>null});
 const req=(method:string,body?:unknown,extra={})=>new Request(origin+'/api/cli/authorize',{method,headers:{host:'127.0.0.1:3020',origin,'content-type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await service.handle(req('POST',{}),'authorize')).status,401);
 assert.equal((await service.handle(req('POST',{}, {origin:'https://evil.test'}),'authorize')).status,403);
 assert.equal((await service.handle(req('GET'),'session')).status,401);
 assert.equal((await service.handle(req('POST',{unexpected:true}),'login')).status,400);
 const credential=await issued();const status=await service.handle(req('GET',undefined,{authorization:'Bearer '+credential}),'session');assert.equal(status.status,200);assert.ok(!(await status.text()).includes(user.id));
});

test('complete CLI commands against real service/store with disposable web identity; logout replay fails',async()=>{
 // Test-only UI confirmation adapter; no production route or identity bypass.
 const { run } = await import('../../../../../packages/wops-cli/src/commands.mjs');
 const { AuthStorage } = await import('../../../../../packages/wops-cli/src/storage.mjs');
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'wops-cli-acceptance-'));const storage=new AuthStorage(dir),lines:string[]=[];
 const origin='http://127.0.0.1:3020',service=createCliAuthService({pool,origin,identity:async()=>web,now:()=>time});let terminalCode='';
 const fetcher=async(url:string,init:RequestInit)=>{
   const headers=new Headers(init.headers);headers.set('host','127.0.0.1:3020');
   return service.handle(new Request(url,{...init,headers}),new URL(url).pathname.split('/').at(-1) as 'login'|'poll'|'session'|'authorize');
 };
 const options={storage,output:(value:string)=>{lines.push(value);const found=value.match(/Code: ([A-F0-9-]+)/);if(found)terminalCode=found[1];},fetch:fetcher,sleep:async()=>{time+=5000;},now:()=>time,openBrowser:async()=>{
   const context=await fetcher(origin+'/api/cli/authorize',{headers:{origin}});assert.equal(context.status,200);
   const response=await fetcher(origin+'/api/cli/authorize',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({code:terminalCode,workspaceId:workspace,displayedUserId:user.id,action:'authorize'})});assert.equal(response.status,200);return true;
 }};
 try{
   assert.equal(await run(['auth','login','--server',origin],options),0);const saved=await storage.read();assert.ok(saved);
   assert.equal(await run(['auth','status'],options),0);assert.equal(await run(['auth','logout'],options),0);assert.equal(await run(['auth','status'],options),0);
   await rejectsCode(store.status(saved.credential),'revoked');assert.ok(!lines.join().includes(saved.credential));assert.ok(!lines.join().includes(user.id));
   assert.match(lines.join(),/Workspace: CLI Test Workspace/);assert.equal(lines.at(-1),'Not signed in.');
   console.log(lines.filter(value=>!value.startsWith('Opening')).join('\n'));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('expired login rows do not hold anonymous issuance capacity for a day',async()=>{
 await pool.query(`INSERT INTO cli_login_transactions(device_hash,code_hash,created_at,expires_at)
 SELECT lpad(to_hex(n),64,'0'), lpad(to_hex(n+1000),64,'0'), $1::timestamptz-interval '20 minutes', $1::timestamptz-interval '10 minutes' FROM generate_series(1,1000) n`,[new Date(time)]);
 assert.ok((await store.create()).device);assert.equal((await pool.query('SELECT count(*) FROM cli_login_transactions')).rows[0].count,'1');
});

test('CLI credential is not accepted by product endpoints; local workspace hint cannot change binding',async()=>{
 const credential=await issued(),origin='http://127.0.0.1:3020';
 const {createFoundationService}=await import('../server');
 const request=new Request(origin+'/api/workspace',{headers:{host:'127.0.0.1:3020',origin,authorization:'Bearer '+credential,'x-witnessops-workspace':second}});
 assert.equal((await createFoundationService({pool,origin,identity:async()=>null}).handle(request,'workspace')).status,401);
 const result=await createCliAuthService({pool,origin}).handle(new Request(origin+'/api/cli/session',{headers:request.headers}),'session');
 assert.equal((await result.json()).workspace,'CLI Test Workspace');
});
