import '../../../../../tests/proofpack/register-report-css.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuyerReportDocument } from '../../components/proofpack/buyer-report';
import { externalExposureReportModel } from '../external-exposure/report-model';

test('EE collected evidence, determined outcomes and informational disposition remain distinct', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json', import.meta.url), 'utf8'));
  // A response can provide evidence without establishing a determined result.
  for (const check of snapshot.checks) { check.status = 'UNDETERMINED'; check.collected = false; }
  snapshot.checks[0].collected = true;
  snapshot.checks[1].status = 'INFORMATIONAL'; snapshot.checks[1].collected = true;
  const model = externalExposureReportModel(snapshot, { digest: 'a'.repeat(64), serialization: 'witnessops-canonical-json-v1' });
  const before = JSON.stringify(model);
  const html = renderToStaticMarkup(<BuyerReportDocument model={model} />);
  assert.match(html, /Checks with collected evidence/);
  assert.match(html, /<strong>2 \/ 10<\/strong>/);
  assert.match(html, /1 determined outcomes/);
  assert.match(html, /9 undetermined/);
  assert.match(html, /Informational observations/);
  assert.match(html, /context, not attention flags/);
  assert.doesNotMatch(html, /Observations completed|Review the findings with the responsible owner/);
  assert.equal(JSON.stringify(model), before);
  assert.equal(model.findings[0].severity, null);
});
