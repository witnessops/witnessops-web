import assert from 'node:assert/strict';
import test from 'node:test';
import { registerChatView, CHAT_VIEW_RESOURCE_URI } from '../src/chat-view.mjs';

test('registers an MCP Apps resource with restrictive no-network CSP', async () => {
  let registration;
  registerChatView({ registerResource(...args) { registration = args; } });
  assert.equal(registration[0], 'academy-decision-room');
  assert.equal(registration[1], CHAT_VIEW_RESOURCE_URI);
  assert.equal(registration[2].mimeType, 'text/html;profile=mcp-app');
  const resource = (await registration[3](new URL(CHAT_VIEW_RESOURCE_URI))).contents[0];
  assert.equal(resource.uri, CHAT_VIEW_RESOURCE_URI);
  assert.deepEqual(resource._meta.ui.csp, { connectDomains: [], resourceDomains: [] });
  assert.match(resource.text, /ui\/initialize/);
  assert.match(resource.text, /ui\/notifications\/initialized/);
  assert.match(resource.text, /tools\/call/);
  assert.match(resource.text, /Retry exact request/);
  assert.match(resource.text, /FICTIONAL EXERCISE/);
  assert.doesNotMatch(resource.text, /localStorage|sessionStorage|document\.cookie|\bfetch\(/);
  assert.doesNotMatch(resource.text, /<script\s+src=/i);
  assert.match(resource.text, /textContent/);
  assert.match(resource.text, /pendingWrite/);
});

test('widget is HTML5 and the inline JavaScript is syntax valid', async () => {
  let registration;
  registerChatView({ registerResource(...args) { registration = args; } });
  const html = (await registration[3](new URL(CHAT_VIEW_RESOURCE_URI))).contents[0].text;
  assert.match(html, /^<!doctype html>/i);
  const script = html.match(/<script>([\s\S]+?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
});
