/** Test-only adapter. No runner, routes, network or real security verification. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createReportModel, type ProofpackReportV1 } from '../../apps/witnessops-web/src/lib/proofpack/report-model';
const DIGEST = '7d8cd850418f270a97f45505a3ff636297d0b5eea623ee4a2d8b8621c72d292b';
export function syntheticProofpackAdapter(generatedAt: string): ProofpackReportV1 {
    const bytes = readFileSync(new URL('./synthetic-fixture.json', import.meta.url));
    if (createHash('sha256').update(bytes).digest('hex') !== DIGEST) throw new Error('Synthetic fixture identity mismatch');
    const fixture = JSON.parse(bytes.toString());
    return createReportModel({
        reportVersion: '1.0',
        identity: { reportId: 'synthetic-report-001', sourceDigest: DIGEST, productId: 'synthetic-test-only', productName: 'Synthetic fixture', productVersion: '1.0', generatedAt, synthetic: true },
        subject: { label: fixture.subject, reference: 'fixture-only', observedAt: fixture.observedAt, scopeSummary: 'Three deterministic fixture checks. No system was inspected.', scopeTitle: 'One fixture. A bounded view.', scopeBoundary: 'No runtime state or external system was collected.', kicker: 'SYNTHETIC ADAPTER TEST ONLY.' },
        verification: { status: 'VERIFIED', label: 'Fixture checks', method: 'Pinned fixture SHA-256 comparison', verifierVersion: 'synthetic-fixture/1.0', boundary: 'Only deterministic fixture identity was checked. No real system or package signature was verified.', established: ['The fixture bytes match the pinned test digest.'] },
        summary: { checks: { total: 3, passed: 1, needsAttention: 1, informational: 0, undetermined: 1 }, coverage: { total: 3, complete: 2, undetermined: 1 }, findings: { total: 1, needsAttention: 1, informational: 0, severities: { medium: 1 } } },
        coverage: fixture.checks.map((check: { id: string; state: string; observation: unknown }) => ({ id: check.id, label: check.id, complete: check.state !== 'undetermined', observedState: check.state, observation: check.observation })),
        findings: [{ id: 'example-baseline', checkId: 'fixture.baseline', title: 'Example configuration differs from admitted baseline', severity: 'medium', state: 'needs_attention', observation: fixture.checks[1].observation, evidence: ['fixture.json#checks/1'], interpretation: 'Synthetic fixture used only to prove adapter independence.', recommendation: 'Inspect the fixture comparison; no system change is proposed.', limitations: ['This is not an observation of a real configuration.'], sourceRefs: ['fixture.json'] }],
        unknowns: [{ id: 'runtime-unknown', title: 'Runtime state was not collected.', reason: 'The test adapter reads a deterministic file only.', evidenceNeeded: 'An independently scoped runtime observation would be needed.' }],
        collectionGaps: [{ id: 'fixture.runtime', label: 'Runtime fixture', reason: 'No runtime input was supplied.', observation: null }],
        provenance: [{ id: 'fixture', label: 'Source fixture', value: `sha256:${DIGEST}`, digest: DIGEST, mechanism: 'SHA-256 compared with pinned test digest', relationship: 'fixture.json, deterministic test-only source' }],
        verificationChecks: [{ id: 'fixture-digest', label: 'Fixture digest', status: 'passed', detail: 'Bytes match the pinned deterministic fixture digest; no signature claim.' }],
        sourceArtifacts: [{ id: 'fixture', label: 'Fixture source', path: 'fixture.json', digest: DIGEST, relationship: 'Test-only input', content: fixture, format: 'json', presentation: 'appendix' }],
        declaredExclusions: ['All real systems and external network activity'],
        reproduction: { steps: [{ title: 'Repeat the fixture test', description: 'Run the report contract tests against the pinned synthetic fixture.' }], trustBoundary: 'Test data only. No real signer or customer evidence.' },
    });
}
