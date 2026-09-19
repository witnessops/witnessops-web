import { test, expect } from '@playwright/test';
import { pdfPages } from '../proofpack/report-pdf';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { RECOMMENDED_PROFILE, type Workspace, type Run } from '../../apps/witnessops-app/src/lib/model';
import { canonicalSource } from '../../apps/witnessops-app/src/lib/source-digest';
import { savedRunReport } from '../../apps/witnessops-app/src/lib/report-model';
import { verifyProofpack } from '../../apps/witnessops-web/src/lib/proofpack/verify.mjs';
import { pinnedRegistryInput } from '../../apps/witnessops-web/src/lib/proofpack/pinned-registry';
import { localAuditAdapter } from '../../apps/witnessops-web/src/lib/proofpack/local-audit-adapter';
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
  let named = safe; let state = 'preview', previewFails = false; const actions: string[] = [], errors: string[] = [];
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
   if (body.action === 'preview') { named = body.name ? recipientReport(savedRunReport(run), body.name) : safe; return route.fulfill({ json: { id: 'share', token, digest, snapshot: named, expiresAt, canPublish: true } }); }
   if (body.action === 'publish') { expect(body).toEqual({ action: 'publish', id: 'share', token, digest, audience: 'anyone_with_link' }); state = 'published'; return route.fulfill({ json: { id: 'share', token, digest, expiresAt } }); }
   if (body.action === 'revoke') { state = 'revoked'; return route.fulfill({ json: { revoked: true } }); }
   return route.fulfill({ json: state === 'preview' ? [] : [{ id: 'share', state, expiresAt }] });
  });
  await page.goto(`/reports/${run.id}`);
  await page.getByRole('button', { name: 'Share report', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Recipient preview' });
  await expect(panel.getByRole('heading', { name: 'Recipient preview' })).toBeFocused();
  await expect(panel.locator('article[aria-label="Shared report reader"]')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Publish link', exact: true })).toBeDisabled();
  expect(actions).not.toContain('publish');
  await expect(panel).toContainText('Anyone with the link can read');
  await expect(panel.locator('article[aria-label="Shared report reader"]')).not.toContainText('Private workspace');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath(`share-preview-${width}.png`) });
  await panel.getByLabel('Report name',{exact:true}).fill('Release review <script>');
  await panel.getByRole('button',{name:'Update recipient preview'}).click();
  await expect(panel.getByRole('heading',{name:'Release review <script>',exact:true})).toBeVisible();
  await panel.getByRole('checkbox').focus(); await page.keyboard.press('Space');
  await panel.getByRole('button', { name: 'Publish link', exact: true }).click();
  await expect(page.getByLabel('Published link')).toHaveValue(`${baseURL}/s#${token}`);
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async (text: string) => { (window as Window & { copied?: string }).copied = text; } }));
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  expect(await page.evaluate(() => (window as Window & { copied?: string }).copied)).toBe(`${baseURL}/s#${token}`);
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const recipient = await context.newPage(); const unexpected: string[] = [];
  recipient.on('pageerror', e => errors.push(e.message));
  const recipientRequests: string[] = [];
  const recipientHandler = (route: import('@playwright/test').Route) => {
   const request = route.request(), url = new URL(request.url());
   expect(request.url()).not.toContain(token);
   if (url.origin !== baseURL) { unexpected.push(request.url()); return route.abort(); }
   if (url.pathname === '/api/shared-report') {
    expect(request.method()).toBe('POST');
    const received = request.postDataJSON().token; recipientRequests.push(received);
    if (received !== token) return route.fulfill({status:404,json:{error:'Unavailable'}});
    expect(request.headers().cookie).toBeUndefined(); expect(request.headers().referer).toBeUndefined();
    return state === 'published' ? route.fulfill({ json: { snapshot: named, digest, expiresAt }, headers: { 'Cache-Control': 'no-store' } }) : route.fulfill({ status: 404, json: { error: 'Unavailable' } });
   }
   if (url.pathname.startsWith('/api/') || url.pathname.includes('auth')) { unexpected.push(url.pathname); return route.abort(); }
   return route.continue();
  };
  await recipient.route('**/*', recipientHandler);
  const response = await recipient.goto(`${baseURL}/s#${token}`);
  expect(response!.headers()['cache-control']).toContain('no-store');
  expect(response!.headers()['x-robots-tag']).toContain('noindex');
  await expect(recipient.locator('article[aria-label="Shared report reader"]')).toBeVisible();
  await expect(recipient).toHaveURL(`${baseURL}/s#${token}`);
  await expect(recipient.getByRole('heading',{name:'Release review <script>',exact:true})).toBeVisible();
  const reader = recipient.getByRole('article',{name:'Shared report reader'});
  for (const label of ['Scope','Findings','Evidence included','Verification method','Report history','Export']) {
   const button = reader.getByRole('navigation').getByRole('button',{name:label,exact:true});
   await button.focus(); await recipient.keyboard.press('Enter');
   await expect(reader.getByRole('heading',{name:label === 'Findings' ? 'Findings and unknowns' : label,exact:true})).toBeFocused();
   await expect(recipient).toHaveURL(`${baseURL}/s#${token}`);
   await recipient.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  }
  await reader.getByRole('button',{name:'View all findings and unknowns'}).click();
  await expect(reader.getByRole('heading',{name:'Findings and unknowns',exact:true})).toBeFocused();
  const suggested = named.findings.find(f=>f.recommendation)!;
  await reader.getByRole('button',{name:suggested.title,exact:true}).focus();
  await recipient.keyboard.press('Space');
  const target = reader.locator('details').filter({has:recipient.locator('summary strong').filter({hasText:suggested.title})});
  await expect(target).toHaveAttribute('open','');
  await expect(target.locator('summary')).toBeFocused();
  await expect(recipient).toHaveURL(`${baseURL}/s#${token}`);
  for (const item of named.coverage) {
   const row = reader.locator('#recipient-scope li').filter({hasText:item.label});
   await expect(row).toContainText(item.complete ? 'Collection complete' : 'Collection incomplete');
   await expect(row).toContainText(item.observedState ?? 'Not recorded');
  }
  await recipient.emulateMedia({media:'print'});
  await expect(recipient.getByRole('button',{name:'Export PDF'})).toBeHidden();
  await expect(recipient.locator('main')).toContainText('Source evidence is not included');
  await recipient.emulateMedia({media:'screen'});
  await recipient.reload();
  await expect(recipient.locator('article[aria-label="Shared report reader"]')).toBeVisible();
  await expect(recipient.locator('main')).toContainText('does not establish that the findings are true');
  expect(await recipient.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await recipient.screenshot({ path: info.outputPath(`recipient-${width}.png`) });
  const copiedContext = await browser.newContext();
  const copiedPage = await copiedContext.newPage();
  await copiedPage.route('**/*', recipientHandler);
  await copiedPage.goto(recipient.url());
  await expect(copiedPage.getByRole('article',{name:'Shared report reader'})).toBeVisible();
  await copiedPage.evaluate(()=>{location.hash='incorrect-token';});
  await expect(copiedPage.locator('main').getByRole('alert')).toContainText('unavailable');
  expect(recipientRequests.pop()).toBe('incorrect-token');
  await copiedPage.goto(recipient.url());
  await expect(copiedPage.getByRole('article',{name:'Shared report reader'})).toBeVisible();
  let releasePoll: (()=>void)|undefined;
  const delayed = async (route: import('@playwright/test').Route) => { await new Promise<void>(resolve => { releasePoll=resolve; }); await route.fulfill({json:{snapshot:named,digest,expiresAt}}); };
  await recipient.route('**/api/shared-report',delayed);
  await recipient.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  await expect.poll(()=>Boolean(releasePoll)).toBe(true);
  await expect(recipient.locator('article[aria-label="Shared report reader"]')).toBeVisible();
  releasePoll!();await recipient.unroute('**/api/shared-report',delayed);
  previewFails = true;
  await panel.getByRole('button', { name: 'Close preview' }).click();
  await page.getByRole('button', { name: 'Share report', exact: true }).click();
  await expect(page.locator('.report-sharing').getByRole('alert')).toHaveText('Preview limit reached.');
  await page.getByRole('button', { name: 'Revoke link', exact: true }).click();
  await expect(page.getByLabel('Published link')).toHaveCount(0);
  await recipient.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(recipient.locator('main').getByRole('alert')).toContainText('expired or revoked');
  await expect(recipient.locator('article[aria-label="Shared report reader"]')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Close preview' }).click();
  await expect(page.getByRole('button', { name: 'Share report', exact: true })).toBeFocused();
  await copiedPage.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  await expect(copiedPage.locator('main').getByRole('alert')).toContainText('expired or revoked');
  expect(recipientRequests.length).toBeGreaterThan(3);
  expect(recipientRequests.every(value=>value===token)).toBe(true);
  await copiedContext.close();
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
   await expect(page.getByRole('region', { name: 'Recipient preview' }).locator('article[aria-label="Shared report reader"]')).toBeVisible();
   await expect(page.getByRole('button', { name: 'Publish link', exact: true })).toHaveCount(0);
   await expect(page.getByRole('button', { name: 'Revoke link', exact: true })).toHaveCount(0);
  }
 });
}

