import type { ProofpackReportV1 } from '../../../witnessops-web/src/lib/proofpack/report-model';

export type OutcomeBar = { label: string; count: number; tone: 'expected' | 'attention' | 'information' | 'unknown' };

/** Read only the admitted report totals. Missing check ledgers never imply passing checks. */
export function reportOutcomeChart(model: ProofpackReportV1): { label: string; total: number; bars: OutcomeBar[]; boundary: string } {
  const checks = model.summary.checks;
  return checks ? {
    label: 'Recorded check outcomes', total: checks.total,
    bars: [
      { label: 'Observed as expected', count: checks.passed, tone: 'expected' },
      { label: 'Needs attention', count: checks.needsAttention, tone: 'attention' },
      { label: 'Informational', count: checks.informational, tone: 'information' },
      { label: 'Undetermined', count: checks.undetermined, tone: 'unknown' },
    ],
    boundary: 'Individual check results, not a security score. Collection errors remain undetermined.',
  } : {
    label: 'Recorded findings', total: model.summary.findings.total,
    bars: [
      { label: 'Needs attention', count: model.summary.findings.needsAttention, tone: 'attention' },
      { label: 'Informational', count: model.summary.findings.informational, tone: 'information' },
    ],
    boundary: 'No complete individual-check ledger. Passing or undetermined checks cannot be inferred from these findings.',
  };
}

export type ReportReference = {
  key: string; reference: string; kind: 'evidence' | 'source';
  artifact: ProofpackReportV1['sourceArtifacts'][number] | null;
};

/** Resolve explicit source references by exact id/path only, never by a guessed filename or URL. */
export function findingReferences(model: ProofpackReportV1, finding: ProofpackReportV1['findings'][number]): ReportReference[] {
  return [
    ...Array.from(new Set(finding.evidence)).map(reference => ({ key: `evidence:${reference}`, reference, kind: 'evidence' as const, artifact: null })),
    ...Array.from(new Set(finding.sourceRefs)).map(reference => {
      const matches = model.sourceArtifacts.filter(artifact => artifact.id === reference || artifact.path === reference);
      return { key: `source:${reference}`, reference, kind: 'source' as const, artifact: matches.length === 1 ? matches[0] : null };
    }),
  ];
}
