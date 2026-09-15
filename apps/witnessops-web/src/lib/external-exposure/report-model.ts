import { createReportModel, type ProofpackReportV1 } from '../proofpack/report-model';
import { CHECK_IDS, EXCLUSIONS, EXTERNAL_VERSION, SNAPSHOT_BOUNDARY, type ExternalSnapshotV1, type CheckStatus } from './contracts';

/** Presentation only. Callers must first admit the snapshot through
 * validateExternalSnapshot and supply the digest for the named representation.
 * Both the public adapter and persisted run store enforce that boundary. */
export function externalExposureReportModel(snapshot: ExternalSnapshotV1, source: {
  digest: string; serialization: 'json-stringify' | 'witnessops-canonical-json-v1';
}): ProofpackReportV1 {
  const { digest } = source;
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('Invalid source digest.');
  const canonical = source.serialization === 'witnessops-canonical-json-v1';
  const representation = canonical
    ? 'UTF-8 canonical JSON (object keys sorted by UTF-16 code unit, arrays in recorded order, JSON encoding, no whitespace)'
    : 'UTF-8 JSON.stringify output';
  const findings = snapshot.checks.filter(check => check.status === 'NEEDS_ATTENTION' || check.status === 'INFORMATIONAL').map(check => ({
    id: check.check_id, checkId: check.check_id, title: check.title, severity: null,
    state: check.status === 'INFORMATIONAL' ? 'informational' : 'needs_attention',
    observation: check.observation, evidence: check.evidence, interpretation: check.interpretation,
    recommendation: check.recommendation, limitations: check.limitations, sourceRefs: ['external-exposure-snapshot.json'],
  }));
  const gaps = snapshot.checks.filter(check => !check.collected).map(check => ({
    id: check.check_id, label: check.title, reason: `${check.status}: ${check.interpretation}`, observation: check.observation,
  }));
  const count = (value: CheckStatus) => snapshot.checks.filter(check => check.status === value).length;
  return createReportModel({
    reportVersion: '1.0',
    identity: {
      reportId: `external-${snapshot.finished_at.replace(/[^0-9]/g, '')}-${digest.slice(0, 16)}`,
      sourceDigest: digest, productId: 'external-exposure-snapshot', productVersion: EXTERNAL_VERSION,
      productName: 'External Exposure Snapshot', generatedAt: snapshot.finished_at, synthetic: false,
    },
    subject: {
      label: snapshot.target, reference: snapshot.target, observedAt: snapshot.finished_at,
      scopeSummary: 'Ten defined public observations of one hostname, collected by WitnessOps during the recorded window. Results describe those observations only.',
      scopeTitle: 'One hostname. Ten public observations.', scopeBoundary: SNAPSHOT_BOUNDARY,
      kicker: 'EXTERNAL EXPOSURE SNAPSHOT. UNSIGNED OBSERVATIONS.',
    },
    verification: {
      status: 'VERIFIED', label: 'Snapshot data validation', method: 'Structure, check ledger and collection consistency',
      verifierVersion: `${EXTERNAL_VERSION}/data-admission`,
      boundary: `Only the snapshot data checks passed. These observations are unsigned. No signature, signer identity or source-system truth was verified. ${SNAPSHOT_BOUNDARY}`,
      established: [
        'The source data conforms to the named snapshot version and contains exactly ten unique, recognized check IDs.',
        'Target, recorded timestamps, collection states, usage limits and report totals passed the named data-consistency checks.',
        'SHA-256 identifies the serialized source JSON used for this report. This locally computed digest does not authenticate its source.',
      ],
    },
    summary: {
      checks: { total: CHECK_IDS.length, passed: count('OBSERVED_EXPECTED'), needsAttention: count('NEEDS_ATTENTION'), informational: count('INFORMATIONAL'), undetermined: count('UNDETERMINED') + count('CHECK_ERROR') },
      coverage: { total: CHECK_IDS.length, complete: CHECK_IDS.length - gaps.length, undetermined: gaps.length },
      findings: { total: findings.length, needsAttention: count('NEEDS_ATTENTION'), informational: count('INFORMATIONAL'), severities: {}, unassessed: findings.length },
    },
    coverage: snapshot.checks.map(check => ({ id: check.check_id, label: `${check.title} · ${check.status}`, complete: check.collected, observedState: check.status, observation: check.observation })),
    findings, collectionGaps: gaps,
    unknowns: [
      ...snapshot.checks.filter(check => check.status === 'UNDETERMINED').map(check => ({ id: check.check_id, title: check.title, reason: check.interpretation, evidenceNeeded: check.recommendation ?? 'A separately scoped follow-up observation is required.' })),
      { id: 'source-authenticity', title: 'Independent source authenticity and signer identity.', reason: 'The observations and this derived report have no cryptographic signature. The source digest identifies bytes only.' },
      { id: 'coverage-boundary', title: 'Unobserved vulnerabilities and wider infrastructure.', reason: SNAPSHOT_BOUNDARY },
      { id: 'security-severity', title: 'Finding severity, completed remediation and ongoing state.', reason: 'Severity was not assessed. This bounded snapshot does not establish remediation or the state outside its recorded collection window.' },
    ],
    provenance: [
      { id: 'source', label: 'Source observations', value: `sha256:${digest}`, digest, mechanism: `SHA-256 of ${representation}`, relationship: 'Identifies the enclosed unsigned observation source, including network events and selected addresses. It does not authenticate them.' },
      { id: 'collector', label: 'Collection method', value: EXTERNAL_VERSION, mechanism: 'Bounded server-side public DNS, TLS and HTTP observations', relationship: 'Recorded methods, collection window and request usage are included in the source JSON.' },
      { id: 'signature', label: 'Signature', value: 'Unsigned', mechanism: 'No signing operation', relationship: 'No signer or cryptographic authenticity claim.' },
    ],
    verificationChecks: [
      { id: 'snapshot-shape', label: 'Snapshot structure and limits', status: 'passed', detail: 'Exact version, bounded JSON, recognized fields and numeric usage limits passed adapter validation.' },
      { id: 'snapshot-ledger', label: 'Ten-check ledger', status: 'passed', detail: 'Exactly ten unique recognized check IDs, matching target and valid collection timestamps passed adapter validation.' },
      { id: 'snapshot-consistency', label: 'Collection and report consistency', status: 'passed', detail: 'Collection flags and dispositions passed adapter validation; the report factory checked all coverage and finding totals. This does not make each observed result positive.' },
    ],
    sourceArtifacts: [{ id: 'observations', label: 'Unsigned source observations', path: 'external-exposure-snapshot.json', digest, relationship: 'Full source JSON used for this report, including exact result statuses and bounded network events. The digest is an identifier, not authentication.', content: snapshot, format: 'json', presentation: 'appendix' }],
    declaredExclusions: [...EXCLUSIONS],
    reproduction: {
      steps: [
        { title: 'Keep the source', description: canonical ? `Download the unsigned source JSON and this derived report. The source digest is SHA-256 of ${representation}.` : 'Download the unsigned source JSON and this derived report. The report identifies the source using SHA-256 of its UTF-8 JSON.stringify representation.' },
        { title: 'Inspect the observations', description: 'Read all ten exact statuses, methods, evidence references, network events and limitations in the source. CHECK_ERROR is grouped with undetermined only in the compact report summary.' },
        { title: 'Arrange follow-up', description: 'Repeat only within an authorized scope. DNS, certificates and HTTP responses can change; a later run is a new observation.' },
      ],
      trustBoundary: 'These server-collected observations and this report are unsigned. SHA-256 identifies source bytes without authenticating a signer or source-system truth. This PDF is a reading aid. No verification receipt or signed proofpack was issued.',
    },
  });
}
