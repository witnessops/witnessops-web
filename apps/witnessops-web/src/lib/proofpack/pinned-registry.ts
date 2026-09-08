import registry from './trust/local-audit-registry-v1.json';

export const LOCAL_AUDIT_TRUST = Object.freeze({
    name: 'WitnessOps Local Audit Registry',
    id: 'witnessops_local_audit_registry',
    version: 1,
    sha256: '4f3ef3b9468a9de3e0a4d3ec573db25bbff86c9c458901931d01e36f4493e939',
    signerId: 'witnessops_local_audit_prod_2026_01',
});

// Captured once, with the canonical file's ordering, indentation and final newline.
// The trust-anchor test compares this representation with the exact checked-in bytes.
const registryText = JSON.stringify(registry, null, 2) + '\n';
export function pinnedRegistryInput() {
    return { name: 'local-audit-registry-v1.json', bytes: new TextEncoder().encode(registryText) };
}
