import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isProtectedResourceMetadataRequest, protectedResourceMetadataPath } from '../src/metadata-path.mjs';

test('the resource path uses the path-suffixed metadata URL and not the origin-level one', () => {
  assert.equal(protectedResourceMetadataPath('/mcp'), '/.well-known/oauth-protected-resource/mcp');
  assert.equal(isProtectedResourceMetadataRequest('/.well-known/oauth-protected-resource/mcp', '/mcp'), true);
  assert.equal(isProtectedResourceMetadataRequest('/.well-known/oauth-protected-resource', '/mcp'), false);
});

test('Caddy routes only the path-suffixed protected-resource metadata', () => {
  const caddy = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../deploy/academy/Caddyfile.academy'), 'utf8');
  assert.match(caddy, /^[ \t]*@prm path \/\.well-known\/oauth-protected-resource\/mcp$/m);
  assert.equal(caddy.includes('path /.well-known/oauth-protected-resource\n'), false);
});
