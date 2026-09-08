import '../../../../../tests/proofpack/register-report-css.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { fixtureInput, fixtureModel, GENERATED_AT } from './test-support/render-fixture';
import { syntheticProofpackAdapter } from '../../../../../tests/proofpack/synthetic-adapter';
import { BuyerReportDocument } from '../../components/proofpack/buyer-report';
import { verifyProofpack } from './verify.mjs';
import { localAuditAdapter } from './local-audit-adapter';
import { createReportModel, isBuyerReport, printBuyerReport, type ProofpackReportV1, type ReportModelInput } from './report-model';

for (const name of ['complete', 'adverse', 'partial']) test(`Local Audit mapping is lossless for existing report content: ${name}`, async () => {
    const result = await verifyProofpack(fixtureInput(name));
    const raw = result.report!, model = localAuditAdapter(result, GENERATED_AT)!;
    assert.ok(isBuyerReport(model));
    assert.equal(model.summary.checks, null, 'No invented per-check security pass ledger');
    assert.equal(model.summary.coverage.total, raw.completeness.section_results.length);
    assert.equal(model.summary.coverage.complete, raw.completeness.section_results.filter(c => c.complete).length);
    assert.deepEqual(model.summary.findings.severities, raw.findings.counts);
    assert.equal(model.summary.findings.total, raw.findings.findings.length);
    assert.deepEqual(model.coverage.map(c => c.observation), raw.completeness.section_results.map(c => raw.posture.sections[c.section]));
    assert.deepEqual(model.collectionGaps.map(c => c.id), raw.completeness.section_results.filter(c => !c.complete).map(c => c.section));
    assert.equal(model.unknowns.length, 4);
    raw.findings.findings.forEach((f, i) => {
        const mapped = model.findings[i];
        assert.deepEqual(mapped, { id: f.finding_id, title: f.title, severity: f.severity, state: f.state, observation: f.observed_value, evidence: f.evidence_refs, interpretation: null, recommendation: f.recommendation, limitations: [f.claim_limit], sourceRefs: f.evidence_refs });
    });
    assert.deepEqual(model.verificationChecks.map(c => [c.id, c.status, c.detail]), Object.entries(result.checks).map(([id, c]) => [id, c.status, c.detail]));
    raw.manifest.artifacts.forEach(a => assert.ok(model.sourceArtifacts.some(s => s.path === a.path && s.digest === a.sha256.replace(/^sha256:/, ''))));
    assert.deepEqual(model.sourceArtifacts.find(s => s.id === 'checked-scope')?.content, raw.scope);
    assert.equal(model.sourceArtifacts.find(s => s.id === 'original-report')?.content, raw.originalReport);
    for (const [id, file] of Object.entries(result.verification_inputs)) assert.equal(model.provenance.find(p => p.id === id)?.digest, file.sha256);
    assert.deepEqual(model, localAuditAdapter(result, GENERATED_AT));
    assert.ok(Object.isFrozen(model) && Object.isFrozen(model.coverage[0]));
    raw.posture.target.hostname = 'mutated later';
    assert.equal(model.subject.label, 'demo-host');
});

for (const name of ['complete', 'adverse', 'partial', 'synthetic']) test(`Same browser document and print gate: ${name}`, async () => {
    const model = (await fixtureModel(name))!;
    const before = JSON.stringify(model);
    const html = renderToStaticMarkup(<BuyerReportDocument model={model} />);
    assert.match(html, /Derived buyer report/);
    assert.match(html, /Verification appendix/);
    assert.doesNotMatch(html, /sha256:sha256:/);
    assert.ok(html.includes(model.subject.label));
    for (const f of model.findings) assert.ok(html.includes(f.title.replaceAll('&', '&amp;').replaceAll('>', '&gt;')));
    assert.equal(printBuyerReport(model, () => { assert.equal(renderToStaticMarkup(<BuyerReportDocument model={model} />), html); }), true);
    assert.equal(JSON.stringify(model), before);
});

test('Synthetic report uses neutral semantics without claiming an audit or signed source', () => {
    const model = syntheticProofpackAdapter(GENERATED_AT);
    const html = renderToStaticMarkup(<BuyerReportDocument model={model} />);
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    // The fixture can truthfully disclaim signature verification. It cannot inherit
    // an existing signature, required collection contract, registry, or audit type.
    assert.doesNotMatch(text, /\b(?:local\s+audit|your\s+audit|trusted\s+registry|signed\s+package|original\s+proofpack\s+signature|required\s+collection)\b/i);
    assert.match(text, /report\s+at\s+a\s+glance/i);
    assert.match(text, /verification\s+and\s+provenance/i);
    assert.match(text, /source\s+artifacts/i);
    assert.match(text, /collection\s+coverage/i);
});

