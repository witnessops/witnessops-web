import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const realm = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../keycloak/academy-realm.json'), 'utf8'));

test('the academy-app client has an audience mapper', () => {
  const client = realm.clients.find((item) => item.clientId === 'academy-app');
  const mapper = client.protocolMappers.find((item) => item.protocolMapper === 'oidc-audience-mapper');
  assert.equal(mapper.config['included.client.audience'], 'academy-app');
  assert.equal(mapper.config['access.token.claim'], 'true');
  assert.equal(mapper.config['id.token.claim'], 'false');
});
