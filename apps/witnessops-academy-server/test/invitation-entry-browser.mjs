// Header/form regression only: real browser, synthetic loopback receiver; no IdP or database.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { chromium } from '@playwright/test';
import { invitationPage, INVITATION_PAGE_HEADERS } from '../src/invitation-page.mjs';

if (process.env.ACADEMY_INVITATION_BROWSER !== '1') {
  console.log('Native invitation browser regression skipped; set ACADEMY_INVITATION_BROWSER=1.');
  process.exit(0);
}
const controller = readFileSync(new URL('../src/invitation-client.js', import.meta.url));
const token = randomBytes(32).toString('base64url');
const observations = [];
let origin;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, origin);
  if (url.pathname === '/academy/static/invitation.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(controller); return;
  }
  if (url.pathname === '/academy/auth/invitation') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const form = new URLSearchParams(raw);
    const exactOrigin = req.headers.origin === origin;
    observations.push({ exactOrigin, originWasNull: req.headers.origin === 'null',
      sameOriginFetchSite: req.headers['sec-fetch-site'] === 'same-origin',
      oneTokenField: form.size === 1 && form.get('token') === token });
    res.writeHead(exactOrigin ? 302 : 403, exactOrigin ? { Location: '/synthetic-login' } : {});
    res.end(exactOrigin ? '' : 'origin rejected'); return;
  }
  if (url.pathname === '/synthetic-login') {
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<label>Username<input id="username"></label>'); return;
  }
  if (url.pathname === '/academy/invitation') {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store',
      'Referrer-Policy': url.searchParams.get('negative') ? 'no-referrer' : INVITATION_PAGE_HEADERS['Referrer-Policy'],
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
    res.end(invitationPage(null)); return;
  }
  res.writeHead(404); res.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
origin = 'http://127.0.0.1:' + server.address().port;
let browser;
try {
  browser = await chromium.launch({ headless: true,
    ...(process.env.ACADEMY_TEST_BROWSER_EXECUTABLE ? { executablePath: process.env.ACADEMY_TEST_BROWSER_EXECUTABLE } : {}) });
  for (const negative of [true, false]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', () => errors.push('page_error'));
    await page.goto(origin + '/academy/invitation' + (negative ? '?negative=1' : '') + '#token=' + token);
    assert.equal(new URL(page.url()).hash, '');
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/academy/auth/invitation');
    await page.locator('#accept-invitation').click();
    assert.equal((await response).status(), negative ? 403 : 302);
    if (!negative) await page.locator('#username').waitFor({ state: 'visible' });
    assert.equal(errors.length, 0);
    await context.close();
  }
  assert.equal(observations.length, 2);
  assert.equal(observations[0].originWasNull, true);
  assert.equal(observations[1].exactOrigin, true);
  assert.ok(observations.every(row => row.sameOriginFetchSite && row.oneTokenField));
  console.log('PASS native invitation: no-referrer negative denied; selected same-origin policy enters login; token stays out of URL.');
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
