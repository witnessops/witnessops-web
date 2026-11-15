import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { requireHttpsOrLoopback, secret } from '../src/env.mjs';

function withTempDir(prefix, run) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function withEnv(updates, run) {
  const previous = new Map();
  for (const [key, value] of Object.entries(updates)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('*_FILE reads a trimmed secret', () => {
  withTempDir('academy-env-file-', (dir) => {
    const file = join(dir, 'value');
    const credentialDir = join(dir, 'credentials');
    writeFileSync(file, '  synthetic-file-secret \n');
    mkdirSync(credentialDir);
    writeFileSync(join(credentialDir, 'academy_sample_secret'), 'synthetic-credential-secret\n');
    withEnv({
      ACADEMY_SAMPLE_SECRET: 'synthetic-plain-value',
      ACADEMY_SAMPLE_SECRET_FILE: file,
      CREDENTIALS_DIRECTORY: credentialDir,
    }, () => {
      assert.equal(secret('ACADEMY_SAMPLE_SECRET'), 'synthetic-file-secret');
    });
  });
});

test('CREDENTIALS_DIRECTORY reads the lower-case credential name', () => {
  withTempDir('academy-env-cred-', (dir) => {
    writeFileSync(join(dir, 'academy_sample_credential'), '  synthetic-credential-secret \n');
    withEnv({
      ACADEMY_SAMPLE_CREDENTIAL: 'synthetic-plain-value',
      ACADEMY_SAMPLE_CREDENTIAL_FILE: undefined,
      CREDENTIALS_DIRECTORY: dir,
    }, () => {
      assert.equal(secret('ACADEMY_SAMPLE_CREDENTIAL'), 'synthetic-credential-secret');
    });
  });
});

test('an empty or whitespace-only secret throws', () => {
  withTempDir('academy-env-blank-', (dir) => {
    const file = join(dir, 'blank');
    const credentialDir = join(dir, 'credentials');
    const missing = /missing secret ACADEMY_BLANK_SECRET: set ACADEMY_BLANK_SECRET_FILE or provide a systemd credential named academy_blank_secret/;
    mkdirSync(credentialDir);
    writeFileSync(join(credentialDir, 'academy_blank_secret'), 'synthetic-credential-secret\n');
    for (const contents of ['', ' \n\t']) {
      writeFileSync(file, contents);
      withEnv({
        ACADEMY_BLANK_SECRET_FILE: file,
        CREDENTIALS_DIRECTORY: credentialDir,
      }, () => {
        assert.throws(() => secret('ACADEMY_BLANK_SECRET'), missing);
      });
    }
    for (const contents of ['', ' \n\t']) {
      writeFileSync(join(credentialDir, 'academy_blank_secret'), contents);
      withEnv({
        ACADEMY_BLANK_SECRET_FILE: undefined,
        CREDENTIALS_DIRECTORY: credentialDir,
      }, () => {
        assert.throws(() => secret('ACADEMY_BLANK_SECRET'), missing);
      });
    }
  });
});

test('a missing secret throws', () => {
  withTempDir('academy-env-missing-', (dir) => {
    withEnv({
      ACADEMY_ABSENT_SECRET: 'synthetic-plain-value',
      ACADEMY_ABSENT_SECRET_FILE: undefined,
      CREDENTIALS_DIRECTORY: dir,
    }, () => {
      assert.throws(
        () => secret('ACADEMY_ABSENT_SECRET'),
        /missing secret ACADEMY_ABSENT_SECRET: set ACADEMY_ABSENT_SECRET_FILE or provide a systemd credential named academy_absent_secret/,
      );
    });
  });
});

test('non-loopback http:// is rejected', () => {
  assert.throws(
    () => requireHttpsOrLoopback('ACADEMY_PUBLIC_ORIGIN', 'http://example.invalid/academy'),
    /ACADEMY_PUBLIC_ORIGIN must be https:\/\/ \(plain http is allowed only on loopback\): http:\/\/example\.invalid\/academy/,
  );
  assert.throws(
    () => requireHttpsOrLoopback('ACADEMY_OIDC_ISSUER', 'http://localhost.example.invalid/realms/academy'),
    /ACADEMY_OIDC_ISSUER must be https:\/\/ \(plain http is allowed only on loopback\): http:\/\/localhost\.example\.invalid\/realms\/academy/,
  );
});

test('https and loopback http are accepted', () => {
  const httpsUrl = requireHttpsOrLoopback('ACADEMY_PUBLIC_ORIGIN', 'https://example.invalid/academy');
  assert.equal(httpsUrl.protocol, 'https:');
  assert.equal(httpsUrl.hostname, 'example.invalid');
  for (const value of [
    'http://127.0.0.1:18300/academy',
    'http://localhost/academy',
    'http://[::1]:18500/mcp',
  ]) {
    assert.equal(requireHttpsOrLoopback('ACADEMY_PUBLIC_ORIGIN', value).protocol, 'http:');
  }
});