for (const kind of ['complete','partial','adverse']) for (const width of [1440,390]) test(`Linux recipient ${kind}, unknowns, legacy title and print ${width}`,async({page,browserName},info)=>{
 const name='proofpack-pr_lsa_20260710120000_198fd7aceb.zip';
 const path=resolve('tests/proofpack/production-fixtures',kind,name);
 const checked=await verifyProofpack({proofpack:{name,bytes:readFileSync(path)},signature:{name:name+'.sig.json',bytes:readFileSync(path+'.sig.json')},trust_registry:pinnedRegistryInput()});
 const projection=recipientReport(localAuditAdapter(checked,'2026-09-11T12:00:00Z')!);
 const bytes=canonicalSource(projection), hash=createHash('sha256').update(bytes).digest('hex');
 await page.setViewportSize({width,height:900});
 await page.route('**/api/shared-report',route=>route.fulfill({json:{snapshot:projection,digest:hash,expiresAt,publishedAt:'2026-09-18T12:00:00Z'}}));
 await page.goto(`/s#${token}`);
 const reader=page.getByRole('article',{name:'Shared report reader'});
 await expect(reader).toBeVisible();
 await expect(reader).toContainText('Synthetic / illustrative example');
 for(const unknown of projection.unknowns) await expect(reader).toContainText(unknown.reason);
 await expect(reader).toContainText(projection.verification.boundary);
 await expect(reader).toContainText('Source evidence is not included');
 for (const item of projection.coverage) {
  const row = reader.locator('#recipient-scope li').filter({hasText:item.label});
  await expect(row).toContainText(item.complete ? 'Collection complete' : 'Collection incomplete');
  await expect(row).toContainText(item.observedState ?? 'Not recorded');
 }
 await expect(reader.getByRole('heading',{level:1})).toContainText(projection.subject.label);
 const finding=projection.findings.length ? reader.locator('details').filter({hasText:projection.findings[0].title}) : reader.locator('details').filter({hasText:'Link access and expiry'});
 await finding.locator('summary').focus(); await page.keyboard.press('Enter');
 await expect(finding).toHaveAttribute('open','');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:info.outputPath(`linux-recipient-${width}.png`)});
 await page.emulateMedia({media:'print'});
 await expect(reader).toBeHidden();
 await expect(page.locator('article').filter({hasNot:page.locator('[aria-label="Report sections"]')})).toBeVisible();
 for(const finding of projection.findings) {
   if(finding.recommendation) await expect(page.locator('main')).toContainText(finding.recommendation);
   for(const limit of finding.limitations) await expect(page.locator('main')).toContainText(limit);
 }
 await expect(page.getByRole('button',{name:'Export PDF'})).toBeHidden();
 if(browserName==='chromium') await page.pdf({path:info.outputPath(`linux-recipient-${width}.pdf`),format:'A4',printBackground:true});
 expect(canonicalSource(projection)).toBe(bytes);
});

