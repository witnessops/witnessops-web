import { isBuyerReport, type ProofpackReportV1 } from './report-model';

export const REPORT_GRAPH_MODEL_V0_1 = '0.1' as const;

export type ReportGraphLane = 'scope' | 'findings' | 'limits' | 'proof';
export type ReportGraphNodeKind =
    | 'report'
    | 'coverage'
    | 'finding'
    | 'evidence-reference'
    | 'unknown'
    | 'collection-gap'
    | 'verification'
    | 'verification-check'
    | 'provenance';
export type ReportGraphRelation =
    | 'covers'
    | 'records'
    | 'cites'
    | 'limited_by'
    | 'describes_verification'
    | 'checks'
    | 'derived_from';

export type ReportGraphNode = Readonly<{
    id: string;
    kind: ReportGraphNodeKind;
    lane: ReportGraphLane | 'root';
    order: number;
    label: string;
    detail: string | null;
    state: string | null;
    severity: string | null;
    reference: string | null;
}>;

export type ReportGraphEdge = Readonly<{
    id: string;
    from: string;
    to: string;
    relation: ReportGraphRelation;
    sourceField: string;
}>;

export type ReportGraphModel = Readonly<{
    version: typeof REPORT_GRAPH_MODEL_V0_1;
    reportId: string;
    sourceDigest: string;
    rootId: string;
    boundary: string;
    nodes: readonly ReportGraphNode[];
    edges: readonly ReportGraphEdge[];
}>;

function freezeGraph(graph: Omit<ReportGraphModel, 'nodes' | 'edges'> & {
    nodes: ReportGraphNode[];
    edges: ReportGraphEdge[];
}): ReportGraphModel {
    graph.nodes.forEach(Object.freeze);
    graph.edges.forEach(Object.freeze);
    return Object.freeze({
        ...graph,
        nodes: Object.freeze(graph.nodes),
        edges: Object.freeze(graph.edges),
    });
}

/**
 * Deterministic presentation projection of an already-admitted buyer report.
 *
 * This does not verify source evidence, discover relationships, join identities,
 * or create new claims. Every edge names the exact report-model field that
 * caused it to exist. Repeated labels or reference strings remain separate nodes.
 */
export function createReportGraph(
    model: ProofpackReportV1 | null | undefined,
): ReportGraphModel | null {
    if (!isBuyerReport(model)) return null;

    const rootId = 'report:root';
    const nodes: ReportGraphNode[] = [];
    const edges: ReportGraphEdge[] = [];
    const addNode = (node: ReportGraphNode) => nodes.push(node);
    const addEdge = (
        from: string,
        to: string,
        relation: ReportGraphRelation,
        sourceField: string,
    ) => edges.push(Object.freeze({
        id: `edge:${edges.length + 1}`,
        from,
        to,
        relation,
        sourceField,
    }));

    addNode({
        id: rootId,
        kind: 'report',
        lane: 'root',
        order: 0,
        label: model.subject.label,
        detail: model.subject.scopeSummary,
        state: null,
        severity: null,
        reference: model.identity.reportId,
    });

    model.coverage.forEach((item, index) => {
        const id = `coverage:${index + 1}`;
        addNode({
            id,
            kind: 'coverage',
            lane: 'scope',
            order: index,
            label: item.label,
            detail: item.observedState
                ? `Recorded outcome: ${item.observedState}`
                : 'No recorded outcome.',
            state: item.complete ? 'complete' : 'incomplete',
            severity: null,
            reference: item.id,
        });
        addEdge(rootId, id, 'covers', `coverage[${index}]`);
    });

    model.findings.forEach((finding, index) => {
        const id = `finding:${index + 1}`;
        addNode({
            id,
            kind: 'finding',
            lane: 'findings',
            order: index,
            label: finding.title,
            detail: finding.recommendation ?? finding.interpretation ?? 'No next step recorded.',
            state: finding.state,
            severity: finding.severity,
            reference: finding.checkId ?? finding.id,
        });
        addEdge(rootId, id, 'records', `findings[${index}]`);

        finding.evidence.forEach((reference, evidenceIndex) => {
            const evidenceId = `finding:${index + 1}:evidence:${evidenceIndex + 1}`;
            addNode({
                id: evidenceId,
                kind: 'evidence-reference',
                lane: 'proof',
                order: nodes.length,
                label: reference,
                detail: 'Evidence reference recorded on this finding.',
                state: null,
                severity: null,
                reference,
            });
            addEdge(id, evidenceId, 'cites', `findings[${index}].evidence[${evidenceIndex}]`);
        });
    });

    model.unknowns.forEach((unknown, index) => {
        const id = `unknown:${index + 1}`;
        addNode({
            id,
            kind: 'unknown',
            lane: 'limits',
            order: index,
            label: unknown.title,
            detail: unknown.evidenceNeeded
                ? `${unknown.reason} Evidence needed: ${unknown.evidenceNeeded}`
                : unknown.reason,
            state: 'unknown',
            severity: null,
            reference: unknown.id,
        });
        addEdge(rootId, id, 'limited_by', `unknowns[${index}]`);
    });

    model.collectionGaps.forEach((gap, index) => {
        const id = `gap:${index + 1}`;
        addNode({
            id,
            kind: 'collection-gap',
            lane: 'limits',
            order: model.unknowns.length + index,
            label: gap.label,
            detail: gap.reason,
            state: 'incomplete',
            severity: null,
            reference: gap.id,
        });
        addEdge(rootId, id, 'limited_by', `collectionGaps[${index}]`);
    });

    const verificationId = 'verification:summary';
    addNode({
        id: verificationId,
        kind: 'verification',
        lane: 'proof',
        order: 0,
        label: model.verification.label,
        detail: model.verification.method,
        state: 'passed',
        severity: null,
        reference: model.verification.verifierVersion,
    });
    addEdge(rootId, verificationId, 'describes_verification', 'verification');

    model.verificationChecks.forEach((check, index) => {
        const id = `verification-check:${index + 1}`;
        addNode({
            id,
            kind: 'verification-check',
            lane: 'proof',
            order: index + 1,
            label: check.label,
            detail: check.detail,
            state: check.status,
            severity: null,
            reference: check.id,
        });
        addEdge(verificationId, id, 'checks', `verificationChecks[${index}]`);
    });

    model.provenance.forEach((record, index) => {
        const id = `provenance:${index + 1}`;
        addNode({
            id,
            kind: 'provenance',
            lane: 'proof',
            order: model.verificationChecks.length + index + 1,
            label: record.label,
            detail: `${record.mechanism}. ${record.relationship}`,
            state: null,
            severity: null,
            reference: record.value,
        });
        addEdge(rootId, id, 'derived_from', `provenance[${index}]`);
    });

    const ids = new Set(nodes.map(node => node.id));
    if (ids.size !== nodes.length || edges.some(edge => !ids.has(edge.from) || !ids.has(edge.to))) {
        throw new Error('Inconsistent report graph projection.');
    }

    return freezeGraph({
        version: REPORT_GRAPH_MODEL_V0_1,
        reportId: model.identity.reportId,
        sourceDigest: model.identity.sourceDigest,
        rootId,
        boundary: model.verification.boundary,
        nodes,
        edges,
    });
}
