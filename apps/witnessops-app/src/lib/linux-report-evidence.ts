import type { ProofpackResult } from '../../../witnessops-web/src/lib/proofpack/verify.mjs';
import type { ProofpackReportV1 } from '../../../witnessops-web/src/lib/proofpack/report-model';

/** Member-only graph input after package verification and classification admission.
 * Keep the report model (including PDF/share projections) and saved source intact. */
export function linuxReportEvidence(model: ProofpackReportV1, result: ProofpackResult): ProofpackReportV1['sourceArtifacts'] {
  const artifacts = structuredClone(model.sourceArtifacts);
  if (result.status !== 'valid' || !result.report || result.checks['core.evidence_artifact_hashes_and_claim_refs']?.status !== 'passed'
    || model.identity.sourceDigest !== result.verification_inputs.proofpack?.sha256
    || model.identity.reportId !== result.proof_run_id
    || model.verification.verifierVersion !== result.verifier_version) return artifacts;
  const bound = result.report.manifest.artifacts.filter(item => item.artifact_id === 'host_posture');
  const projected = artifacts.filter(item => item.id === 'host_posture');
  if (bound.length !== 1 || projected.length !== 1 || bound[0].path !== projected[0].path
    || bound[0].sha256.replace(/^sha256:/, '') !== projected[0].digest) return artifacts;
  return artifacts.map(item => item.id === 'host_posture'
    ? { ...item, content: structuredClone(result.report!.posture), format: 'json' }
    : item);
}
