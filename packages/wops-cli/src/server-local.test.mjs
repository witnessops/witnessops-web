import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {boundedCaptureDiagnostic,capture} from './server-local.mjs';

const authority={operator_id:'operator-test'};
const fixedNow=()=>new Date('2026-09-29T12:00:00.000Z');

async function failedCapture(error){
 const dir=await mkdtemp(path.join(tmpdir(),'wops-capture-failure-'));
 try{
  let visibleError;
  await assert.rejects(capture(authority,dir,{run:async()=>{throw error;},now:fixedNow}),value=>{visibleError=value;return /Collection failed \(producer_/.test(value.message);});
  const diagnosticPath=path.join(dir,'collection-failure.json');
  const diagnostic=JSON.parse(await readFile(diagnosticPath,'utf8'));
  const metadata=await stat(diagnosticPath);
  assert.equal(metadata.mode&0o777,0o600);
  assert.equal(diagnostic.schema,'witnessops.cli.capture-failure.v1');
  assert.equal(diagnostic.timestamp,'2026-09-29T12:00:00.000Z');
  return {diagnostic,text:await readFile(diagnosticPath,'utf8'),visibleError};
 }finally{await rm(dir,{recursive:true,force:true});}
}

test('nonzero producer exit retains a bounded root-only diagnostic without uploading',async()=>{
 const error=Object.assign(new Error('child failed'),{code:2,stdout:'',stderr:'capture probe failed'});
 const {diagnostic}=await failedCapture(error);
 assert.equal(diagnostic.category,'producer_exit_nonzero');
 assert.equal(diagnostic.exitCode,2);
 assert.equal(diagnostic.timeout,false);
 assert.match(diagnostic.reference,/collection-failure\.json$/);
});

test('producer timeout is recorded locally while terminal error stays category-only',async()=>{
 const error=Object.assign(new Error('timeout detail'),{code:'ETIMEDOUT',signal:'SIGTERM',killed:true,stderr:'timeout internal detail'});
 const {diagnostic,text,visibleError}=await failedCapture(error);
 assert.equal(diagnostic.category,'producer_timeout');
 assert.equal(diagnostic.timeout,true);
 assert.ok(text.includes('timeout internal detail'));
 assert.ok(!visibleError.message.includes('timeout internal detail'));
});

test('oversized producer output is marked truncated and excerpt remains bounded',async()=>{
 const error=Object.assign(new Error('too much output'),{code:'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',stdout:'x'.repeat(20_000),stderr:''});
 const {diagnostic}=await failedCapture(error);
 assert.equal(diagnostic.category,'producer_output_limit');
 assert.equal(diagnostic.stdoutTruncated,true);
 assert.equal(diagnostic.stderrTruncated,false);
 assert.ok(diagnostic.excerpt.length<=512);
});

test('diagnostic sanitizer strips controls and redacts bearer, credential and labeled secret values',()=>{
 const credential='A'.repeat(43);
 const diagnostic=boundedCaptureDiagnostic(Object.assign(new Error('x'),{code:1,stderr:`unsafe\u0000line Bearer ${credential} credential=${credential} password=hunter2`}));
 const serialized=JSON.stringify(diagnostic);
 assert.ok(!/[\x00-\x1f\x7f]/.test(serialized));
 assert.ok(!serialized.includes(credential));
 assert.ok(!serialized.includes('hunter2'));
 assert.match(diagnostic.excerpt,/\[REDACTED\]/);
});
