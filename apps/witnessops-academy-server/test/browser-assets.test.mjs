import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

for (const asset of ['lesson-client.js', 'invitation-client.js', 'account-client.js', 'chat-client.js']) {
  test(`served browser module ${asset} parses as an ES module`, () => {
    const file = fileURLToPath(new URL('../src/' + asset, import.meta.url));
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.error, undefined, 'syntax checker must actually execute');
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, result.stderr);
  });
}
