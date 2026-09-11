import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyProofpack } from '../../../witnessops-web/src/lib/proofpack/verify.mjs';
import { pinnedRegistryInput } from '../../../witnessops-web/src/lib/proofpack/pinned-registry';
import { linuxServerSnapshotFromVerifiedResult as project,isLinuxServerSnapshot } from './linux-snapshot';
import { compareLinuxRuns,linuxBaseline,type LinuxComparisonRun } from './linux-comparison';
const name='proofpack-pr_lsa_20260710120000_198fd7aceb.zip';
async function fixture(kind='complete') {
 const path=new URL(`../../../../tests/proofpack/production-fixtures/${kind}/${name}`,import.meta.url);
 return verifyProofpack({proofpack:{name,bytes:readFileSync(path)},signature:{name:name+'.sig.json',bytes:readFileSync(new URL(path.href+'.sig.json'))},trust_registry:pinnedRegistryInput()});
}
let base: Awaited<ReturnType<typeof fixture>>;
before(async()=>{base=await fixture();});
const run=(id:string,snapshot=project(base),assetId='asset-a',workspaceId='workspace-a'):LinuxComparisonRun=>({id,workspaceId,assetId,createdAt:`2026-09-11T12:00:0${id}.000Z`,snapshot});
test('strict deterministic projection; no current time, source mutation, report parsing or unknown fields',()=>{
 const before=JSON.stringify(base),a=project(base);assert.deepEqual(project(base),a);assert.equal(JSON.stringify(base),before);assert.ok(isLinuxServerSnapshot(a));assert.equal(isLinuxServerSnapshot({...a,extra:true}),false);assert.equal(isLinuxServerSnapshot({...a,values:{...a.values,rebootRequired:'false'}}),false);assert.throws(()=>project({...base,status:'invalid'}));assert.equal(a.source.sourceDigest,base.verification_inputs.proofpack.sha256);assert.ok(a.source.collectorSourceSha256);
});
test('identical semantics and reordered listeners produce no environment delta',()=>{
 const a=run('1'),b=run('2');assert.deepEqual(compareLinuxRuns(b,a).environment,[]);
 const changed=structuredClone(base);changed.report!.posture.sections.listeners.actual_endpoints=(changed.report!.posture.sections.listeners.actual_endpoints as unknown[]).slice().reverse();assert.deepEqual(project(changed),project(base));
});
test('explicit same-status listener, kernel, reboot and failed-service changes',()=>{
 const a=run('1'),b=run('2');b.snapshot.listeners=['tcp/0.0.0.0:443','udp/0.0.0.0:53'];b.snapshot.values.kernel='new-kernel';b.snapshot.values.rebootRequired=true;b.snapshot.failedServices=['backup.service'];
 const c=compareLinuxRuns(b,a);assert.ok(c.environment.includes('Listener added: udp/0.0.0.0:53'));assert.ok(c.environment.some(s=>s.startsWith('Listener removed:')));assert.ok(c.environment.some(s=>s.startsWith('kernel:')));assert.ok(c.environment.includes('rebootRequired: false → true'));assert.ok(c.environment.includes('Failed service added: backup.service'));
});
test('missing section is uncertainty; new scalar is coverage, not environment',()=>{
 const a=run('1'),b=run('2');b.snapshot.collection.ssh={status:'unavailable',complete:false,reason:'not collected',method:null};b.snapshot.values.permitRootLogin=null;const c=compareLinuxRuns(b,a);assert.equal(c.environment.length,0);assert.ok(c.uncertainty.some(s=>s.includes('ssh')));
 const d=run('2');a.snapshot.values.selinux=null;d.snapshot.values.selinux=true;const e=compareLinuxRuns(d,a);assert.ok(e.coverage.some(s=>s.includes('selinux')));assert.equal(e.environment.length,0);
});
test('method/profile changes withhold host conclusions',()=>{
 for(const key of ['profileId','verifierVersion','collectorSourceSha256'] as const){const a=run('1'),b=run('2');b.snapshot.source[key]='changed';b.snapshot.values.kernel='new';const c=compareLinuxRuns(b,a);assert.ok(c.coverage.length);assert.equal(c.environment.length,0);}
});
test('machine-id/hostname/OS mismatch or missing identity qualifies and withholds comparison',()=>{
 for(const key of ['machineIdHash','hostname'] as const){const a=run('1'),b=run('2');b.snapshot.identity[key]='changed';b.snapshot.values.kernel='new';const c=compareLinuxRuns(b,a);assert.equal(c.qualification,'IDENTITY_UNCERTAIN');assert.equal(c.environment.length,0);}
 const a=run('1'),b=run('2');b.snapshot.values.osId=null;assert.equal(compareLinuxRuns(b,a).qualification,'IDENTITY_UNCERTAIN');
});
test('baseline scoped to workspace and asset, nearest incompatible is not skipped',()=>{
 const a=run('1'),b=run('2'),c=run('3');b.snapshot.identity.machineIdHash=null;
 assert.equal(linuxBaseline(c,[a,b,run('2',project(base),'other'),run('2',project(base),'asset-a','other')])?.id,'2');assert.equal(compareLinuxRuns(c,b).qualification,'IDENTITY_UNCERTAIN');assert.equal(compareLinuxRuns(c,run('2',project(base),'other')).qualification,'NO_BASELINE');assert.equal(compareLinuxRuns(c,run('2',project(base),'asset-a','other')).qualification,'NO_BASELINE');
});
test('real signed partial APT fixture retains known pending zero and unknown security count',async()=>{
 const p=project(await fixture('partial'));assert.equal(p.values.pendingUpdates,0);assert.equal(p.values.securityUpdates,null);assert.equal(p.updates.securityClassification,'unavailable');assert.equal(p.collection.updates.complete,false);
 const c=compareLinuxRuns(run('2',p),run('1'));assert.ok(c.uncertainty.some(s=>s.includes('unknown, not zero')));assert.ok(!c.environment.some(s=>s.startsWith('securityUpdates:')));
});
test('existing signed adverse fixture exposes supported host-value changes',async()=>{
 const c=compareLinuxRuns(run('2',project(await fixture('adverse'))),run('1'));assert.ok(c.environment.some(s=>s.startsWith('Listener added:')));assert.ok(c.environment.some(s=>s.startsWith('permitRootLogin:')));assert.ok(c.environment.some(s=>s.startsWith('/etc/passwd mode:')));
});
