import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { verifyProofpack } from '../../../witnessops-web/src/lib/proofpack/verify.mjs';
import { unzip, json, hash, canonical } from '../../../witnessops-web/src/lib/proofpack/primitives.mjs';
import { storeArchive } from '../../../../tests/proofpack/create-bundle';
import { requireLinuxClassification } from './linux-admission';
import { localAuditAdapter } from '../../../witnessops-web/src/lib/proofpack/local-audit-adapter';
import { linuxServerSnapshotFromVerifiedResult } from './linux-snapshot';
const root=new URL('../../../../tests/proofpack/live-classified/',import.meta.url);
const name='proofpack-pr_lsa_20260710120000_198fd7aceb.zip';
for(const kind of ['synthetic','live-classified']) {
 test(`${kind}: exact verifier, classification, report and snapshot`,async()=>{
  const bytes=readFileSync(new URL(`${kind}/${name}`,root));
  const input={proofpack:{name,bytes},signature:{name:name+'.sig.json',bytes:readFileSync(new URL(`${kind}/${name}.sig.json`,root))},trust_registry:{name:'test.json',bytes:readFileSync(new URL('registry.json',root))}};
  const result=await verifyProofpack(input);assert.equal(result.status,'valid');
  await requireLinuxClassification(result,bytes);
  assert.equal(linuxServerSnapshotFromVerifiedResult(result).source.synthetic,kind==='synthetic');
  assert.equal(localAuditAdapter(result,'2026-09-11T00:00:00Z')?.identity.synthetic,kind==='synthetic');
  // Isolated policy-unit cases; these modified archives are not represented as signed/verified packs.
  for(const field of ['mode','fingerprint','version','hostname','time','classification']) {
   const modified=structuredClone(result), files=await unzip(bytes);
   const reference=modified.report!.manifest.artifacts.find(a=>a.artifact_id==='run_record')!;
   const record=json(files.get(reference.path));
   if(field==='mode')record.execution.mode='unsupported';
   if(field==='fingerprint')delete record.collector.source_sha256;
   if(field==='version')record.collector.version='1.0.0';
   if(field==='hostname')record.observed_hostname='different-host';
   if(field==='time')record.observed_at_utc='2030-01-01T00:00:00Z';
   if(field==='classification')record.input_classification='contradiction';
   const changed=Buffer.from(JSON.stringify(record));files.set(reference.path,changed);reference.sha256='sha256:'+await hash(changed);
   await assert.rejects(requireLinuxClassification(modified,storeArchive([...files].map(([name,bytes])=>({name,bytes})))),/inconsistent/);
  }
  for(const purposes of [[],['witnessops_local_server_audit_receipt'],['witnessops_local_server_audit_proofpack']]) {
   const registry=JSON.parse(Buffer.from(input.trust_registry.bytes).toString());registry.keys[0].purposes=purposes;
   assert.equal((await verifyProofpack({...input,trust_registry:{name:'wrong.json',bytes:Buffer.from(JSON.stringify(registry))}})).status,'invalid');
  }
  const keys=generateKeyPairSync('ed25519');
  const registry=JSON.parse(Buffer.from(input.trust_registry.bytes).toString());
  registry.keys.push({...registry.keys[0],public_key_id:'second_disposable_test',public_key:keys.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex')});
  const envelope=JSON.parse(Buffer.from(input.signature.bytes).toString());delete envelope.signature;envelope.public_key_id='second_disposable_test';
  envelope.signature=sign(null,Buffer.from(canonical(envelope)),keys.privateKey).toString('hex');
  const mismatch=await verifyProofpack({...input,signature:{name:input.signature.name,bytes:Buffer.from(JSON.stringify(envelope))},trust_registry:{name:'test.json',bytes:Buffer.from(JSON.stringify(registry))}});
  assert.equal(mismatch.checks.proofpack_detached_signature.status,'passed');
  assert.equal(mismatch.checks.transport_receipt_signer_continuity.status,'failed');assert.equal(mismatch.status,'invalid');
  assert.equal((await verifyProofpack({...input,signature:{name:input.signature.name,bytes:Buffer.from(JSON.stringify(envelope))}})).status,'invalid');
  const corrupt=Buffer.from(bytes);corrupt[30]^=1;
  assert.equal((await verifyProofpack({...input,proofpack:{name,bytes:corrupt}})).status,'invalid');
  for(const change of [{synthetic:kind!=='synthetic'},{data_classification:'fixture'},{synthetic:null}]) {
   const modified=structuredClone(result);Object.assign(modified.report!.posture,change);
   await assert.rejects(requireLinuxClassification(modified,bytes),/inconsistent/);
  }
 });
}
