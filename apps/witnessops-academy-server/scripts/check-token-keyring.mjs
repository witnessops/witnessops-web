// Read-only format/custody preflight. No network, database, file writes or key creation.
import { readSessionTokenKeyring } from '../src/token-keyring-file.mjs';
import { createSessionTokenCodec } from '../src/session-tokens.mjs';
try {
  createSessionTokenCodec(readSessionTokenKeyring(), { issuer: 'offline-preflight', clientId: 'offline-preflight' });
  console.log(JSON.stringify({ ok: true, check: 'token_keyring_custody_and_format', network: false }));
} catch {
  console.error('Academy token keyring preflight failed');
  process.exitCode = 1;
}
