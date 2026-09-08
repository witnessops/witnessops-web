import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { z } from 'zod';
import { createReportModel, type ProofpackReportV1 } from '../proofpack/report-model';
import { normalizeExternalHostname } from './input';
import { CHECK_IDS, EXCLUSIONS, EXTERNAL_VERSION, SNAPSHOT_BOUNDARY, type ExternalSnapshotV1 } from './contracts';

const status = z.enum(['OBSERVED_EXPECTED', 'NEEDS_ATTENTION', 'INFORMATIONAL', 'UNDETERMINED', 'CHECK_ERROR']);
const timestamp = z.string().datetime({ offset: true });
const shortText = z.string().min(1).max(2000);
const texts = z.array(shortText).max(40);
const snapshotSchema = z.object({
  version: z.literal(EXTERNAL_VERSION), target: z.string().min(1).max(253),
  started_at: timestamp, finished_at: timestamp,
  checks: z.array(z.object({
    check_id: z.enum(CHECK_IDS), check_version: z.literal(EXTERNAL_VERSION), target: z.string().min(1).max(253),
    started_at: timestamp, finished_at: timestamp, status, method: shortText, title: shortText,
    observation: z.unknown(), evidence: texts, interpretation: shortText,
    limitations: texts, recommendation: shortText.nullable(), collected: z.boolean(),
  }).strict()).length(CHECK_IDS.length),
  usage: z.object({
    dns: z.number().int().min(0).max(20), normalTls: z.number().int().min(0).max(1),
    legacyTls: z.number().int().min(0).max(2), http: z.number().int().min(0).max(8),
    redirects: z.number().int().min(0).max(3),
  }).strict(),
  network: z.array(z.object({
    kind: z.enum(['dns', 'connect', 'http', 'redirect']), hostname: z.string().min(1).max(253),
    detail: shortText, address: z.string().max(45).refine(value => isIP(value) !== 0).optional(),
    port: z.union([z.literal(80), z.literal(443)]).optional(),
  }).strict()).max(200),
}).strict();

/** Reject values which JSON would silently discard or alter before assigning source identity. */
function assertBoundedJson(value: unknown, depth = 0): void {
  if (depth > 16) throw new Error('Snapshot data exceeds supported nesting.');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)) throw new Error('Snapshot data must contain JSON values only.');
  for (const item of Object.values(value)) assertBoundedJson(item, depth + 1);
}

export function validateExternalSnapshot(input: unknown): ExternalSnapshotV1 {
  assertBoundedJson(input);
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 1024 * 1024) throw new Error('Snapshot data exceeds the report size limit.');
  const snapshot = snapshotSchema.parse(input);
  if (normalizeExternalHostname(snapshot.target) !== snapshot.target) throw new Error('Snapshot target is not normalized.');
  const start = Date.parse(snapshot.started_at), finish = Date.parse(snapshot.finished_at);
  // The transport budget is 30 seconds; allow one second for final timestamp bookkeeping.
  if (start > finish || finish - start > 31_000) throw new Error('Snapshot collection window is invalid.');
  if (new Set(snapshot.checks.map(check => check.check_id)).size !== CHECK_IDS.length) throw new Error('Snapshot check ledger is incomplete or duplicated.');
  for (const check of snapshot.checks) {
    const checkStart = Date.parse(check.started_at), checkFinish = Date.parse(check.finished_at);
    if (check.target !== snapshot.target || checkStart < start || checkFinish > finish || checkStart > checkFinish) throw new Error('Snapshot check identity or collection window is inconsistent.');
    if ((check.status === 'CHECK_ERROR' && check.collected) || (!['CHECK_ERROR', 'UNDETERMINED'].includes(check.status) && !check.collected)) throw new Error('Snapshot collection status is inconsistent.');
    if (!check.evidence.length || !check.limitations.length) throw new Error('Snapshot check requires evidence references and limitations.');
  }
  return snapshot as ExternalSnapshotV1;
}

/** Admission checks establish data consistency only. Source observations remain unsigned. */
export function externalExposureAdapter(input: unknown): ProofpackReportV1 {
  const snapshot = validateExternalSnapshot(input);
  const serialized = JSON.stringify(snapshot);
  const digest = createHash('sha256').update(serialized).digest('hex');
  const findings = snapshot.checks.filter(check => check.status === 'NEEDS_ATTENTION' || check.status === 'INFORMATIONAL').map(check => ({
    id: check.check_id, checkId: check.check_id, title: check.title, severity: null,
    state: check.status === 'INFORMATIONAL' ? 'informational' : 'needs_attention',
    observation: check.observation, evidence: check.evidence, interpretation: check.interpretation,
    recommendation: check.recommendation, limitations: check.limitations, sourceRefs: ['external-exposure-snapshot.json'],
  }));
  const gaps = snapshot.checks.filter(check => !check.collected).map(check => ({
    id: check.check_id, label: check.title, reason: `${check.status}: ${check.interpretation}`, observation: check.observation,
  }));
  const count = (value: z.infer<typeof status>) => snapshot.checks.filter(check => check.status === value).length;
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
      { id: 'source', label: 'Source observations', value: `sha256:${digest}`, digest, mechanism: 'SHA-256 of UTF-8 JSON.stringify output', relationship: 'Identifies the enclosed unsigned observation source, including network events and selected addresses. It does not authenticate them.' },
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
        { title: 'Keep the source', description: 'Download the unsigned source JSON and this derived report. The report identifies the source using SHA-256 of its UTF-8 JSON.stringify representation.' },
        { title: 'Inspect the observations', description: 'Read all ten exact statuses, methods, evidence references, network events and limitations in the source. CHECK_ERROR is grouped with undetermined only in the compact report summary.' },
        { title: 'Arrange follow-up', description: 'Repeat only within an authorized scope. DNS, certificates and HTTP responses can change; a later run is a new observation.' },
      ],
      trustBoundary: 'These server-collected observations and this report are unsigned. SHA-256 identifies source bytes without authenticating a signer or source-system truth. This PDF is a reading aid. No verification receipt or signed proofpack was issued.',
    },
  });
}
