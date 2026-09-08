import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUNDLE_LIMITS, BundleError, extractBundle, verifyBundle } from './bundle';
import { LOCAL_AUDIT_TRUST, pinnedRegistryInput } from './pinned-registry';
import { localAuditAdapter } from './local-audit-adapter';
import { verifyProofpack } from './verify.mjs';
import { bundleEntries, createBundle, sha256, storeArchive } from '../../../../../tests/proofpack/create-bundle';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const fixtures = resolve(root, 'tests/proofpack/fixtures');
function fixture(name: string, root = fixtures) {
    const dir = resolve(root, name), filename = readdirSync(dir).find(n => n.endsWith('.zip'))!;
    return { proofpack: { name: filename, bytes: readFileSync(resolve(dir, filename)) }, signature: { name: `${filename}.sig.json`, bytes: readFileSync(resolve(dir, `${filename}.sig.json`)) } };
}
const complete = fixture('complete');
const entries = () => bundleEntries(complete.proofpack.bytes, complete.signature.bytes);
const input = (bytes: Uint8Array) => ({ name: 'acceptance.proofpack', bytes });
async function rejected(bytes: Uint8Array, pattern?: RegExp) {
    await assert.rejects(verifyBundle(input(bytes)), error => error instanceof BundleError && (!pattern || pattern.test(error.message)));
}
function changeManifest(edit: (manifest: { format: string; format_version: number; declared_product: { id: string; version: string }; payload: { path: string; sha256: string }; signature: { path: string; sha256: string } }) => void) {
    const list = entries(), manifest = JSON.parse(Buffer.from(list[0].bytes).toString());
    edit(manifest); list[0].bytes = Buffer.from(JSON.stringify(manifest));
    return storeArchive(list);
}
function centralOffsets(bytes: Uint8Array) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let cursor = view.getUint32(bytes.length - 6, true);
    return Array.from({ length: 3 }, () => { const current = cursor; cursor += 46 + view.getUint16(cursor + 28, true); return current; });
}
function mutateDirectory(edit: (view: DataView, offsets: number[]) => void) {
    const bytes = storeArchive(entries()), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    edit(view, centralOffsets(bytes)); return bytes;
}

test('pinned production registry matches exact approved bytes and only approved authority', () => {
    const actual = pinnedRegistryInput(), bytes = readFileSync(resolve(root, 'apps/witnessops-web/src/lib/proofpack/trust/local-audit-registry-v1.json'));
    assert.deepEqual(Buffer.from(actual.bytes), bytes);
    assert.equal(sha256(bytes), LOCAL_AUDIT_TRUST.sha256);
    const registry = JSON.parse(bytes.toString());
    assert.equal(registry.registry_id, 'witnessops_local_audit_registry'); assert.equal(registry.version, 1);
    assert.deepEqual(registry.keys, [{ algorithm: 'ed25519', encoding: 'hex', public_key: '6a356407058ab89bc4ce05e2dff8e47aa098e34417e0071fafb8460fbab915db', public_key_id: 'witnessops_local_audit_prod_2026_01', purposes: ['witnessops_local_server_audit_receipt', 'witnessops_local_server_audit_proofpack'], status: 'active' }]);
    actual.bytes.fill(0); assert.equal(sha256(pinnedRegistryInput().bytes), LOCAL_AUDIT_TRUST.sha256);
});

test('deterministic envelope preserves original ZIP/signature bytes and original signed subject', async () => {
    const first = createBundle(complete.proofpack.bytes, complete.signature.bytes), second = createBundle(complete.proofpack.bytes, complete.signature.bytes);
    assert.equal(sha256(first), sha256(second));
    assert.deepEqual(await extractBundle(input(first)), { proofpack: { ...complete.proofpack, bytes: new Uint8Array(complete.proofpack.bytes) }, signature: { ...complete.signature, bytes: new Uint8Array(complete.signature.bytes) } });
});
test('envelope owns a snapshot during digest verification', async () => {
    const bytes = createBundle(complete.proofpack.bytes, complete.signature.bytes), pending = extractBundle(input(bytes));
    bytes.fill(0); assert.equal(sha256((await pending).proofpack.bytes), sha256(complete.proofpack.bytes));
});

for (const name of ['complete', 'adverse', 'partial', 'tampered', 'wrong-registry']) {
    test(`legacy raw and extracted verification agree exactly: ${name}`, async () => {
        const raw = fixture(name), trust_registry = { name: 'trusted-keys.json', bytes: readFileSync(resolve(fixtures, name, 'trusted-keys.json')) };
        const extracted = await extractBundle(input(createBundle(raw.proofpack.bytes, raw.signature.bytes)));
        const before = await verifyProofpack({ ...raw, trust_registry }), after = await verifyProofpack({ ...extracted, trust_registry });
        assert.deepEqual(after, before);
        assert.deepEqual(localAuditAdapter(after, '2026-09-08T12:00:00Z'), localAuditAdapter(before, '2026-09-08T12:00:00Z'));
    });
}
test('valid synthetic signature cannot be admitted by pinned production registry', async () => {
    const bundled = await verifyBundle(input(createBundle(complete.proofpack.bytes, complete.signature.bytes)));
    assert.deepEqual(bundled, await verifyProofpack({ ...complete, trust_registry: pinnedRegistryInput() }));
    assert.equal(bundled.status, 'invalid'); assert.equal(localAuditAdapter(bundled, '2026-09-08T12:00:00Z'), null);
    assert.match(bundled.checks.proofpack_detached_signature.detail, /trusted|registry|key/i);
});

