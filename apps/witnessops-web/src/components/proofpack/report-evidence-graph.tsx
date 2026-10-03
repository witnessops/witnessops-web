import type { ProofpackReportV1 } from '../../lib/proofpack/report-model';
import {
    createReportGraph,
    type ReportGraphEdge,
    type ReportGraphLane,
    type ReportGraphNode,
    type ReportGraphRelation,
} from '../../lib/proofpack/report-graph-model';
import styles from './report-evidence-graph.module.css';

const LANES: readonly { id: ReportGraphLane; label: string; description: string }[] = [
    { id: 'scope', label: 'Scope', description: 'Recorded coverage in this fixed report revision.' },
    { id: 'findings', label: 'Findings', description: 'Recorded findings without an inferred overall grade.' },
    { id: 'limits', label: 'Unknowns & gaps', description: 'Missing evidence and collection limits stay visible.' },
    { id: 'proof', label: 'Evidence & verification', description: 'Recorded references, checks and provenance.' },
];

const RELATION_LABELS: Record<ReportGraphRelation, string> = {
    covers: 'covers',
    records: 'records',
    cites: 'cites',
    limited_by: 'limited by',
    describes_verification: 'verification',
    checks: 'checks',
    derived_from: 'derived from',
};

function incomingFor(node: ReportGraphNode, edges: readonly ReportGraphEdge[]) {
    return edges.filter(edge => edge.to === node.id);
}

function outgoingFor(node: ReportGraphNode, edges: readonly ReportGraphEdge[]) {
    return edges.filter(edge => edge.from === node.id);
}

function stateLabel(node: ReportGraphNode) {
    if (node.severity) return `${node.state ?? 'recorded'} · ${node.severity}`;
    return node.state;
}

function NodeCard({ node, nodes, edges }: {
    node: ReportGraphNode;
    nodes: readonly ReportGraphNode[];
    edges: readonly ReportGraphEdge[];
}) {
    const incoming = incomingFor(node, edges);
    const outgoing = outgoingFor(node, edges);
    const nodeById = new Map(nodes.map(candidate => [candidate.id, candidate]));
    return <details className={styles.node} data-kind={node.kind}>
        <summary>
            <span className={styles.kind}>{node.kind.replaceAll('-', ' ')}</span>
            <strong>{node.label}</strong>
            {stateLabel(node) && <span className={styles.state}>{stateLabel(node)}</span>}
        </summary>
        {node.detail && <p>{node.detail}</p>}
        {node.reference && <p className={styles.reference}>{node.reference}</p>}
        {incoming.length > 0 && <div className={styles.relations} aria-label="Incoming relationships">
            {incoming.map(edge => {
                const from = nodeById.get(edge.from);
                return <p key={edge.id}>
                    <span>{RELATION_LABELS[edge.relation]}</span>
                    <strong>{from?.label ?? edge.from}</strong>
                    <small>from <code>{edge.sourceField}</code></small>
                </p>;
            })}
        </div>}
        {outgoing.length > 0 && <div className={styles.relations} aria-label="Outgoing relationships">
            {outgoing.map(edge => {
                const to = nodeById.get(edge.to);
                return <p key={edge.id}>
                    <span>{RELATION_LABELS[edge.relation]} →</span>
                    <strong>{to?.label ?? edge.to}</strong>
                    <small>from <code>{edge.sourceField}</code></small>
                </p>;
            })}
        </div>}
    </details>;
}

/**
 * Experimental presentation only. It is intentionally not wired into any route,
 * report tab or export flow by this change.
 */
export function ReportEvidenceGraph({ model, className = '' }: {
    model: ProofpackReportV1 | null | undefined;
    className?: string;
}) {
    const graph = createReportGraph(model);
    if (!graph) return null;
    const root = graph.nodes.find(node => node.id === graph.rootId);
    if (!root) return null;

    return <section className={`${styles.graph} ${className}`} aria-label="Report evidence graph">
        <header className={styles.header}>
            <p className={styles.eyebrow}>REPORT RELATIONSHIP MAP · EXPERIMENTAL PRESENTATION</p>
            <h2>{root.label}</h2>
            <p>{root.detail}</p>
            <dl className={styles.identity}>
                <div><dt>Report</dt><dd>{graph.reportId}</dd></div>
                <div><dt>Source</dt><dd><code>sha256:{graph.sourceDigest}</code></dd></div>
            </dl>
        </header>

        <article className={styles.root}>
            <span>Fixed report revision</span>
            <strong>{root.label}</strong>
            <small>All relationships below are projected from named fields in the admitted report model.</small>
        </article>

        <div className={styles.lanes}>
            {LANES.map(lane => {
                const laneNodes = graph.nodes
                    .filter(node => node.lane === lane.id)
                    .sort((a, b) => a.order - b.order);
                return <section className={styles.lane} key={lane.id} aria-labelledby={`graph-lane-${lane.id}`}>
                    <header>
                        <h3 id={`graph-lane-${lane.id}`}>{lane.label}</h3>
                        <p>{lane.description}</p>
                    </header>
                    {laneNodes.length
                        ? laneNodes.map(node => <NodeCard key={node.id} node={node} nodes={graph.nodes} edges={graph.edges} />)
                        : <p className={styles.empty}>Nothing recorded in this lane.</p>}
                </section>;
            })}
        </div>

        <footer className={styles.footer}>
            <p className={styles.boundary}>{graph.boundary}</p>
            <p>This graph is a presentation projection only. It does not add evidence, infer identity, authenticate a source, extend scope or replace the fixed report/PDF export.</p>
        </footer>
    </section>;
}
