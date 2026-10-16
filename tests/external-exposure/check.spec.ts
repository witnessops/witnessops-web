import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { canonicalSource } from '../../apps/witnessops-app/src/lib/source-digest';
import { externalExposureAdapter, validateExternalSnapshot } from '../../apps/witnessops-web/src/lib/external-exposure/adapter';
import { RUN_RECORD_WORDING } from '../../apps/witnessops-web/src/lib/external-exposure/unsigned-run-record';
import { buyerOfferRequestHref } from '../../apps/witnessops-web/src/lib/buyer-services';
import { EXTERNAL_ATTACK_SURFACE_OFFER } from '../../apps/witnessops-web/src/lib/commercial-truth';
import { cleanSnapshotFixture, snapshotFixture } from './fixture';

const snapshot = validateExternalSnapshot(snapshotFixture());
const model = externalExposureAdapter(snapshot);
const payload = { snapshot, model };

test.beforeEach(async ({ page, baseURL }) => {
  // Test collection is always mocked. Fail closed if the UI attempts another origin.
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
  await page.route('**/api/external-exposure', route => route.fulfill({ status: 200, json: payload }));
  await page.addInitScript(() => {
    Object.assign(window, { __snapshotPrints: 0 });
    window.print = () => { (window as unknown as { __snapshotPrints: number }).__snapshotPrints += 1; };
  });
});

async function collect(page: Page) {
  await page.getByLabel('Public hostname', { exact: true }).fill('example.com');
  await page.getByRole('button', { name: 'Run free check', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'example.com', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'example.com', exact: true })).toBeFocused();
}

test('indexable page reuses public navigation and keeps mocked mobile results usable without a score', async ({ page, browserName }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto('/check');
  expect(response?.headers()['cache-control']).toContain('no-store');
  expect(response?.headers()['content-security-policy']).toContain("connect-src 'self'");
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'index, follow');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://witnessops.com/check');
  await expect(page.getByRole('heading', { name: 'Check your public exposure.', exact: true })).toBeVisible();
  await expect(page.getByText('Ten checks of one public hostname. No account or email required.', { exact: true })).toBeVisible();
  await expect(page.getByText('See what your company exposes publicly.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Primary navigation', exact: true })).toBeVisible();
  await expect(page.locator('#site-footer')).toBeVisible();
  await expect(page.locator('script[src*="witnessops-manual"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ask WitnessOps', exact: true })).toBeVisible();
  expect(await page.evaluate(async () => {
    const inter = await document.fonts.load('400 16px Inter');
    const mono = await document.fonts.load('500 14px "IBM Plex Mono"');
    await document.fonts.ready;
    return inter.length > 0 && inter.every(font => font.family.replaceAll('"', '') === 'Inter' && font.status === 'loaded')
      && mono.length > 0 && mono.every(font => font.family.replaceAll('"', '') === 'IBM Plex Mono' && font.status === 'loaded')
      && getComputedStyle(document.querySelector('main h1')!).fontFamily.includes('Inter')
      && getComputedStyle(document.querySelector('button[type=submit]')!).fontFamily.includes('Inter');
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('empty-mobile.png'), fullPage: true });
  // macOS WebKit uses Option+Tab to traverse links and all controls.
  const nextControl = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.getByRole('link', { name: 'Skip to snapshot' }).focus();
  await page.keyboard.press(nextControl);
  await expect(page.getByRole('link', { name: 'WitnessOps home', exact: true }).first()).toBeFocused();
  await page.getByLabel('Public hostname', { exact: true }).focus();
  await page.getByLabel('Public hostname', { exact: true }).fill('example.com');
  await page.keyboard.press(nextControl);
  await expect(page.getByRole('button', { name: 'Run free check', exact: true })).toBeFocused();
  await collect(page);
  const resultRegion = page.getByRole('article', { name: 'Snapshot results' });
  await expect(resultRegion).toContainText('9 checks run · 5 observed as expected · 1 needs attention · 0 not run · 1 collection error');
  await expect(resultRegion).toContainText('Checks with collected evidence: 8/10');
  await expect(resultRegion).toContainText('Collection error: web.hsts.v1.');
  await expect(resultRegion.getByRole('heading', { name: 'Needs attention', exact: true })).toBeVisible();
  const undetermined = resultRegion.locator('details').filter({ has: page.getByText('Undetermined', { exact: true }) }).first();
  await undetermined.locator('summary').click();
  await expect(resultRegion.locator('[data-status=CHECK_ERROR]')).toContainText('Collection error');
  const expectedDetails = resultRegion.locator('details').filter({ has: page.getByText('Observed as expected', { exact: true }) }).first();
  await expect(expectedDetails).toHaveJSProperty('open', false);
  await expectedDetails.locator('summary').click();
  for (const check of snapshot.checks.filter(check => check.status === 'OBSERVED_EXPECTED'))
    await expect(expectedDetails).toContainText(check.interpretation);
  for (const check of snapshot.checks.filter(check => check.status === 'NEEDS_ATTENTION'))
    await expect(resultRegion.locator('[data-status=NEEDS_ATTENTION]').getByText(check.title, { exact: true })).toBeVisible();
  const information = resultRegion.locator('details').filter({ has: page.getByText('Informational', { exact: true }) }).first();
  await expect(information).toHaveJSProperty('open', false);
  await expect(information.getByText('Mock observation 3', { exact: true })).not.toBeVisible();
  await information.locator('summary').click();
  await expect(information.getByText('Mock observation 3', { exact: true })).toBeVisible();
  await expect(page.locator('input[type=email]')).toHaveCount(0);
  await expect(page.locator('main').getByRole('link', { name: 'Ask an expert', exact: true })).toHaveAttribute('href', buyerOfferRequestHref('en', EXTERNAL_ATTACK_SURFACE_OFFER.productId));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('result-mobile.png'), fullPage: true });
});

