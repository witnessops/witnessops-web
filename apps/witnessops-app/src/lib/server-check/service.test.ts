import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerCheckRetirementService,createServerCheckService} from './service';
import type {ServerCheckStore} from './store';

test('actual service deadline releases capacity even when stream cancellation never settles', async () => {
  let cancelled = 0;
  let writes = 0;
  const store = {authenticate: async () => {}, context: async () => ({ready: true}),
    upload: async () => {writes++;}, authorize: async () => {writes++;}} as unknown as ServerCheckStore;
  const origin = 'http://127.0.0.1:3020';
  const service = createServerCheckService(store, origin);
  const headers = {host:'127.0.0.1:3020', Origin:origin, Authorization:'Bearer '+'a'.repeat(43), 'Content-Type':'application/json'};
  const stalled = () => new Request(origin, {method:'POST', headers,
    body:new ReadableStream({cancel(){cancelled++;return new Promise(() => {});}}), duplex:'half'} as RequestInit);
  const started = Date.now();
  const pending = [service(stalled(),true),service(stalled(),true)];
  const blocked = await service(new Request(origin,{headers}));
  assert.equal(blocked.status,429);
  const responses = await Promise.all(pending);
  for(const r of responses) {assert.equal(r.status,408);assert.equal((await r.json()).code,'upload_timeout');}
  assert(Date.now()-started >= 9500 && Date.now()-started < 15000);
  assert.equal(cancelled,2);assert.equal(writes,0);
  assert.equal((await service(new Request(origin,{headers}))).status,200);
});

test('retirement endpoint has a read-only status phase and a bounded explicit POST',async()=>{
 const calls:string[]=[];const id='11111111-1111-4111-8111-111111111111';
 const store={authenticate:async()=>{calls.push('authenticate');},retirementContext:async()=>({workspaceId:id,workspace:'Fixture'}),retirementStatus:async(_credential:string,execution:string)=>{calls.push('status:'+execution);return{id:execution,state:'authorized',captureDigest:null,runId:null};},retire:async(_credential:string,execution:string)=>{calls.push('retire:'+execution);return{id:execution,state:'retired',retiredAt:'2026-01-01T00:00:00.000Z',retiredBy:id};}} as unknown as ServerCheckStore;
 const service=createServerCheckRetirementService(store,'http://127.0.0.1:3020'),headers={Host:'127.0.0.1:3020',Origin:'http://127.0.0.1:3020',Authorization:'Bearer '+'a'.repeat(43),'Content-Type':'application/json'};
 const context=await service(new Request('http://127.0.0.1:3020/api/cli/server-check-retirement',{headers}));assert.equal(context.status,200);assert.deepEqual(await context.json(),{workspaceId:id,workspace:'Fixture'});
 const status=await service(new Request(`http://127.0.0.1:3020/api/cli/server-check-retirement?executionId=${id}`,{headers}));assert.equal(status.status,200);assert.equal((await status.json()).state,'authorized');assert.deepEqual(calls,['status:'+id]);
 const wrongOrigin=await service(new Request('http://127.0.0.1:3020/api/cli/server-check-retirement',{method:'POST',headers:{...headers,Origin:'https://attacker.test'},body:JSON.stringify({executionId:id})}));assert.equal(wrongOrigin.status,403);
 const malformed=await service(new Request('http://127.0.0.1:3020/api/cli/server-check-retirement',{method:'POST',headers,body:JSON.stringify({executionId:id,extra:true})}));assert.equal(malformed.status,400);
 const retired=await service(new Request('http://127.0.0.1:3020/api/cli/server-check-retirement',{method:'POST',headers,body:JSON.stringify({executionId:id})}));assert.equal(retired.status,200);assert.equal((await retired.json()).state,'retired');assert.deepEqual(calls,['status:'+id,'authenticate','authenticate','retire:'+id]);
});
