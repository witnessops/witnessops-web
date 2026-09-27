import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, lstatSync, mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { inspectHandoff, formatHuman, IntakeError, MAX_PACKET_BYTES, MAX_RECEIPT_BYTES } from '../../scripts/morpheus-handoff/intake.ts';
import { FIXED_EXCLUSIONS, handoff, receipt, encode, json, sha256, withReceipt, withRawReceipt } from './fixtures.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = fileURLToPath(new URL('../../scripts/morpheus-handoff/cli.ts', import.meta.url));
const admission = 'ADMISSIBLE FOR HUMAN REVIEW';
function rejected(value, code) {
  let error;
  try { inspectHandoff(value); } catch (caught) { error = caught; }
  assert.ok(error instanceof IntakeError, `Expected bounded IntakeError, received ${error?.constructor?.name ?? 'success'}`);
  assert.equal(typeof error.code, 'string');
  assert.ok(error.code.length > 0 && error.code.length <= 80);
  assert.equal(typeof error.location, 'string');
  assert.ok(error.location.length > 0 && error.location.length <= 200);
  assert.ok(error.message.length <= 500);
  if (code) assert.equal(error.code, code);
  return error;
}
function fixtureCase(mutate) { const packet = handoff(); mutate(packet); return encode(packet); }
function temporary(run) {
  const folder = mkdtempSync(join(tmpdir(), 'morpheus-synthetic-intake-'));
  try { return run(folder); } finally { rmSync(folder, { recursive: true, force: true }); }
}
function invoke(args, options = {}) {
  return spawnSync(process.execPath, ['--import', 'tsx', cli, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, TSX_DISABLE_CACHE: '1' }, timeout: 15000, ...options });
}
function inventory(directory) {
  const result = {};
  for (const name of readdirSync(directory).sort()) {
    const file = join(directory, name), stat = lstatSync(file);
    result[name] = stat.isDirectory() ? inventory(file) : stat.isFile() ? sha256(readFileSync(file)) : 'other';
  }
  return result;
}

test('valid synthetic handoff is admissible for human review', () => {
  const p = handoff(), r = receipt(), result = inspectHandoff(encode(p));
  assert.notEqual(result.status, admission);
  assert.deepEqual(result.decision, { id: r.decision_id, title: r.title, question: r.question, reason: r.reason, limitations: r.limitations });
  assert.deepEqual(result.selected_option, r.selected_option);
  assert.equal(result.requested_outcome, p.requested_outcome);
  assert.deepEqual(result.target, p.target);
  assert.deepEqual(result.acceptance, p.acceptance);
  assert.deepEqual(result.fixed_non_authorizations, [...FIXED_EXCLUSIONS]);
  assert.deepEqual(result.additional_exclusions, p.not_authorized.slice(6));
  assert.equal(result.next_gate, p.next_gate);
  assert.deepEqual(result.receipt, { id: r.id, sha256: p.decision_receipt_sha256, sha256_match: true, source_snapshot_sha256: r.source_snapshot_sha256 });
  assert.deepEqual(result.scope, p.scope);
  assert.ok(result.limitations.length > 0);
});

test('inspection preserves caller bytes and deterministic output', () => {
  const bytes = encode(handoff()), copy = Buffer.from(bytes);
  assert.deepEqual(inspectHandoff(bytes), inspectHandoff(bytes));
  assert.deepEqual(bytes, copy);
});

test('UTF-8 receipt bytes with final LF are hashed exactly', () => {
  const p = withReceipt(handoff(), r => { r.reason = 'SYNTHETIC TEST: zażółć gęślą jaźń, café and 🧪 are supplied data.'; });
  assert.ok(p.decision_receipt_json.endsWith('\n'));
  assert.notEqual(Buffer.byteLength(p.decision_receipt_json), p.decision_receipt_json.length);
  assert.equal(inspectHandoff(encode(p)).receipt.sha256, sha256(Buffer.from(p.decision_receipt_json)));
});

