import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyProofpack, verifySemantics, type ProofpackInput } from './verify.mjs';
import { json, canonical, unzip, validatePackagePaths, safePath } from './primitives.mjs';
import { timestamp, authorityAdmission } from './contracts.mjs';
const root = resolve(import.meta.dirname, '../../../../../tests/proofpack/fixtures');
function input(name: string): ProofpackInput { const dir = resolve(root, name), names = readdirSync(dir); const read = (n: string) => ({ name: n, bytes: new Uint8Array(readFileSync(resolve(dir, n))) }); return { proofpack: read(names.find(n => n.endsWith('.zip'))!), signature: read(names.find(n => n.endsWith('.sig.json'))!), trust_registry: read('trusted-keys.json') }; }
for (const name of ['complete', 'adverse', 'partial', 'tampered', 'wrong-registry', 'signed-bad-findings', 'signed-bad-coverage', 'signed-bad-authority', 'signed-bad-embedded'])
    test(`Local Audit 1.2.2 CLI parity: ${name}`, async () => {
        const actual = await verifyProofpack(input(name));
        const expected = JSON.parse(readFileSync(resolve(root, name, 'expected.json'), 'utf8'));
        for (const field of ['status', 'outcome', 'proof_run_id', 'workflow_class', 'failure_states', 'verification_inputs'] as const)
            assert.deepEqual(actual[field], expected[field], field);
        assert.deepEqual(Object.fromEntries(Object.entries(actual.checks).map(([k, v]) => [k, v.status])), Object.fromEntries(Object.entries(expected.checks).map(([k, v]) => [k, (v as {
                status: string;
            }).status])));
        if (actual.report) {
            for (const field of ['posture', 'findings', 'scope'] as const)
                assert.deepEqual(actual.report[field], JSON.parse(readFileSync(resolve(root, name, field + '.json'), 'utf8')));
            assert.deepEqual(actual.report.completeness, JSON.parse(readFileSync(resolve(root, name, 'collection-completeness.json'), 'utf8')));
        }
        else
            assert.equal(actual.status, 'invalid');
    });
test('missing registry cannot produce a buyer report', async () => { const files = input('complete'); delete files.trust_registry; const result = await verifyProofpack(files); assert.equal(result.status, 'invalid'); assert.equal(result.report, undefined); assert.equal(result.checks.verification_inputs.status, 'failed'); });
test('unsigned supplied verification result cannot shortcut verification', async () => { const files = input('complete'); files.signature!.bytes = new TextEncoder().encode('{"status":"valid"}'); assert.equal((await verifyProofpack(files)).status, 'invalid'); });
test('JSON duplicate keys, excess depth and unsafe numbers are rejected', () => { for (const text of ['{"status":"invalid","status":"valid"}', '['.repeat(70) + '0' + ']'.repeat(70), '9007199254740993'])
    assert.throws(() => json(new TextEncoder().encode(text))); });
test('canonical JSON orders Unicode keys by codepoint like Python', () => { assert.equal(canonical({ '\u{1f600}': 1, '\ufffd': 2 }), '{' + '"\ufffd":2,"😀":1}'); });
test('resource admission precedes ZIP extraction', async () => { await assert.rejects(unzip(new Uint8Array(22))); });

test('report records follow manifest-selected paths and are read once for checking and presentation', async () => {
    const archive = await unzip(input('partial').proofpack!.bytes);
    const manifest = json(archive.get('evidence_manifest.json'));
    const selected = new Map<string, unknown>();
    for (const id of ['authority_record', 'collection_completeness']) {
        const artifact = manifest.artifacts.find((a: { artifact_id: string }) => a.artifact_id === id);
        const bytes = archive.get(artifact.path);
        selected.set(id, json(bytes));
        archive.delete(artifact.path);
        artifact.path = `evidence/selected-${id}.json`;
        archive.set(artifact.path, bytes);
    }
    // Scope is a presentation of checked authority, not another independently selected file.
    archive.delete('evidence/scope.json');
    const reads: string[] = [];
    const checked = await verifySemantics(name => {
        assert.ok(archive.has(name), `Unexpected record lookup: ${name}`);
        reads.push(name);
        return archive.get(name);
    }, manifest, json(archive.get('receipt.json')));
    assert.deepEqual(checked.authority, selected.get('authority_record'));
    assert.deepEqual(checked.completeness, selected.get('collection_completeness'));
    assert.equal(reads.length, new Set(reads).size, 'Checked records must not be reopened for presentation');
    assert.equal(checked.completeness.section_results.filter(s => s.complete).length, 10);
    assert.deepEqual(checked.completeness.section_results.filter(s => !s.complete).map(s => s.section), ['updates']);
    assert.deepEqual(checked.scope, JSON.parse(readFileSync(resolve(root, 'partial/scope.json'), 'utf8')));
});

