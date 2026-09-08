/** Stable presentation contract. Rejections are diagnostics, never buyer reports. */
export const PROOFPACK_REPORT_MODEL_V1 = '1.0' as const;
export const REPORT_TEMPLATE = 'proofpack-report/1.4';
type Immutable<T> = T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;
export type CoverageItem = { id: string; label: string; complete: boolean; observedState: string | null; observation: unknown };
export type ReportFinding = {
    id: string; checkId?: string; title: string; severity: string; state: string;
    observation: unknown; evidence: string[]; interpretation: string | null;
    recommendation: string | null; limitations: string[]; sourceRefs: string[];
};
export type UnknownItem = { id: string; title: string; reason: string; evidenceNeeded?: string };
export type GapItem = { id: string; label: string; reason: string; observation: unknown };
export type ProvenanceRecord = { id: string; label: string; value: string; digest?: string; mechanism: string; relationship: string };
export type VerificationCheck = { id: string; label: string; status: 'passed' | 'failed' | 'skipped'; detail: string };
export type SourceArtifact = {
    id: string; label: string; path?: string; digest?: string; relationship: string;
    content?: unknown; format?: 'json' | 'markdown';
    /** Dense originals remain downloadable; selected structured sources also appear in print. */
    presentation: 'appendix' | 'download';
};
export type ReportModelInput = {
    reportVersion: typeof PROOFPACK_REPORT_MODEL_V1;
    identity: { reportId: string; sourceDigest: string; productId: string; productVersion: string; productName: string; generatedAt: string; synthetic: boolean };
    subject: { label: string; reference: string; observedAt: string; scopeSummary: string; scopeTitle: string; scopeBoundary: string; kicker: string };
    verification: { status: 'VERIFIED'; label: string; method: string; verifierVersion: string; boundary: string; established: string[] };
    summary: {
        /** Null means the producer has no complete individual-check ledger. Never infer passes from absent findings. */
        checks: { total: number; passed: number; needsAttention: number; informational: number; undetermined: number } | null;
        coverage: { total: number; complete: number; undetermined: number };
        findings: { total: number; needsAttention: number; informational: number; severities: Record<string, number> };
    };
    coverage: CoverageItem[]; findings: ReportFinding[]; unknowns: UnknownItem[]; collectionGaps: GapItem[];
    provenance: ProvenanceRecord[]; verificationChecks: VerificationCheck[]; sourceArtifacts: SourceArtifact[];
    declaredExclusions: string[];
    reproduction: { steps: { title: string; description: string }[]; command?: string; trustBoundary: string };
};
export type ProofpackReportV1 = Immutable<ReportModelInput>;

/** Defensive presentation gate, not a substitute for the product verifier. */
export function isBuyerReport(model: ProofpackReportV1 | null | undefined): model is ProofpackReportV1 {
    return !!model && model.reportVersion === PROOFPACK_REPORT_MODEL_V1 && model.verification?.status === 'VERIFIED'
        && Array.isArray(model.verificationChecks) && model.verificationChecks.length > 0 && model.verificationChecks.every(check => check.status === 'passed');
}
export function createReportModel(input: ReportModelInput): ProofpackReportV1 {
    if (!isBuyerReport(input)) throw new Error('Buyer report requires passed verification.');
    const { coverage, findings, checks } = input.summary;
    const totals = [coverage.total, coverage.complete, coverage.undetermined, findings.total, findings.needsAttention, findings.informational, ...Object.values(findings.severities), ...Object.values(checks ?? {})];
    if (totals.some(n => !Number.isSafeInteger(n) || n < 0) || coverage.total !== input.coverage.length || coverage.complete !== input.coverage.filter(c => c.complete).length
        || coverage.undetermined !== coverage.total - coverage.complete
        || input.collectionGaps.length !== coverage.undetermined
        || findings.total !== input.findings.length || findings.total !== findings.needsAttention + findings.informational
        || Object.values(findings.severities).reduce((a, b) => a + b, 0) !== findings.total
        || (checks && checks.total !== checks.passed + checks.needsAttention + checks.informational + checks.undetermined)
        || !Number.isFinite(Date.parse(input.identity.generatedAt))) throw new Error('Inconsistent report model.');
    // Detach from mutable verifier output, preserving source order and supplied generation time.
    const model = structuredClone(input);
    function freeze(value: unknown) {
        if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    }
    freeze(model);
    return model;
}

/** Browser preview and print export consume the same already-generated model. */
export function printBuyerReport(model: ProofpackReportV1 | null | undefined, print: () => void): boolean {
    if (!isBuyerReport(model)) return false;
    print();
    return true;
}
