import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { externalExposureReportModel } from '../../../witnessops-web/src/lib/external-exposure/report-model';
import { reportNextSteps, recommendation, findingHelpRequest } from './report-actions';
const snapshot=JSON.parse(readFileSync(new URL('../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json',import.meta.url),'utf8'));
function model(){return structuredClone(externalExposureReportModel(snapshot,{digest:'a'.repeat(64),serialization:'json-stringify'}));}
test('unassessed recommendations retain recorded order, bounded list and all gap/unknown counts',()=>{
 const m=model();const findings=Array.from({length:5},(_,i)=>({id:String(i),title:`Finding ${i}`,state:'needs_attention',severity:null,observation:'observed',interpretation:null,recommendation:`Recorded step ${i}`,limitations:[],evidence:[],sourceRefs:[]}));
 const value={...m,findings};const before=JSON.stringify(value);const next=reportNextSteps(value);
 assert.equal(next.kind,'attention');assert.deepEqual(next.findings.map(f=>f.id),['0','1','2']);assert.equal(recommendation(next.findings[0]),'Recorded step 0');assert.ok(next.findings.every(f=>f.severity===null));assert.equal(JSON.stringify(value),before);
});
test('collected but undetermined, collection errors, informational and baseline stay distinct',()=>{
 const m=model();const base={...m,findings:[],collectionGaps:[],summary:{...m.summary,checks:{total:1,passed:1,needsAttention:0,informational:0,undetermined:0}}};
 assert.equal(reportNextSteps(base).kind,'baseline');
 const unknown={...base,summary:{...base.summary,checks:{...base.summary.checks,passed:0,undetermined:1}}};assert.equal(reportNextSteps(unknown).kind,'unknown');assert.equal(reportNextSteps(unknown).undetermined,1);
 assert.equal(reportNextSteps({...base,collectionGaps:[{id:'x',label:'Collection error',reason:'CHECK_ERROR: timeout',observation:null}]}).kind,'unknown');
 const f={id:'i',title:'Context',state:'informational',severity:null,observation:'x',interpretation:null,recommendation:null,limitations:[],evidence:[],sourceRefs:[]};
 assert.equal(reportNextSteps({...base,findings:[f]}).kind,'informational');assert.match(recommendation(f),/No recommended next step/);
 assert.equal(reportNextSteps({...base,findings:[{...f,state:'recorded',severity:'informational'}]}).kind,'informational');
});
test('help is an allowlisted explicit draft with synthetic labels and optional target',()=>{
 const input={title:'Service not active',method:'Local Audit',observedAt:'2026-09-18',synthetic:true,question:'What must be checked?',neededBy:'Tomorrow',rawEvidence:'SECRET',shareToken:'PRIVATE',members:['PRIVATE']};
 const text=findingHelpRequest(input);assert.match(text,/Synthetic example/);assert.match(text,/What must be checked/);assert.doesNotMatch(text,/SECRET|PRIVATE|Target/);assert.match(findingHelpRequest({...input,target:'included.example'}),/Target \(included by you\): included.example/);
});