test('source snapshot identity remains distinct from receipt digest', () => {
  const p = handoff(), result = inspectHandoff(encode(p));
  assert.notEqual(result.receipt.source_snapshot_sha256, result.receipt.sha256);
  assert.equal(result.receipt.source_snapshot_sha256, p.source_snapshot_sha256);
});

test('changed request and area retain bound original receipt and selected snapshot', () => {
  const p = handoff(), original = inspectHandoff(encode(p));
  p.requested_outcome = 'SYNTHETIC TEST alternative request only; no authorization.';
  p.target.area = 'packages/content';
  const altered = inspectHandoff(encode(p));
  assert.deepEqual(altered.receipt, original.receipt);
  assert.deepEqual(altered.selected_option, original.selected_option);
  assert.notEqual(altered.requested_outcome, original.requested_outcome);
});

const invalidPacket = [
  ['wrong schema', p => { p.schema = 'witnessops.morpheus.build-handoff.v2'; }],
  ['unsupported state', p => { p.state = 'approved'; }],
  ['authority is not none', p => { p.authority = 'founder'; }],
  ['wrong target repository', p => { p.target.repository = 'witnessops/witnessops-morpheus'; }],
  ['case changed target repository', p => { p.target.repository = 'WitnessOps/witnessops-web'; }],
  ['target repository URL', p => { p.target.repository = 'https://github.com/witnessops/witnessops-web'; }],
  ['wrong digest', p => { p.decision_receipt_sha256 = 'f'.repeat(64); }],
  ['digest uppercase representation', p => { p.decision_receipt_sha256 = p.decision_receipt_sha256.toUpperCase(); }],
  ['wrong receipt encoding', p => { p.decision_receipt_encoding = 'utf-16'; }],
  ['packet decision ID mismatch', p => { p.decision_id = 'synthetic-other-decision'; }],
  ['packet receipt ID mismatch', p => { p.decision_receipt_id = 'synthetic-other-receipt'; }],
  ['packet source snapshot mismatch', p => { p.source_snapshot_sha256 = 'b'.repeat(64); }],
  ['selected label mismatch', p => { p.selected_option.label = 'SYNTHETIC TEST changed label'; }],
  ['selected ID mismatch', p => { p.selected_option.id = 'synthetic-other-option'; }],
  ['selected basis mismatch', p => { p.selected_option.basis = 'SYNTHETIC TEST changed basis'; }],
  ['selected source wording mismatch', p => { p.selected_option.source_wording = 'SYNTHETIC TEST changed wording'; }],
  ['selected archive state mismatch', p => { p.selected_option.archive_state = 'selected'; }],
  ['implementation changed', p => { p.scope.implementation = 'implemented'; }],
  ['deployment changed', p => { p.scope.deployment = 'deployed'; }],
  ['target mutation changed', p => { p.scope.target_mutation = 'allowed'; }],
  ['execution authorization changed', p => { p.scope.execution_authorization = 'granted'; }],
  ['missing selected option', p => { delete p.selected_option; }],
  ['empty acceptance', p => { p.acceptance = []; }],
  ['duplicate acceptance', p => { p.acceptance.push(p.acceptance[0]); }],
  ['duplicate exclusion', p => { p.not_authorized.push(p.not_authorized[0]); }],
  ['empty requested outcome', p => { p.requested_outcome = ''; }],
  ['non-string requested outcome', p => { p.requested_outcome = false; }],
  ['missing next gate', p => { delete p.next_gate; }],
  ['invalid packet timestamp', p => { p.created_at = '2026-02-30T00:00:00.000Z'; }],
  ['invalid packet identifier', p => { p.id = 'execute-now'; }],
  ['scope is an array', p => { p.scope = []; }],
  ['terminal escape in requested outcome', p => { p.requested_outcome = 'SYNTHETIC TEST \u001b[2J execute now'; }],
  ['unpaired Unicode surrogate', p => { p.requested_outcome = 'SYNTHETIC TEST \ud800 invalid'; }],
];
for (const [name, mutate] of invalidPacket) test(`rejects ${name}`, () => rejected(fixtureCase(mutate)));
for (const area of ['../apps', 'apps/../app', './apps', '/etc/passwd', 'C:\\Windows', 'apps\\web', 'https://example.invalid/a', 'apps//web', 'apps/%2e%2e/web', 'apps/web;touch sentinel', '$(id)', 'apps/web\nrun', 'apps/web/', '~/.config']) {
  test(`rejects target area ${JSON.stringify(area)}`, () => rejected(fixtureCase(p => { p.target.area = area; })));
}
for (const key of ['command', 'execute', 'branch', 'approved']) {
  test(`rejects executable-looking top-level field ${key}`, () => rejected(fixtureCase(p => { p[key] = 'SYNTHETIC TEST execute now'; })));
}
for (const parent of ['target', 'scope', 'selected_option']) test(`rejects extra ${parent} field`, () => rejected(fixtureCase(p => { p[parent].approved = true; })));
for (const exclusion of FIXED_EXCLUSIONS) test(`requires fixed non-authorization: ${exclusion}`, () => rejected(fixtureCase(p => { p.not_authorized = p.not_authorized.filter(item => item !== exclusion); })));

