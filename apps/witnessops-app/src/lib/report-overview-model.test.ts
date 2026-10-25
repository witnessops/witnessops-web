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

test('map resolves only unique exact source references, keeping unresolved evidence explicit', () => {
  const model = report(), finding = model.findings[0];
  const artifact = model.sourceArtifacts[0];
  finding.sourceRefs = [artifact.path!, artifact.id, 'other/external-exposure-snapshot.json', 'https://example.test/external-exposure-snapshot.json', artifact.path!];
  finding.evidence = ['recorded:event:1', 'recorded:event:1', artifact.path!];
  const before = canonicalSource(model);
  const refs = findingReferences(model, finding);
  assert.equal(refs.length, 6);
  assert.equal(refs.filter(ref => ref.artifact).length, 2);
  assert.ok(refs.filter(ref => ref.kind === 'evidence').every(ref => ref.artifact === null));
  assert.ok(refs.filter(ref => ref.reference.startsWith('other/') || ref.reference.startsWith('https:')).every(ref => ref.artifact === null));
  assert.equal(canonicalSource(model), before);
  model.sourceArtifacts.push({ ...artifact, id: 'second-artifact' });
  assert.equal(findingReferences(model, finding).find(ref => ref.kind === 'source' && ref.reference === artifact.path)?.artifact, null);
});
