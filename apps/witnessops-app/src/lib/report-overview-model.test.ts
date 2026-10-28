import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateExternalSnapshot } from '../../../witnessops-web/src/lib/external-exposure/adapter';
import type { ReportModelInput } from '../../../witnessops-web/src/lib/proofpack/report-model';
import { savedRunReport } from './report-model';
import { canonicalSource } from './source-digest';
import { RECOMMENDED_PROFILE } from './model';
import { findingReferences, reportOutcomeChart } from './report-overview-model';
import { verifyProofpack } from '../../../witnessops-web/src/lib/proofpack/verify.mjs';
import { localAuditAdapter } from '../../../witnessops-web/src/lib/proofpack/local-audit-adapter';

function report() {
  const snapshot = validateExternalSnapshot(JSON.parse(readFileSync(new URL('../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json', import.meta.url), 'utf8')));
  const model = savedRunReport({ id: 'graph-test', assetId: 'asset', createdAt: snapshot.finished_at, snapshot, profile: RECOMMENDED_PROFILE, sourceDigest: createHash('sha256').update(canonicalSource(snapshot)).digest('hex') });
  return structuredClone(model) as ReportModelInput;
}

test('outcome chart preserves every admitted check count without changing source', () => {
  const model = report(), before = canonicalSource(model);
  model.summary.checks = { total: 10, passed: 4, needsAttention: 2, informational: 1, undetermined: 3 };
  const chart = reportOutcomeChart(model);
  assert.deepEqual(chart.bars.map(bar => bar.count), [4, 2, 1, 3]);
  assert.equal(chart.total, 10);
  assert.match(chart.boundary, /not a security score/);
  assert.match(chart.boundary, /errors remain undetermined/);
  // The chart does not mutate even a writable input projection.
  const changed = canonicalSource(model); reportOutcomeChart(model); assert.equal(canonicalSource(model), changed);
  assert.equal(canonicalSource(model.sourceArtifacts), canonicalSource(JSON.parse(before).sourceArtifacts));
});

test('missing check ledger uses only recorded finding dispositions, never inferred passes', () => {
  const model = report(); model.summary.checks = null;
  const chart = reportOutcomeChart(model);
  assert.equal(chart.total, model.summary.findings.total);
  assert.deepEqual(chart.bars.map(bar => bar.tone), ['attention', 'information']);
  assert.equal(chart.bars.reduce((sum, bar) => sum + bar.count, 0), model.summary.findings.total);
  assert.match(chart.boundary, /No complete individual-check ledger/);
  model.summary.findings = { total: 0, needsAttention: 0, informational: 0, severities: {} };
  assert.deepEqual(reportOutcomeChart(model).bars.map(bar => bar.count), [0, 0]);
});

test('map resolves only unique exact artifact references and keeps other text unresolved', () => {
  const model = report(), finding = model.findings[0];
  const artifact = model.sourceArtifacts[0];
  finding.sourceRefs = [artifact.path!, artifact.id, 'other/external-exposure-snapshot.json', 'https://example.test/external-exposure-snapshot.json', artifact.path!];
  finding.evidence = ['recorded:event:1', 'recorded:event:1', artifact.path!];
  const before = canonicalSource(model);
  const refs = findingReferences(model, finding);
  assert.equal(refs.length, 6);
  assert.equal(refs.filter(ref => ref.artifact).length, 3);
  assert.equal(refs.find(ref => ref.kind === 'evidence' && ref.reference === artifact.path)?.resolution, 'artifact');
  assert.equal(refs.find(ref => ref.reference === 'recorded:event:1')?.resolution, 'unresolved');
  assert.ok(refs.filter(ref => ref.reference.startsWith('other/') || ref.reference.startsWith('https:')).every(ref => ref.artifact === null));
  assert.equal(canonicalSource(model), before);
  model.sourceArtifacts.push({ ...artifact, id: 'second-artifact' });
  assert.equal(findingReferences(model, finding).find(ref => ref.kind === 'source' && ref.reference === artifact.path)?.artifact, null);
});


