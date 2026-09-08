import '../../../../../tests/proofpack/register-report-css.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuyerReportDocument } from '../../components/proofpack/buyer-report';
import { createReportModel, printBuyerReport, type ReportModelInput } from '../proofpack/report-model';
import { snapshotFixture } from '../../../../../tests/external-exposure/fixture';
import { externalExposureAdapter, validateExternalSnapshot } from './adapter';
import { CHECK_IDS, EXCLUSIONS, SNAPSHOT_BOUNDARY } from './contracts';

test('external adapter separates status, collection, unassessed severity and data admission', () => {
  const model = externalExposureAdapter(snapshotFixture());
  assert.deepEqual(model.summary.checks, { total: 10, passed: 5, needsAttention: 1, informational: 1, undetermined: 3 });
  assert.deepEqual(model.summary.coverage, { total: 10, complete: 8, undetermined: 2 });
  assert.deepEqual(model.summary.findings, { total: 2, needsAttention: 1, informational: 1, severities: {}, unassessed: 2 });
  assert.ok(model.findings.every(finding => finding.severity === null));
  assert.equal(model.findings[1].state, 'informational');
  assert.equal(model.verification.label, 'Snapshot data checks');
  assert.ok(model.verificationChecks.every(check => check.status === 'passed'));
  assert.equal(model.coverage[4].observedState, 'CHECK_ERROR');
  assert.equal(model.coverage[3].complete, true, 'An ambiguous result can have collected evidence');
  assert.ok(model.unknowns.some(item => item.id === CHECK_IDS[3]));
  assert.ok(!model.collectionGaps.some(item => item.id === CHECK_IDS[3]));
  assert.deepEqual(model.collectionGaps.map(item => item.id), [CHECK_IDS[4], CHECK_IDS[9]]);
  assert.deepEqual(model.declaredExclusions, EXCLUSIONS);
  assert.ok(model.subject.scopeBoundary.includes(SNAPSHOT_BOUNDARY));
});

test('source digest identifies exactly the owned source and includes network events', () => {
  const input = snapshotFixture();
  const model = externalExposureAdapter(input);
  const source = model.sourceArtifacts[0].content;
  assert.equal(createHash('sha256').update(JSON.stringify(source)).digest('hex'), model.identity.sourceDigest);
  assert.deepEqual(source, validateExternalSnapshot(input));
  assert.ok(JSON.stringify(source).includes('93.184.216.34'));
  assert.deepEqual(model, externalExposureAdapter(input));
  assert.ok(Object.isFrozen(model) && Object.isFrozen(model.sourceArtifacts[0].content));
  input.checks[0].observation = 'Changed later';
  assert.notEqual(JSON.stringify(source), JSON.stringify(input));
});

test('unsigned report renders original states and prints the same admitted immutable document', () => {
  const serverModel = externalExposureAdapter(snapshotFixture());
  const browserModel = createReportModel(JSON.parse(JSON.stringify(serverModel)) as ReportModelInput);
  const html = renderToStaticMarkup(<BuyerReportDocument model={browserModel} />);
  assert.match(html, /Snapshot data checks/);
  assert.match(html, /observations are unsigned/i);
  assert.match(html, /Severity not assessed/);
  assert.match(html, /CHECK_ERROR/);
  assert.match(html, /informational/);
  assert.doesNotMatch(html, /data-severity=|Local Audit|trusted registry/);
  let prints = 0;
  assert.equal(printBuyerReport(browserModel, () => {
    prints += 1;
    assert.equal(renderToStaticMarkup(<BuyerReportDocument model={browserModel} />), html);
  }), true);
  assert.equal(prints, 1);
});

const invalidCases: [string, (input: ReturnType<typeof snapshotFixture>) => void][] = [
  ['missing check', input => { input.checks.pop(); }],
  ['duplicated check', input => { input.checks[1].check_id = input.checks[0].check_id; }],
  ['unknown check', input => { Object.assign(input.checks[0], { check_id: 'unknown' }); }],
  ['wrong version', input => { Object.assign(input, { version: 'v2' }); }],
  ['wrong check version', input => { Object.assign(input.checks[0], { check_version: 'v2' }); }],
  ['unnormalized hostname', input => { input.target = 'EXAMPLE.COM'; }],
  ['private target', input => { input.target = '127.0.0.1'; }],
  ['mismatched target', input => { input.checks[0].target = 'other.example.com'; }],
  ['invalid time', input => { input.started_at = 'yesterday'; }],
  ['reversed time', input => { input.started_at = '2026-09-08T12:01:00.000Z'; }],
  ['collection window beyond the runtime allowance', input => { input.finished_at = '2026-09-08T12:00:31.001Z'; }],
  ['check outside window', input => { input.checks[0].finished_at = '2026-09-08T12:01:00.000Z'; }],
  ['invalid status', input => { Object.assign(input.checks[0], { status: 'SECURE' }); }],
  ['missing collected flag', input => { delete (input.checks[0] as Partial<typeof input.checks[0]>).collected; }],
  ['positive result without evidence collection', input => { input.checks[0].collected = false; }],
  ['error marked collected', input => { input.checks[4].collected = true; }],
  ['missing evidence', input => { input.checks[0].evidence = []; }],
  ['missing limitation', input => { input.checks[0].limitations = []; }],
  ['nonfinite observation', input => { input.checks[0].observation = NaN; }],
  ['undefined observation', input => { input.checks[0].observation = undefined; }],
  ['oversized source', input => { input.checks[0].observation = 'x'.repeat(1024 * 1024); }],
  ['oversized budget', input => { input.usage.redirects = 4; }],
  ['unknown budget', input => { Object.assign(input.usage, { unknown: 2 }); }],
  ['unknown network event', input => { Object.assign(input.network[0], { kind: 'exec' }); }],
  ['unsupported port', input => { Object.assign(input.network[0], { port: 22 }); }],
];
for (const [label, mutate] of invalidCases) test(`adapter rejects ${label}`, () => {
  const input = snapshotFixture();
  mutate(input);
  assert.throws(() => externalExposureAdapter(input));
});

test('untrusted observation text remains escaped', () => {
  const input = snapshotFixture();
  input.checks[1].observation = '<script>bad()</script>';
  input.checks[1].title = '<img src=x onerror=bad()>';
  const html = renderToStaticMarkup(<BuyerReportDocument model={externalExposureAdapter(input)} />);
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
});