for (const name of ['complete', 'adverse', 'partial']) test(`Local Audit verification semantics remain adapter-provided: ${name}`, async () => {
    const model = (await fixtureModel(name))!;
    const html = renderToStaticMarkup(<BuyerReportDocument model={model} />);
    assert.ok(html.includes(model.verification.method));
    for (const statement of model.verification.established) assert.ok(html.includes(statement));
    for (const phrase of ['enclosed Local Audit package was checked against its detached signature', 'supplied registry', 'Manifest, evidence hashes', 'Local Audit 1.2.2 CLI', 'scope from checked authority']) {
        assert.ok(html.toLowerCase().includes(phrase.toLowerCase()), phrase);
    }
    assert.ok(html.includes('does not establish the registry supplier identity'));
    assert.ok(html.includes('This derived report is not covered by the detached signature on the enclosed Local Audit package.'));
    assert.ok(html.includes('This report does not establish a before/after change'));
});

test('Synthetic contract preserves all three check states and separate unknown/gap', () => {
    const model = syntheticProofpackAdapter(GENERATED_AT);
    assert.deepEqual(model.summary.checks, { total: 3, passed: 1, needsAttention: 1, informational: 0, undetermined: 1 });
    assert.equal(model.findings.length, 1); assert.equal(model.unknowns.length, 1); assert.equal(model.collectionGaps.length, 1);
    assert.equal(model.provenance.length, 1); assert.equal(model.sourceArtifacts.length, 1); assert.equal(model.verificationChecks.length, 1);
    assert.deepEqual(model, syntheticProofpackAdapter(GENERATED_AT));
});

for (const name of ['tampered', 'wrong-registry', 'signed-bad-findings', 'signed-bad-coverage', 'signed-bad-authority', 'signed-bad-embedded']) test(`Rejected package cannot produce a model: ${name}`, async () => {
    const result = await verifyProofpack(fixtureInput(name));
    assert.equal(localAuditAdapter(result, GENERATED_AT), null);
    // Even accidentally attaching a verified report must not override rejection.
    result.report = (await verifyProofpack(fixtureInput('complete'))).report;
    assert.equal(localAuditAdapter(result, GENERATED_AT), null);
});

test('Missing registry, missing/failed checks and unsupported verifier stay closed', async () => {
    const files = fixtureInput('complete'); delete files.trust_registry;
    assert.equal(localAuditAdapter(await verifyProofpack(files), GENERATED_AT), null);
    const good = await verifyProofpack(fixtureInput('complete'));
    for (const status of ['failed', 'skipped'] as const) {
        const bad = structuredClone(good); bad.checks['core.signer_trust'].status = status;
        assert.equal(localAuditAdapter(bad, GENERATED_AT), null);
    }
    const missing = structuredClone(good); delete missing.checks['core.signer_trust'];
    assert.equal(localAuditAdapter(missing, GENERATED_AT), null);
    assert.equal(localAuditAdapter({ ...good, verifier_version: 'unknown' }, GENERATED_AT), null);
});

test('Model factory, renderer and print helper independently reject rejection', () => {
    const good = syntheticProofpackAdapter(GENERATED_AT);
    const rejected = { ...good, verification: { ...good.verification, status: 'REJECTED' } } as unknown as ProofpackReportV1;
    assert.throws(() => createReportModel(rejected as ReportModelInput), /passed verification/);
    assert.equal(renderToStaticMarkup(<BuyerReportDocument model={rejected} />), '');
    let called = false;
    for (const model of [null, rejected, { ...good, verificationChecks: [] }, { ...good, verificationChecks: [{ ...good.verificationChecks[0], status: 'failed' as const }] }]) assert.equal(printBuyerReport(model, () => { called = true; }), false);
    assert.equal(called, false);
    assert.throws(() => createReportModel({ ...good, summary: { ...good.summary, coverage: { total: 99, complete: 1, undetermined: 98 } } } as ReportModelInput), /Inconsistent/);
});

test('Generic document imports no verifier, adapter or product-specific structures', () => {
    const source = readFileSync(new URL('../../components/proofpack/buyer-report.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /verify\.mjs|local-audit|Local Audit|posture|completeness|finding_id|observed_value|productId\s*===/);
    assert.doesNotMatch(source, /your\s+audit|original\s+(?:proofpack\s+signature|signed\s+package)|required\s+collection|trusted\s+registry/i);
});

test('Report source identity is independent of provenance record order', async () => {
    const result = await verifyProofpack(fixtureInput('complete'));
    result.verification_inputs = Object.fromEntries(Object.entries(result.verification_inputs).reverse());
    const model = localAuditAdapter(result, GENERATED_AT)!;
    assert.equal(model.identity.sourceDigest, result.verification_inputs.proofpack.sha256);
});

test('Generic report treats all source text as text, including CSS page identity', () => {
    const base = syntheticProofpackAdapter(GENERATED_AT);
    const hostile = '</style><script>alert(1)</script><img src="https://invalid.example/leak">';
    const input = structuredClone(base) as ReportModelInput;
    input.subject.label = hostile;
    input.findings[0].title = hostile;
    input.findings[0].interpretation = hostile;
    input.sourceArtifacts[0].content = { text: hostile };
    const html = renderToStaticMarkup(<BuyerReportDocument model={createReportModel(input)} />);
    assert.doesNotMatch(html, /<script|<img|url\(/i);
    assert.ok(html.includes('&lt;script&gt;'));
});
