import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat, writeFile, readFile, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AuthStorage, serverOrigin } from './storage.mjs';
import { run } from './commands.mjs';
const credential='x'.repeat(43),expiresAt='2030-01-01T00:00:00Z';
async function fixture(action) {const dir=await mkdtemp(join(tmpdir(),'wops-auth-test-'));try{await action(new AuthStorage(dir),dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('private storage, atomic replacement and symlink rejection',async()=>fixture(async(storage,dir)=>{
 await storage.write({server:'https://app.example.test',credential,expiresAt});assert.equal((await stat(dir)).mode&0o777,0o700);assert.equal((await stat(storage.file)).mode&0o777,0o600);
 assert.equal((await storage.read()).credential,credential);await storage.write({server:'https://app.example.test',credential:'y'.repeat(43),expiresAt});assert.equal((await storage.read()).credential,'y'.repeat(43));
 await storage.remove();await symlink(join(dir,'other'),storage.file);await assert.rejects(storage.read(),/malformed or unsafe/);await storage.remove();
}));
test('malformed local file recovery, no content leak',async()=>fixture(async(storage)=>{
 await writeFile(storage.file,'SECRET-MALFORMED',{mode:0o600});await assert.rejects(storage.read(),/malformed/);
 const logs=[];assert.equal(await run(['auth','logout'],{storage,output:x=>logs.push(x)}),1);assert.equal(await storage.read(),null);assert.ok(!logs.join().includes('SECRET'));
}));
test('command grammar, server URL and scope stay bounded',async()=>{
 for(const value of ['http://evil.test','https://user:pass@app.test','https://app.test/path','https://app.test?x=1'])assert.throws(()=>serverOrigin(value));
 assert.equal(serverOrigin('http://127.0.0.1:3020'),'http://127.0.0.1:3020');
 await assert.rejects(run(['server','check']),/Use wops auth/);
});
test('login fallback, validated status, logout and no-session status; no credential in output or URL',async()=>fixture(async(storage)=>{
 const logs=[],requests=[];let revoked=false;
 const options={storage,output:x=>logs.push(x),openBrowser:async()=>false,sleep:async()=>{},fetch:async(url,opts)=>{
 requests.push({url,opts});assert.ok(!url.includes(credential));
 const path=new URL(url).pathname;
 if(path.endsWith('/login'))return Response.json({device:'d'.repeat(43),userCode:'ABCD-EF12-3456',expiresAt,interval:5,authorizationUrl:'https://app.witnessops.com/cli/authorize'});
 if(path.endsWith('/poll'))return Response.json({state:'active',credential,expiresAt,workspace:'Acme Test',displayName:'Test Identity',role:'viewer',scope:'cli:session'});
 if(opts.method==='POST'){revoked=true;return Response.json({state:'signed_out'});}
 return Response.json({state:'active',expiresAt,workspace:'Acme Test',displayName:'Test Identity',role:'viewer',scope:'cli:session'});
 }};
 assert.equal(await run(['auth','login'],options),0);assert.equal(await run(['auth','status'],options),0);assert.equal(await run(['auth','logout'],options),0);assert.equal(await run(['auth','status'],options),0);
 assert.ok(revoked);assert.match(logs.join('\n'),/Browser unavailable/);assert.match(logs.join('\n'),/Role: Viewer/);assert.equal(logs.at(-1),'Not signed in.');assert.ok(!logs.join().includes(credential));assert.ok(!logs.join().includes('d'.repeat(43)));
 for(const {opts} of requests)assert.equal(opts.redirect,'error');
}));
test('status confirms server; expired and unreachable do not claim active',async()=>fixture(async(storage)=>{
 await storage.write({server:'https://app.example.test',credential,expiresAt});const logs=[];
 assert.equal(await run(['auth','status'],{storage,output:x=>logs.push(x),fetch:async()=>Response.json({code:'expired'},{status:401})}),1);assert.ok(!logs.join().includes('Session: active'));
 await assert.rejects(run(['auth','status'],{storage,fetch:async()=>{throw new Error(credential);}}),/cannot be confirmed/);
}));
test('logout network failure removes local credential and reports unconfirmed revocation',async()=>fixture(async(storage)=>{
 await storage.write({server:'https://app.example.test',credential,expiresAt});const logs=[];
 assert.equal(await run(['auth','logout'],{storage,output:x=>logs.push(x),fetch:async()=>{throw new Error();}}),1);assert.equal(await storage.read(),null);assert.match(logs.join(),/revocation is unconfirmed/);
}));
test('polling bounded, denial terminal, malicious browser URL rejected',async()=>fixture(async(storage)=>{
 let polls=0;
 const tx={device:'d'.repeat(43),userCode:'ABCD-EF12-3456',expiresAt,interval:5,authorizationUrl:'https://app.witnessops.com/cli/authorize'};
 const options={storage,output:()=>{},openBrowser:async()=>true,sleep:async()=>{},fetch:async url=>Response.json(url.endsWith('/login')?tx:(polls++,{state:'pending'}))};
 await assert.rejects(run(['auth','login'],options),/timed out/);assert.equal(polls,120);
 await assert.rejects(run(['auth','login'],{...options,fetch:async url=>url.endsWith('/login')?Response.json(tx):Response.json({code:'denied'},{status:403})}),/declined/);
 await assert.rejects(run(['auth','login'],{...options,fetch:async()=>Response.json({...tx,authorizationUrl:'https://evil.test'})}),/Unexpected login response/);
}));
test('concurrent commands are serialized and no production signing dependency exists',async()=>fixture(async(storage)=>{
 await storage.lock(()=>assert.rejects(storage.lock(async()=>{}),/Another auth command/));
 for(const file of ['commands.mjs','storage.mjs','main.mjs']){
 const source=await readFile(new URL(file,import.meta.url),'utf8');assert.doesNotMatch(source,/local.audit|proofpack|signing.key|sign_record|collect_live|wops server check/i);
 }
}));
test('actual command entrypoint displays no-session status using isolated HOME',async()=>fixture(async(_storage,dir)=>{
 const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');
 const result=await promisify(execFile)(process.execPath,[new URL('main.mjs',import.meta.url).pathname,'auth','status'],{env:{...process.env,HOME:dir,XDG_CONFIG_HOME:dir}});
 assert.equal(result.stdout.trim(),'Not signed in.');assert.equal(result.stderr,'');
}));
test('real fetch rejects redirects without forwarding bearer to redirected path',async()=>fixture(async(storage)=>{
 const {createServer}=await import('node:http');let redirected=0;
 const server=createServer((req,res)=>{if(req.url==='/leak')redirected++;res.writeHead(302,{Location:'/leak'});res.end();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  await storage.write({server:`http://127.0.0.1:${server.address().port}`,credential,expiresAt});
  await assert.rejects(run(['auth','status'],{storage}),/cannot be confirmed/);assert.equal(redirected,0);
 }finally{await new Promise(resolve=>server.close(resolve));}
}));

test('Contributor login and status preserve the issued session scope; unknown roles remain rejected',async()=>fixture(async(storage)=>{
 const logs=[];let role='contributor';
 const options={storage,output:x=>logs.push(x),openBrowser:async()=>false,sleep:async()=>{},fetch:async(url,opts)=>{
  if(url.endsWith('/login'))return Response.json({device:'d'.repeat(43),userCode:'ABCD-EF12-3456',expiresAt,interval:5,authorizationUrl:'https://app.witnessops.com/cli/authorize'});
  if(url.endsWith('/session'))assert.equal(opts.headers.Authorization,`Bearer ${credential}`);
  return Response.json({state:'active',credential,expiresAt,workspace:'Test workspace',displayName:'Test Contributor',role,scope:'cli:session'});
 }};
 assert.equal(await run(['auth','login'],options),0);
 assert.equal((await storage.read()).credential,credential);
 assert.equal(await run(['auth','status'],options),0);
 assert.match(logs.join('\n'),/Role: Contributor/);
 assert.ok(!logs.join().includes(credential));
 role='administrator';
 await assert.rejects(run(['auth','status'],options),/Unexpected session response/);
 await storage.remove();
 await assert.rejects(run(['auth','login'],options),/Unexpected login response/);
 assert.equal(await storage.read(),null);
}));
