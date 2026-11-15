import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const realm = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../keycloak/academy-realm.json'), 'utf8'));

function academyAppClient() {
  return realm.clients.find((item) => item.clientId === 'academy-app');
}

test('the academy-app client has an audience mapper', () => {
  const client = academyAppClient();
  const mapper = client.protocolMappers.find((item) => item.protocolMapper === 'oidc-audience-mapper');
  assert.equal(mapper.config['included.client.audience'], 'academy-app');
  assert.equal(mapper.config['access.token.claim'], 'true');
  assert.equal(mapper.config['id.token.claim'], 'false');
});

test('the academy-app client keeps the sign-in contract', () => {
  const client = academyAppClient();
  assert.deepEqual(client.redirectUris, ['https://academy.example.invalid/academy/auth/callback']);
  assert.equal(client.redirectUris.some((uri) => uri.includes('*')), false);
  assert.equal(client.attributes['pkce.code.challenge.method'], 'S256');
  assert.equal(client.standardFlowEnabled, true);
  assert.equal(client.implicitFlowEnabled, false);
  assert.equal(client.directAccessGrantsEnabled, false);
  assert.equal(client.serviceAccountsEnabled, false);
});