test('JSON rejects numeric forms that cannot retain Python canonical semantics', () => {
    for (const number of ['1.0', '1e0', '1E+0', '-0.0', '1.5', '9007199254740993'])
        assert.throws(() => json(new TextEncoder().encode(`{"value":${number}}`)));
    assert.deepEqual(json(new TextEncoder().encode('{"value":-42,"count":0,"label":"1e0"}')), { value: -42, count: 0, label: '1e0' });
});

test('JSON rejects lone surrogates while retaining valid Unicode strings', () => {
    for (const text of ['"\\ud800"', '{"\\udc00":1}'])
        assert.throws(() => json(new TextEncoder().encode(text)), /surrogate/);
    assert.equal(json(new TextEncoder().encode('"\\ud83d\\ude00"')), '😀');
});

test('JSON preserves the reference rejection of a leading UTF-8 BOM', () => {
    assert.throws(() => json(new TextEncoder().encode('\ufeff{"value":1}')));
    assert.deepEqual(json(new TextEncoder().encode('{"value":"\ufeff"}')), { value: '\ufeff' });
});

test('UTC timestamps reject rollover and preserve exact microsecond comparisons', () => {
    for (const value of ['2026-02-30T12:00:00Z', '2026-02-29T00:00:00Z', '2026-07-10T24:00:00Z', '0000-01-01T00:00:00Z'])
        assert.throws(() => timestamp(value));
    assert.equal(timestamp('2024-02-29T00:00:00Z'), BigInt(Date.parse('2024-02-29T00:00:00Z')) * 1000n);
    assert.equal(timestamp('2026-07-10T12:00:00.000999Z') - timestamp('2026-07-10T12:00:00.000001Z'), 998n);
    assert.equal(timestamp('1969-12-31T23:59:59.999999Z'), -1n);
    assert.equal(timestamp('0001-01-01T00:00:00Z'), BigInt(Date.parse('0001-01-01T00:00:00Z')) * 1000n);
});

test('authority rejects observations one microsecond outside its inclusive window', async () => {
    const archive = await unzip(input('complete').proofpack!.bytes);
    const authority = json(archive.get('evidence/authority.json')!);
    authority.authorization_window.ends_at_utc = '2026-07-10T12:00:00.000001Z';
    const admitted = await authorityAdmission(authority, 'demo-host', authority.operator_id, '2026-07-10T12:00:00.000001Z');
    assert.equal(admitted.evaluated_at_utc, '2026-07-10T12:00:00Z');
    await assert.rejects(authorityAdmission(authority, 'demo-host', authority.operator_id, '2026-07-10T12:00:00.000002Z'), /outside declared authority/);
});

test('portable package paths include implicit directories and reject ambiguous encodings', () => {
    validatePackagePaths(['evidence/authority.json', 'evidence/scope.json', 'report.md']);
    for (const paths of [['A/x', 'a/y'], ['A', 'a/y'], ['a/y', 'A'], ['a/x', 'a/x']])
        assert.throws(() => validatePackagePaths(paths), /collision/);
    for (const path of ['ﬀ.txt', 'ff/ſ.txt', '../report.md', 'a\\report.md', 'a/./report.md'])
        assert.throws(() => safePath(path));
    assert.throws(() => validatePackagePaths([Array.from({ length: 401 }, () => 'a').join('/')]), /entry limit/);
});
