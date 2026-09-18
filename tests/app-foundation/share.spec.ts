import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { RECOMMENDED_PROFILE, type Workspace, type Run } from '../../apps/witnessops-app/src/lib/model';
import { canonicalSource } from '../../apps/witnessops-app/src/lib/source-digest';
import { savedRunReport } from '../../apps/witnessops-app/src/lib/report-model';
import { recipientReport } from '../../apps/witnessops-app/src/lib/share-projection';
const snapshot = JSON.parse(readFileSync(resolve('tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json'), 'utf8'));
const run: Run = { id: 'run-fixture', assetId: 'asset-fixture', createdAt: snapshot.finished_at, profile: structuredClone(RECOMMENDED_PROFILE), snapshot, sourceDigest: createHash('sha256').update(canonicalSource(snapshot)).digest('hex') };
const safe = recipientReport(savedRunReport(run));
const token = 'a'.repeat(43), digest = createHash('sha256').update(canonicalSource(safe)).digest('hex');
const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
for (const width of [1440, 390]) {
 test(`explicit publication, separate recipient and revocation at ${width}`, async ({ page, browser, baseURL }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const ws: Workspace = { id: 'workspace-fixture', name: 'Private workspace', slug: 'private', role: 'owner', members: [], assets: [{ id: 'asset-fixture', hostname: snapshot.target, type: 'hostname', createdAt: run.createdAt }], runs: [run] };
  let state = 'preview', previewFails = false; const actions: string[] = [], errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', route => {
   const path = new URL(route.request().url()).pathname;
   if (path === '/api/workspace') return route.fulfill({ json: { user: { id: 'owner' }, workspaces: [ws], workspace: ws } });
   if (path === '/api/feedback') return route.fulfill({ json: [] });
   if (path === '/api/events') return route.fulfill({ json: { recorded: true } });
   if (path !== '/api/shares') throw new Error(`Unexpected private request ${path}`);
   const body = route.request().postDataJSON(); actions.push(body.action);
   expect(route.request().headers()['x-witnessops-workspace']).toBe(ws.id);
   if (body.action === 'preview' && previewFails) return route.fulfill({ status: 429, json: { error: 'Preview limit reached.' } });
   if (body.action === 'preview') return route.fulfill({ json: { id: 'share', token, digest, snapshot: safe, expiresAt, canPublish: true } });
   if (body.action === 'publish') { expect(body).toEqual({ action: 'publish', id: 'share', token, digest, audience: 'anyone_with_link' }); state = 'published'; return route.fulfill({ json: { id: 'share', token, digest, expiresAt } }); }
   if (body.action === 'revoke') { state = 'revoked'; return route.fulfill({ json: { revoked: true } }); }
   return route.fulfill({ json: state === 'preview' ? [] : [{ id: 'share', state, expiresAt }] });
  });
  await page.goto(`/reports/${run.id}`);
  await page.getByRole('button', { name: 'Share report', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Recipient preview' });
  await expect(panel.getByRole('heading', { name: 'Recipient preview' })).toBeFocused();
  await expect(panel.locator('article')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Publish link', exact: true })).toBeDisabled();
  expect(actions).not.toContain('publish');
  await expect(panel).toContainText('Anyone with the link can read');
  await expect(panel.locator('article')).not.toContainText('Private workspace');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath(`share-preview-${width}.png`) });
  await panel.getByRole('checkbox').focus(); await page.keyboard.press('Space');
  await panel.getByRole('button', { name: 'Publish link', exact: true }).click();
  await expect(page.getByLabel('Published link')).toHaveValue(`${baseURL}/s#${token}`);
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async (text: string) => { (window as Window & { copied?: string }).copied = text; } }));
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  expect(await page.evaluate(() => (window as Window & { copied?: string }).copied)).toBe(`${baseURL}/s#${token}`);
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const recipient = await context.newPage(); const unexpected: string[] = [];
  recipient.on('pageerror', e => errors.push(e.message));
  await recipient.route('**/*', route => {
   const request = route.request(), url = new URL(request.url());
   expect(request.url()).not.toContain(token);
   if (url.origin !== baseURL) { unexpected.push(request.url()); return route.abort(); }
   if (url.pathname === '/api/shared-report') {
    expect(request.method()).toBe('POST'); expect(request.postDataJSON()).toEqual({ token });
    expect(request.headers().cookie).toBeUndefined(); expect(request.headers().referer).toBeUndefined();
    return state === 'published' ? route.fulfill({ json: { snapshot: safe, digest, expiresAt }, headers: { 'Cache-Control': 'no-store' } }) : route.fulfill({ status: 404, json: { error: 'Unavailable' } });
   }
   if (url.pathname.startsWith('/api/') || url.pathname.includes('auth')) { unexpected.push(url.pathname); return route.abort(); }
   return route.continue();
  });
  const response = await recipient.goto(`${baseURL}/s#${token}`);
  expect(response!.headers()['cache-control']).toContain('no-store');
  expect(response!.headers()['x-robots-tag']).toContain('noindex');
  await expect(recipient.locator('article')).toBeVisible();
  await expect(recipient).toHaveURL(`${baseURL}/s#${token}`);
  await recipient.reload();
  await expect(recipient.locator('article')).toBeVisible();
  await expect(recipient.locator('main')).toContainText('does not establish that the findings are true');
  expect(await recipient.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await recipient.screenshot({ path: info.outputPath(`recipient-${width}.png`) });
  let releasePoll: (()=>void)|undefined;
  const delayed = async (route: import('@playwright/test').Route) => { await new Promise<void>(resolve => { releasePoll=resolve; }); await route.fulfill({json:{snapshot:safe,digest,expiresAt}}); };
  await recipient.route('**/api/shared-report',delayed);
  await recipient.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  await expect.poll(()=>Boolean(releasePoll)).toBe(true);
  await expect(recipient.locator('article')).toBeVisible();
  releasePoll!();await recipient.unroute('**/api/shared-report',delayed);
  previewFails = true;
  await panel.getByRole('button', { name: 'Close preview' }).click();
  await page.getByRole('button', { name: 'Share report', exact: true }).click();
  await expect(page.locator('.report-sharing').getByRole('alert')).toHaveText('Preview limit reached.');
  await page.getByRole('button', { name: 'Revoke link', exact: true }).click();
  await expect(page.getByLabel('Published link')).toHaveCount(0);
  await recipient.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(recipient.locator('main').getByRole('alert')).toContainText('expired or revoked');
  await expect(recipient.locator('article')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Close preview' }).click();
  await expect(page.getByRole('button', { name: 'Share report', exact: true })).toBeFocused();
  expect(unexpected).toEqual([]); expect(errors).toEqual([]); await context.close();
 });
}

