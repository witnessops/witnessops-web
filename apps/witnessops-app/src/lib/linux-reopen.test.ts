import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLinuxCheck } from './linux-reopen';
const busy=()=>Response.json({code:'verification_busy',retryable:true},{status:429});
test('explicit busy retries to success; later reopen is fresh',async()=>{
 let calls=0,notices=0;
 const fetcher:typeof fetch=async()=>++calls===1?busy():Response.json({ok:true});
 assert.equal((await fetchLinuxCheck('run','workspace',new AbortController().signal,()=>notices++,fetcher)).status,200);
 await fetchLinuxCheck('run','workspace',new AbortController().signal,()=>notices++,fetcher);
 assert.equal(calls,3);assert.equal(notices,1);
});
test('busy retry budget is four total requests, never an infinite loop',async()=>{
 let calls=0;
 const r=await fetchLinuxCheck('run','workspace',new AbortController().signal,()=>{},async()=>{calls++;return busy();});
 assert.equal(r.status,429);assert.equal(calls,4);
});
test('access, proof failures and unclassified 429 never retry',async()=>{
 for(const status of [401,403,404,422,500,429]){
  let calls=0;
  const r=await fetchLinuxCheck('run','workspace',new AbortController().signal,()=>assert.fail('No busy notice'),async()=>{calls++;return Response.json({error:'denied'},{status});});
  assert.equal(r.status,status);assert.equal(calls,1);
 }
});
test('navigation cancels backoff and sends no subsequent request',async()=>{
 const controller=new AbortController();let calls=0;
 const pending=fetchLinuxCheck('run','workspace',controller.signal,()=>controller.abort(),async()=>{calls++;return busy();});
 await assert.rejects(pending,{name:'AbortError'});assert.equal(calls,1);
});
test('in-flight fetch receives navigation abort signal',async()=>{
 const controller=new AbortController();
 const pending=fetchLinuxCheck('run','workspace',controller.signal,()=>{},async(_url,options)=>{
  assert.equal(options?.signal,controller.signal);
  return new Promise((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(options.signal?.reason),{once:true}));
 });
 controller.abort();await assert.rejects(pending,{name:'AbortError'});
});
