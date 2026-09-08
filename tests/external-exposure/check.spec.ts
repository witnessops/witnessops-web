import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { externalExposureAdapter, validateExternalSnapshot } from '../../apps/witnessops-web/src/lib/external-exposure/adapter';
import { buyerOfferRequestHref } from '../../apps/witnessops-web/src/lib/buyer-services';
import { EXTERNAL_ATTACK_SURFACE_OFFER } from '../../apps/witnessops-web/src/lib/commercial-truth';
import { snapshotFixture } from './fixture';

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
}

test('indexable page reuses public navigation and keeps mocked mobile results usable without a score', async ({ page, browserName }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto('/check');
  expect(response?.headers()['cache-control']).toContain('no-store');
  expect(response?.headers()['content-security-policy']).toContain("connect-src 'self'");
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'index, follow');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://witnessops.com/check');
  await expect(page.getByRole('heading', { name: 'External Exposure Snapshot', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary navigation', exact: true })).toBeVisible();
  await expect(page.locator('#site-footer')).toBeVisible();
  await expect(page.locator('script[src*="witnessops-manual"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ask WitnessOps', exact: true })).toHaveCount(0);
  expect(await page.evaluate(async () => {
    const inter = await document.fonts.load('400 16px Inter');
    const mono = await document.fonts.load('500 14px "IBM Plex Mono"');
    await document.fonts.ready;
    return inter.length > 0 && inter.every(font => font.family.replaceAll('"', '') === 'Inter' && font.status === 'loaded')
      && mono.length > 0 && mono.every(font => font.family.replaceAll('"', '') === 'IBM Plex Mono' && font.status === 'loaded')
      && getComputedStyle(document.querySelector('main h1')!).fontFamily.includes('Inter')
      && getComputedStyle(document.querySelector('button[type=submit]')!).fontFamily.includes('IBM Plex Mono');
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
  await expect(page.locator('[data-status=CHECK_ERROR]')).toContainText('Collection error');
  await expect(page.getByRole('heading', { name: 'What needs attention?', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What remains unknown?', exact: true })).toBeVisible();
  for (const check of snapshot.checks.filter(check => check.status === 'NEEDS_ATTENTION'))
    await expect(page.locator('[data-status=NEEDS_ATTENTION]').getByRole('heading', { name: check.title, exact: true })).toBeVisible();
  const information = page.getByText('1 informational observations', { exact: true }).locator('..');
  await expect(information).toHaveJSProperty('open', false);
  await expect(information.getByText('Mock observation 3', { exact: true })).not.toBeVisible();
  await information.locator('summary').click();
  await expect(information.getByText('Mock observation 3', { exact: true })).toBeVisible();
  await expect(page.getByText('No score or severity ranking is assigned.', { exact: false })).toBeVisible();
  await expect(page.locator('input[type=email]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Request a 30-minute review call', exact: true })).toHaveAttribute('href', '/review/request');
  await expect(page.getByRole('link', { name: 'Request review', exact: true })).toHaveAttribute('href', buyerOfferRequestHref('en', EXTERNAL_ATTACK_SURFACE_OFFER.productId));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('result-mobile.png'), fullPage: true });
});

test('source download and the immutable report use the same identity and print document', async ({ page, browserName }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/check');
  await collect(page);
  await page.getByText('Source data and report details', { exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download source JSON' }).click();
  const download = await downloadEvent;
  const source = await readFile((await download.path())!);
  expect(createHash('sha256').update(source).digest('hex')).toBe(model.identity.sourceDigest);
  await page.getByRole('button', { name: 'View full report', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hide full report', exact: true })).toHaveAttribute('aria-expanded', 'true');
  const report = page.getByRole('article', { name: 'Derived buyer report' });
  await expect(report).toBeVisible();
  await expect(report).toContainText('Snapshot data checks');
  await expect(report).toContainText('Severity not assessed');
  await expect(report).toContainText('CHECK_ERROR');
  const chapterHeading = report.getByRole('heading', { name: 'Recorded findings', level: 2, exact: true });
  const expectChapterTypography = async () => {
    await expect(chapterHeading).toHaveCSS('font-size', '27px');
    await expect(chapterHeading).toHaveCSS('line-height', '33.75px');
    await expect(chapterHeading).toHaveCSS('margin-bottom', '16px');
  };
  await expectChapterTypography();
  const desktopWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(await report.boundingBox()).toMatchObject({ x: (desktopWidth - 960) / 2, width: 960 });
  const before = await report.innerHTML();
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __snapshotPrints: number }).__snapshotPrints)).toBe(1);
  expect(await report.innerHTML()).toBe(before);
  await page.screenshot({ path: testInfo.outputPath('report-desktop.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('nav[aria-label="Primary navigation"]')).not.toBeVisible();
  await expect(page.locator('#site-footer')).not.toBeVisible();
  await expect(page.getByRole('form', { name: 'Run an external exposure snapshot' })).not.toBeVisible();
  await expect(report).toBeVisible();
  await expectChapterTypography();
  expect(await report.innerHTML()).toBe(before);
  if (browserName === 'chromium') await page.pdf({ path: testInfo.outputPath('mock-external-snapshot.pdf'), format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(await report.boundingBox()).toMatchObject({ x: 8, width: mobileWidth - 16 });
});

test('input changes clear old results immediately and duplicate submission cannot start a second request', async ({ page }) => {
  await page.goto('/check');
  await collect(page);
  await page.getByRole('button', { name: 'View full report', exact: true }).click();
  await page.getByLabel('Public hostname', { exact: true }).fill('changed.example.com');
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
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
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
  await page.route('**/api/external-exposure', route => route.fulfill({ status: 200, json: { ...payload, model: { ...model, verification: { ...model.verification, status: 'UNSIGNED' } } } }));
  await page.getByLabel('Public hostname', { exact: true }).fill('example.com');
  await page.getByRole('button', { name: 'Run free check', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Run an external exposure snapshot' }).getByRole('alert')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
});