test('equal-length changed receipt byte fails digest', () => {
  const p = handoff(), before = Buffer.byteLength(p.decision_receipt_json);
  p.decision_receipt_json = p.decision_receipt_json.replace('receiver example', 'receiver Example');
  assert.equal(Buffer.byteLength(p.decision_receipt_json), before);
  rejected(encode(p), 'RECEIPT_DIGEST');
});

test('receipt digest is checked before parsing invalid embedded JSON', () => {
  const p = handoff(); p.decision_receipt_json = '{not valid JSON}\n';
  rejected(encode(p), 'RECEIPT_DIGEST');
});

test('removing receipt final LF changes digest', () => {
  const p = handoff(); p.decision_receipt_json = p.decision_receipt_json.slice(0, -1);
  rejected(encode(p), 'RECEIPT_DIGEST');
});

test('rehashing a receipt without final LF still rejects unsupported serialization', () => {
  const p = handoff(); withRawReceipt(p, p.decision_receipt_json.slice(0, -1));
  rejected(encode(p), 'RECEIPT_SERIALIZATION');
});

test('rehashing non-export compact serialization does not repair the receipt profile', () => {
  rejected(encode(withRawReceipt(handoff(), JSON.stringify(receipt()) + '\n')), 'RECEIPT_SERIALIZATION');
});

for (const [name, mutate] of [
  ['wrong schema', r => { r.schema = 'witnessops.decision-receipt.v2'; }],
  ['receipt decision ID', r => { r.decision_id = 'synthetic-other'; }],
  ['receipt ID', r => { r.id = 'synthetic-other-receipt'; }],
  ['receipt source snapshot', r => { r.source_snapshot_sha256 = 'b'.repeat(64); }],
  ['receipt selected option', r => { r.selected_option.label = 'SYNTHETIC TEST different'; }],
  ['extra command', r => { r.command = 'SYNTHETIC TEST execute now'; }],
  ['false owner', r => { r.owner = false; }],
  ['missing limitations', r => { delete r.limitations; }],
  ['scope implementation', r => { r.scope.implementation = 'implemented'; }],
  ['scope deployment', r => { r.scope.deployment = 'deployed'; }],
  ['scope storage', r => { r.scope.storage = 'Server-side authenticated decision'; }],
  ['no cited evidence', r => { r.evidence = []; }],
  ['cited evidence missing digest', r => { r.evidence[0].sha256 = null; }],
]) test(`rejects rehashed ${name}`, () => rejected(encode(withReceipt(handoff(), mutate))));

for (const [name, use, availability] of [
  ['missing use without missing availability', 'missing', 'available'],
  ['context use with missing availability', 'context', 'missing'],
]) test(`rejects inconsistent evidence: ${name}`, () => {
  const p = withReceipt(handoff(), r => r.evidence.push({ id: 'synthetic-evidence-gap', label: 'SYNTHETIC TEST gap', use, availability, sha256: null, path: null, verification: 'Not checked for this record' }));
  const error = rejected(encode(p), 'EVIDENCE_PROFILE');
  assert.equal(error.location, '/receipt/evidence/1/use');
});

