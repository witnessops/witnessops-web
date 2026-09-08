import { demand, exact, integer, same, hash, encoder, canonical, safePath } from './primitives.mjs';
export const PROHIBITED = ['credentials', 'browser_cookies', 'oauth_tokens', 'private_keys', 'password_manager_data', 'screenshots', 'clipboard', 'full_user_documents', 'full_memory_dump', 'process_command_lines', 'process_environment'];
export const CLAIMS = ['artifact_hashes_present', 'authority_record_exists', 'collection_profile_bound', 'collector_hash_recorded', 'collector_signature_status_recorded', 'host_clock_trust_declared', 'known_side_effects_declared', 'launcher_boundary_declared', 'manifest_contains_all_artifacts', 'operator_is_authorized', 'package_is_offline_verifiable', 'prohibited_artifacts_absent', 'required_collection_sections_available', 'target_host_in_scope'];
export const POLICY = { schema: 'witnessops.local_server_audit.manifest_policy.v1', hash_algorithm: 'sha256', excluded_paths: ['MANIFEST.sha256', 'verification_result.json'], exclusion_reason: 'MANIFEST.sha256 cannot list itself; verification_result.json records reconstruction after the core manifest is frozen; final ZIP signature binds both' };
const token = v => typeof v === 'string' && /^[a-z][a-z0-9_]*$/.test(v);
const digest = v => typeof v === 'string' && /^sha256:[a-f0-9]{64}$/.test(v);
const unique = a => Array.isArray(a) && new Set(a).size === a.length;
export function validateContracts(receipt, manifest) {
    exact(receipt, ['receipt_version', 'workflow_class', 'proof_run_id', 'result', 'claims', 'manifest_hash', 'signature']);
    demand(receipt.receipt_version === 'witnessops.receipt.v0' && receipt.workflow_class === 'host_triage_evidence_collection' && /^pr_[A-Za-z0-9_:-]+$/.test(receipt.proof_run_id), 'Unsupported receipt contract');
    exact(receipt.result, ['outcome', 'failure_states']);
    demand(['pass', 'partial', 'fail', 'inconclusive'].includes(receipt.result.outcome) && unique(receipt.result.failure_states) && receipt.result.failure_states.every(token), 'Invalid result');
    demand(Array.isArray(receipt.claims) && receipt.claims.length === CLAIMS.length, 'Invalid claim set');
    const seen = new Set();
    for (const c of receipt.claims) {
        exact(c, ['claim', 'status', 'evidence_refs']);
        demand(CLAIMS.includes(c.claim) && !seen.has(c.claim) && ['passed', 'partial', 'failed', 'inconclusive'].includes(c.status) && unique(c.evidence_refs) && c.evidence_refs.length && c.evidence_refs.every(token), 'Invalid claim');
        seen.add(c.claim);
    }
    if (receipt.result.outcome === 'pass')
        demand(!receipt.result.failure_states.length && receipt.claims.every(c => c.status === 'passed'), 'Pass claim contradiction');
    if (receipt.result.outcome === 'partial')
        demand(receipt.result.failure_states.includes('required_collection_incomplete') && receipt.claims.find(c => c.claim === 'required_collection_sections_available').status === 'partial', 'Partial claim contradiction');
    if (['fail', 'inconclusive'].includes(receipt.result.outcome))
        demand(receipt.result.failure_states.length, 'Missing failure state');
    demand(digest(receipt.manifest_hash), 'Invalid manifest digest');
    exact(receipt.signature, ['algorithm', 'public_key_id', 'encoding', 'signature']);
    demand(receipt.signature.algorithm === 'ed25519' && receipt.signature.encoding === 'hex' && token(receipt.signature.public_key_id) && /^[a-fA-F0-9]{128}$/.test(receipt.signature.signature), 'Invalid receipt signature');
    exact(manifest, ['manifest_version', 'workflow_class', 'proof_run_id', 'source_systems', 'artifacts'], ['authority', 'target', 'collector', 'launcher', 'collection_profile', 'declared_exclusions', 'declared_side_effects', 'host_clock']);
    demand(manifest.manifest_version === 'witnessops.evidence_manifest.v0' && manifest.workflow_class === 'host_triage_evidence_collection' && receipt.proof_run_id === manifest.proof_run_id, 'Manifest identity mismatch');
    demand(Array.isArray(manifest.artifacts) && manifest.artifacts.length > 0 && manifest.artifacts.length <= 200, 'Invalid artifact count');
    const ids = new Set(), paths = new Set(), sources = new Set();
    for (const a of manifest.artifacts) {
        exact(a, ['artifact_id', 'artifact_type', 'source_system', 'path', 'sha256'], ['artifact_class', 'collector_method', 'sensitivity']);
        demand([a.artifact_id, a.artifact_type, a.source_system].every(token) && (a.collector_method == null || token(a.collector_method)) && (a.sensitivity == null || ['low', 'medium', 'high', 'restricted'].includes(a.sensitivity)) && digest(a.sha256) && (a.artifact_class == null || typeof a.artifact_class === 'string') && !PROHIBITED.includes(a.artifact_class), 'Invalid artifact');
        safePath(a.path);
        demand(!ids.has(a.artifact_id) && !paths.has(a.path), 'Duplicate artifact');
        ids.add(a.artifact_id);
        paths.add(a.path);
        sources.add(a.source_system);
    }
    demand(same(manifest.source_systems, [...sources].sort()), 'Source-system set mismatch');
}
// Compare exact microseconds, matching Python datetime rather than rounded JS dates.
export function timestamp(value) {
    demand(typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(value), 'Invalid UTC timestamp');
    const seconds = value.slice(0, 19);
    const milliseconds = Date.parse(seconds + 'Z');
    demand(Number(value.slice(0, 4)) >= 1 && Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().slice(0, 19) === seconds, 'Invalid UTC calendar date');
    const fraction = value.includes('.') ? value.slice(20, -1) : '';
    return BigInt(milliseconds) * 1000n + BigInt(fraction.padEnd(6, '0'));
}
function address(value) {
    demand(typeof value === 'string' && value.length <= 255, 'Invalid listener address');
    let v = value.trim();
    if (v.startsWith('[') && v.endsWith(']'))
        v = v.slice(1, -1);
    if (v === '*')
        return v;
    const [host, scope, ...extra] = v.split('%');
    demand(!extra.length && (!scope || /^[A-Za-z0-9_.:-]{1,64}$/.test(scope)), 'Invalid interface scope');
    if (host.includes(':')) {
        let parsed;
        try {
            parsed = new URL('http://[' + host + ']/').hostname.slice(1, -1);
        }
        catch {
            throw Error('Invalid IPv6 address');
        }
        return parsed + (scope ? '%' + scope : '');
    }
    demand(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(host) && host.split('.').every(p => Number(p) <= 255), 'Invalid IPv4 address');
    return host;
}
export async function authorityAdmission(a, hostname, operator, time) {
    exact(a, ['schema', 'authorization_id', 'case_id', 'authority_source', 'operator_id', 'target', 'profile_id', 'authorization_window', 'execution_mode', 'allowed_actions', 'prohibited_artifact_classes']);
    demand(a.schema === 'witnessops.local_server_audit.authority.v1' && ['authorization_id', 'case_id', 'operator_id'].every(k => typeof a[k] === 'string' && a[k].trim()), 'Invalid authority');
    const src = a.authority_source;
    exact(src, ['kind', 'authority_identity', 'artifact_sha256', 'approved_at_utc'], ['operator_declaration']);
    demand(/^[a-f0-9]{64}$/.test(src.artifact_sha256), 'Invalid authority digest');
    timestamp(src.approved_at_utc);
    if (src.kind === 'operator_declared_scope') {
        const d = src.operator_declaration;
        exact(d, ['customer', 'purpose', 'expected_ssh_exposure']);
        demand(['customer', 'purpose'].every(k => typeof d[k] === 'string' && d[k].trim() && Array.from(d[k]).length <= 256 && !/[\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(d[k])) && ['public', 'private', 'none'].includes(d.expected_ssh_exposure), 'Invalid operator declaration');
        demand(await hash(encoder.encode(canonical(d))) === src.artifact_sha256, 'Operator declaration digest mismatch');
    }
    else
        demand(!Object.hasOwn(src, 'operator_declaration'), 'Unexpected operator declaration');
    exact(a.target, ['asset_id', 'allowed_hostnames', 'expected_listeners']);
    demand(Array.isArray(a.target.allowed_hostnames) && a.target.allowed_hostnames.length && a.target.allowed_hostnames.every(v => typeof v === 'string' && v.trim()), 'Invalid target hostnames');
    demand(Array.isArray(a.target.expected_listeners) && a.target.expected_listeners.length <= 200, 'Invalid expected listeners');
    const endpoints = new Set();
    for (const item of a.target.expected_listeners) {
        exact(item, ['transport', 'address', 'port']);
        const transport = String(item.transport).toLowerCase();
        demand(['tcp', 'udp'].includes(transport) && integer(item.port) && item.port > 0 && item.port <= 65535, 'Invalid listener');
        const key = JSON.stringify([transport, address(item.address), item.port]);
        demand(!endpoints.has(key), 'Duplicate expected listener');
        endpoints.add(key);
    }
    exact(a.authorization_window, ['starts_at_utc', 'ends_at_utc']);
    const start = timestamp(a.authorization_window.starts_at_utc), end = timestamp(a.authorization_window.ends_at_utc);
    demand(start < end, 'Invalid authority window');
    demand(a.profile_id === 'linux_baseline_v1' && a.execution_mode === 'operator_present_local' && same(a.allowed_actions, ['read_only_posture_collection']) && Array.isArray(a.prohibited_artifact_classes) && PROHIBITED.every(p => a.prohibited_artifact_classes.includes(p)), 'Authority scope mismatch');
    const normalize = s => s.trim().replace(/\.+$/, '').toLowerCase().replace(/ß/g, 'ss').replace(/ς/g, 'σ');
    demand(typeof hostname === 'string' && normalize(hostname) && a.target.allowed_hostnames.some(h => normalize(h) === normalize(hostname)) && operator === a.operator_id && timestamp(time) >= start && timestamp(time) <= end, 'Observation outside declared authority');
    return { schema: 'witnessops.local_server_audit.admission_decision.v1', decision: 'ADMIT', authorization_id: a.authorization_id, case_id: a.case_id, operator_id: operator, observed_hostname: hostname, evaluated_at_utc: time.slice(0, 19) + 'Z', checks: { authority_shape: 'passed', operator_match: 'passed', target_hostname_match: 'passed', authorization_window: 'passed', profile_binding: 'passed', read_only_action_binding: 'passed', prohibited_classes_bound: 'passed' }, reasons: [], boundary: 'admission decision only; it does not validate the honesty of the external authority source' };
}
