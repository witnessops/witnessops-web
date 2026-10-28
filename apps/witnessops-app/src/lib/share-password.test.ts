import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hashSharePassword,checkSharePassword,passwordInput,runPasswordWork,PasswordChallenge} from './share-password';
test('share passwords use independent salts, exact text and bounded input',async()=>{
 const secret='synthetic passphrase only';
 const first=await hashSharePassword(secret,'test-a'),second=await hashSharePassword(secret,'test-b');
 assert.notEqual(first,second);assert.match(first,/^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
 assert.equal(await checkSharePassword(secret,first,'test-a'),true);
 assert.equal(await checkSharePassword(secret+' ',first,'test-a'),false);
 assert.equal(await checkSharePassword('wrong password',first,'test-a'),false);
 assert.equal(await checkSharePassword(secret,'scrypt-v1$invalid','test-a'),false);
 assert.throws(()=>passwordInput('short'));assert.throws(()=>passwordInput('界'.repeat(86)));
 assert.equal(passwordInput('界'.repeat(85)),'界'.repeat(85));
});
test('password work is per slot and rejects a third concurrent derivation',async()=>{
 let release!:()=>void;
 const held=new Promise<void>(resolve=>{release=resolve;});
 const first=runPasswordWork('share:a',()=>held);
 const second=hashSharePassword('synthetic passphrase only','share:b');
 await assert.rejects(runPasswordWork('share:c',async()=>1),(error:unknown)=>(error instanceof PasswordChallenge)&&(error.status===503));
 await assert.rejects(hashSharePassword('synthetic passphrase only','share:a'),(error:unknown)=>(error instanceof PasswordChallenge)&&(error.status===503));
 release();
 await first;
 assert.match(await second,/^scrypt-v1\$/);
});
test('a failed password task releases its slot and active count',async()=>{
 await assert.rejects(runPasswordWork('share:boom',async()=>{throw new Error('boom');}),/boom/);
 assert.equal(await runPasswordWork('share:boom',async()=>'released'),'released');
 const again=await Promise.all([
  runPasswordWork('share:left',async()=>'left'),
  runPasswordWork('share:right',async()=>'right'),
 ]);
 assert.deepEqual(again,['left','right']);
});
test('an empty slot is rejected before any password work',async()=>{
 let ran=false;
 await assert.rejects(runPasswordWork('',async()=>{ran=true;return 1;}),(error:unknown)=>error instanceof PasswordChallenge&&error.status===503);
 assert.equal(ran,false);
});
test('a busy slot rejects the password check instead of comparing the secret',async()=>{
 const secret='synthetic passphrase only';
 const encoded=await hashSharePassword(secret,'share:ready');
 let release!:()=>void;
 const held=new Promise<void>(resolve=>{release=resolve;});
 const pending=runPasswordWork('share:ready',()=>held);
 await assert.rejects(checkSharePassword(secret,encoded,'share:ready'),(error:unknown)=>error instanceof PasswordChallenge&&error.status===503);
 release();
 await pending;
 assert.equal(await checkSharePassword(secret,encoded,'share:ready'),true);
});