test('explicit missing evidence remains admissible alongside cited evidence without fetching', () => {
  const p = withReceipt(handoff(), r => r.evidence.push({ id: 'synthetic-evidence-gap', label: 'SYNTHETIC TEST missing source', use: 'missing', availability: 'missing', sha256: null, path: null, verification: 'Not checked for this record' }));
  const result = inspectHandoff(encode(p));
  assert.equal(result.status, admission);
  assert.equal(result.scope.execution_authorization, 'not_granted');
});

test('duplicate packet member is ambiguous even when equal', () => {
  rejected(Buffer.from(json(handoff()).replace('"state": "prepared",', '"state": "prepared", "state": "prepared",')));
});

test('escaped-equivalent packet members are ambiguous', () => {
  rejected(Buffer.from(json(handoff()).replace('"state": "prepared",', '"state": "prepared", "\\u0073tate": "prepared",')));
});

test('duplicate nested packet member is ambiguous', () => {
  rejected(Buffer.from(json(handoff()).replace('"repository": "witnessops/witnessops-web",', '"repository": "witnessops/witnessops-web", "repository": "witnessops/witnessops-web",')));
});

test('rehashed duplicate receipt member is ambiguous', () => {
  const p = handoff(); withRawReceipt(p, p.decision_receipt_json.replace('"owner": "founder",', '"owner": "founder", "owner": "founder",'));
  rejected(encode(p));
});

test('rehashed escaped-equivalent receipt members are ambiguous', () => {
  const p = handoff(); withRawReceipt(p, p.decision_receipt_json.replace('"owner": "founder",', '"owner": "founder", "\\u006fwner": "founder",'));
  rejected(encode(p));
});

for (const raw of ['', '{', '{bad}', '{"a":1,}', 'null', 'false', '0', '"string"', '[]', '{}\n{}']) test(`rejects malformed or unsupported JSON ${JSON.stringify(raw)}`, () => rejected(Buffer.from(raw)));

test('malformed UTF-8 is rejected instead of replaced', () => rejected(Buffer.concat([encode(handoff()), Buffer.from([0xc0, 0xaf])])));
test('UTF-8 BOM is rejected rather than stripped', () => rejected(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), encode(handoff())])));
test('packet limit is 256 KiB and oversized input is refused', () => { assert.equal(MAX_PACKET_BYTES, 262144); rejected(Buffer.alloc(MAX_PACKET_BYTES + 1, 32)); });
test('embedded receipt limit is 128 KiB', () => {
  assert.equal(MAX_RECEIPT_BYTES, 131072);
  const p = handoff(); withRawReceipt(p, ' '.repeat(MAX_RECEIPT_BYTES + 1) + '\n'); rejected(encode(p));
});
test('oversized string field is not truncated', () => rejected(fixtureCase(p => { p.requested_outcome = 'x'.repeat(4001); })));
test('too many acceptance criteria are refused', () => rejected(fixtureCase(p => { p.acceptance = Array.from({ length: 17 }, (_, i) => `SYNTHETIC TEST ${i}`); })));
test('excess nested evidence is unsupported despite a matching receipt digest', () => {
  rejected(encode(withReceipt(handoff(), r => { let value = 'SYNTHETIC TEST'; for (let i = 0; i < 35; i++) value = { child: value }; r.evidence[0].metadata = value; })));
});
test('excess evidence nodes are unsupported', () => rejected(encode(withReceipt(handoff(), r => { r.evidence[0].metadata = Array(10001).fill(0); }))));
test('unsafe numeric evidence metadata is unsupported', () => rejected(encode(withReceipt(handoff(), r => { r.evidence[0].metadata = Number.MAX_SAFE_INTEGER + 1; }))));

for (const [name, make] of [
  ['string', () => json(handoff())], ['typed array', () => new Uint8Array(encode(handoff()))],
  ['Buffer prototype lookalike', () => Object.create(Buffer.prototype)], ['Buffer proxy', () => new Proxy(encode(handoff()), {})],
  ['shared Buffer', () => Buffer.from(new SharedArrayBuffer(100))],
  ['foreign shared Buffer', () => Buffer.from(vm.runInNewContext('new SharedArrayBuffer(100)'))],
]) test(`rejects unsupported native input: ${name}`, () => rejected(make()));