function oneReference(model: ReportModelInput, reference: string, artifacts = model.sourceArtifacts) {
  return findingReferences(model, { ...model.findings[0], evidence: [reference], sourceRefs: [] }, artifacts)[0];
}
async function linuxReport() {
  const dir = new URL('../../../../tests/proofpack/fixtures/adverse/', import.meta.url);
  const read = (name: string) => ({ name, bytes: new Uint8Array(readFileSync(new URL(name, dir))) });
  const name = 'proofpack-pr_lsa_20260710120000_198fd7aceb.zip';
  const result = await verifyProofpack({ proofpack: read(name), signature: read(`${name}.sig.json`), trust_registry: read('trusted-keys.json') });
  const admitted = localAuditAdapter(result, '2026-10-12T12:00:00Z');
  assert.ok(admitted && result.report);
  const model = structuredClone(admitted) as ReportModelInput;
  const artifacts = structuredClone(model.sourceArtifacts);
  const posture = artifacts.find(artifact => artifact.id === 'host_posture')!;
  // Separate member-only source projection; do not add contents to the report.
  posture.content = structuredClone(result.report.posture);
  posture.format = 'json';
  return { model, artifacts, posture };
}

test('hostname evidence selector opens its exact stored check without changing the report', () => {
  const model = report(), finding = model.findings[0], before = canonicalSource(model);
  const refs = findingReferences(model, finding);
  const resolved = refs.find(ref => ref.resolution === 'section');
  assert.ok(resolved);
  assert.equal(resolved.reference, `external-exposure-snapshot.json: checks[check_id=${finding.checkId}]`);
  assert.equal(resolved.artifact, model.sourceArtifacts[0]);
  assert.equal(resolved.section?.path, `checks[check_id=${finding.checkId}]`);
  const check = resolved.section?.value as { check_id: string; observation: unknown };
  assert.equal(check.check_id, finding.checkId);
  assert.deepEqual(check.observation, finding.observation);
  assert.equal(resolved.reason, null);
  assert.equal(refs.find(ref => ref.reference.startsWith('The source appendix'))?.resolution, 'unresolved');
  assert.equal(canonicalSource(model), before);
});

test('hostname selectors preserve missing checks, duplicate checks and duplicate artifact ambiguity', () => {
  const model = report(), artifact = model.sourceArtifacts[0];
  const content = artifact.content as { checks: { check_id: string }[] };
  const check = content.checks[0], reference = `external-exposure-snapshot.json: checks[check_id=${check.check_id}]`;
  content.checks = [check, { ...check }];
  assert.equal(oneReference(model, reference).resolution, 'ambiguous');
  content.checks = [];
  assert.equal(oneReference(model, reference).resolution, 'unresolved');
  content.checks = [check];
  model.sourceArtifacts.push({ ...artifact, id: 'duplicate' });
  assert.equal(oneReference(model, reference).resolution, 'ambiguous');
});

test('hostname selector requires a recognized selector and available structured snapshot content', () => {
  const model = report(), artifact = model.sourceArtifacts[0];
  const reference = 'external-exposure-snapshot.json: checks[check_id=mail.dmarc.v1]';
  for (const unsupported of [
    'other/external-exposure-snapshot.json: checks[check_id=mail.dmarc.v1]',
    'https://example.test/external-exposure-snapshot.json: checks[check_id=mail.dmarc.v1]',
    'external-exposure-snapshot.json: checks[0]',
    'external-exposure-snapshot.json: checks[check_id=unrecognized.v1]',
    `${reference}.observation`,
  ]) assert.equal(oneReference(model, unsupported).resolution, 'unresolved', unsupported);
  artifact.content = JSON.stringify(artifact.content);
  assert.equal(oneReference(model, reference).resolution, 'unresolved', 'does not parse opaque strings');
  artifact.content = { version: 'unknown', checks: [{ check_id: 'mail.dmarc.v1' }] };
  assert.equal(oneReference(model, reference).resolution, 'unresolved');
});

test('verified Linux references resolve against separately supplied exact posture contents', async () => {
  const { model, artifacts } = await linuxReport(), before = canonicalSource(model);
  assert.ok(findingReferences(model, model.findings[0]).every(ref => ref.resolution === 'unresolved'));
  for (const finding of model.findings) {
    const refs = findingReferences(model, finding, artifacts);
    assert.ok(refs.length > 0);
    assert.ok(refs.every(ref => ref.resolution === 'section' && ref.artifact?.id === 'host_posture'), finding.id);
  }
  assert.equal(oneReference(model, 'posture.sections.accounts.uid0_account_count', artifacts).section?.value, 2);
  assert.equal(oneReference(model, 'posture.sections.hardening.sysctl.kernel.kptr_restrict', artifacts).section?.value, '0');
  const files = oneReference(model, 'posture.sections.critical_files.files', artifacts).section?.value;
  assert.ok(Array.isArray(files) && files.length === 5, 'complete referenced section, not a finding-only subset');
  assert.equal(canonicalSource(model), before);
});

