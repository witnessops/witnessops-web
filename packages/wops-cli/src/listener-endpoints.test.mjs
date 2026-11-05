import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {parseListenerEndpoints as parse,validateListenerEndpoints as validate,listenerAddress} from './listener-endpoints.mjs';
// Expected identities from accepted producer normalize_listener_address, fce41c1.
export const cases=[['127.0.0.53%lo','127.0.0.53'],['172.26.9.158%ens5','172.26.9.158'],['fe80::1%eth0','fe80::1%eth0'],['FE80:0::1%ETH0','fe80::1%ETH0'],['::ffff:192.0.2.1','::ffff:c000:201']];
test('producer address identities preserve IPv6 scope case and normalize numeric IPv6',()=>{for(const [address,identity] of cases)assert.equal(listenerAddress(address).identity,identity);});
test('CLI and request round-trip preserve exact qualified representation',()=>{
 for(const uri of ['tcp://127.0.0.53%lo:53','udp://172.26.9.158%ens5:68','tcp://127.0.0.53:53','tcp://[fe80::1%eth0]:443','tcp://[::1]:53','udp://0.0.0.0:41641','tcp://127.0.0.1:53','tcp://127.0.0.1%eth0:1:53']){
  const items=parse(uri);assert.deepEqual(validate(JSON.parse(JSON.stringify(items))),items);
  const e=items[0];assert.equal(`${e.transport}://${listenerAddress(e.address).family===6?'['+e.address+']':e.address}:${e.port}`,uri);
 }
});
test('producer-equivalent identities reject duplicates without removing stored qualifiers',()=>{
 for(const pair of [['127.0.0.53','127.0.0.53%lo'],['127.0.0.53%lo','127.0.0.53%eth0'],['fe80::1%eth0','fe80::1%eth0'],['FE80:0::1%eth0','fe80::1%eth0'],['::ffff:192.0.2.1','::ffff:c000:201']])assert.throws(()=>validate(pair.map(address=>({transport:'tcp',address,port:53}))),/Duplicate/);
 assert.equal(validate(['fe80::1%eth0','fe80::1%ETH0'].map(address=>({transport:'tcp',address,port:53}))).length,2);
});
test('malformed addresses and encoded/control input rejected by both entry points',()=>{
 for(const address of ['127.0.0.1%','127.0.0.1%eth/0','127.0.0.1%'+ 'a'.repeat(65),'127.0.0.1%eth%30','127.0.0.1%%lo','127.0.0.1%lo?x','127.0.0.1%lo#x','127.0.0.1%lo;id','127.0.0.1%lo\n','127.0.0.1%lo x','bad','[::1]'])assert.throws(()=>validate([{transport:'tcp',address,port:53}]));
 for(const uri of ['127.0.0.1:53','tcp://127.0.0.1','tcp://127.0.0.1:0','tcp://127.0.0.1:65536','tcp://127.0.0.1:-1','tcp://127.0.0.1:53/path','tcp://127.0.0.1:53?x','tcp://127.0.0.1:53#x','tcp://[127.0.0.1]:53','tcp://::1:53','tcp://[[::1]]:53','tcp://[::1:53','tcp://127.0.0.1:53,,udp://0.0.0.0:53','tcp://127.0.0.1:53\n','tcp://127.0.0.1:53\t','tcp://127.0.0.1 :53'])assert.throws(()=>parse(uri));
});
test('percent characters are separators, never URL-decoded',()=>{
 // %25eth0 is a literal Linux zone named 25eth0, not encoded %eth0.
 assert.equal(listenerAddress('fe80::1%25eth0').identity,'fe80::1%25eth0');
 assert.throws(()=>parse('tcp://[fe80::1%25eth%30]:443'));
});
test('only ASCII spaces around entries are ignored',()=>{
 assert.deepEqual(parse('  tcp://127.0.0.1:53  ,  udp://[fe80::1%eth0]:443  '),[
  {transport:'tcp',address:'127.0.0.1',port:53},
  {transport:'udp',address:'fe80::1%eth0',port:443},
 ]);
 assert.deepEqual(parse('none'),[]);
 for(const input of ['', ' ', ' none ', 'tcp://127.0.0.1:53, ', 'tcp://127.0.0.1 :53'])assert.throws(()=>parse(input));
 // String.trim() would silently admit Unicode whitespace outside endpoints.
 for(const space of ['\t','\n','\r','\v','\f','\u00a0','\u1680','\u2000','\u2028','\u2029','\u202f','\u205f','\u3000','\ufeff']){
  for(const input of [space+'tcp://127.0.0.1:53','tcp://127.0.0.1:53'+space,'tcp://127.0.0.1'+space+':53'])assert.throws(()=>parse(input));
 }
});
test('large space runs cannot stall listener parsing',()=>{
 // A child deadline also stops a synchronous regexp stall; a test timeout alone cannot.
 const result=spawnSync(process.execPath,['--input-type=module','-e',`
  import assert from 'node:assert/strict';
  import {parseListenerEndpoints as parse} from ${JSON.stringify(new URL('./listener-endpoints.mjs',import.meta.url).href)};
  const spaces=' '.repeat(250_000);
  assert.throws(()=>parse('tcp://127.0.0.1:53'+spaces+'x'),/Use exact/);
  assert.throws(()=>parse('tcp://127.0.0.1'+spaces+':53'),/Invalid listener address/);
  assert.throws(()=>parse(spaces),/Use exact/);
  assert.deepEqual(parse(spaces+'tcp://127.0.0.1:53'+spaces+','+spaces+'udp://[::1]:443'+spaces),[
   {transport:'tcp',address:'127.0.0.1',port:53},
   {transport:'udp',address:'::1',port:443},
  ]);
 `],{encoding:'utf8',timeout:5000});
 assert.ifError(result.error);
 assert.equal(result.status,0,result.stderr);
});
