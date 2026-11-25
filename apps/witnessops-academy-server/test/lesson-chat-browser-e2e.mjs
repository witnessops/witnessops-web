// Opt-in browser contract test with synthetic identity/admission and memory DB.
// It exercises the real UI, HTTP handler, engine, store and MCP adapter. Passing
// is not evidence of Keycloak/OAuth, PostgreSQL locking, ChatGPT or deployment.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { createLessonChatHttpFixture } from './lesson-chat-http-fixture.mjs';
import { CHAT_ROUTE, CHAT_DECISION_API } from '../src/lesson-chat-routes.mjs';

if (process.env.ACADEMY_CHAT_BROWSER !== '1') {
  console.log(JSON.stringify({ status: 'SKIPPED', reason: 'Set ACADEMY_CHAT_BROWSER=1 for the isolated browser contract test.' }));
  process.exit(0);
}
const screenshotDir = process.env.ACADEMY_CHAT_SCREENSHOT_DIR ? resolve(process.env.ACADEMY_CHAT_SCREENSHOT_DIR) : null;
if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.ACADEMY_TEST_BROWSER_EXECUTABLE ? { executablePath: process.env.ACADEMY_TEST_BROWSER_EXECUTABLE } : {}) });
const findings = [];
const errors = [];
const outbound = [];
const lesson = { lesson_id: 'report-or-evidence' };

async function open(fixture, learner = 'a', mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, deviceScaleFactor: 1 });
  await context.addCookies([fixture.cookie(learner)]);
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === fixture.origin) return route.continue();
    outbound.push(new URL(route.request().url()).origin);
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !/net::ERR_FAILED|status of 409/.test(message.text())) errors.push(message.text());
  });
  await page.goto(fixture.origin + CHAT_ROUTE);
  await expect(page.locator('#chat-options button').first()).toBeEnabled();
  return { page, context };
}
async function choose(page, option, step) {
  await page.locator(`[data-option="${option}"]`).click();
  await expect(page.locator('#chat-step')).toHaveText(step);
  await expect(page.locator('#chat-status')).toContainText(step.startsWith('Lesson complete') ? 'Lesson complete' : 'Choice saved');
}
async function fits(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'no horizontal page overflow');
}
async function shot(page, name, fullPage = true) {
  if (screenshotDir) await page.screenshot({ path: resolve(screenshotDir, name), fullPage });
}