test('production-designated synthetic complete package verifies identically through raw and bundle paths', async () => {
    const raw = fixture('complete', resolve(root, 'tests/proofpack/production-fixtures'));
    const before = await verifyProofpack({ ...raw, trust_registry: pinnedRegistryInput() });
    const after = await verifyBundle(input(createBundle(raw.proofpack.bytes, raw.signature.bytes)));
    assert.equal(after.status, 'valid'); assert.deepEqual(after, before);
    const model = localAuditAdapter(after, '2026-09-08T12:00:00Z')!;
    assert.ok(model); assert.equal(model.identity.synthetic, true);
    assert.deepEqual(model, localAuditAdapter(before, '2026-09-08T12:00:00Z'));
    assert.equal(model.summary.coverage.complete, 11);
    assert.equal(model.provenance.find(p => p.id === 'trust_registry')?.digest, LOCAL_AUDIT_TRUST.sha256);
    assert.ok(model.verification.established.some(s => s.includes('production registry pinned by this verifier')));
    assert.match(model.reproduction!.trustBoundary!, /not covered by the detached signature on the enclosed Local Audit package/);
});
for (const name of ['adverse', 'partial']) test(`authorized production synthetic ${name} retains raw fixture semantics through the bundle`, async () => {
    const raw = fixture(name, resolve(root, 'tests/proofpack/production-fixtures'));
    const before = await verifyProofpack({ ...raw, trust_registry: pinnedRegistryInput() });
    const bytes = createBundle(raw.proofpack.bytes, raw.signature.bytes);
    const extracted = await extractBundle(input(bytes));
    assert.deepEqual(Buffer.from(extracted.proofpack.bytes), raw.proofpack.bytes);
    assert.deepEqual(Buffer.from(extracted.signature.bytes), raw.signature.bytes);
    const after = await verifyBundle(input(bytes));
    assert.equal(after.status, 'valid'); assert.deepEqual(after, before);
    const model = localAuditAdapter(after, '2026-09-08T12:00:00Z')!;
    const legacy = fixture(name);
    const old = localAuditAdapter(await verifyProofpack({ ...legacy, trust_registry: { name: 'trusted-keys.json', bytes: readFileSync(resolve(fixtures, name, 'trusted-keys.json')) } }), '2026-09-08T12:00:00Z')!;
    assert.ok(model.identity.synthetic);
    assert.deepEqual(model, localAuditAdapter(before, '2026-09-08T12:00:00Z'));
    for (const field of ['subject', 'summary', 'coverage', 'findings', 'collectionGaps', 'sourceArtifacts'] as const) assert.deepEqual(model[field], old[field], field);
    assert.equal(model.unknowns.length, old.unknowns.length);
    assert.equal(model.summary.coverage.complete, name === 'adverse' ? 11 : 10);
    assert.equal(model.summary.findings.total, name === 'adverse' ? 19 : 1);
    assert.equal(model.provenance.find(p => p.id === 'trust_registry')?.digest, LOCAL_AUDIT_TRUST.sha256);
});
test('valid envelope with invalid production detached signature yields no buyer report', async () => {
    const raw = fixture('complete', resolve(root, 'tests/proofpack/production-fixtures'));
    const signature = JSON.parse(raw.signature.bytes.toString()); signature.signature = '0'.repeat(128);
    const result = await verifyBundle(input(createBundle(raw.proofpack.bytes, Buffer.from(JSON.stringify(signature)))));
    assert.equal(result.status, 'invalid'); assert.equal(result.checks.proofpack_detached_signature.status, 'failed');
    assert.equal(result.report, undefined); assert.equal(localAuditAdapter(result, '2026-09-08T12:00:00Z'), null);
});
test('manifest integrity cannot authorize a changed signed subject', async () => {
    const raw = fixture('complete', resolve(root, 'tests/proofpack/production-fixtures'));
    const signature = JSON.parse(raw.signature.bytes.toString()); signature.subject = 'other.zip';
    const result = await verifyBundle(input(createBundle(raw.proofpack.bytes, Buffer.from(JSON.stringify(signature)))));
    assert.equal(result.status, 'invalid'); assert.equal(localAuditAdapter(result, '2026-09-08T12:00:00Z'), null);
});

