import type { ProofpackReportV1, ReportFinding } from '../../../witnessops-web/src/lib/proofpack/report-model';

/** Select recorded content without assigning severity or changing source order. */
export function reportNextSteps(model: ProofpackReportV1) {
  const attention = model.findings.filter(f => f.state !== 'informational' && f.severity !== 'informational');
  const information = model.findings.filter(f => f.state === 'informational' || f.severity === 'informational');
  return {
    kind: attention.length ? 'attention' : model.collectionGaps.length || model.summary.checks?.undetermined ? 'unknown' : information.length ? 'informational' : 'baseline',
    findings: (attention.length ? attention : information).slice(0, 3),
    gaps: model.collectionGaps,
    unknowns: model.unknowns,
    undetermined: model.summary.checks?.undetermined ?? null,
  };
}
export const recommendation = (finding: Pick<ReportFinding, 'recommendation'>) => finding.recommendation?.trim() ? finding.recommendation : 'No recommended next step was recorded. Agree an appropriate investigation with the responsible owner.';
export const findingAnchor = (index: number) => `report-finding-${index + 1}`;

/** Explicit allowlist. Never serialize the report, source, member details or share URL. */
export function findingHelpRequest(input: { title: string; method: string; observedAt: string; synthetic: boolean; question: string; neededBy: string; target?: string }) {
  return [input.synthetic ? 'Synthetic example — not customer evidence.' : '', `Finding: ${input.title}`, `Check: ${input.method}`, `Observed: ${input.observedAt}`, input.target ? `Target (included by you): ${input.target}` : '', `What I need to establish: ${input.question}`, input.neededBy ? `Needed by: ${input.neededBy}` : ''].filter(Boolean).join('\n');
}
