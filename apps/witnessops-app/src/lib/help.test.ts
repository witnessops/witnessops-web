import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { helpPage, helpPayload } from './help-context';
import { createHelpService, presentHelpAnswer } from './help-server';
import type { DocsAssistantAnswer } from '../../../witnessops-web/src/lib/docs-assistant/answer-contract';
const origin='http://127.0.0.1:3020';
const identity=async()=>({identity:{provider:'workos' as const,issuer:'https://identity.example',subject:randomUUID(),email:'private@example.test',displayName:'Private member'},session:{issuer:'https://identity.example',subject:'user_test',sessionId:'session_test'}});
const request=(value:unknown,extra={})=>new Request(origin+'/api/help',{method:'POST',headers:{host:'127.0.0.1:3020',origin,'content-type':'application/json',...extra},body:JSON.stringify(value)});
const response={status:'supported_by_docs',facts:['Read the named limits.'],inference:[],limits:[],sources:[]};
test('generic contexts discard private path identifiers and payload rejects attached context',()=>{
 assert.equal(helpPage('/reports/private-report-token'),'results');assert.equal(helpPage('/assets/customer-hostname'),'assets');assert.equal(helpPage('/unexpected/private'),'overview');
 assert.deepEqual(helpPayload({question:'How do I export?',page:'results'}),{question:'How do I export?',page:'results'});
 for(const value of [{question:'hello',page:'members',workspace:'private'},{question:'hello',page:'/members/private'},{question:' ',page:'members'},{question:'x'.repeat(1801),page:'members'}])assert.throws(()=>helpPayload(value));
});
test('Help requires origin/session and explicit enablement before any provider call',async()=>{
 let calls=0;const answer=async()=>{calls++;return response;};
 assert.equal((await createHelpService({origin,identity:async()=>null,enabled:true,answer})(request({question:'Help',page:'members'}))).status,401);
 assert.equal((await createHelpService({origin,identity,enabled:false,answer})(request({question:'Help',page:'members'}))).status,503);
 assert.equal((await createHelpService({origin,identity,enabled:true,answer})(request({question:'Help',page:'members'},{origin:'https://foreign.example'}))).status,403);assert.equal(calls,0);
});
test('provider receives only question and generic category; extras/duplicate fields denied',async()=>{
 const received:string[]=[];const service=createHelpService({origin,identity,enabled:true,answer:async(q)=>{received.push(q);return response;}});
 assert.equal((await service(request({question:'How do I export?',page:'results'}))).status,200);
 assert.match(received[0],/Results and Share/);assert.doesNotMatch(received[0],/private@example|Private member|session_test|user_test/);
 assert.equal((await service(request({question:'hello',page:'results',report:{secret:'private'}}))).status,400);
 const duplicate=request({});await service(new Request(duplicate,{body:'{"question":"first","question":"second","page":"results"}'})).then(r=>assert.equal(r.status,400));assert.equal(received.length,1);
});
test('provider failures are generic and help rate limit uses authenticated identity',async()=>{
 const session=await identity();const service=createHelpService({origin,identity:async()=>session,enabled:true,answer:async()=>{throw new Error('SECRET PROVIDER BODY');}});
 const first=await service(request({question:'How do I export?',page:'results'}));assert.equal(first.status,503);assert.doesNotMatch(await first.text(),/SECRET/);
 for(let i=0;i<9;i++)await service(request({question:'How do I export?',page:'results'}));assert.equal((await service(request({question:'How do I export?',page:'results'}))).status,429);
});
test('source links permit canonical docs only; no provider file IDs or raw excerpts',()=>{
 const answer:DocsAssistantAnswer={schema_version:'docs-assistant.answer.v1',answer_status:'supported_by_docs',question:'x',documented_facts:[],inference:[],not_proven:[],boundary_findings:[],human_review_required:false,unsupported_reason:null,citations:[{citation_id:'1',source_type:'source_url',title:'Docs',source_url:'https://witnessops.com/docs?secret=private'},{citation_id:'2',source_type:'source_url',title:'Rejected link',source_url:'https://evil.example/'}]};
 const projected=presentHelpAnswer(answer);assert.equal(projected.sources[0].url,'https://witnessops.com/docs');assert.equal(projected.sources[1].url,undefined);assert.doesNotMatch(JSON.stringify(projected),/private|evil.example/);
});
