import '../../../../../tests/proofpack/register-report-css.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { syntheticProofpackAdapter } from '../../../../../tests/proofpack/synthetic-adapter';
import { ReportEvidenceGraph } from '../../components/proofpack/report-evidence-graph';
import { createReportGraph } from './report-graph-model';
import { createReportModel, type ProofpackReportV1, type ReportModelInput } from './report-model';

const GENERATED_AT = '2026-09-29T02:30:00.000Z';

test('graph is a deterministic, immutable projection of the admitted report', () => {
    const model = syntheticProofpackAdapter(GENERATED_AT);
    const before = JSON.stringify(model);
    const graph = createReportGraph(model);
    assert.ok(graph);
    assert.equal(graph.reportId, model.identity.reportId);
    assert.equal(graph.sourceDigest, model.identity.sourceDigest);
    assert.equal(graph.boundary, model.verification.boundary);
    assert.equal(JSON.stringify(model), before);
    assert.ok(Object.isFrozen(graph));
    assert.ok(Object.isFrozen(graph.nodes));
    assert.ok(Object.isFrozen(graph.edges));

    const ids = new Set(graph.nodes.map(node => node.id));
    assert.equal(ids.size, graph.nodes.length);
    for (const edge of graph.edges) {
        assert.ok(ids.has(edge.from), edge.from);
        assert.ok(ids.has(edge.to), edge.to);
        assert.ok(edge.sourceField.length > 0);
    }

    assert.equal(graph.nodes.filter(node => node.kind === 'coverage').length, model.coverage.length);
    assert.equal(graph.nodes.filter(node => node.kind === 'finding').length, model.findings.length);
    assert.equal(graph.nodes.filter(node => node.kind === 'unknown').length, model.unknowns.length);
    assert.equal(graph.nodes.filter(node => node.kind === 'collection-gap').length, model.collectionGaps.length);
    assert.equal(graph.nodes.filter(node => node.kind === 'verification-check').length, model.verificationChecks.length);
    assert.equal(graph.nodes.filter(node => node.kind === 'provenance').length, model.provenance.length);
    assert.deepEqual(
        graph.nodes.filter(node => node.kind === 'evidence-reference').map(node => node.reference),
        model.findings.flatMap(finding => finding.evidence),
    );
});

test('repeated labels and evidence strings do not create inferred identity joins', () => {
    const base = syntheticProofpackAdapter(GENERATED_AT);
    const input = structuredClone(base) as ReportModelInput;
    const first = input.findings[0];
    input.findings.push({
        ...first,
        id: 'same-looking-second-finding',
        evidence: [...first.evidence],
        sourceRefs: [...first.sourceRefs],
    });
    input.summary.findings.total = 2;
    input.summary.findings.needsAttention = 2;
    input.summary.findings.severities = { medium: 2 };

    const graph = createReportGraph(createReportModel(input));
    assert.ok(graph);
    const findings = graph.nodes.filter(node => node.kind === 'finding');
    const evidence = graph.nodes.filter(node => node.kind === 'evidence-reference');
    assert.equal(findings.length, 2);
    assert.equal(findings[0].label, findings[1].label);
    assert.notEqual(findings[0].id, findings[1].id);
    assert.equal(evidence.length, 2);
    assert.equal(evidence[0].reference, evidence[1].reference);
    assert.notEqual(evidence[0].id, evidence[1].id);
    assert.equal(
        graph.edges.filter(edge => edge.relation === 'cites').length,
        2,
    );
});

test('a recipient-style model with evidence references removed cannot recreate evidence nodes', () => {
    const base = syntheticProofpackAdapter(GENERATED_AT);
    const input = structuredClone(base) as ReportModelInput;
    input.findings = input.findings.map(finding => ({
        ...finding,
        evidence: [],
        sourceRefs: [],
    }));
    input.sourceArtifacts = [];

    const graph = createReportGraph(createReportModel(input));
    assert.ok(graph);
    assert.equal(graph.nodes.some(node => node.kind === 'evidence-reference'), false);
    assert.equal(graph.edges.some(edge => edge.relation === 'cites'), false);
});

test('rejected report semantics fail closed and render no graph', () => {
    const good = syntheticProofpackAdapter(GENERATED_AT);
    const rejected = {
        ...good,
        verificationChecks: [{ ...good.verificationChecks[0], status: 'failed' as const }],
    } as ProofpackReportV1;
    assert.equal(createReportGraph(rejected), null);
    assert.equal(renderToStaticMarkup(<ReportEvidenceGraph model={rejected} />), '');
});

test('renderer exposes relationship provenance without becoming proof authority', () => {
    const model = syntheticProofpackAdapter(GENERATED_AT);
    const html = renderToStaticMarkup(<ReportEvidenceGraph model={model} />);
    assert.match(html, /REPORT RELATIONSHIP MAP/);
    assert.match(html, /EXPERIMENTAL PRESENTATION/);
    assert.match(html, /findings\[0\]\.evidence\[0\]/);
    assert.match(html, /presentation projection only/i);
    assert.match(html, /does not add evidence/i);
    assert.ok(html.includes(model.verification.boundary));
    assert.doesNotMatch(html, /overall security grade|system is secure/i);
});

test('graph slice has no Morpheus runtime, network call or route-side effect', () => {
    const modelSource = readFileSync(new URL('./report-graph-model.ts', import.meta.url), 'utf8');
    const componentSource = readFileSync(new URL('../../components/proofpack/report-evidence-graph.tsx', import.meta.url), 'utf8');
    const source = modelSource + '\n' + componentSource;
    assert.doesNotMatch(source, /from ['"][^'"]*morpheus|fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|window\.|document\./);
    assert.doesNotMatch(source, /use client/);
});
