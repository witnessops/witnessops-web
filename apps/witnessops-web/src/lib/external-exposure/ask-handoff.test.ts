import assert from 'node:assert/strict';
import test from 'node:test';
import { ASK_CHECK_KEY, ASK_CHECK_TTL, normalizeAskHostname, rememberAskCheck, takeAskCheck } from './ask-handoff';
import { normalizeExternalHostname } from './input';
function storage() { const values = new Map<string,string>(); return { getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);} }; }
test('Ask hostname convenience validation agrees with unchanged server validation', () => {
 for (const input of [' example.com. ','WWW.Example.COM','bücher.de','sub.example.com']) assert.equal(normalizeAskHostname(input),normalizeExternalHostname(input));
 for (const input of ['','127.0.0.1','2130706433','0x7f000001','::1','localhost','a.local','a.test','https://example.com','a.com/path','a.com:443','a..com','a.com?x','user@a.com','a.com#x','a.com%2f','-a.com']) { assert.throws(()=>normalizeAskHostname(input)); assert.throws(()=>normalizeExternalHostname(input)); }
});
test('optional email is local only; hostname URL carries no contact data; acknowledgement required',()=>{
 const s=storage();assert.throws(()=>rememberAskCheck(s,'example.com','person@work.example',false,1000));
 const url=rememberAskCheck(s,'Example.com.','person@work.example',true,1000);
 assert.equal(url,'/check?hostname=example.com&source=ask');assert.ok(!url.includes('person'));
 assert.deepEqual(takeAskCheck(s,'example.com',1001),{hostname:'example.com',email:'person@work.example',authorized:true,expiresAt:1000+ASK_CHECK_TTL});
 assert.equal(s.getItem(ASK_CHECK_KEY),null);assert.equal(takeAskCheck(s,'example.com',1002),null);
});
test('empty email works; expired, mismatched and malformed session records fail closed',()=>{
 const s=storage();rememberAskCheck(s,'example.com','',true,1000);assert.equal(takeAskCheck(s,'example.com',1001)?.email,'');
 rememberAskCheck(s,'example.com','a@b.com',true,1000);assert.equal(takeAskCheck(s,'other.com',1001),null);
 rememberAskCheck(s,'example.com','a@b.com',true,1000);assert.equal(takeAskCheck(s,'example.com',1000+ASK_CHECK_TTL),null);
 s.setItem(ASK_CHECK_KEY,'{');assert.equal(takeAskCheck(s,'example.com',1001),null);
});