test('malformed archive', () => rejected(Buffer.from('not a zip'), /Malformed/));
for (const name of ['bundle.json', 'payload.zip', 'payload.sig.json']) test(`missing ${name}`, () => rejected(storeArchive(entries().filter(entry => entry.name !== name))));
for (const name of ['trusted-keys.json', 'unexpected.txt', 'nested.proofpack']) test(`extra entry ${name}`, () => rejected(storeArchive([...entries(), { name, bytes: Buffer.from('{}') }])));
for (const name of ['bundle.json', 'PAYLOAD.ZIP', '../payload.zip', '/payload.zip', '..\\payload.zip', 'payload/', 'C:\\payload.zip', '__proto__', 'nested.proofpack']) {
    test(`duplicate, unsupported name or path: ${name}`, () => { const list = entries(); list[1].name = name; return rejected(storeArchive(list)); });
}
test('unsupported format', () => rejected(changeManifest(m => { m.format = 'other'; })));
test('unsupported format version', () => rejected(changeManifest(m => { m.format_version = 2; })));
test('unsupported product', () => rejected(changeManifest(m => { m.declared_product.id = 'external-exposure'; })));
test('unsupported product version', () => rejected(changeManifest(m => { m.declared_product.version = '1.2.1'; })));
for (const field of ['registry', 'registry_url', 'registry_digest', 'signer_allowlist', '__proto__']) test(`manifest cannot add ${field}`, () => rejected(changeManifest(m => { Object.defineProperty(m, field, { value: 'attacker', enumerable: true }); })));
test('payload digest mismatch', () => rejected(changeManifest(m => { m.payload.sha256 = '0'.repeat(64); }), /payload.zip SHA-256/));
test('signature digest mismatch', () => rejected(changeManifest(m => { m.signature.sha256 = '0'.repeat(64); }), /payload.sig.json SHA-256/));
test('manifest cannot route to another filename', () => rejected(changeManifest(m => { m.payload.path = '../payload.zip'; })));
test('duplicate JSON fields are rejected', () => { const list = entries(); list[0].bytes = Buffer.from('{"format":1,"format":2}'); return rejected(storeArchive(list), /unambiguous JSON/); });
test('invalid JSON cannot execute markup', () => { const list = entries(); list[0].bytes = Buffer.from('<script>alert(1)</script>'); return rejected(storeArchive(list), /^bundle.json must be valid, unambiguous JSON\.$/); });
test('signature cannot introduce a subject path', () => {
    const signature = JSON.parse(complete.signature.bytes.toString()); signature.subject = '../secret.zip';
    return rejected(createBundle(complete.proofpack.bytes, Buffer.from(JSON.stringify(signature))), /safe original ZIP filename/);
});
test('oversized outer bundle', () => rejected(new Uint8Array(BUNDLE_LIMITS.outer + 1), /110 MiB/));
for (const [index, key] of ['bundle.json', 'payload.zip', 'payload.sig.json'].entries()) test(`oversized ${key} is rejected from headers before allocation`, () => rejected(mutateDirectory((view, offsets) => { view.setUint32(offsets[index] + 24, BUNDLE_LIMITS[key as keyof typeof BUNDLE_LIMITS] + 1, true); }), /size limit/));
test('encrypted entry', () => rejected(mutateDirectory((v, o) => v.setUint16(o[0] + 8, 1, true)), /unencrypted ZIP STORE/));
test('compressed entry', () => rejected(mutateDirectory((v, o) => v.setUint16(o[0] + 10, 8, true)), /ZIP STORE/));
test('data descriptor entry', () => rejected(mutateDirectory((v, o) => v.setUint16(o[0] + 8, 8, true))));
test('symlink', () => rejected(mutateDirectory((v, o) => v.setUint32(o[0] + 38, 0xa1ff0000, true)), /links/));
test('directory attributes', () => rejected(mutateDirectory((v, o) => v.setUint32(o[0] + 38, 0x41ed0010, true))));
test('ZIP64 version', () => rejected(mutateDirectory((v, o) => v.setUint16(o[0] + 6, 45, true))));
test('archive extras', () => rejected(mutateDirectory((v, o) => v.setUint16(o[0] + 30, 1, true))));
test('local/central disagreement', () => rejected(mutateDirectory(v => v.setUint32(14, 0, true)), /Conflicting/));
test('overlapping local entries', () => rejected(mutateDirectory((v, o) => v.setUint32(o[1] + 42, 0, true))));
test('out of bounds offset', () => rejected(mutateDirectory((v, o) => v.setUint32(o[0] + 42, 0xffffffff, true))));
test('CRC mismatch', () => { const bytes = storeArchive(entries()); bytes[41] ^= 1; return rejected(bytes, /integrity/); });
test('trailing bytes', () => rejected(Buffer.concat([storeArchive(entries()), Buffer.from('extra')])));
test('wrong file extension', () => assert.rejects(extractBundle({ name: 'file.zip', bytes: storeArchive(entries()) }), /Choose a .proofpack/));
