import {isIP} from 'node:net';

// Local Audit 1.2.2: IPv4 scope is presentation only; IPv6 scope is identity.
export function listenerAddress(address) {
 if(typeof address!=='string'||address.length>255||/[\x00-\x20\x7f-\x9f\u2028\u2029]/.test(address))throw new Error('Invalid listener address.');
 const parts=address.split('%'),base=parts[0],zone=parts[1],family=isIP(base);
 if(!family||parts.length>2||(parts.length===2&&!/^[A-Za-z0-9_.:-]{1,64}$/.test(zone)))throw new Error('Invalid listener address or interface qualifier.');
 // Only an already validated, unscoped numeric IPv6 reaches URL serialization.
 const normalized=family===6?new URL(`http://[${base}]/`).hostname.slice(1,-1):base;
 return {family,identity:normalized+(family===6&&zone!==undefined?'%'+zone:'')};
}
export function validateListenerEndpoints(items) {
 if(!Array.isArray(items)||items.length>200)throw new Error('Listener policy is too large.');
 const seen=new Set();
 for(const item of items){
  if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).sort().join(',')!=='address,port,transport'||!['tcp','udp'].includes(item.transport)||!Number.isInteger(item.port)||item.port<1||item.port>65535)throw new Error('Invalid listener endpoint.');
  const {identity}=listenerAddress(item.address),key=JSON.stringify([item.transport,identity,item.port]);
  if(seen.has(key))throw new Error('Duplicate listener matching identity.');
  seen.add(key);
 }
 return items;
}
export function parseListenerEndpoints(input) {
 if(typeof input!=='string'||/[\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(input))throw new Error('Use single-line listener endpoints.');
 if(input==='none')return [];
 const items=input.split(',').map(token=>{
  // ASCII spaces around comma-separated entries are allowed, never within one.
  const text=token.replace(/^ +| +$/g,''),m=/^(tcp|udp):\/\/(?:\[([^\[\]]+)\]|([^\[\]]+)):(\d+)$/.exec(text);
  if(!m)throw new Error('Use exact tcp://address:port or udp://[IPv6]:port endpoints, separated by commas; or none.');
  const address=m[2]??m[3],{family}=listenerAddress(address);
  if((m[2]!==undefined)!==(family===6))throw new Error('Bracket IPv6 addresses only.');
  return {transport:m[1],address,port:Number(m[4])};
 });
 return validateListenerEndpoints(items);
}
