import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateExternalSnapshot } from '../../../witnessops-web/src/lib/external-exposure/adapter';
import type { ReportModelInput } from '../../../witnessops-web/src/lib/proofpack/report-model';
import { savedRunReport } from './report-model';
import { canonicalSource } from './source-digest';
import { RECOMMENDED_PROFILE } from './model';
import { reportFollowUpGuidance } from './report-follow-up-model';

function report() {
  const snapshot = validateExternalSnapshot(JSON.parse(readFileSync(new URL('../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json', import.meta.url), 'utf8')));
  return savedRunReport({ id: 'follow-up-test', assetId: 'asset', createdAt: snapshot.finished_at, snapshot, profile: RECOMMENDED_PROFILE, sourceDigest: createHash('sha256').update(canonicalSource(snapshot)).digest('hex') });
}
const mutableReport = () => structuredClone(report()) as ReportModelInput;

test('inconclusive collected results precede optional CAA review without inventing a collection failure', () => {
  const model = mutableReport();
  const legacy = model.coverage.find(item => item.id === 'tls.legacy_protocols.v1')!;
  legacy.complete = true; legacy.observedState = 'UNDETERMINED';
  model.collectionGaps = model.collectionGaps.filter(item => item.id !== legacy.id);
  const guidance = reportFollowUpGuidance(model);
  const item = guidance.items.find(item => item.key === `gap:${legacy.id}`)!;
  assert.equal(item.kind, 'evidence');
  assert.equal(item.target?.kind, 'coverage');
  assert.equal(item.target?.index, model.coverage.indexOf(legacy));
  assert.match(item.suggested.evidence, /TLS 1.0 and TLS 1.1/);
  assert.match(item.suggested.action, /local protocol error/);
  assert.ok(item.recordedReasons.includes('Recorded outcome: UNDETERMINED.'));
  assert.ok(!item.recordedReasons.includes('Collection is incomplete for this item.'));
  const caa = guidance.items.findIndex(item => item.title === 'CAA publication');
  assert.ok(caa > guidance.items.indexOf(item));
  assert.equal(guidance.items[caa].kind, 'information');
  assert.match(guidance.items[caa].suggested.action, /optional policy review/);
});

test('overlapping incomplete coverage, gap and unknown become one item with the recorded diagnostic intact', () => {
  const model = mutableReport();
  const id = 'web.hsts.v1', index = model.coverage.findIndex(item => item.id === id);
  model.coverage[index].complete = false; model.coverage[index].observedState = 'CHECK_ERROR';
  model.collectionGaps.push({ id, label: 'HSTS', reason: 'The HTTPS request timed out.', observation: null });
  model.unknowns.push({ id, title: 'HSTS', reason: 'No response was available.', evidenceNeeded: 'Recorded advice: obtain a successful HTTPS response.' });
  const matches = reportFollowUpGuidance(model).items.filter(item => item.key === `gap:${id}`);
  assert.equal(matches.length, 1);
  assert.ok(matches[0].recordedReasons.includes('The HTTPS request timed out.'));
  assert.ok(matches[0].recordedReasons.includes('No response was available.'));
  assert.equal(matches[0].recordedNextStep, 'Recorded advice: obtain a successful HTTPS response.');
  assert.match(matches[0].suggested.evidence, /Strict-Transport-Security/);
});

test('specific guidance requires the exact check and product identities, not a title or partial ID', () => {
  for (const id of ['copied-tls.legacy_protocols.v1', '__proto__', 'constructor']) {
    const model = mutableReport();
    model.coverage = [{ id, label: 'Legacy TLS protocols', complete: false, observedState: 'UNDETERMINED', observation: null }];
    model.collectionGaps = []; model.findings = []; model.unknowns = [];
    assert.doesNotMatch(reportFollowUpGuidance(model).items[0].suggested.evidence, /TLS 1.0/);
  }
  const model = mutableReport(); model.identity.productId = 'other-product';
  model.coverage = [{ id: 'tls.legacy_protocols.v1', label: 'Legacy TLS protocols', complete: false, observedState: 'UNDETERMINED', observation: null }];
  model.collectionGaps = []; model.findings = []; model.unknowns = [];
  assert.doesNotMatch(reportFollowUpGuidance(model).items[0].suggested.evidence, /TLS 1.0/);
});

