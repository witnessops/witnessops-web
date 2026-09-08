import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifySemantics } from './verify.mjs';
import { validateContracts } from './contracts.mjs';
import { encoder, hash, json, unzip } from './primitives.mjs';
import { storeArchive } from '../../../../../tests/proofpack/create-bundle';

const root = resolve(import.meta.dirname, '../../../../../tests/proofpack/fixtures');
const roles = [
    { id: 'host_posture', filename: 'posture.json', field: 'posture' },
    { id: 'posture_findings', filename: 'findings.json', field: 'findings' },
] as const;
async function fixture(name = 'adverse') {
    const dir = resolve(root, name);
    const files: Map<string, Uint8Array> = await unzip(readFileSync(resolve(dir, readdirSync(dir).find(n => n.endsWith('.zip'))!)));
    const manifest = json(files.get('evidence_manifest.json'));
    const receipt = json(files.get('receipt.json'));
    const reads: string[] = [];
    const read = (path: string) => {
        reads.push(path);
        assert.ok(files.has(path), `Missing required file: ${path}`);
        return files.get(path)!;
    };
    return { files, manifest, receipt, reads, read };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
type Artifact = { artifact_id: string; path: string; sha256: string };
function artifact(f: Fixture, id: string): Artifact {
    const entry = f.manifest.artifacts.find((a: Artifact) => a.artifact_id === id);
    assert.ok(entry, id);
    return entry;
}
async function writeBound(f: Fixture, id: string, value: unknown) {
    const entry = artifact(f, id), bytes = encoder.encode(JSON.stringify(value));
    f.files.set(entry.path, bytes);
    entry.sha256 = 'sha256:' + await hash(bytes);
}
function relocate(f: Fixture, id: string, keepLegacy = false) {
    const entry = artifact(f, id), oldPath = entry.path, content = f.files.get(oldPath)!;
    if (keepLegacy) f.manifest.artifacts.push({ ...entry, artifact_id: 'legacy_' + id });
    else f.files.delete(oldPath);
    entry.path = `evidence/selected-${id}.json`;
    f.files.set(entry.path, content);
    return entry.path;
}
async function checkDeclaredHashes(f: Fixture) {
    validateContracts(f.receipt, f.manifest);
    for (const entry of f.manifest.artifacts) assert.equal('sha256:' + await hash(f.files.get(entry.path)), entry.sha256);
}

// This calls the real post-admission interpretation boundary. No signature is
// created or bypassed in the public verifier; archive edits exist only in memory.
test('P1 regression: relocated manifest roles never read conventional filenames', async () => {
    const f = await fixture(), expected = new Map();
    for (const role of roles) {
        expected.set(role.field, json(f.files.get(role.filename)));
        relocate(f, role.id, true);
        await writeBound(f, 'legacy_' + role.id, { synthetic: true, stale: role.filename });
    }
    await checkDeclaredHashes(f);
    const result = await verifySemantics(path => {
        assert.ok(!roles.some(r => r.filename === path), `Conventional filename must not select an artifact: ${path}`);
        return f.read(path);
    }, f.manifest, f.receipt);
    for (const role of roles) assert.deepEqual(result[role.field], expected.get(role.field));
});

for (const role of roles) {
    test(`${role.id}: valid relocated bytes work without the conventional file`, async () => {
        const f = await fixture(), expected = json(f.files.get(role.filename));
        const path = relocate(f, role.id);
        await checkDeclaredHashes(f);
        const result = await verifySemantics(f.read, f.manifest, f.receipt);
        assert.deepEqual(result[role.field], expected);
        assert.ok(f.reads.includes(path));
        assert.ok(!f.reads.includes(role.filename));
    });
    test(`${role.id}: missing ID fails despite a conventional file`, async () => {
        const f = await fixture();
        artifact(f, role.id).artifact_id = 'legacy_' + role.id;
        await checkDeclaredHashes(f);
        await assert.rejects(verifySemantics(f.read, f.manifest, f.receipt), /exactly one manifest entry/);
    });
    test(`${role.id}: duplicate ID fails closed`, async () => {
        const f = await fixture(), entry = artifact(f, role.id);
        f.manifest.artifacts.push({ ...entry, path: `duplicate-${role.filename}` });
        f.files.set(`duplicate-${role.filename}`, f.files.get(role.filename)!);
        assert.throws(() => validateContracts(f.receipt, f.manifest), /Duplicate artifact/);
        await assert.rejects(verifySemantics(f.read, f.manifest, f.receipt), /exactly one manifest entry/);
    });
    test(`${role.id}: missing bound file fails without legacy fallback`, async () => {
        const f = await fixture();
        artifact(f, role.id).path = `missing-${role.filename}`;
        await assert.rejects(verifySemantics(f.read, f.manifest, f.receipt), /Missing required file/);
        assert.ok(!f.reads.includes(role.filename));
    });
    test(`${role.id}: digest mismatch is rejected before JSON parsing`, async () => {
        const f = await fixture();
        const path = relocate(f, role.id, true);
        f.files.set(path, encoder.encode('not JSON; digest must fail first'));
        await assert.rejects(verifySemantics(f.read, f.manifest, f.receipt), /Evidence artifact hash mismatch/);
        assert.ok(!f.reads.includes(role.filename));
    });
    test(`${role.id}: unsafe bound path is rejected before file lookup`, async () => {
        const f = await fixture();
        artifact(f, role.id).path = '../outside.json';
        assert.throws(() => validateContracts(f.receipt, f.manifest), /Unsafe package path/);
        await assert.rejects(verifySemantics(f.read, f.manifest, f.receipt), /Unsafe package path/);
        assert.ok(!f.reads.includes('../outside.json'));
    });
    test(`${role.id}: valid conventional content cannot mask inconsistent bound content`, async () => {
        const f = await fixture(), value = json(f.files.get(role.filename));
        relocate(f, role.id, true);
        if (role.field === 'posture') value.target.hostname = 'manifest-selected-synthetic-host';
        else value.findings[0].title = 'Manifest-selected synthetic finding';
        await writeBound(f, role.id, value);
        await checkDeclaredHashes(f);
        await assert.rejects(verifySemantics(f.read, f.manifest, f.receipt), role.field === 'posture' ? /Posture does not reconstruct from observations/ : /Findings do not reconstruct from posture/);
        assert.ok(!f.reads.includes(role.filename));
    });
    test(`${role.id}: content shaped for the other role fails semantic reconstruction`, async () => {
        const f = await fixture(), other = roles.find(r => r.id !== role.id)!;
        await writeBound(f, role.id, json(f.files.get(other.filename)));
        await checkDeclaredHashes(f);
        await assert.rejects(verifySemantics(f.read, f.manifest, f.receipt), role.field === 'posture' ? /Posture does not reconstruct from observations/ : /Findings do not reconstruct from posture/);
    });
    test(`${role.id}: duplicate and case-conflicting archive names fail before interpretation`, async () => {
        for (const conflicting of [role.filename, role.filename.toUpperCase()]) {
            const bytes = encoder.encode('{}');
            await assert.rejects(unzip(storeArchive([{ name: role.filename, bytes }, { name: conflicting, bytes }])), /collision/);
        }
    });
}

for (const name of ['complete', 'adverse', 'partial']) test(`all six semantic roles can relocate: ${name}`, async () => {
    const f = await fixture(name);
    const before = await verifySemantics(f.read, f.manifest, f.receipt);
    for (const id of ['host_posture', 'posture_findings', 'host_observations', 'authority_record', 'admission_decision', 'collection_completeness']) relocate(f, id);
    await checkDeclaredHashes(f);
    f.reads.length = 0;
    const after = await verifySemantics(f.read, f.manifest, f.receipt);
    assert.deepEqual(after, before);
    assert.equal(new Set(f.reads).size, 6);
    assert.equal(f.reads.length, 6, 'Each bound record is read once for checking and presentation');
});

for (const representation of ['Uint8Array', 'Buffer']) test(`digest and parser share an owned byte snapshot: ${representation}`, async () => {
    const f = await fixture();
    for (const [path, bytes] of f.files) f.files.set(path, representation === 'Buffer' ? Buffer.from(bytes) : new Uint8Array(bytes));
    const checked = await verifySemantics(path => {
        const bytes = f.read(path), content = new TextDecoder().decode(bytes);
        if (content.includes('demo-host')) queueMicrotask(() => bytes.set(encoder.encode(content.replaceAll('demo-host', 'evil-host'))));
        return bytes;
    }, f.manifest, f.receipt);
    assert.equal(checked.posture.target.hostname, 'demo-host');
    assert.deepEqual(checked.findings, json(readFileSync(resolve(root, 'adverse/findings.json'))));
    assert.equal(json(f.files.get('posture.json')).target.hostname, 'evil-host', 'The source buffer changed; the parsed snapshot must not');
});
