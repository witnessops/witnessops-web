import { createReportModel, type ProofpackReportV1 } from '../../../witnessops-web/src/lib/proofpack/report-model';
export type RecipientReport = ProofpackReportV1 & { readonly sharedTitle?: string };
export function reportTitle(report: RecipientReport): string {
    return report.sharedTitle || `${report.identity.productName} — ${report.subject.label}`;
}
export function validateReportName(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 120 || /[\u0000-\u001f\u007f]/.test(value))
        throw new Error('Use a report name of 1–120 characters without control characters.');
    return value.trim();
}
/** Recipient allowlist: never serialize the original model, source objects or attachments. */
export function recipientReport(source: ProofpackReportV1, name?: string): RecipientReport {
    const text = (value: string) => value
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email omitted]')
        .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[internal identifier omitted]')
        .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, '[credential omitted]')
        .replace(/-----BEGIN[\s\S]*?-----END[^\n]*-----/g, '[private material omitted]')
        .replace(/\b(?:sk_(?:live|test)_|ghp_|github_pat_)[A-Za-z0-9_-]+\b/g, '[credential omitted]');
    const strings = (values: readonly string[]) => values.map(text);
    const findings = source.findings.map((f, i) => ({
        id: `finding-${i + 1}`, title: text(f.title), severity: f.severity, state: f.state,
        observation: 'Detailed source observations are excluded from this shared revision.', evidence: [], sourceRefs: [],
        interpretation: f.interpretation === null ? null : text(f.interpretation),
        recommendation: f.recommendation === null ? null : text(f.recommendation), limitations: strings(f.limitations),
    }));
    const model = createReportModel({
        reportVersion: '1.0',
        identity: { reportId: 'shared-report', sourceDigest: source.identity.sourceDigest, productId: source.identity.productId,
            productVersion: source.identity.productVersion, productName: text(source.identity.productName), generatedAt: source.identity.generatedAt, synthetic: source.identity.synthetic },
        // Original references may be internal asset IDs; the recipient sees the subject label only.
        subject: { label: text(source.subject.label), reference: text(source.subject.label), observedAt: source.subject.observedAt,
            scopeSummary: text(source.subject.scopeSummary), scopeTitle: text(source.subject.scopeTitle), scopeBoundary: text(source.subject.scopeBoundary), kicker: text(source.subject.kicker) },
        verification: { status: source.verification.status, label: text(source.verification.label), method: text(source.verification.method), verifierVersion: source.verification.verifierVersion,
            boundary: text(source.verification.boundary), established: strings(source.verification.established) },
        summary: { checks: source.summary.checks ? { total: source.summary.checks.total, passed: source.summary.checks.passed, needsAttention: source.summary.checks.needsAttention, informational: source.summary.checks.informational, undetermined: source.summary.checks.undetermined } : null,
            coverage: { total: source.summary.coverage.total, complete: source.summary.coverage.complete, undetermined: source.summary.coverage.undetermined },
            findings: { total: source.summary.findings.total, needsAttention: source.summary.findings.needsAttention, informational: source.summary.findings.informational,
                severities: Object.fromEntries(Object.entries(source.summary.findings.severities).map(([key, value]) => [text(key), value])), ...(source.summary.findings.unassessed === undefined ? {} : { unassessed: source.summary.findings.unassessed }) } },
        coverage: source.coverage.map((c, i) => ({ id: `coverage-${i + 1}`, label: text(c.label), complete: c.complete, observedState: c.observedState, observation: null })), findings,
        unknowns: source.unknowns.map((u, i) => ({ id: `unknown-${i + 1}`, title: text(u.title), reason: text(u.reason), ...(u.evidenceNeeded ? { evidenceNeeded: text(u.evidenceNeeded) } : {}) })),
        collectionGaps: source.collectionGaps.map((g, i) => ({ id: `gap-${i + 1}`, label: text(g.label), reason: text(g.reason), observation: null })),
        provenance: [{ id: 'source', label: 'Source digest', value: source.identity.sourceDigest, mechanism: 'SHA-256 identifier recorded with the saved source', relationship: 'Identifies source bytes; does not establish that findings are true. Original source is not included.' }],
        verificationChecks: source.verificationChecks.map((c, i) => ({ id: `check-${i + 1}`, label: text(c.label), status: c.status, detail: 'Recorded source-admission check. Private verification detail is excluded.' })),
        sourceArtifacts: [], declaredExclusions: [...strings(source.declaredExclusions), 'Raw attachments, detailed observations, member emails, internal workspace/run/asset identifiers and comparison history are not included.'],
        reproduction: { steps: [{ title: 'Request source separately', description: 'Ask the report owner for appropriately scoped source evidence. This link grants no workspace or collection access.' }], trustBoundary: text(source.reproduction.trustBoundary) },
    });
    const title = validateReportName(name);
    return title === undefined ? model : Object.freeze({ ...model, sharedTitle: text(title) });
}
