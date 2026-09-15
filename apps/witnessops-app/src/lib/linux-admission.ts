import type { ProofpackResult } from '../../../witnessops-web/src/lib/proofpack/verify.mjs';
import { unzip, json, hash } from '../../../witnessops-web/src/lib/proofpack/primitives.mjs';
import { ApiError } from './errors';

/** Additional app admission checks on already verified source; never a trust decision. */
export async function requireLinuxClassification(result: ProofpackResult, zip: Uint8Array) {
  const reject = () => { throw new ApiError(422, 'Local Audit collection metadata is inconsistent. No run was admitted.'); };
  if (result.status !== 'valid' || !result.report) return reject();
  const { posture, scope, manifest } = result.report;
  if (typeof posture.synthetic !== 'boolean' || result.workflow_class !== 'host_triage_evidence_collection'
    || scope.profile_id !== 'linux_baseline_v1' || scope.execution_mode !== 'operator_present_local') return reject();
  // Select the signed manifest's record, not a conventional unsigned replacement path.
  const references = manifest.artifacts.filter(a => a.artifact_id === 'run_record');
  if (references.length !== 1) return reject();
  const files = await unzip(zip), bytes = files.get(references[0].path);
  if (!bytes || `sha256:${await hash(bytes)}` !== references[0].sha256) return reject();
  const record = json(bytes);
  const mode = posture.synthetic ? 'fixture' : 'live_approved';
  const classification = posture.synthetic ? 'synthetic_non_customer' : 'customer_host_posture';
  if (!record || typeof record !== 'object' || record.schema !== 'witnessops.local_server_audit.run_record.v1'
    || record.synthetic !== posture.synthetic || posture.data_classification !== classification
    || record.input_classification !== classification || record.execution?.mode !== mode
    || record.execution.local_only !== true || record.execution.read_only !== true || record.execution.network_discovery !== false
    || record.collector?.version !== '1.2.2' || !/^[a-f0-9]{64}$/.test(record.collector?.source_sha256 ?? '')
    || record.proof_run_id !== result.proof_run_id || record.observed_hostname !== posture.target.hostname
    || record.observed_at_utc !== posture.observed_at_utc) return reject();
  // Fingerprint is signed provenance data, not an implementation allowlist or host authentication.
}
