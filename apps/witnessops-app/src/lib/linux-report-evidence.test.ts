import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyProofpack } from '../../../witnessops-web/src/lib/proofpack/verify.mjs';
import { localAuditAdapter } from '../../../witnessops-web/src/lib/proofpack/local-audit-adapter';
import { pinnedRegistryInput } from '../../../witnessops-web/src/lib/proofpack/pinned-registry';
import { linuxReportEvidence } from './linux-report-evidence';

test('member graph receives only the uniquely bound posture; PDF model and checked source stay unchanged', async () => {
  const name = 'proofpack-pr_lsa_20260710120000_198fd7aceb.zip';
  const file = new URL(`../../../../tests/proofpack/production-fixtures/adverse/${name}`, import.meta.url);
  const result = await verifyProofpack({ proofpack: { name, bytes: readFileSync(file) }, signature: { name: name + '.sig.json', bytes: readFileSync(new URL(file.href + '.sig.json')) }, trust_registry: pinnedRegistryInput() });
  assert.equal(result.status, 'valid');
  const model = localAuditAdapter(result, '2026-10-12T00:00:00Z')!;
  const before = JSON.stringify({ model, result });
  const artifacts = linuxReportEvidence(model, result);
  const posture = artifacts.find(item => item.id === 'host_posture')!;
  assert.deepEqual(posture.content, result.report!.posture);
  assert.notEqual(posture.content, result.report!.posture);
  assert.equal(JSON.stringify({ model, result }), before);
  assert.deepEqual(artifacts.filter(item => item.id !== 'host_posture'), model.sourceArtifacts.filter(item => item.id !== 'host_posture'));
  assert.equal(model.sourceArtifacts.find(item => item.id === 'host_posture')!.content, undefined);

  for (const mutation of ['digest', 'path', 'duplicate', 'invalid', 'identity'] as const) {
    const changed = structuredClone(result);
    const bound = changed.report!.manifest.artifacts.find(item => item.artifact_id === 'host_posture')!;
    if (mutation === 'digest') bound.sha256 = 'sha256:' + '0'.repeat(64);
    if (mutation === 'path') bound.path = 'another.json';
    if (mutation === 'duplicate') changed.report!.manifest.artifacts.push({ ...bound });
    if (mutation === 'invalid') changed.status = 'invalid';
    if (mutation === 'identity') changed.proof_run_id = 'different-run';
    assert.deepEqual(linuxReportEvidence(model, changed), model.sourceArtifacts, mutation);
  }
});
