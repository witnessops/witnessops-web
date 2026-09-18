import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { externalExposureReportModel } from '../../../witnessops-web/src/lib/external-exposure/report-model';
import { recipientReport } from './share-projection';
import type { ReportModelInput } from '../../../witnessops-web/src/lib/proofpack/report-model';
const source = JSON.parse(readFileSync(new URL('../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json', import.meta.url), 'utf8'));
test('recipient allowlist excludes arbitrary fields, identifiers, raw content and email/credential material', () => {
    const model = structuredClone(externalExposureReportModel(source, { digest: 'a'.repeat(64), serialization: 'json-stringify' })) as ReportModelInput;
    model.identity.synthetic = true;
    model.identity.reportId = 'PRIVATE_RUN_ID';
    model.subject.reference = 'PRIVATE_ASSET_ID';
    model.provenance.push({ id: 'private', label: 'Secret', value: 'PRIVATE_PROVENANCE', mechanism: 'private', relationship: 'private' });
    model.sourceArtifacts.push({ id: 'private', label: 'Private', relationship: 'private', content: { credential: 'PRIVATE_ATTACHMENT' }, presentation: 'download' });
    model.coverage[0].observation = { secret: 'PRIVATE_OBSERVATION' };
    model.unknowns.push({ id: 'PRIVATE_UNKNOWN_ID', title: 'Unknown remains', reason: 'Not established for member@example.test; Bearer secretCredential' });
    Object.assign(model.summary.checks!, { credential: 'PRIVATE_EXTRA_FIELD' });
    const result = recipientReport(model), raw = JSON.stringify(result);
    for (const secret of ['PRIVATE_RUN_ID', 'PRIVATE_ASSET_ID', 'PRIVATE_PROVENANCE', 'PRIVATE_ATTACHMENT', 'PRIVATE_OBSERVATION', 'PRIVATE_UNKNOWN_ID', 'PRIVATE_EXTRA_FIELD', 'member@example.test', 'secretCredential'])
        assert.ok(!raw.includes(secret), secret);
    assert.equal(result.identity.synthetic, true);
    assert.ok(result.unknowns.some(x => x.title === 'Unknown remains'));
    assert.deepEqual(result.findings.map(x => x.limitations), model.findings.map(x => x.limitations));
    assert.equal(result.sourceArtifacts.length, 0);
    assert.ok(Object.isFrozen(result));
});