test('Linux gaps preserve diagnostics and missing ledger without inferring passed checks or a known check identity', () => {
  const model = mutableReport(); model.identity.productId = 'local-audit'; model.summary.checks = null;
  model.coverage = [{ id: 'updates', label: 'updates', complete: false, observedState: 'partial', observation: { cache_only: true } }];
  model.collectionGaps = [{ id: 'updates', label: 'updates', reason: 'Cached update plan does not classify security updates.', observation: null }];
  model.findings = []; model.unknowns = [];
  const guidance = reportFollowUpGuidance(model);
  assert.equal(guidance.incompleteCheckLedger, true);
  assert.equal(guidance.evidenceGapCount, 1);
  assert.equal(guidance.items.length, 1);
  assert.ok(guidance.items[0].recordedReasons.includes('Cached update plan does not classify security updates.'));
  assert.match(guidance.items[0].suggested.evidence, /supported Local Audit collection/);
  assert.match(guidance.items[0].suggested.action, /do not change host settings/);
  assert.equal(guidance.items[0].recordedNextStep, null);
});

test('projection leaves the frozen report and recorded recommendation unchanged', () => {
  const model = report(), before = canonicalSource(model);
  const advice = reportFollowUpGuidance(model);
  assert.ok(advice.items.length);
  const caa = model.findings.find(item => item.checkId === 'dns.caa.v1')!;
  assert.equal(caa.recommendation, null);
  const item = advice.items.find(item => item.title === caa.title)!;
  assert.equal(item.recordedNextStep, null);
  item.suggested.action = 'Changed only in the returned presentation object.';
  assert.match(reportFollowUpGuidance(model).items.find(item => item.title === caa.title)!.suggested.action, /optional policy review/);
  assert.equal(canonicalSource(model), before);
});

test('no actionable records yields no invented advice from counts or general report unknowns', () => {
  const model = mutableReport(); model.summary.checks = null;
  model.coverage = []; model.collectionGaps = []; model.findings = [];
  const before = canonicalSource(model.unknowns);
  const guidance = reportFollowUpGuidance(model);
  assert.deepEqual(guidance.items, []);
  assert.equal(guidance.evidenceGapCount, 0);
  assert.equal(canonicalSource(model.unknowns), before);
});

test('unmatched recorded gaps keep a generic next step without inventing an evidence-map target', () => {
  const model = mutableReport();
  model.coverage = []; model.findings = []; model.unknowns = [];
  model.collectionGaps = [{ id: 'unlisted-section', label: 'Unlisted section', reason: 'No observation recorded.', observation: null }];
  const [item] = reportFollowUpGuidance(model).items;
  assert.equal(item.target, undefined);
  assert.deepEqual(item.recordedReasons, ['No observation recorded.']);
  assert.match(item.suggested.action, /supported, authorized follow-up/);
});


test('a finding overlapping a collection gap retains its recorded interpretation and recommendation', () => {
  const model = mutableReport();
  const finding = model.findings.find(item => item.checkId === 'dns.caa.v1')!;
  finding.recommendation = 'Keep this recorded recommendation.';
  model.collectionGaps.push({ id: finding.checkId!, label: finding.title, reason: 'Partial observation.', observation: null });
  const guidance = reportFollowUpGuidance(model);
  const matching = guidance.items.filter(item => item.title === finding.title);
  assert.equal(matching.length, 1);
  assert.equal(matching[0].kind, 'evidence');
  assert.equal(matching[0].recordedNextStep, finding.recommendation);
  assert.ok(matching[0].recordedReasons.includes(finding.interpretation!));
});