test('attention without a recommendation does not suggest a clear baseline', async ({page}) => {
 const projection = {...safe, findings:[{...safe.findings[0], state:'needs_attention' as const, recommendation:null}]};
 await page.route('**/api/shared-report', route=>route.fulfill({json:{snapshot:projection,digest,expiresAt}}));
 await page.goto(`/s#${token}`);
 const reader=page.getByRole('article',{name:'Shared report reader'});
 await expect(reader).toContainText('No recommendation was recorded; agree an appropriate follow-up');
 await expect(reader).not.toContainText('Keep this bounded baseline');
});

// Actual Chromium page text catches wrappers that add enough height to orphan the summary.
test('named hostname recipient PDF keeps summary and finding content together', async ({page,browserName}, info) => {
 test.skip(browserName !== 'chromium');
 const projection=recipientReport(savedRunReport(run),'Staging export acceptance — fixed revision');
 const bytes=canonicalSource(projection), hash=createHash('sha256').update(bytes).digest('hex');
 await page.route('**/api/shared-report',route=>route.fulfill({json:{snapshot:projection,digest:hash,expiresAt,publishedAt:'2026-09-18T12:00:00Z'}}));
 await page.goto(`/s#${token}`);
 await expect(page.getByRole('article',{name:'Shared report reader'})).toBeVisible();
 const pdf=await page.pdf({path:info.outputPath('recipient.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
 const pages=pdfPages(pdf).map(p=>p.text.replace(/\s+/g,' '));
 expect(pages[0]).toContain(projection.sharedTitle);
 expect(pages[0]).toContain('This report is a derived presentation of the source evidence.');
 const firstFinding=pages.find(p=>p.includes('THE FINDINGS'))!;
 expect(firstFinding).toContain(projection.findings[0].title);
 const all=pages.join(' '), compact=(s:string)=>s.replace(/\s+/g,'');
 for(const f of projection.findings){if(f.recommendation)expect(compact(all)).toContain(compact(f.recommendation));for(const l of f.limitations)expect(compact(all)).toContain(compact(l));}
 for(const u of projection.unknowns)expect(compact(all)).toContain(compact(u.reason));
 expect(all).not.toContain(' · Evidence:');
 for(const excluded of ['Full source JSON used for this report',run.id,run.assetId,'Export PDF','Publish link',token])expect(all).not.toContain(excluded);
 expect(pages.every(p=>p.length>180)).toBe(true);
 expect(canonicalSource(projection)).toBe(bytes);
});
