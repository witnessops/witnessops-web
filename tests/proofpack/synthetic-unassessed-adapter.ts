/** Test-only severity compatibility variants. No runner, routes, signatures or network. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createReportModel, type ProofpackReportV1, type ReportFinding, type ReportModelInput } from '../../apps/witnessops-web/src/lib/proofpack/report-model';
import { syntheticProofpackAdapter } from './synthetic-adapter';

const DIGEST = '6e5e314cfc3227d2f961f3c430458b75fbbf69162e11137a0f6e96c56cd7a424';
export type UnassessedFixtureVariant = 'mixed' | 'only';

export function syntheticUnassessedAdapter(generatedAt: string, variant: UnassessedFixtureVariant): ProofpackReportV1 {
    const bytes = readFileSync(new URL('./synthetic-unassessed-fixture.json', import.meta.url));
    if (createHash('sha256').update(bytes).digest('hex') !== DIGEST) throw new Error('Synthetic severity fixture identity mismatch');
    const fixture = JSON.parse(bytes.toString()) as Record<UnassessedFixtureVariant, Pick<ReportFinding, 'id' | 'title' | 'severity' | 'state' | 'recommendation'>[]>;
    const base = structuredClone(syntheticProofpackAdapter(generatedAt)) as ReportModelInput;
    const findings = fixture[variant].map((finding, index) => ({
        ...finding,
        observation: `Deterministic fixture observation ${index + 1}. No system was inspected.`,
        evidence: [`synthetic-unassessed-fixture.json#${variant}/${index}`],
        interpretation: 'Severity and disposition are separate producer-supplied fields.',
        limitations: ['This fixture is not customer evidence or a real security assessment.'],
        sourceRefs: ['synthetic-unassessed-fixture.json'],
    }));
    const severities: Record<string, number> = {};
    for (const finding of findings) if (finding.severity !== null) severities[finding.severity] = (severities[finding.severity] ?? 0) + 1;
    return createReportModel({
        ...base,
        identity: { ...base.identity, reportId: `synthetic-unassessed-${variant}-001`, sourceDigest: DIGEST },
        findings,
        summary: { ...base.summary, findings: {
            total: findings.length,
            needsAttention: findings.filter(finding => finding.state === 'needs_attention').length,
            informational: findings.filter(finding => finding.state === 'informational').length,
            unassessed: findings.filter(finding => finding.severity === null).length,
            severities,
        } },
        verification: { ...base.verification, established: [...base.verification.established, 'The severity compatibility fixture bytes match the pinned test digest.'] },
        provenance: [...base.provenance, { id: 'severity-fixture', label: 'Severity compatibility fixture', value: `sha256:${DIGEST}`, digest: DIGEST, mechanism: 'SHA-256 compared with pinned test digest', relationship: `Deterministic test-only ${variant} severity variant` }],
        verificationChecks: [...base.verificationChecks, { id: 'severity-fixture-digest', label: 'Severity fixture digest', status: 'passed', detail: 'Bytes match the pinned deterministic compatibility fixture digest; no signature claim.' }],
        sourceArtifacts: [...base.sourceArtifacts, { id: 'severity-fixture', label: 'Severity compatibility source', path: 'synthetic-unassessed-fixture.json', digest: DIGEST, relationship: `Test-only ${variant} variant`, content: fixture, format: 'json', presentation: 'appendix' }],
    });
}
