import { readFileSync, openSync, writeFileSync, closeSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validStagingOrigin } from '../../../apps/witnessops-app/src/lib/aasr-staging/build-profile.js';

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join() === [...keys].sort().join();
}

/** Input is an operator-owned file, never a request or a production secret. */
export function renderStagingCaddy(input) {
  if (!exactKeys(input, ['schema', 'origin', 'accounts']) || input.schema !== 1) throw new Error('Invalid staging proxy configuration.');
  let origin;
  try { origin = new URL(input.origin); } catch { throw new Error('A fixed staging HTTPS origin is required.'); }
  const host = origin.hostname;
  if (typeof input.origin !== 'string' || !validStagingOrigin(input.origin) || input.origin !== origin.origin || origin.protocol !== 'https:' || origin.port
    || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(host)
    || host === 'app.witnessops.com' || host === 'witnessops.com' || host === 'www.witnessops.com') {
    throw new Error('Use a separate staging hostname with no port, credentials, path, query or fragment.');
  }
  if (!Array.isArray(input.accounts) || input.accounts.length !== 2) throw new Error('Two separate outer-gate accounts are required.');
  for (const account of input.accounts) {
    if (!exactKeys(account, ['username', 'passwordHash']) || typeof account.username !== 'string'
      || !/^[a-zA-Z][a-zA-Z0-9_-]{2,63}$/.test(account.username)
      || typeof account.passwordHash !== 'string' || !/^\$2[aby]\$(?:10|11|12|13|14|15|16)\$[./A-Za-z0-9]{53}$/.test(account.passwordHash)) {
      throw new Error('Use distinct usernames and bcrypt password hashes with cost 10 through 16.');
    }
  }
  if (input.accounts[0].username === input.accounts[1].username || input.accounts[0].passwordHash === input.accounts[1].passwordHash) throw new Error('Outer-gate accounts must have distinct usernames and hashes.');
  let rendered = readFileSync(new URL('./Caddyfile.template', import.meta.url), 'utf8').replaceAll('__STAGING_HOST__', host);
  input.accounts.forEach((account, index) => {
    rendered = rendered.replaceAll(`__GATE_USER_${index + 1}__`, account.username).replaceAll(`__GATE_HASH_${index + 1}__`, account.passwordHash);
  });
  if (/__[A-Z_0-9]+__/.test(rendered)) throw new Error('Unresolved staging configuration.');
  return rendered;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: node render-caddy.mjs PRIVATE_INPUT.json NEW_OUTPUT');
    const inputPath = resolve(process.argv[2]);
    const stat = lstatSync(inputPath);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 || stat.size > 8192) throw new Error('Input must be a private regular file of at most 8 KiB.');
    const rendered = renderStagingCaddy(JSON.parse(readFileSync(inputPath, 'utf8')));
    const fd = openSync(resolve(process.argv[3]), 'wx', 0o600);
    try { writeFileSync(fd, rendered); } finally { closeSync(fd); }
    console.log('Created restricted staging proxy candidate; not installed or activated.');
  } catch {
    // No input values, usernames, hashes or paths in diagnostics.
    console.error('Staging proxy candidate refused. Check private input, exact schema and a new output path.');
    process.exitCode = 1;
  }
}
