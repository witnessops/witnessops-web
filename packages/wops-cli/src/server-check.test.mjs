import test from 'node:test';
import assert from 'node:assert/strict';
import {originatingUid} from './server-local.mjs';
import {serverCheck,listeners} from './server-check.mjs';
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
 const options={hostname:'demo-host',output:x=>output.push(x),sleep:async()=>{},remove:async file=>files.delete(file),ask:async question=>question.startsWith('Reason')?'Test':question.startsWith('Intended SSH')?'private':question.startsWith('Intended listener')?'none':cancel?'n':'y',local:{originatingUid:()=>1000,readOriginAuth:async()=>({server:'https://app.example.test',credential:'s'.repeat(43)}),trustedRuntime:async()=>hash,privateDirectory:async()=>{},privateRead:async f=>files.get(f)??null,privateWrite:async(f,b)=>files.set(f,Buffer.from(b)),lock:async(_d,fn)=>fn(),capture:async(_a,dir)=>{captures++;files.set(dir+'/capture.json',Buffer.from(JSON.stringify({hostname:'demo-host',mode:'live_approved',collector_hash:hash,observations:{synthetic:false}})));}},fetch:async(url,request)=>{
  if(url.endsWith('/server-check-capture')){uploads++;state='uploaded';if(failUpload){failUpload=false;throw new Error('network');}return Response.json(execution());}
  if(request.headers['X-WitnessOps-Execution']){finalizes++;if(failFinalize){failFinalize=false;throw new Error('network');}state='run_created';return Response.json(execution());}
  if(request.method==='POST')return Response.json(execution());
  return Response.json({workspace:'Test',workspaceId:uuid,collectorHash:hash,assets:[]});
 }};
 return {options,output,files,counts:()=>({captures,uploads,finalizes}),failUpload:()=>failUpload=true,failFinalize:()=>failFinalize=true,cancel:()=>cancel=true};}
test('successful capture/upload/reconcile, no credential in output or persisted journal',async()=>{const h=harness();assert.equal(await serverCheck(['server','check'],h.options),0);assert.deepEqual(h.counts(),{captures:1,uploads:1,finalizes:1});assert.ok(h.output.join('\n').includes('/runs/'+run));assert.ok(!h.output.join().includes('s'.repeat(43)));for(const b of h.files.values())assert.ok(!b.toString().includes('s'.repeat(43)));});
test('timeout after upload resumes by status without another capture/upload',async()=>{const h=harness();h.failUpload();await assert.rejects(serverCheck(['server','check'],h.options));await serverCheck(['server','check'],h.options);assert.equal(h.counts().captures,1);assert.equal(h.counts().uploads,1);});
test('timeout during finalization reconciles without recollection',async()=>{const h=harness();h.failFinalize();await assert.rejects(serverCheck(['server','check'],h.options));await serverCheck(['server','check'],h.options);assert.equal(h.counts().captures,1);assert.equal(h.counts().uploads,1);});
test('explicit cancellation does not collect or authorize',async()=>{const h=harness();h.cancel();await serverCheck(['server','check'],h.options);assert.equal(h.counts().captures,0);assert.equal(h.files.size,0);});
test('runtime mismatch and unsupported flags fail before collection',async()=>{const h=harness();h.options.local.trustedRuntime=async()=> 'b'.repeat(64);await assert.rejects(serverCheck(['server','check'],h.options),/identity differs/);assert.equal(h.counts().captures,0);await assert.rejects(serverCheck(['server','check','--signing-key','x'],h.options),/No remote/);});
test('capture failure is retained and retry never silently recollects',async()=>{const h=harness();let calls=0;h.options.local.capture=async()=>{calls++;throw new Error('Collection failed');};await assert.rejects(serverCheck(['server','check'],h.options));await assert.rejects(serverCheck(['server','check'],h.options),/interrupted/);assert.equal(calls,1);assert.equal(h.counts().uploads,0);});
test('wrong observed capture hostname fails before upload',async()=>{const h=harness();h.options.local.capture=async(_a,dir)=>h.files.set(dir+'/capture.json',Buffer.from(JSON.stringify({hostname:'wrong',mode:'live_approved',collector_hash:hash,observations:{synthetic:false}})));await assert.rejects(serverCheck(['server','check'],h.options),/identity/);assert.equal(h.counts().uploads,0);});
test('origin auth uses account database, private permissions and no symlink handoff',async()=>{
 const {mkdtemp,mkdir,writeFile,chmod,rm,realpath,symlink}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {readOriginAuth}=await import('./server-local.mjs');
 const home=await realpath(await mkdtemp(tmpdir()+'/wops-origin-')),uid=process.getuid();const directory=home+'/.config/witnessops';await mkdir(directory,{recursive:true,mode:0o700});const auth={server:'https://app.example.test',credential:'z'.repeat(43),expiresAt:new Date(Date.now()+1000).toISOString()};const file=directory+'/auth.json';await writeFile(file,JSON.stringify(auth),{mode:0o600});
 const lookup=async()=>`fixture:x:${uid}:20:Test:${home}:/bin/sh`;
 try{assert.deepEqual(await readOriginAuth(uid,lookup),auth);await chmod(file,0o644);await assert.rejects(readOriginAuth(uid,lookup));await chmod(file,0o600);await rm(file);await symlink(home+'/elsewhere',file);await assert.rejects(readOriginAuth(uid,lookup));}finally{await rm(home,{recursive:true,force:true});}
});