try {
  for (const mobile of [false, true]) {
    const fixture = await createLessonChatHttpFixture();
    let context;
    try {
      const opened = await open(fixture, 'a', mobile); context = opened.context; const { page } = opened;
      const label = mobile ? 'mobile' : 'desktop';
      await fits(page); await shot(page, `${label}-initial.png`);
      await page.locator('[data-option="created_recovery_unverified"]').focus();
      assert.equal(await page.locator('[data-option="created_recovery_unverified"]').evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Enter');
      await expect(page.locator('#chat-step')).toHaveText('Step 2 of 3');
      await expect(page.locator('#chat-messages [data-role="tutor"]').nth(1)).toBeFocused();
      await page.reload();
      await expect(page.locator('#chat-step')).toHaveText('Step 2 of 3');
      await expect(page.locator('#chat-status')).toContainText('saved lesson is ready');
      await choose(page, 'ask_agent', 'Step 3 of 3');
      await expect(page.locator('#chat-messages')).toContainText('New technical evidence: 0');
      await page.locator('[data-option="accept_and_close"]').click();
      await expect(page.locator('#chat-status')).toContainText('Choice saved');
      await expect(page.locator('[data-option="accept_and_close"]')).toHaveCount(0);
      await expect(page.locator('#chat-outcome')).toBeHidden();
      await choose(page, 'accept_supported_require_restore', 'Lesson complete · 3 of 3');
      await expect(page.locator('#outcome-facts')).toContainText('UNVERIFIED');
      await expect(page.locator('#outcome-facts')).toContainText('BLOCKED');
      await fits(page); await page.locator('#chat-outcome').scrollIntoViewIfNeeded();
      await shot(page, `${label}-complete.png`, false);
      await page.reload(); await expect(page.locator('#chat-outcome')).toBeVisible();
      assert.equal((await fixture.mcpCall('get_progress', lesson)).structuredContent.completed, true);
      await page.locator('#chat-sign-out').click();
      await expect(page.locator('#chat-sign-in')).toBeVisible();
      await expect(page.locator('#chat-messages')).toBeEmpty();
      await expect(page.locator('#chat-evidence')).toBeEmpty();
      findings.push(`${label}: keyboard selection, browser reload/resume, wrong closure feedback, completion, saved MCP result, layout and logout PASS`);
    } finally { await context?.close(); await fixture.close(); }
  }

  {
    const fixture = await createLessonChatHttpFixture();
    const contexts = [];
    try {
      const a = await open(fixture); contexts.push(a.context);
      await choose(a.page, 'created_recovery_unverified', 'Step 2 of 3');
      const resumed = await fixture.mcpCall('resume_lesson', lesson);
      assert.equal(resumed.structuredContent.version, 1);
      const mcp = await fixture.mcpCall('submit_decision', { ...lesson, step_id: 'verification', option_id: 'controlled_restore', expected_version: 1, request_id: crypto.randomUUID() });
      assert.equal(mcp.structuredContent.step_id, 'closure');
      await a.page.reload(); await expect(a.page.locator('#chat-step')).toHaveText('Step 3 of 3');
      await expect(a.page.locator('#chat-messages')).toContainText('Choosing it proposes the action');
      const b = await open(fixture, 'b'); contexts.push(b.context);
      await expect(b.page.locator('#chat-step')).toHaveText('Step 1 of 3');
      await expect(b.page.locator('#chat-messages [data-role="learner"]')).toHaveCount(0);
      assert.equal((await fixture.mcpCall('get_progress', lesson, 'b')).structuredContent.version, 0);
      await choose(a.page, 'accept_supported_require_restore', 'Lesson complete · 3 of 3');
      assert.equal((await fixture.mcpCall('get_progress', lesson)).structuredContent.version, 3);
      findings.push('website → actual MCP adapter → website continues one record; second synthetic learner remains isolated PASS');
    } finally { for (const context of contexts) await context.close(); await fixture.close(); }
  }

  {
    const fixture = await createLessonChatHttpFixture(); let context;
    try {
      const opened = await open(fixture); context = opened.context; const { page } = opened;
      const bodies = []; let first = true;
      await page.route('**' + CHAT_DECISION_API, async route => {
        bodies.push(route.request().postData());
        if (first) {
          first = false;
          const accepted = await route.fetch();
          assert.equal(accepted.status(), 200); await accepted.body();
          return route.abort('failed');
        }
        return route.continue();
      });
      await page.locator('[data-option="created_recovery_unverified"]').click();
      await expect(page.locator('#retry-decision')).toBeVisible();
      assert.equal(fixture.memory.writes, 1);
      await expect(page.locator('#chat-options button').first()).toBeDisabled();
      await page.locator('#retry-decision').click();
      await expect(page.locator('#chat-step')).toHaveText('Step 2 of 3');
      assert.equal(fixture.memory.writes, 1);
      assert.equal(bodies.length, 2); assert.equal(bodies[0], bodies[1]);
      findings.push('response lost after real handler commit: explicit retry repeats exact request and writes once PASS');
    } finally { await context?.close(); await fixture.close(); }
  }

  {
    const fixture = await createLessonChatHttpFixture(); let context;
    try {
      const opened = await open(fixture); context = opened.context; const { page } = opened;
      const second = await context.newPage();
      second.on('pageerror', error => errors.push(error.message));
      await second.goto(fixture.origin + CHAT_ROUTE); await expect(second.locator('#chat-options button').first()).toBeEnabled();
      await choose(page, 'created_recovery_unverified', 'Step 2 of 3');
      await second.locator('[data-option="nothing_established"]').click();
      await expect(second.locator('#reload-progress')).toBeVisible();
      await expect(second.locator('#chat-status')).toContainText('another window or ChatGPT');
      assert.equal(fixture.memory.writes, 1);
      await second.locator('#reload-progress').click();
      await expect(second.locator('#chat-step')).toHaveText('Step 2 of 3');
      assert.equal(fixture.memory.writes, 1);
      await page.goto(fixture.origin + CHAT_ROUTE + '#chatgpt-help');
      await expect(page.locator('#chatgpt-help')).toHaveAttribute('open', '');
      await expect(page.getByRole('link', { name: 'https://academy.witnessops.com/mcp', exact: true })).toBeVisible();
      findings.push('stale tab conflict blocks overwrite; explicit reload preserves winning choice; ChatGPT help entry opens PASS');
    } finally { await context?.close(); await fixture.close(); }
  }
  assert.deepEqual(outbound, [], 'browser makes no outbound request');
  assert.deepEqual(errors, [], 'no unexpected console or JavaScript errors');
  console.log(JSON.stringify({ status: 'PASS', checks: findings, screenshots: screenshotDir ? ['desktop-initial.png', 'desktop-complete.png', 'mobile-initial.png', 'mobile-complete.png'] : [],
    boundary: 'Synthetic session/admission boundary and in-memory database; real Keycloak/OAuth/PostgreSQL, native ChatGPT and production deployment not tested.' }, null, 2));
} finally { await browser.close(); }