test('source download and the immutable report use the same identity and print document', async ({ page, browserName }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/check');
  await collect(page);
  // The source can be kept directly from the result without opening details.
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download source JSON' }).click();
  const download = await downloadEvent;
  const source = await readFile((await download.path())!);
  expect(source.toString('utf8')).toBe(canonicalSource(snapshot));
  expect(createHash('sha256').update(source).digest('hex')).toBe(createHash('sha256').update(canonicalSource(snapshot), 'utf8').digest('hex'));
  const report = page.locator("main article[aria-label='Snapshot results']");
  await expect(report).toBeVisible();
  await expect(report).toContainText(RUN_RECORD_WORDING.integrityLabel);
  await report.getByText('Raw results', { exact: true }).click();
  await expect(report).toContainText('CHECK_ERROR');
  const before = await report.innerHTML();
  await page.getByRole('button', { name: 'Save report as PDF', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __snapshotPrints: number }).__snapshotPrints)).toBe(1);
  expect(await report.innerHTML()).toBe(before);
  await page.screenshot({ path: testInfo.outputPath('report-desktop.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('nav[aria-label="Primary navigation"]')).not.toBeVisible();
  await expect(page.locator('#site-footer')).not.toBeVisible();
  await expect(page.getByRole('form', { name: 'Run an external exposure snapshot' })).not.toBeVisible();
  const printed = page.locator('[data-run-record-print]');
  await expect(printed).toBeVisible();
  await expect(printed).toContainText(RUN_RECORD_WORDING.integrityLabel);
  expect(await report.innerHTML()).toBe(before);
  if (browserName === 'chromium') await page.pdf({ path: testInfo.outputPath('mock-external-snapshot.pdf'), format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const [name, fixture, line, collected, clear] of [
  ['clean', cleanSnapshotFixture(), '10 checks run · 8 observed as expected · 0 need attention · 0 not run · 0 collection errors', 'Checks with collected evidence: 10/10', true],
  ['attention', snapshotFixture(), '9 checks run · 5 observed as expected · 1 needs attention · 0 not run · 1 collection error', 'Checks with collected evidence: 8/10', false],
] as const) test(`short results keep outcome counts in browser and print: ${name}`, async ({ page, browserName }, testInfo) => {
  const snapshot = validateExternalSnapshot(fixture), model = externalExposureAdapter(snapshot);
  await page.route('**/api/external-exposure', route => route.fulfill({ status: 200, json: { snapshot, model } }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/check');
  await collect(page);
  const report = page.locator("main article[aria-label='Snapshot results']");
  const before = await report.innerHTML();
  for (const media of ['screen', 'print'] as const) {
    await page.emulateMedia({ media });
    const visible = media === 'print' ? page.locator("[data-run-record-print] article") : report;
    await expect(visible).toContainText(line);
    await expect(visible).toContainText(collected);
    await expect(visible).toContainText('Result:');
    if (clear) await expect(visible).toContainText(RUN_RECORD_WORDING.noIssues);
    else await expect(visible.getByRole('heading', { name: 'Needs attention', exact: true })).toBeVisible();
    expect(await report.innerHTML()).toBe(before);
  }
  if (browserName === 'chromium') await page.pdf({ path: testInfo.outputPath(`${name}-cover.pdf`), format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await report.screenshot({ path: testInfo.outputPath(`${name}-cover-desktop.png`) });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await report.screenshot({ path: testInfo.outputPath(`${name}-cover-mobile.png`) });
  await expect(report).toContainText(line);
});

test('input changes clear old results immediately and duplicate submission cannot start a second request', async ({ page }) => {
  await page.goto('/check');
  await collect(page);
  await page.getByLabel('Public hostname', { exact: true }).fill('changed.example.com');
  await expect(page.getByRole('article', { name: 'Snapshot results' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'example.com', exact: true })).toHaveCount(0);
  let requests = 0;
  let release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/external-exposure', async route => {
    requests += 1;
    await pending;
    await route.fulfill({ status: 200, json: payload }).catch(() => {});
  });
  await page.locator('form').evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByRole('button', { name: 'Collecting observations…' })).toBeDisabled();
  await expect.poll(() => requests).toBe(1);
  await page.getByLabel('Public hostname', { exact: true }).fill('new.example.com');
  release!();
  await expect(page.getByRole('heading', { name: 'example.com', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Run free check', exact: true })).toBeEnabled();
});

test('invalid response cannot restore a report; clear removes results and the hostname', async ({ page }) => {
  await page.goto('/check');
  await collect(page);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByLabel('Public hostname', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Public hostname', { exact: true })).toBeFocused();
  await expect(page.getByRole('article', { name: 'Snapshot results' })).toHaveCount(0);
  await page.route('**/api/external-exposure', route => route.fulfill({ status: 200, json: { ...payload, model: { ...model, verification: { ...model.verification, status: 'UNSIGNED' } } } }));
  await page.getByLabel('Public hostname', { exact: true }).fill('example.com');
  await page.getByRole('button', { name: 'Run free check', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Run an external exposure snapshot' }).getByRole('alert')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Snapshot results' })).toHaveCount(0);
});

for (const rejection of [
  { input: 'https://example.com', status: 400, error: 'Enter one public hostname, without a URL, path, port, IP address or additional fields.' },
  { input: 'unreachable.example.com', status: 422, error: 'A bounded snapshot could not be completed for this hostname. No report was generated.' },
]) test(`request rejection is readable and clears on replacement: ${rejection.status}`, async ({ page }) => {
  await page.goto('/check');
  await collect(page);
  await page.route('**/api/external-exposure', route => route.fulfill({ status: rejection.status, json: { error: rejection.error } }));
  await page.getByLabel('Public hostname', { exact: true }).fill(rejection.input);
  await expect(page.getByRole('article', { name: 'Snapshot results' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Run free check', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Run an external exposure snapshot' }).getByRole('alert')).toHaveText(rejection.error);
  await expect(page.getByRole('button', { name: 'Save report as PDF', exact: true })).toHaveCount(0);
  await page.getByLabel('Public hostname', { exact: true }).fill('example.com');
  await expect(page.getByRole('form', { name: 'Run an external exposure snapshot' }).getByRole('alert')).toHaveCount(0);
  await page.route('**/api/external-exposure', route => route.fulfill({ status: 200, json: payload }));
  await collect(page);
});

test('uncollected timeout observations remain unknown and a long hostname wraps', async ({ page }) => {
  const target = `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.example.com`;
  const timeout = validateExternalSnapshot({ ...snapshotFixture(target), checks: snapshotFixture(target).checks.map(check => ({
    ...check, status: 'UNDETERMINED', collected: false, recommendation: null,
    interpretation: 'Collection deadline exhausted. No reliable observation was obtained.',
  })) });
  await page.route('**/api/external-exposure', route => route.fulfill({ status: 200, json: { snapshot: timeout, model: externalExposureAdapter(timeout) } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/check');
  await page.getByLabel('Public hostname', { exact: true }).fill(target);
  await page.getByRole('button', { name: 'Run free check', exact: true }).click();
  await expect(page.getByRole('heading', { name: target, exact: true })).toBeVisible();
  await expect(page.locator('main [data-status=NEEDS_ATTENTION]')).toHaveCount(0);
  await expect(page.locator('main [data-status=UNDETERMINED]')).toHaveCount(10);
  await expect(page.getByRole('article', { name: 'Snapshot results' })).toContainText('10 checks run · 0 observed as expected · 0 need attention · 0 not run · 0 collection errors');
  await expect(page.getByRole('article', { name: 'Snapshot results' })).toContainText('Checks with collected evidence: 0/10');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Snapshot results' })).toHaveCount(0);
  await expect(page.getByRole('article', { name: 'Snapshot results' })).toHaveCount(0);
});

test('a new visitor can reach the free check from shared desktop and mobile navigation', async ({ page }) => {
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const menu = page.getByRole('button', { name: 'Open primary navigation', exact: true });
    const mobile = await menu.isVisible();
    if (mobile) {
      await menu.click();
      await expect(page.getByRole('button', { name: 'Close primary navigation', exact: true })).toBeVisible();
      await expect(page.locator('#witnessops-mobile-menu')).toBeVisible();
    }
    const navigation = mobile ? page.locator('#witnessops-mobile-menu') : page.getByRole('navigation', { name: 'Primary navigation', exact: true });
    const product = navigation.getByRole('button', { name: 'Product', exact: true });
    await product.click();
    const panelId = await product.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const link = page.locator(`[id="${panelId}"]`).getByRole('link', { name: /^Free check/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/check');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await link.click();
    await expect(page.getByRole('heading', { name: 'Check your public exposure.', exact: true })).toBeVisible();
    await expect(page.getByLabel('Public hostname', { exact: true })).toBeVisible();
  }
});

test('resizing an open mobile menu to desktop releases its scroll lock', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open primary navigation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close primary navigation', exact: true })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.setViewportSize({ width: 1440, height: 844 });
  await expect(page.locator('html')).not.toHaveAttribute('data-mobile-nav-open', 'true');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Open primary navigation', exact: true })).toHaveAttribute('aria-expanded', 'false');
});

test('Cancel returns focus to the hostname and cannot display a late response', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await page.route('**/api/external-exposure', async route => {
    requests += 1;
    await pending;
    await route.fulfill({ status: 200, json: payload }).catch(() => {});
  });
  await page.goto('/check');
  const hostname = page.getByLabel('Public hostname', { exact: true });
  await hostname.fill('example.com');
  await page.getByRole('button', { name: 'Run free check', exact: true }).click();
  await expect.poll(() => requests).toBe(1);
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
  await cancel.focus();
  await cancel.press('Enter');
  await expect(hostname).toBeFocused();
  await expect(hostname).toHaveValue('example.com');
  await expect(page.getByRole('button', { name: 'Run free check', exact: true })).toBeEnabled();
  release();
  await expect(page.getByRole('region', { name: 'Snapshot results' })).toHaveCount(0);
});
