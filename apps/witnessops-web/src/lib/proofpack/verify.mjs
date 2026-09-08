import { VERSION, LIMITS, demand, exact, object, same, hash, encoder, decoder, canonical, hex, verifySignature, json, safePath, unzip } from './primitives.mjs';
import { POLICY, validateContracts, authorityAdmission } from './contracts.mjs';
import { SECTIONS, buildPosture, deriveFindings, sectionComplete } from './assessment.mjs';
const boundary = 'package integrity and declared bindings only; no host security, compromise, completeness, or compliance conclusion';
const failed = checks => Object.values(checks).some(c => c.status === 'failed');
const check = async (checks, name, fn) => { try {
    checks[name] = { status: 'passed', detail: await fn() };
}
catch (e) {
    checks[name] = { status: 'failed', detail: e instanceof Error ? e.message : 'Check could not complete' };
} };
function trustedKey(registry, id, purpose) {
    exact(registry, ['schema', 'registry_id', 'version', 'keys']);
    demand(registry.schema === 'witnessops.key_registry.snapshot.v1' && Array.isArray(registry.keys), 'Unsupported trust registry');
    const matches = registry.keys.filter(k => object(k) && k.public_key_id === id);
    demand(matches.length === 1, 'Signer must resolve to exactly one registry entry');
    const k = matches[0];
    exact(k, ['public_key_id', 'algorithm', 'encoding', 'public_key', 'status', 'purposes']);
    demand(k.algorithm === 'ed25519' && k.encoding === 'hex' && k.status === 'active' && Array.isArray(k.purposes) && k.purposes.includes(purpose), 'Signer is not active or not admitted for this purpose');
    hex(k.public_key, 32);
    return k.public_key;
}
async function resolveManifestArtifact(bytes, manifest, artifactId) {
    const matches = manifest.artifacts.filter(a => a.artifact_id === artifactId);
    demand(matches.length === 1, 'Required semantic artifact must resolve to exactly one manifest entry: ' + artifactId);
    const { path, sha256 } = matches[0];
    // Archive admission guarantees unique entries. Snapshot the selected bytes
    // so the digest check and parser consume the same content.
    const content = new Uint8Array(bytes(safePath(path)));
    demand('sha256:' + await hash(content) === sha256, 'Evidence artifact hash mismatch: ' + path);
    return json(content);
}
export async function verifySemantics(bytes, manifest, receipt) {
    const get = id => resolveManifestArtifact(bytes, manifest, id);
    const posture = await get('host_posture'), observations = await get('host_observations'), authority = await get('authority_record'), admission = await get('admission_decision'), completeness = await get('collection_completeness');
    demand(same(buildPosture(observations), posture), 'Posture does not reconstruct from observations');
    const findings = await get('posture_findings');
    demand(same(deriveFindings(posture), findings), 'Findings do not reconstruct from posture');
    await authorityAdmission(authority, observations.target.hostname, authority.operator_id, observations.observed_at_utc);
    demand(same(await authorityAdmission(authority, admission.observed_hostname, admission.operator_id, admission.evaluated_at_utc), admission), 'Admission does not reconstruct to ADMIT');
    exact(completeness, ['schema', 'profile_id', 'required_sections', 'section_results', 'complete', 'failure_states', 'claim_boundary']);
    demand(completeness.schema === 'witnessops.local_server_audit.collection_completeness.v1' && same(completeness.required_sections, SECTIONS) && Array.isArray(completeness.section_results) && completeness.section_results.length === SECTIONS.length, 'Invalid collection completeness contract');
    const observed = new Set();
    let complete = true;
    for (const item of completeness.section_results) {
        exact(item, ['section', 'observed_status', 'admitted_complete_statuses', 'complete']);
        demand(SECTIONS.includes(item.section) && !observed.has(item.section), 'Invalid or duplicate coverage section');
        observed.add(item.section);
        const r = posture.sections[item.section];
        demand(same(item.observed_status, object(r) ? r.status ?? null : null) && same(item.admitted_complete_statuses, item.section === 'firewall' ? ['active', 'inactive'] : ['observed']), 'Coverage status mismatch');
        const expected = sectionComplete(item.section, r);
        demand(item.complete === expected, 'Coverage completeness mismatch');
        complete &&= expected;
    }
    const failures = complete ? [] : ['required_collection_incomplete'];
    demand(completeness.complete === complete && same(completeness.failure_states, failures), 'Collection completeness contradicts reconstruction');
    demand(receipt.claims.find(c => c.claim === 'required_collection_sections_available').status === (complete ? 'passed' : 'partial') && same(receipt.result, { outcome: complete ? 'pass' : 'partial', failure_states: failures }), 'Receipt outcome contradicts reconstructed coverage');
    // Present the records checked above. Never reopen a conventional filename
    // after the manifest has selected a different semantic artifact.
    const scope = { schema: 'witnessops.local_server_audit.scope.v1' };
    for (const key of ['authorization_id', 'case_id', 'operator_id', 'target', 'profile_id', 'execution_mode', 'allowed_actions', 'prohibited_artifact_classes'])
        scope[key] = authority[key];
    return { posture, findings, authority, completeness, scope };
}
async function core(files, registry, requireTrust) {
    const checks = {}, state = {};
    const bytes = name => { demand(files.has(name), 'Missing required file: ' + name); return files.get(name); };
    const get = name => json(bytes(name));
    await check(checks, 'package_tree', async () => { demand(files.size <= 200, 'Package file count exceeded'); return 'package tree contains only bounded regular files and directories'; });
    await check(checks, 'core_manifest', async () => {
        demand(same(get('MANIFEST-POLICY.json'), POLICY), 'Manifest policy differs from Local Audit 1.2.2');
        const entries = new Map();
        for (const line of decoder.decode(bytes('MANIFEST.sha256')).split(/\r?\n/)) {
            if (!line)
                continue;
            demand(/^[a-f0-9]{64}  .+$/.test(line), 'Invalid MANIFEST.sha256 line');
            const name = safePath(line.slice(66));
            demand(!entries.has(name), 'Duplicate core manifest path');
            entries.set(name, line.slice(0, 64));
        }
        demand(same([...entries.keys()].sort(), [...files.keys()].filter(n => !POLICY.excluded_paths.includes(n)).sort()), 'Core manifest file set differs');
        for (const [name, digest] of entries)
            demand(await hash(bytes(name)) === digest, 'Core manifest hash mismatch: ' + name);
        return `${entries.size} core package files matched MANIFEST.sha256`;
    });
    await check(checks, 'receipt_signature_and_manifest_binding', async () => {
        const receipt = get('receipt.json'), manifest = get('evidence_manifest.json');
        validateContracts(receipt, manifest);
        const k = get('public_key.json');
        exact(k, ['schema', 'algorithm', 'public_key_id', 'encoding', 'public_key', 'purpose', 'trust_boundary']);
        demand(k.schema === 'witnessops.public_key.v1' && k.algorithm === 'ed25519' && k.encoding === 'hex' && k.purpose === 'witnessops_local_server_audit_receipt_and_proofpack' && k.trust_boundary === 'package-provided public key is not a trust anchor' && k.public_key_id === receipt.signature.public_key_id, 'Package public key contract mismatch');
        hex(k.public_key, 32);
        const key = requireTrust ? trustedKey(registry, k.public_key_id, 'witnessops_local_server_audit_receipt') : k.public_key;
        demand(key === k.public_key, 'Package public key differs from external trust registry');
        const unsigned = { ...receipt };
        delete unsigned.signature;
        await verifySignature(key, receipt.signature.signature, unsigned);
        demand(receipt.manifest_hash === 'sha256:' + await hash(encoder.encode(canonical(manifest))), 'Receipt manifest hash mismatch');
        state.receipt = receipt;
        state.manifest = manifest;
        return requireTrust ? 'receipt signature verified with an externally admitted trust-registry key' : 'receipt signature verified with package key; signer authority not established';
    });
    if (state.manifest)
        await check(checks, 'evidence_artifact_hashes_and_claim_refs', async () => {
            const m = state.manifest, byId = Object.fromEntries(m.artifacts.map(a => [a.artifact_id, a]));
            demand(byId.buyer_report?.path === 'report.md' && byId.buyer_walkthrough?.path === 'BUYER_WALKTHROUGH.md', 'Signed manifest must bind buyer report and walkthrough');
            const envelope = ['receipt.json', 'RECEIPT-COMPAT.json', 'evidence_manifest.json', 'public_key.json', 'MANIFEST.sha256', 'MANIFEST-POLICY.json', 'verification_result.json'];
            demand([...files.keys()].every(n => envelope.includes(n) || m.artifacts.some(a => a.path === n)), 'File outside signed artifact set and verifier envelope');
            for (const a of m.artifacts)
                demand('sha256:' + await hash(bytes(a.path)) === a.sha256, 'Evidence artifact hash mismatch: ' + a.path);
            for (const c of state.receipt.claims)
                demand(c.evidence_refs.every(id => Object.hasOwn(byId, id)), 'Claim references an unknown artifact');
            state.verified = await verifySemantics(bytes, m, state.receipt);
            return `${m.artifacts.length} evidence artifacts and all claim references matched`;
        });
    else
        checks.evidence_artifact_hashes_and_claim_refs = { status: 'failed', detail: 'receipt/manifest validation did not complete' };
    await check(checks, 'receipt_compatibility_projection', async () => { demand(await hash(bytes('receipt.json')) === await hash(bytes('RECEIPT-COMPAT.json')), 'Compatibility receipt bytes differ'); return 'canonical and compatibility receipt bytes are identical'; });
    checks.signer_trust = requireTrust ? { status: checks.receipt_signature_and_manifest_binding.status, detail: 'external trust registry required and compared' } : { status: 'skipped', detail: 'producer core reconstruction does not establish signer authority' };
    return { verified: state.verified, result: { verifier_version: VERSION, status: failed(checks) ? 'invalid' : 'valid', proof_run_id: state.receipt?.proof_run_id ?? 'unknown', workflow_class: state.receipt?.workflow_class ?? 'unknown', checks, outcome: state.receipt?.result.outcome ?? 'inconclusive', failure_states: state.receipt?.result.failure_states ?? ['verification_incomplete'], proof_boundary: boundary } };
}
export async function verifyProofpack(input) {
    const checks = {}, inputs = {};
    let snapshots, registry, envelope, files;
    const early = (failure, description) => ({ verifier_version: VERSION, status: 'invalid', proof_run_id: 'unknown', workflow_class: 'unknown', checks, outcome: 'inconclusive', failure_states: [failure], proof_boundary: description, verification_inputs: inputs });
    await check(checks, 'verification_inputs', async () => {
        snapshots = {};
        for (const label of ['proofpack', 'signature', 'trust_registry']) {
            const f = input[label];
            demand(f && typeof f.name === 'string' && f.name.length > 0 && f.name.length < 256 && f.bytes instanceof Uint8Array, 'Missing or invalid ' + label);
            demand(f.bytes.length <= LIMITS[label], 'Input exceeds limit: ' + label);
            snapshots[label] = { name: f.name, bytes: f.bytes.slice() };
            inputs[label] = { name: f.name, sha256: await hash(snapshots[label].bytes), size_bytes: f.bytes.length };
        }
        return 'proofpack, signature, and trust registry were captured as bounded private snapshots';
    });
    if (failed(checks))
        return early('verification_input_invalid', 'verification inputs failed before signature admission');
    await check(checks, 'proofpack_detached_signature', async () => {
        envelope = json(snapshots.signature.bytes);
        registry = json(snapshots.trust_registry.bytes);
        exact(envelope, ['schema', 'subject', 'subject_sha256', 'algorithm', 'public_key_id', 'encoding', 'purpose', 'signature']);
        demand(envelope.schema === 'witnessops.detached_signature.v1' && envelope.subject === snapshots.proofpack.name && envelope.subject_sha256 === inputs.proofpack.sha256, 'Detached signature subject or digest mismatch');
        demand(envelope.algorithm === 'ed25519' && envelope.encoding === 'hex', 'Unsupported detached signature algorithm');
        const key = trustedKey(registry, envelope.public_key_id, 'witnessops_local_server_audit_proofpack');
        const unsigned = { ...envelope };
        delete unsigned.signature;
        await verifySignature(key, envelope.signature, unsigned);
        return 'detached ZIP signature and external trust-registry admission passed';
    });
    if (failed(checks))
        return early('proofpack_signature_invalid', 'transport signature failed; package contents were not admitted');
    await check(checks, 'safe_zip_structure', async () => { files = await unzip(snapshots.proofpack.bytes); return `safely extracted ${files.size} files totaling ${[...files.values()].reduce((s, b) => s + b.length, 0)} bytes`; });
    if (failed(checks))
        return early('unsafe_proofpack_structure', 'ZIP structure failed before core package admission');
    const get = name => { demand(files.has(name), 'Missing required file: ' + name); return json(files.get(name)); };
    const { result, verified } = await core(files, registry, true);
    await check(result.checks, 'embedded_core_verifier_result', async () => {
        const embedded = get('verification_result.json');
        demand(embedded.verifier_version === VERSION, 'Unsupported Local Audit verifier version');
        const { result: expected } = await core(files, null, false);
        demand(same(embedded, expected), 'Embedded core verifier result differs from fresh reconstruction');
        return 'embedded producer core result matched fresh reconstruction';
    });
    await check(checks, 'transport_receipt_signer_continuity', async () => { demand(envelope.public_key_id === get('receipt.json').signature.public_key_id, 'Detached ZIP signer and receipt signer differ'); return 'detached ZIP signer and receipt signer key ids match'; });
    const merged = { ...checks, ...Object.fromEntries(Object.entries(result.checks).map(([k, v]) => ['core.' + k, v])) };
    const valid = !failed(merged) && result.status === 'valid';
    const output = { ...result, status: valid ? 'valid' : 'invalid', checks: merged, failure_states: valid ? result.failure_states : [...new Set([...result.failure_states, 'verification_check_failed'])].sort(), verification_inputs: inputs };
    if (valid) {
        output.report = { ...verified, manifest: get('evidence_manifest.json'), originalReport: decoder.decode(files.get('report.md')), signerId: envelope.public_key_id };
    }
    return output;
}
