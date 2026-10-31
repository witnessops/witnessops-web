import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { renderStagingCaddy } from './render-caddy.mjs';

// Synthetic hashes used only to exercise parsing; not usable hosted credentials.
const config = () => ({ schema: 1, origin: 'https://staging.example.test', accounts: [
  { username: 'operator_one', passwordHash: '$2a$14$' + 'A'.repeat(53) },
  { username: 'operator_two', passwordHash: '$2b$14$' + 'B'.repeat(53) },
] });

test('separate fixed origin, per-account gate and native callback survive rendering', () => {
  const text = renderStagingCaddy(config());
  assert.match(text, /https:\/\/staging\.example\.test/);
  assert.match(text, /\/login \/callback \/aasr-fixture \/api\/aasr-fixture/);
  assert.match(text, /header_up -Authorization/);
  assert.match(text, /header_up -Proxy-Authorization/);
  assert.match(text, /strict_sni_host on/);
  assert.match(text, /disable_http_challenge/);
  assert.doesNotMatch(text, /__[A-Z_0-9]+__/);
  assert.doesNotMatch(text, /header_up (?:Origin|Cookie|Sec-Fetch-)/i);
});

test('reject configuration injection, production origins, ambiguous shape and missing accounts', () => {
  for (const origin of ['https://app.witnessops.com', 'https://app.example.test', 'https://witnessops.com', 'https://staging.example.test/', 'https://x@staging.example.test', 'https://staging.example.test:444', 'http://staging.example.test', 'https://staging.example.test?x=1', 'https://staging.example.test\nrespond 200']) {
    assert.throws(() => renderStagingCaddy({ ...config(), origin }), origin);
  }
  for (const patch of [{ schema: 2 }, { accounts: [] }, { unexpected: true }]) assert.throws(() => renderStagingCaddy({ ...config(), ...patch }));
  for (const username of ['', 'x\n}', '{env.SECRET}', 'same user']) {
    const input = config(); input.accounts[0].username = username;
    assert.throws(() => renderStagingCaddy(input));
  }
  for (const passwordHash of ['', 'plaintext', '$2a$04$' + 'A'.repeat(53), '$2a$14$' + 'A'.repeat(53) + '\n}']) {
    const input = config(); input.accounts[0].passwordHash = passwordHash;
    assert.throws(() => renderStagingCaddy(input));
  }
  const repeated = config(); repeated.accounts[1] = repeated.accounts[0];
  assert.throws(() => renderStagingCaddy(repeated));
});

test('CLI writes a new private candidate and refuses overwrite without leaking input', () => {
  const directory = mkdtempSync(join(tmpdir(), 'aasr-caddy-config-'));
  try {
    const input = join(directory, 'input.json'), output = join(directory, 'Caddyfile');
    writeFileSync(input, JSON.stringify(config()), { mode: 0o600 });
    const args = [new URL('./render-caddy.mjs', import.meta.url).pathname, input, output];
    const first = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr);
    assert.equal(statSync(output).mode & 0o777, 0o600);
    const original = readFileSync(output, 'utf8');
    const second = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(second.status, 1);
    assert.equal(readFileSync(output, 'utf8'), original);
    assert.doesNotMatch(second.stdout + second.stderr, /operator_one|\$2a\$|staging\.example/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
