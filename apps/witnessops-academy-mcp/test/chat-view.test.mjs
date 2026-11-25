import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { registerChatView, CHAT_VIEW_RESOURCE_URI } from '../src/chat-view.mjs';
import { inlineScript } from './support/view-dom.mjs';

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
  // Plain index-based extraction (no HTML-matching regex): the view has exactly one inline script.
  const script = inlineScript(html);
  assert.ok(script.includes("'use strict'"));
  assert.doesNotThrow(() => new Function(script));
});

test('legacy worksheet tools are model-only so the view cannot ask the host to call them', async () => {
  const { MODEL_ONLY_UI_META, APP_CALLABLE_TOOLS } = await import('../src/chat-tools.mjs');
  assert.deepEqual(MODEL_ONLY_UI_META, { visibility: ['model'] });
  assert.deepEqual([...APP_CALLABLE_TOOLS].sort(), ['resume_lesson', 'start_lesson', 'submit_decision']);
  const source = readFileSync(new URL('../src/server.mjs', import.meta.url), 'utf8');
  for (const tool of ['listLessons', 'getLesson', 'getAnswer', 'saveAnswer']) {
    const start = source.indexOf(`server.registerTool(${tool}.name, {`);
    assert.ok(start > 0, tool);
    const block = source.slice(start, source.indexOf('}, admitted(', start));
    assert.ok(block.includes('_meta: { ui: MODEL_ONLY_UI_META }'), `${tool} must be model-only`);
  }
});

test('the MCP package serves its own decision-room copy, identical to the Matrix widget markup (L-3)', () => {
  const source = readFileSync(new URL('../src/chat-view.mjs', import.meta.url), 'utf8');
  assert.ok(source.includes("new URL('./decision-room.html', import.meta.url)"));
  assert.doesNotMatch(source, /witnessops-academy-server/);
  const own = readFileSync(new URL('../src/decision-room.html', import.meta.url));
  const canonical = readFileSync(new URL('../../witnessops-academy-server/src/decision-room.html', import.meta.url));
  assert.ok(own.equals(canonical), 'run pnpm --filter @witnessops/academy-mcp sync:decision-room');
});
