import type { ProofpackResult } from './verify.mjs';
import { LOCAL_AUDIT_TRUST } from './pinned-registry';
import { createReportModel, PROOFPACK_REPORT_MODEL_V1, type ProofpackReportV1 } from './report-model';

const VERSION = 'witnessops.local_server_audit.verifier.v1.2.2';
const REQUIRED_CHECKS = ['verification_inputs', 'proofpack_detached_signature', 'safe_zip_structure', 'transport_receipt_signer_continuity', 'core.package_tree', 'core.core_manifest', 'core.receipt_signature_and_manifest_binding', 'core.evidence_artifact_hashes_and_claim_refs', 'core.receipt_compatibility_projection', 'core.signer_trust', 'core.embedded_core_verifier_result'];
const readable = (value: string) => value.replaceAll('_', ' ');

/** Local Audit 1.2.2 only. Collection outcome may be partial despite valid package verification. */
export function localAuditAdapter(result: ProofpackResult | null, generatedAt: string): ProofpackReportV1 | null {
    if (!result || result.status !== 'valid' || !result.report || result.verifier_version !== VERSION
        || REQUIRED_CHECKS.some(id => result.checks[id]?.status !== 'passed')
        || !result.verification_inputs.proofpack?.sha256 || !result.verification_inputs.trust_registry?.sha256
        || Object.values(result.checks).some(check => check.status !== 'passed')) return null;
    const report = result.report;
    const pinned = result.verification_inputs.trust_registry.sha256 === LOCAL_AUDIT_TRUST.sha256;
    const registrySource = pinned ? 'the production registry pinned by this verifier' : 'the supplied registry';
    const coverage = report.completeness.section_results.map(section => ({
        id: section.section, label: readable(section.section), complete: section.complete,
        observedState: section.observed_status, observation: report.posture.sections[section.section],
    }));
    const collectionGaps = coverage.filter(c => !c.complete).map(c => ({
        id: c.id, label: c.label,
        reason: String(report.posture.sections[c.id]?.diagnostic_reason ?? c.observedState ?? 'Collection status not established'), observation: c.observation,
    }));
    const findings = report.findings.findings.map(f => ({
        id: f.finding_id, title: f.title, severity: f.severity, state: f.state,
        observation: f.observed_value, evidence: f.evidence_refs, interpretation: null,
        recommendation: f.recommendation, limitations: [f.claim_limit], sourceRefs: f.evidence_refs,
    }));
    const informational = findings.filter(f => f.severity === 'informational').length;
    return createReportModel({
        reportVersion: PROOFPACK_REPORT_MODEL_V1,
        identity: { reportId: result.proof_run_id, sourceDigest: result.verification_inputs.proofpack.sha256, productId: 'local-audit', productName: 'Local Audit', productVersion: '1.2.2', generatedAt, synthetic: report.posture.synthetic },
        subject: { label: report.posture.target.hostname, reference: report.posture.target.asset_id, observedAt: report.posture.observed_at_utc,
            scopeSummary: 'Read-only collection from one Linux host at the recorded time.', scopeTitle: 'One host. A bounded view.',
            scopeBoundary: 'This report does not establish a before/after change, completed remediation or whole-host security.', kicker: 'ONE HOST. ONE RECORDED SNAPSHOT.' },
        verification: { status: 'VERIFIED', label: 'Package checks', method: 'Signature, bindings and reconstruction', verifierVersion: result.verifier_version,
            boundary: 'Package checks establish the package and its declared bindings. They do not establish that the server is secure, uncompromised or compliant.',
            established: [`The enclosed Local Audit package was checked against its detached signature and ${registrySource}.`, 'Manifest, evidence hashes and declared artifact bindings.', 'Collection completeness and findings reconstructed from supplied observations.'] },
        summary: {
            checks: null,
            coverage: { total: coverage.length, complete: coverage.filter(c => c.complete).length, undetermined: collectionGaps.length },
            findings: { total: findings.length, needsAttention: findings.length - informational, informational, severities: report.findings.counts },
        },
        coverage, findings, collectionGaps,
        unknowns: [
            { id: 'source-integrity', title: 'Source-system honesty or kernel integrity.', reason: 'Package binding does not attest the source system.' },
            { id: 'external-state', title: 'External reachability or current repository state.', reason: 'Only local observations and cached update data were collected.' },
            { id: 'remediation-assurance', title: 'Completed remediation, whole-host security or compliance.', reason: 'A bounded snapshot does not establish a completed change or overall assurance.' },
            { id: 'independent-authority', title: pinned ? "The declared authorizer's approval." : "The registry supplier identity or the declared authorizer's approval.", reason: pinned ? 'Signer admission against the pinned production registry does not independently authenticate the declared authorizer.' : 'The registry and authorizer are declared inputs, not independently authenticated identities.' },
        ],
        provenance: [
            ...Object.entries(result.verification_inputs).map(([id, file]) => ({ id, label: id === 'proofpack' ? 'Source proofpack' : id === 'trust_registry' ? 'Trusted registry' : 'Detached signature', value: `sha256:${file.sha256}`, digest: file.sha256, mechanism: id === 'trust_registry' && pinned ? 'SHA-256 of application-pinned registry bytes' : 'SHA-256 of source file', relationship: file.name })),
            { id: 'verifier', label: 'Verifier', value: result.verifier_version, mechanism: 'Local browser verifier', relationship: 'Package verification and reconstruction' },
            { id: 'signer', label: 'Signer', value: report.signerId, mechanism: 'Signature verification and registry admission', relationship: `Signer admitted by ${registrySource}` },
        ],
        verificationChecks: Object.entries(result.checks).map(([id, check]) => ({ id, label: readable(id), ...check })),
        sourceArtifacts: [
            { id: 'checked-scope', label: 'Scope from checked authority', content: report.scope, format: 'json', relationship: 'Scope selected and checked by the verifier', presentation: 'appendix' },
            ...report.manifest.artifacts.map(a => ({ id: a.artifact_id, label: readable(a.artifact_id), path: a.path, digest: a.sha256.replace(/^sha256:/, ''), relationship: 'Artifact bound by the checked evidence manifest', presentation: 'appendix' as const })),
            { id: 'original-report', label: 'Original package report', content: report.originalReport, format: 'markdown', relationship: 'Original manifest-bound report; separate from this derived presentation', presentation: 'download' },
        ],
        declaredExclusions: report.posture.declared_exclusions.map(readable),
        reproduction: { steps: [
            { title: 'Keep the files', description: pinned ? 'Retain the bundle and its original enclosed ZIP and detached signature. For offline verification, obtain the same production Registry V1 independently and compare its SHA-256.' : 'Retain the original ZIP and detached signature. Obtain the trusted registry through a separate trusted channel.' },
            { title: 'Run the verifier', description: 'Use the matching Local Audit 1.2.2 CLI with those original files and the independently obtained registry.' },
            { title: 'Compare results', description: 'Inspect the named checks, collection gaps and findings. This PDF is a reading aid, not verification authority.' },
        ], command: 'witnessops audit verify PROOFPACK.zip --trust-registry TRUSTED-KEYS.json', trustBoundary: `The signer was admitted using ${registrySource}. ${pinned ? 'This does not authenticate the declared authorizer.' : 'The verifier does not establish the registry supplier identity or authenticate the declared authorizer.'} This derived report is not covered by the detached signature on the enclosed Local Audit package.` },
    });
}