for (const role of ['contributor', 'viewer'] as const) {
 test(`${role} retains the correct sharing controls`, async ({ page }) => {
  const ws: Workspace = { id: 'workspace', name: 'Team', slug: 'team', role, members: [], assets: [], runs: [run] };
  await page.route('**/api/**', route => {
   const path = new URL(route.request().url()).pathname;
   if (path === '/api/workspace') return route.fulfill({ json: { user: { id: 'reader' }, workspaces: [ws], workspace: ws } });
   if (path === '/api/feedback') return route.fulfill({ json: [] });
   if (path === '/api/events') return route.fulfill({ json: {} });
   if (path === '/api/shares' && role === 'contributor') {
    const { action } = route.request().postDataJSON();
    expect(['list', 'preview']).toContain(action);
    return route.fulfill({ json: action === 'list' ? [{ id: 'share', state: 'published', expiresAt }] : { id: 'share', token, digest, snapshot: safe, expiresAt, canPublish: false } });
   }
   throw new Error(`Unexpected request ${path}`);
  });
  await page.goto(`/reports/${run.id}`);
  await expect(page.getByRole('button', { name: 'Save report as PDF', exact: true })).toBeVisible();
  if (role === 'viewer') await expect(page.getByRole('button', { name: 'Share report', exact: true })).toHaveCount(0);
  else {
   await page.getByRole('button', { name: 'Share report', exact: true }).click();
   await expect(page.getByRole('region', { name: 'Recipient preview' }).locator('article')).toBeVisible();
   await expect(page.getByRole('button', { name: 'Publish link', exact: true })).toHaveCount(0);
   await expect(page.getByRole('button', { name: 'Revoke link', exact: true })).toHaveCount(0);
  }
 });
}
