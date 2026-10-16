import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, stat, realpath, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { openDarwinConfig, openDarwinDirectory } from './agent/filesystem-darwin.mjs';
import path from 'node:path';
import test from 'node:test';
import { inspectAgent } from './agent/inspect.mjs';
import { agentCommand } from './commands/agent.mjs';
import { parseConfig, readConfig } from './agent/filesystem.mjs';

const schema = JSON.parse(await readFile(new URL('./agent/schema.json', import.meta.url), 'utf8'));
const entrypoint = new URL('./main.mjs', import.meta.url).pathname;
const secret = 'SYNTHETIC-PRIVATE-VALUE-DO-NOT-EXPORT';

// Dependency-free conformance check for the JSON Schema keywords used by this
// contract. Semantic tests below separately assert failure/observation meaning.
function conforms(value, rule) {
  for (const keyword of Object.keys(rule)) assert.ok(['$schema', '$id', 'title', 'type', 'const', 'enum', 'oneOf', 'properties', 'required',
    'additionalProperties', 'items', 'maxItems', 'minimum', 'maximum', 'minLength', 'pattern', 'format'].includes(keyword), `unhandled schema keyword ${keyword}`);
  if (rule.oneOf) {
    assert.equal(rule.oneOf.filter(candidate => { try { conforms(value, candidate); return true; } catch { return false; } }).length, 1);
    return;
  }
  if ('const' in rule) assert.deepEqual(value, rule.const);
  if (rule.enum) assert.ok(rule.enum.includes(value));
  if (rule.type) {
    const types = [].concat(rule.type);
    assert.ok(types.some(type => type === 'null' ? value === null : type === 'array' ? Array.isArray(value) : type === 'integer'
      ? Number.isInteger(value) : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : typeof value === type));
  }
  if (rule.properties) {
    for (const key of rule.required) assert.ok(Object.hasOwn(value, key), `missing ${key}`);
    for (const [key, item] of Object.entries(value)) { assert.ok(Object.hasOwn(rule.properties, key), `unexpected ${key}`); conforms(item, rule.properties[key]); }
  }
  if (rule.items) { assert.ok(value.length <= rule.maxItems); value.forEach(item => conforms(item, rule.items)); }
  if (rule.minimum !== undefined) assert.ok(value >= rule.minimum);
  if (rule.maximum !== undefined) assert.ok(value <= rule.maximum);
  if (rule.minLength) assert.ok(value.length >= rule.minLength);
  if (rule.pattern) assert.match(value, new RegExp(rule.pattern));
  if (rule.format === 'date-time') assert.equal(new Date(value).toISOString(), value);
  if (rule.format === 'uuid') assert.match(value, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
}

async function fixture(action) {
  const directory = await realpath(await mkdtemp(path.join(tmpdir(), 'wops-agent-test-')));
  const bin = path.join(directory, 'bin'); await mkdir(bin);
  const config = path.join(directory, 'selected.json');
  const options = { platform: process.platform, uid: 1000, userHome: directory, pathValue: bin };
  try { await action({ directory, bin, config, options }); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

function checkRecord(record) {
  conforms(record, schema);
  const checks = new Map(record.checks.map(check => [check.id, check]));
  assert.equal(checks.size, record.checks.length);
  assert.equal(new Set(record.observations.map(item => item.id)).size, record.observations.length);
  for (const observation of record.observations) {
    assert.equal(checks.get(observation.check_id)?.status, 'observed');
    assert.deepEqual(checks.get(observation.check_id).source, observation.source);
    assert.ok(observation.meaning && observation.unknowns.length);
  }
  assert.equal(record.failures.length, record.checks.filter(check => check.status === 'failed').length);
  for (const failure of record.failures) assert.equal(checks.get(failure.check_id)?.status, 'failed');
  assert.ok(record.completed_at >= record.observed_at);
  assert.ok(record.scope.limitations.length && record.scope.privacy_boundary.length && record.unknowns.length);
}

test('record alone identifies scope, time, observations, meaning, unknowns and omitted work', async () => fixture(async ({ bin, config, options }) => {
  await writeFile(path.join(bin, 'codex'), '# never execute this file\n', { mode: 0o755 });
  await symlink('/nonexistent-target-not-followed', path.join(bin, 'claude'));
  await writeFile(config, JSON.stringify({ mcpServers: { [secret]: { command: secret, args: [secret], env: { TOKEN: secret }, url: secret, disabled: false } }, private: secret }));
  const record = await inspectAgent({ ...options, configFiles: [config] });
  checkRecord(record);
  assert.equal(record.collection_status, 'completed');
  assert.equal(record.failures.length, 0);
  assert.equal(record.observations.length, 3);
  const [executable, link, mcp] = record.observations;
  assert.equal(executable.source.path, '$HOME/bin/codex');
  assert.deepEqual(executable.details, { name: 'codex', entry_kind: 'regular-file', executable_mode_bit: true });
  assert.equal(link.details.entry_kind, 'symbolic-link');
  assert.equal(link.details.executable_mode_bit, null);
  assert.match(link.meaning, /target was not inspected/);
  assert.equal(mcp.category, 'mcp-declaration');
  assert.equal(mcp.source.path, '$HOME/selected.json');
  assert.deepEqual(mcp.details, { entry_index: 1, command_field_present: true, url_field_present: true, disabled: false });
  assert.equal(record.checks.filter(check => check.status === 'not-found').length, 2);
  const serialized = JSON.stringify(record);
  assert.ok(!serialized.includes(secret));
  assert.ok(!serialized.includes(options.userHome));
  assert.match(serialized, /not product installation/);
  assert.match(serialized, /Runtime processes/);
}));

test('permission denied preserves useful partial evidence and never claims absence', async () => fixture(async ({ bin, config, options }) => {
  await writeFile(path.join(bin, 'codex'), '', { mode: 0o644 });
  const record = await inspectAgent({ ...options, configFiles: [config], readConfig: async () => { throw Object.assign(new Error(secret), { code: 'EACCES' }); } });
  checkRecord(record);
  assert.equal(record.collection_status, 'partial');
  assert.equal(record.observations[0].details.executable_mode_bit, false);
  assert.equal(record.failures[0].reason, 'permission-denied');
  assert.match(record.failures[0].impact, /remain unknown/);
  assert.ok(!JSON.stringify(record).includes(secret));
}));

test('unreadable PATH location is a failure, not a successful empty inventory', async () => fixture(async ({ options }) => {
  const record = await inspectAgent({ ...options, executableIo: { open: async () => { throw Object.assign(new Error(secret), { code: 'EACCES' }); } } });
  checkRecord(record);
  assert.equal(record.collection_status, 'partial');
  assert.deepEqual(record.observations, []);
  assert.equal(record.failures[0].area, 'agent-path-scan');
  assert.equal(record.failures[0].reason, 'permission-denied');
  assert.match(record.unknowns.join(' '), /not inspected/);
}));

test('optional MCP input and empty declaration map have distinct recorded outcomes', async () => fixture(async ({ config, options }) => {
  const notRequested = await inspectAgent(options); checkRecord(notRequested);
  assert.equal(notRequested.checks.at(-1).status, 'not-requested');
  assert.match(notRequested.unknowns.join(' '), /no JSON configuration file was selected/);
  await writeFile(config, '{"mcpServers":{}}');
  const empty = await inspectAgent({ ...options, configFiles: [config] }); checkRecord(empty);
  assert.equal(empty.checks.at(-1).status, 'observed');
  assert.equal(empty.checks.at(-1).declaration_count, 0);
  assert.equal(empty.observations.length, 0);
  assert.equal(empty.collection_status, 'completed');
}));

test('unsupported platform and elevated user produce explicit records without host reads', async () => {
  for (const options of [{ platform: 'win32', uid: 1000 }, { platform: 'linux', uid: 0 }, { platform: 'darwin', uid: 0 }]) {
    const record = await inspectAgent({ ...options, configFiles: ['/not-read'], executableIo: { open: () => assert.fail('host read') }, readConfig: () => assert.fail('config read') });
    checkRecord(record);
    assert.equal(record.collection_status, 'unsupported');
    assert.equal(record.observations.length, 0);
    assert.match(record.failures[0].impact, /no host inputs were inspected/);
  }
});

test('input parse failures retain no source values and do not suppress another selected file', async () => fixture(async ({ config, options }) => {
  await writeFile(config, '{"mcpServers":{"valid":{}}}');
  const invalid = path.join(path.dirname(config), 'invalid.json');
  for (const [text, reason] of [
    [secret, 'invalid-json'], ['{"other":{}}', 'unsupported-config-shape'],
    ['{"mcpServers":[]}', 'unsupported-config-shape'], ['{"mcpServers":{"bad":null}}', 'invalid-declaration'],
    ['{"mcpServers":{"a":{},"\\u0061":{}}}', 'duplicate-json-key'],
    [JSON.stringify({ mcpServers: Object.fromEntries(Array.from({ length: 129 }, (_, i) => [i, {}])) }), 'declaration-limit'],
    ['['.repeat(33) + '0' + ']'.repeat(33), 'depth-limit'],
    [' '.repeat(65_537), 'size-limit'],
  ]) {
    await writeFile(invalid, text);
    const record = await inspectAgent({ ...options, configFiles: [invalid, config] }); checkRecord(record);
    assert.equal(record.collection_status, 'partial');
    assert.equal(record.failures[0].reason, reason);
    assert.equal(record.observations.length, 1);
    assert.ok(!JSON.stringify(record).includes(secret));
  }
  await writeFile(invalid, Buffer.from([0xff]));
  assert.equal((await inspectAgent({ ...options, configFiles: [invalid] })).failures[0].reason, 'invalid-utf8');
}));

test('selected configuration rejects leaf and ancestor symlinks and special files', async () => fixture(async ({ directory, config, options }) => {
  await writeFile(config, '{"mcpServers":{"fixture":{}}}');
  const alias = path.join(directory, 'alias.json'); await symlink(config, alias);
  const linkDirectory = path.join(directory, 'link'); await symlink(directory, linkDirectory);
  for (const file of [alias, path.join(linkDirectory, 'selected.json'), directory]) {
    const record = await inspectAgent({ ...options, configFiles: [file] }); checkRecord(record);
    assert.equal(record.collection_status, 'partial');
    assert.equal(record.observations.length, 0);
    assert.ok(['symlink-not-inspected', 'non-directory-or-symlink', 'not-regular-file'].includes(record.failures[0].reason));
  }
  const missing = await inspectAgent({ ...options, configFiles: [path.join(directory, 'missing.json')] });
  assert.equal(missing.failures[0].reason, 'not-found');
  const fifo = path.join(directory, 'input-fifo');
  assert.equal(spawnSync('mkfifo', [fifo]).status, 0);
  assert.equal((await inspectAgent({ ...options, configFiles: [fifo] })).failures[0].reason, 'not-regular-file');
}));

test('descriptor reads remain byte-bounded and reject a changed file', async () => {
  let closed = false, stats = 0;
  const opener = async () => ({
    stat: async () => ({ isFile: () => true, size: 2, mtimeMs: ++stats, ctimeMs: 1 }),
    read: async (buffer, offset) => { if (offset) return { bytesRead: 0 }; buffer.write('{}'); return { bytesRead: 2 }; },
    close: async () => { closed = true; },
  });
  await assert.rejects(readConfig('/fixture', opener), error => error.collectionReason === 'changed-during-read');
  assert.equal(closed, true);
  await assert.rejects(readConfig('/fixture', async () => ({
    stat: async () => ({ isFile: () => true, size: 0 }),
    read: async (_buffer, _offset, length) => ({ bytesRead: length }), close: async () => {},
  })), error => error.collectionReason === 'size-limit');
  assert.deepEqual(parseConfig('{"mcpServers":{"a":{"args":["a:b","{}"]}}}'), { mcpServers: { a: { args: ['a:b', '{}'] } } });
});

test('macOS rejects a replaced config before any read and closes both handles', async () => {
  for (const replacement of ['regular-file', 'special-file']) {
    let opened = 0, closed = 0;
    const io = { open: async () => {
      const first = opened++ === 0;
      return {
        stat: async () => ({ dev: 1, ino: first ? 1 : 2, size: 10, mtimeMs: 1, ctimeMs: 1,
          isSymbolicLink: () => false, isFile: () => first || replacement === 'regular-file' }),
        read: () => assert.fail('replacement contents must not be read'),
        close: async () => { closed++; },
      };
    } };
    await assert.rejects(readConfig('/selected.json', file => openDarwinConfig(file, io)),
      error => error.collectionReason === (replacement === 'regular-file' ? 'changed-during-open' : 'not-regular-file'));
    assert.equal(opened, 2); assert.equal(closed, 2);
  }
});

test('macOS event-only metadata never substitutes for file read permission', async () => {
  let opened = 0, closed = 0;
  await assert.rejects(openDarwinConfig('/selected.json', { open: async () => {
    if (opened++) throw Object.assign(new Error(secret), { code: 'EACCES' });
    return { stat: async () => ({ isSymbolicLink: () => false, isFile: () => true }), close: async () => { closed++; } };
  } }), error => error.code === 'EACCES');
  assert.equal(opened, 2); assert.equal(closed, 1);
});

test('macOS PATH aliases retain metadata-only scope', { skip: process.platform !== 'darwin' }, async () => fixture(async ({ directory, bin }) => {
  await writeFile(path.join(bin, 'codex'), secret);
  await symlink('/nonexistent-target-not-followed', path.join(bin, 'claude'));
  const alias = path.join(directory, 'alias-bin'); await symlink(bin, alias);
  const handle = await openDarwinDirectory(alias);
  try {
    assert.equal((await handle.entryMetadata('codex')).isFile(), true);
    assert.equal((await handle.entryMetadata('claude')).isSymbolicLink(), true);
  } finally { await handle.close(); }
}));

test('macOS discards lookup after selected directory replacement', { skip: process.platform !== 'darwin' }, async () => fixture(async ({ bin }) => {
  const handle = await openDarwinDirectory(bin);
  try {
    await rename(bin, `${bin}-old`); await mkdir(bin);
    await writeFile(path.join(bin, 'codex'), secret);
    await assert.rejects(handle.entryMetadata('codex'), error => error.collectionReason === 'changed-during-lookup');
  } finally { await handle.close(); }
}));

test('PATH caps, empty and relative locations are explicit without recursive collection', async () => fixture(async ({ bin, options }) => {
  for (const pathValue of ['', `:${bin}:relative`, Array.from({ length: 33 }, () => bin).join(':')]) {
    const record = await inspectAgent({ ...options, pathValue }); checkRecord(record);
    assert.equal(record.collection_status, 'partial');
    assert.ok(record.failures.some(failure => ['path-unavailable', 'unsupported-path', 'path-entry-limit'].includes(failure.reason)));
  }
  await mkdir(path.join(bin, 'nested')); await writeFile(path.join(bin, 'nested', 'codex'), '');
  assert.equal((await inspectAgent(options)).observations.length, 0);
}));

test('command writes private JSON, returns partial code and preserves existing evidence and symlinks', async () => fixture(async ({ directory, options }) => {
  const output = path.join(directory, 'agent-observation.json');
  const messages = [];
  const invoke = args => agentCommand(args, { inspect: () => inspectAgent({ ...options, pathValue: '' }), output: value => messages.push(value) });
  assert.equal(await invoke(['agent', 'inspect', '--output', output]), 2);
  const bytes = await readFile(output, 'utf8'); checkRecord(JSON.parse(bytes));
  assert.equal((await stat(output)).mode & 0o777, 0o600);
  await assert.rejects(invoke(['agent', 'inspect', '--output', output]), /unused path/);
  assert.equal(await readFile(output, 'utf8'), bytes);
  const link = path.join(directory, 'output-link'); await symlink(output, link);
  await assert.rejects(invoke(['agent', 'inspect', '--output', link]), /unused path/);
  assert.equal(await readFile(output, 'utf8'), bytes);
  const aliasDirectory = path.join(directory, 'alias-directory'); await symlink(directory, aliasDirectory);
  await assert.rejects(invoke(['agent', 'inspect', '--output', path.join(aliasDirectory, 'new.json')]), /unused path/);
  assert.match(messages.join(), /partial/);
  for (const args of [['agent'], ['agent', 'inspect', '--upload', 'yes'], ['agent', 'inspect', '--output'], ['agent', 'inspect', '--output', output, '--output', output]]) {
    await assert.rejects(invoke(args), /--help/);
  }
  const broken = path.join(directory, 'broken.json');
  await assert.rejects(agentCommand(['agent', 'inspect', '--output', broken], { inspect: () => { throw new Error(secret); } }), /incomplete file/);
  assert.equal(await readFile(broken, 'utf8'), '');
}));

test('actual CLI entrypoint emits a portable record from synthetic inputs only', async () => fixture(async ({ directory, bin, config }) => {
  await writeFile(path.join(bin, 'codex'), `#!/bin/sh\necho ${secret}\nexit 99\n`, { mode: 0o755 });
  await writeFile(config, JSON.stringify({ mcpServers: { fixture: { command: secret } } }));
  const run = spawnSync(process.execPath, [entrypoint, 'agent', 'inspect', '--mcp-config', config], {
    cwd: directory, env: { ...process.env, PATH: bin }, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(run.status, process.getuid() === 0 ? 2 : 0, run.stderr);
  assert.equal(run.stderr, '');
  assert.ok(!run.stdout.includes(secret));
  const record = JSON.parse(await readFile(path.join(directory, 'agent-observation.json'), 'utf8')); checkRecord(record);
  assert.ok(!JSON.stringify(record).includes(secret));
  if (process.getuid() !== 0) assert.equal(record.observations.length, 2);
}));
