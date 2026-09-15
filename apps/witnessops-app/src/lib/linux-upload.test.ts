import test from 'node:test';
import assert from 'node:assert/strict';
import { linuxUpload } from './linux-upload';
import { linuxHostname } from './linux-hostname';
import { LIMITS } from '../../../witnessops-web/src/lib/proofpack/primitives.mjs';
const id = '11111111-1111-4111-8111-111111111111';
function upload(extra = false) {
  const form = new FormData(); form.set('assetId',id); form.set('zip',new Blob(['zip']),'original.zip'); form.set('signature',new Blob(['sig']),'original.zip.sig.json');
  if (extra) form.append('zip',new Blob(['duplicate']),'duplicate.zip');
  return new Request('http://localhost/api/linux-checks',{method:'POST',body:form});
}
test('Linux upload preserves bytes and filename; rejects duplicate fields and caller registry',async()=>{
  const result = await linuxUpload(upload());
  assert.equal(result.zipName,'original.zip'); assert.equal(Buffer.from(result.zip).toString(),'zip'); assert.equal(Buffer.from(result.signature).toString(),'sig');
  await assert.rejects(linuxUpload(upload(true)),/only/);
  const req=upload(); const form=await req.formData(); form.set('trust_registry','attacker');
  await assert.rejects(linuxUpload(new Request(req.url,{method:'POST',body:form})),/server selects trust/);
});
test('Linux upload counts actual bytes without trusting an understated Content-Length',async()=>{
  let n=0, cancelled=false;
  const chunk=new Uint8Array(1024*1024);
  const stream=new ReadableStream({pull(controller){ if(n++<LIMITS.proofpack/chunk.length+3) controller.enqueue(chunk); else controller.close(); },cancel(){cancelled=true;}});
  const req=new Request('http://localhost/api/linux-checks',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=test','content-length':'1'},body:stream,duplex:'half'} as RequestInit);
  await assert.rejects(linuxUpload(req),/bounded upload size/); assert.equal(cancelled,true);
});
test('Linux upload rejects encoded bodies; Linux labels are local identifiers, never URLs',async()=>{
  const req=upload();req.headers.set('content-encoding','gzip');await assert.rejects(linuxUpload(req),/Submit ZIP/);
  assert.equal(linuxHostname('DEMO-host'),'demo-host');
  for(const bad of ['../host','https://host','host:22','host/name','a\nHost:other','', '.host','-host']) assert.throws(()=>linuxHostname(bad));
});
