import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hashSharePassword,checkSharePassword,passwordInput} from './share-password';
test('share passwords use independent salts, exact text and bounded input',async()=>{
 const secret='synthetic passphrase only';
 const first=await hashSharePassword(secret),second=await hashSharePassword(secret);
 assert.notEqual(first,second);assert.match(first,/^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
 assert.equal(await checkSharePassword(secret,first),true);
 assert.equal(await checkSharePassword(secret+' ',first),false);
 assert.equal(await checkSharePassword('wrong password',first),false);
 assert.equal(await checkSharePassword(secret,'scrypt-v1$invalid'),false);
 assert.throws(()=>passwordInput('short'));assert.throws(()=>passwordInput('界'.repeat(86)));
 assert.equal(passwordInput('界'.repeat(85)),'界'.repeat(85));
});