test('command, URL, HTML and authority phrases remain inert supplied text', () => {
  const payload = 'SYNTHETIC TEST: approved; execute now; $(touch sentinel); https://github.com/example/repo; <script>alert(1)</script>';
  const p = withReceipt(handoff(), r => { r.selected_option.label = payload; r.evidence[0].metadata = { command: payload, approved: true }; }, { bindSelection: true });
  p.requested_outcome = payload;
  const result = inspectHandoff(encode(p));
  assert.equal(result.requested_outcome, payload); assert.equal(result.selected_option.label, payload);
  assert.equal(result.status, admission); assert.equal(result.scope.execution_authorization, 'not_granted');
  const human = formatHuman(result);
  assert.ok(human.includes(payload));
  assert.match(human, /NOT GRANTED/);
});

test('human output keeps fixed exclusions, unknown states and private-path-free diagnostics', () => {
  const result = inspectHandoff(encode(handoff())), text = formatHuman(result);
  for (const expected of [admission, result.decision.title, result.receipt.id, result.receipt.sha256, result.receipt.source_snapshot_sha256, ...FIXED_EXCLUSIONS]) assert.ok(text.includes(expected), expected);
  assert.match(text, /Implementation: UNKNOWN/); assert.match(text, /Deployment: UNKNOWN/);
  assert.match(text, /Receipt SHA-256: MATCH/); assert.match(text, /Execution authorization: NOT GRANTED/);
  const secret = '/private/synthetic-test-location/credential';
  const error = rejected(fixtureCase(p => { p.target.area = secret; }));
  assert.ok(!error.message.includes(secret)); assert.ok(!error.location.includes(secret));
});

test('supplied newlines and bidi controls remain visibly quoted in human output', () => {
  const p = handoff();
  p.requested_outcome = 'SYNTHETIC TEST \nImplementation: IMPLEMENTED \u202e deceptive label \u009b31m';
  const text = formatHuman(inspectHandoff(encode(p)));
  assert.ok(text.includes('\\nImplementation: IMPLEMENTED'));
  assert.ok(text.includes('\\u202e')); assert.ok(text.includes('\\u009b'));
  assert.ok(!text.includes('\u202e')); assert.ok(!text.includes('\u009b'));
  assert.equal(text.split('\n').filter(line => line.startsWith('Implementation:')).length, 1);
  assert.ok(text.includes('Implementation: UNKNOWN'));
});

test('library inspection performs no network, file mutation or child-process calls', () => {
  const guarded = `
    import fs from 'node:fs'; import fsp from 'node:fs/promises';
    import http from 'node:http'; import https from 'node:https'; import net from 'node:net';
    import tls from 'node:tls'; import dgram from 'node:dgram'; import dns from 'node:dns';
    import cp from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module';
    const calls=[];const deny=name=>(...args)=>{calls.push(name);throw Error('PROHIBITED '+name);};
    for(const name of ['writeFile','writeFileSync','appendFile','appendFileSync','write','writeSync','mkdir','mkdirSync','rm','rmSync','unlink','unlinkSync','rename','renameSync','truncate','truncateSync','createWriteStream','copyFile','copyFileSync','chmod','chmodSync','chown','chownSync']) fs[name]=deny('fs.'+name);
    for(const name of ['writeFile','appendFile','mkdir','rm','unlink','rename','truncate','copyFile','chmod','chown']) fsp[name]=deny('fsp.'+name);
    const writable=flags=>typeof flags==='string'?!['r','rs','sr'].includes(flags):(flags&(fs.constants.O_WRONLY|fs.constants.O_RDWR|fs.constants.O_CREAT|fs.constants.O_APPEND|fs.constants.O_TRUNC))!==0;
    for(const name of ['open','openSync']){const original=fs[name];fs[name]=(...args)=>writable(args[1])?deny('fs.'+name)(...args):original(...args);}
    {const original=fsp.open;fsp.open=(...args)=>writable(args[1])?deny('fsp.open')(...args):original(...args);}
    for(const [module,names] of [[http,['request','get']],[https,['request','get']],[net,['connect','createConnection']],[tls,['connect']],[dgram,['createSocket']],[dns,['lookup','resolve']],[cp,['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']]])for(const name of names)module[name]=deny(name);
    globalThis.fetch=deny('fetch');syncBuiltinESMExports();
    const loaded=await import(${JSON.stringify(new URL('../../scripts/morpheus-handoff/intake.ts', import.meta.url).href)});
    const {inspectHandoff,formatHuman}=loaded.default??loaded;
    const result=inspectHandoff(Buffer.from(process.env.SYNTHETIC_PACKET,'base64'));
    formatHuman(result); process.stdout.write(JSON.stringify({status:result.status,calls}));
  `;
  const output = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', guarded], { cwd: root, encoding: 'utf8', env: { ...process.env, TSX_DISABLE_CACHE: '1', SYNTHETIC_PACKET: encode(handoff()).toString('base64') }, timeout: 15000 });
  assert.equal(output.status, 0, output.stderr);
  assert.deepEqual(JSON.parse(output.stdout), { status: admission, calls: [] });
});