test('Linux resolution uses the semantic artifact id and retains duplicate identities as ambiguous', async () => {
  const { model, artifacts, posture } = await linuxReport();
  const reference = 'posture.sections.clock.ntp_synchronized';
  posture.path = 'renamed/checked-host-observations.json';
  assert.equal(oneReference(model, reference, artifacts).artifact?.path, posture.path);
  posture.id = 'some-other-artifact'; posture.path = 'posture.json';
  assert.equal(oneReference(model, reference, artifacts).resolution, 'unresolved', 'no conventional filename substitute');
  posture.id = 'host_posture'; artifacts.push({ ...posture, content: undefined });
  assert.equal(oneReference(model, reference, artifacts).resolution, 'ambiguous', 'missing content does not disambiguate duplicate artifacts');
});

test('section resolution distinguishes recorded null, zero, false and empty arrays from absence', async () => {
  const { model, artifacts, posture } = await linuxReport();
  const content = posture.content as { sections: Record<string, unknown> };
  content.sections.clock = { null_value: null, zero_value: 0, false_value: false, empty_list: [] };
  for (const [key, value] of Object.entries(content.sections.clock as Record<string, unknown>)) {
    const reference = oneReference(model, `posture.sections.clock.${key}`, artifacts);
    assert.equal(reference.resolution, 'section'); assert.deepEqual(reference.section?.value, value);
  }
  assert.equal(oneReference(model, 'posture.sections.clock.absent', artifacts).resolution, 'unresolved');
});

test('source paths never evaluate expressions or traverse inherited properties and accessors', async () => {
  const { model, artifacts, posture } = await linuxReport();
  const content = posture.content as { sections: Record<string, unknown> };
  let accessorCalls = 0;
  content.sections.clock = Object.defineProperty({}, 'status', { get: () => { accessorCalls++; return 'observed'; } });
  assert.equal(oneReference(model, 'posture.sections.clock.status', artifacts).resolution, 'unresolved');
  assert.equal(accessorCalls, 0);
  content.sections.clock = Object.create({ status: 'observed' });
  assert.equal(oneReference(model, 'posture.sections.clock.status', artifacts).resolution, 'unresolved');
  for (const reference of [
    'posture.sections.__proto__.polluted', 'posture.sections.clock.constructor',
    'posture.sections.clock.prototype', 'posture.sections.clock["status"]',
    'posture.sections.clock.status()', 'posture.sections.clock.*',
    'posture.sections.critical_files.files.0', 'posture.sections.clock.status;alert(1)',
    'posture.sections.' + 'a'.repeat(513), 'posture.sections.a.b.c.d.e.f.g.h.i',
  ]) assert.equal(oneReference(model, reference, artifacts).resolution, 'unresolved', reference);
});

test('literal sysctl references never guess a nested fallback and preserve competing meanings', async () => {
  const { model, artifacts, posture } = await linuxReport();
  const content = posture.content as { sections: { hardening: { sysctl: Record<string, unknown> } } };
  const reference = 'posture.sections.hardening.sysctl.kernel.kptr_restrict';
  content.sections.hardening.sysctl = { kernel: { kptr_restrict: '0' } };
  assert.equal(oneReference(model, reference, artifacts).resolution, 'unresolved');
  content.sections.hardening.sysctl['kernel.kptr_restrict'] = '0';
  const resolved = oneReference(model, reference, artifacts);
  assert.equal(resolved.resolution, 'ambiguous');
  assert.equal(resolved.artifact, null); assert.equal(resolved.section, null);
});

test('a reference that is both an artifact identity and a section selector stays ambiguous', () => {
  const model = report(), reference = 'external-exposure-snapshot.json: checks[check_id=mail.dmarc.v1]';
  model.sourceArtifacts.push({ ...model.sourceArtifacts[0], id: reference, path: 'another.json' });
  assert.equal(oneReference(model, reference).resolution, 'ambiguous');
});
