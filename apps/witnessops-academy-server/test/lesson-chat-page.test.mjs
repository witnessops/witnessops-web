import assert from 'node:assert/strict';
import test from 'node:test';
import { lessonChatPage } from '../src/lesson-chat-page.mjs';

test('chat page starts signed out without leaking saved learner state', () => {
  const page = lessonChatPage(null, 'https://community.example.invalid');
  assert.match(page, /href="\/academy\/auth\/login\?lesson=report-or-evidence&amp;mode=chat"/);
  assert.match(page, /id="chat-sign-out" type="button" hidden/);
  assert.doesNotMatch(page, /id="academy-csrf"|community\.example\.invalid/);
  assert.match(page, /id="chat-messages"[^>]*><\/ol>/);
  assert.match(page, /id="chat-evidence"[^>]*><\/section>/);
  assert.match(page, /Each choice saves your progress/);
  assert.match(page, /Simulated exercise/);
  assert.match(page, /runs no backup or restore/);
});

test('signed-in chat uses same-origin external assets and escapes the CSRF JSON', () => {
  const page = lessonChatPage({ csrf_token: '</script><img src=x>' }, 'https://community.example.invalid/?test="&');
  assert.match(page, /id="academy-csrf">"\\u003c\/script>\\u003cimg src=x>"<\/script>/);
  assert.doesNotMatch(page, /<\/script><img|style=|onclick=/);
  assert.match(page, /src="\/academy\/static\/lesson-chat\.js"/);
  assert.match(page, /href="\/academy\/static\/lesson-chat\.css"/);
  assert.match(page, /href="https:\/\/community\.example\.invalid\/\?test=&quot;&amp;" target="_blank" rel="noopener noreferrer"/);
  assert.match(page, /id="chat-sign-in"[^>]* hidden/);
  assert.doesNotMatch(page, /<script[^>]+src="https?:/);
});

test('ChatGPT instructions refer to the existing account and condition connector availability', () => {
  const page = lessonChatPage(null);
  assert.match(page, /Learn with ChatGPT/);
  assert.match(page, /id="chatgpt-help"/);
  assert.match(page, /If the Academy connector is available/);
  assert.match(page, /same Academy account/);
  assert.match(page, /website and connector use the same saved choices/);
  assert.doesNotMatch(page, /api[_-]?key|Authorization: Bearer|API token|new account/i);
});
