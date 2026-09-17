/** Exact unmodified image + disposable WorkOS-compatible provider and test DB.
 * No HTTP identity bypass, production provider call, capture, or signing. */
import assert from 'node:assert/strict';
import {createServer,request as httpRequest} from 'node:http';
import {createRequire} from 'node:module';
import {randomUUID,generateKeyPairSync,sign} from 'node:crypto';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseEnv} from 'node:util';
import {execFileSync} from 'node:child_process';
import {migrate} from '../../apps/witnessops-app/scripts/migrate.mjs';
import {resolveIdentity} from '../../apps/witnessops-app/src/lib/db/identity';
import {WorkspaceStore} from '../../apps/witnessops-app/src/lib/db/workspaces';
import {revokeSession} from '../../apps/witnessops-app/src/lib/db/sessions';
const require=createRequire(new URL('../../apps/witnessops-app/package.json',import.meta.url));
const {Pool}=require('pg');
const docker=process.env.TEST_DOCKER??'docker';
const config=process.env.TEST_IMAGE_CONFIG;
const archive=process.env.TEST_IMAGE_ARCHIVE;assert(archive,'Exact scanned OCI archive required');
const identity=JSON.parse(execFileSync('python3',['deploy/aws/inspect-oci-image.py',archive],{encoding:'utf8'}));
assert.equal(identity.config_digest,config);
const image=process.env.TEST_IMAGE_REF??config;assert([identity.image_digest,identity.config_digest].includes(image));
assert.match(config??'',/^sha256:[0-9a-f]{64}$/);
const dbUrl=parseEnv(readFileSync(new URL('../../apps/witnessops-app/.env.test.local',import.meta.url),'utf8')).TEST_DATABASE_URL;
const inspected=JSON.parse(execFileSync(docker,['image','inspect',image!],{encoding:'utf8'}))[0];
assert.equal(inspected.Id,image);assert.equal(inspected.Architecture,'amd64');assert.equal(inspected.Os,'linux');assert(['nextjs','1001','1001:1001'].includes(inspected.Config.User));
const parsed=new URL(dbUrl);assert(['127.0.0.1','localhost'].includes(parsed.hostname)&&parsed.pathname.endsWith('_test'));
const schema='image_'+randomUUID().replaceAll('-',''),name='app-auth-'+randomUUID();
const admin=new Pool({connectionString:dbUrl,max:1});
let pool:InstanceType<typeof Pool>;let started=false;
const directory=mkdtempSync(join(tmpdir(),'app-image-auth-'));
const imagePort=Number(process.env.TEST_APP_PORT??3033),providerPort=Number(process.env.TEST_PROVIDER_PORT??3035);
const providerHost=process.env.TEST_CONTAINER_HOST??'host.docker.internal';
const keys=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...keys.publicKey.export({format:'jwk'}),kid:'disposable',alg:'RS256',use:'sig'};
const codes=new Map<string,{subject:string;challenge:string}>();
function token(subject:string){
 const enc=(x:unknown)=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const payload=enc({alg:'RS256',kid:'disposable'})+'.'+enc({sub:subject,sid:'session_'+subject.replaceAll('_',''),iss:'test-provider',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});
 return payload+'.'+sign('RSA-SHA256',Buffer.from(payload),keys.privateKey).toString('base64url');
}
const provider=createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');
 if(req.method==='GET'&&req.url==='/sso/jwks/client_image'){res.end(JSON.stringify({keys:[jwk]}));return;}
 if(req.method==='POST'&&req.url==='/user_management/authenticate'){
  let body='';for await(const chunk of req){body+=chunk;if(body.length>10000){res.writeHead(413).end();return;}}
  const input=JSON.parse(body),entry=codes.get(input.code);codes.delete(input.code);
  const {createHash}=await import('node:crypto');
  if(!entry||input.client_id!=='client_image'||createHash('sha256').update(input.code_verifier??'').digest('base64url')!==entry.challenge){res.writeHead(401).end('{}');return;}
  res.end(JSON.stringify({access_token:token(entry.subject),refresh_token:'disposable-not-refreshed',authentication_method:'Password',user:{object:'user',id:entry.subject,email:entry.subject+'@example.test',email_verified:true,first_name:'Test',last_name:entry.subject,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',metadata:{}}}));return;
 }
 res.writeHead(404).end('{}');
});
const base=`http://127.0.0.1:${imagePort}`;
async function request(path:string,cookie='',extra:Record<string,string>={},body?:unknown){
 return new Promise<Response>((resolve,reject)=>{
  const req=httpRequest(base+path,{method:body===undefined?'GET':'POST',headers:{Host:'app.witnessops.com','X-Forwarded-Host':'app.witnessops.com','X-Forwarded-Proto':'https',...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{Origin:'https://app.witnessops.com','Content-Type':'application/json'}),...extra}},res=>{
   const chunks:Buffer[]=[];res.on('data',b=>chunks.push(b));res.on('end',()=>{const headers=new Headers();for(let i=0;i<res.rawHeaders.length;i+=2)headers.append(res.rawHeaders[i],res.rawHeaders[i+1]);resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers}));});
  });req.on('error',reject);req.end(body===undefined?undefined:body instanceof Uint8Array?body:JSON.stringify(body));
 });
}
async function login(subject:string){
 const r=await request('/login');assert([302,303,307].includes(r.status));
 const auth=new URL(r.headers.get('location')!);assert.equal(auth.searchParams.get('client_id'),'client_image');
 const code=randomUUID();codes.set(code,{subject,challenge:auth.searchParams.get('code_challenge')!});
 const cookies=r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 const cb=await request('/callback?'+new URLSearchParams({state:auth.searchParams.get('state')!,code}),cookies);
 assert([302,303,307].includes(cb.status),`callback ${cb.status}: ${await cb.text()}`);
 const session=cb.headers.getSetCookie().find(v=>v.startsWith('wos-session='));assert(session,'AuthKit must set sealed session');
 return session.split(';')[0];
}
try {
 const custodyVolume='finalizer-custody-'+randomUUID(),keyVolume='finalizer-key-'+randomUUID();
 try {
  for(const volume of [custodyVolume,keyVolume])execFileSync(docker,['volume','create',volume],{stdio:'pipe'});
  const mounts=['--mount',`type=volume,source=${custodyVolume},target=/var/lib/witnessops-finalizer`,'--mount',`type=volume,source=${keyVolume},target=/run/witnessops-finalizer`];
  execFileSync(docker,['run','--rm','--network=none','--user=0',...mounts,'--entrypoint=/bin/sh',image!, '-c', 'printf disposable-readiness-reference > /run/witnessops-finalizer/key; chown -R 1001:1001 /var/lib/witnessops-finalizer /run/witnessops-finalizer; chmod 700 /var/lib/witnessops-finalizer /run/witnessops-finalizer; chmod 400 /run/witnessops-finalizer/key'],{stdio:'pipe'});
  const check=['run','--rm','--network=none','--read-only','--user=1001:1001',...mounts,'-e','WITNESSOPS_FINALIZER_PYTHON=/opt/witnessops/finalizer/venv/bin/python','-e','WITNESSOPS_FINALIZER_DIRECTORY=/var/lib/witnessops-finalizer','-e','WITNESSOPS_FINALIZER_KEY=/run/witnessops-finalizer/key','-e','WITNESSOPS_FINALIZER_SIGNER=witnessops_local_audit_prod_2026_01','--entrypoint=/opt/witnessops/finalizer/venv/bin/python',image!,'-I','/opt/witnessops/finalizer-readiness.py'];
  for(let restart=0;restart<2;restart++)assert.equal(JSON.parse(execFileSync(docker,check,{encoding:'utf8'})).runtime,'ready');
  assert.throws(()=>execFileSync(docker,['run','--rm','--network=none','--entrypoint=/opt/witnessops/finalizer/venv/bin/python',image!,'-I','/opt/witnessops/finalizer-readiness.py'],{stdio:'pipe'}));
 } finally {for(const volume of [custodyVolume,keyVolume])execFileSync(docker,['volume','rm',volume],{stdio:'pipe'});}
 await admin.query(`CREATE SCHEMA ${schema}`);pool=new Pool({connectionString:dbUrl,options:`-c search_path=${schema},public`,max:4});await migrate(pool);
 const issuer='https://api.workos.com/user_management/client_image';
 const users=[];for(const subject of ['user_owner','user_viewer','user_foreign']){const u=await resolveIdentity(pool,{provider:'workos',issuer,subject,email:subject+'@example.test',displayName:subject});await pool.query("UPDATE users SET early_access_state='active' WHERE id=$1",[u.id]);users.push(u);}
 const store=new WorkspaceStore(pool),workspace=await store.create(users[0],'Image fixture',randomUUID()),foreign=await store.create(users[2],'Foreign fixture',randomUUID());
 await pool.query("INSERT INTO memberships(user_id,workspace_id,role) VALUES($1,$2,'viewer')",[users[1].id,workspace]);
 const source=JSON.parse(readFileSync(new URL('../external-exposure/fixtures/public-witnessops-snapshot-20260910.json',import.meta.url),'utf8'));
 const asset=await store.addAsset(users[0],workspace,source.target,'hostname');const run=await store.beginRun(users[0],workspace,asset.id);await store.completeRun(users[0],workspace,run,source);
 parsed.hostname=process.env.TEST_DATABASE_HOST??providerHost;if(process.env.TEST_DATABASE_HOST)parsed.port='5432';parsed.searchParams.set('options',`-c search_path=${schema},public`);
 const env=join(directory,'test.env');writeFileSync(env,`DATABASE_URL=${parsed}\nWORKOS_API_KEY=test-only\nWORKOS_CLIENT_ID=client_image\nWORKOS_COOKIE_PASSWORD=${randomUUID()+randomUUID()}\nWORKOS_API_HOSTNAME=${providerHost}\nWORKOS_API_PORT=${providerPort}\nWORKOS_API_HTTPS=false\nWITNESSOPS_APP_PROXY_MODE=caddy-loopback-v1\n`,{mode:0o600});
 await new Promise<void>(resolve=>provider.listen(providerPort,'0.0.0.0',resolve));
 execFileSync(docker,['run','-d','--name',name,'--platform','linux/amd64','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--user','1001:1001','--tmpfs','/tmp:rw,noexec,nosuid,size=64m','--add-host',providerHost+':host-gateway','-p',`127.0.0.1:${imagePort}:3020`,'--env-file',env,image!],{stdio:'pipe'});started=true;
 for(let i=0;i<60;i++){try{if((await request('/')).status===200)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 assert.equal((await request('/api/workspace')).status,401);
 const owner=await login('user_owner'),viewer=await login('user_viewer'),outsider=await login('user_foreign');
 assert.equal((await request('/api/workspace',owner)).status,200);
 for(const cookie of [owner,viewer]){for(const path of ['/api/workspace','/api/assets?id='+asset.id,'/api/runs?id='+run])assert.equal((await request(path,cookie,{'x-witnessops-workspace':workspace})).status,200,path);}
 const denied=await request('/api/assets',viewer,{'x-witnessops-workspace':workspace},{hostname:source.target,type:'hostname'});assert.equal(denied.status,403,await denied.text());

 const form=new FormData();form.set('assetId',asset.id);form.set('zip',new Blob(['test']), 'test.zip');form.set('signature',new Blob(['{}']), 'test.sig.json');
 const encoded=new Request('http://fixture.invalid',{method:'POST',body:form});
 const importDenied=await request('/api/linux-checks',viewer,{'x-witnessops-workspace':workspace,'Content-Type':encoded.headers.get('content-type')!},new Uint8Array(await encoded.arrayBuffer()));
 assert.equal(importDenied.status,403,await importDenied.text());
 const transaction=await (await request('/api/cli/login','',{},{})).json();
 const bind={code:transaction.userCode,workspaceId:workspace,displayedUserId:users[1].id,action:'authorize'};
 assert.equal((await request('/api/cli/authorize',viewer,{}, {...bind,scope:'cli:session server_check:create'})).status,403);
 assert.equal((await request('/api/cli/authorize',viewer,{},bind)).status,200);
 const credential=await (await request('/api/cli/poll','',{}, {device:transaction.device})).json();
 assert.equal((await request('/api/cli/server-checks','',{Authorization:'Bearer '+credential.credential},{})).status,403);
 assert.equal((await pool.query('SELECT count(*) AS n FROM server_check_executions')).rows[0].n,'0');
 for(const path of ['/api/assets?id='+asset.id,'/api/runs?id='+run])assert.equal((await request(path,outsider,{'x-witnessops-workspace':foreign})).status,404);
 await revokeSession(pool,{issuer,subject:'user_owner',sessionId:'session_userowner'});
 assert.equal((await request('/api/workspace',owner)).status,401);
 assert.equal((await pool.query('SELECT count(*) AS n FROM app_migrations')).rows[0].n,'11');
 console.log(JSON.stringify({manifest:identity.image_digest,config,engineImage:image,owner:'PASS',viewerRead:'PASS',viewerWriteDenied:'PASS',viewerImportDenied:'PASS',viewerExecutionDenied:'PASS',foreignWorkspace:'PASS',revoked:'PASS',unauthenticated:'PASS',migrations:11,auth:'real AuthKit PKCE/callback/JWT with disposable provider; no production WorkOS'},null,2));
} finally {
 if(started)execFileSync(docker,['rm','-f',name],{stdio:'pipe'});
 provider.close();await pool?.end();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();rmSync(directory,{recursive:true,force:true});
}
