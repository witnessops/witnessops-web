import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerCheckService} from './service';
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