test('CLI inspects one absolute synthetic file and optional JSON without changing files', () => temporary(folder => {
  const file = join(folder, 'synthetic-handoff.json'); writeFileSync(file, encode(handoff()));
  const sentinel = join(folder, 'unrelated'); mkdirSync(sentinel); writeFileSync(join(sentinel, 'keep.txt'), 'SYNTHETIC TEST untouched');
  const before = inventory(folder);
  const human = invoke(['--', file]); assert.equal(human.status, 0, human.stderr); assert.match(human.stdout, /ADMISSIBLE FOR HUMAN REVIEW/);
  const structured = invoke(['--json', '--', file]); assert.equal(structured.status, 0, structured.stderr); assert.equal(JSON.parse(structured.stdout).status, admission);
  assert.deepEqual(inventory(folder), before);
  assert.ok(!human.stdout.includes(folder)); assert.ok(!structured.stdout.includes(folder));
}));

test('CLI invalid file exits nonzero without normal output or private path', () => temporary(folder => {
  const file = join(folder, 'PRIVATE-SYNTHETIC-NAME.json'); writeFileSync(file, fixtureCase(p => { p.authority = 'approved'; }));
  const result = invoke([file]); assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.ok(result.stderr.length < 1000); assert.ok(!result.stderr.includes(folder)); assert.ok(!result.stderr.includes('PRIVATE-SYNTHETIC-NAME'));
}));

test('CLI rejects a final symlink without consuming its target', () => temporary(folder => {
  const target = join(folder, 'target.json'), link = join(folder, 'link.json'); writeFileSync(target, encode(handoff())); symlinkSync(target, link);
  const result = invoke([link]); assert.equal(result.status, 1); assert.equal(result.stdout, '');
}));
test('CLI rejects nonregular input', () => temporary(folder => { const result = invoke([folder]); assert.equal(result.status, 1); assert.equal(result.stdout, ''); }));
test('CLI rejects oversized file before normal presentation', () => temporary(folder => { const file = join(folder, 'oversized.json'); writeFileSync(file, Buffer.alloc(MAX_PACKET_BYTES + 1)); const result = invoke([file]); assert.equal(result.status, 1); assert.equal(result.stdout, ''); }));
test('CLI missing file diagnostic does not expose supplied path', () => temporary(folder => { const result = invoke([join(folder, 'PRIVATE-MISSING')]); assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.ok(!result.stderr.includes(folder)); }));
for (const args of [[], ['-'], ['relative.json'], ['--unknown'], ['--json'], ['/one', '/two']]) test(`CLI usage rejects ${JSON.stringify(args)}`, () => { const result = invoke(args); assert.equal(result.status, 2, result.stderr); assert.equal(result.stdout, ''); });
