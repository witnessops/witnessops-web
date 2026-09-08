import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { externalExposureAdapter, validateExternalSnapshot } from '../../apps/witnessops-web/src/lib/external-exposure/adapter';
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
  await page.getByRole('button', { name: 'Run free snapshot', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'example.com', exact: true })).toBeVisible();
}

test('isolated noindex page and mocked mobile result remain usable without a score', async ({ page, browserName }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto('/check');
  expect(response?.headers()['cache-control']).toContain('no-store');
  expect(response?.headers()['content-security-policy']).toContain("connect-src 'self'");
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex, nofollow/);
  await expect(page.getByRole('heading', { name: 'External Exposure Snapshot', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  expect(await page.evaluate(async () => {
    await document.fonts.load('400 16px Inter');
    await document.fonts.ready;
    return Array.from(document.fonts).some(font => font.family.replaceAll('"', '') === 'Inter' && font.status === 'loaded') && getComputedStyle(document.body).fontFamily.includes('Inter');
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('empty-mobile.png'), fullPage: true });
  // macOS WebKit uses Option+Tab to traverse links and all controls.
  const nextControl = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await page.getByRole('link', { name: 'Skip to snapshot' }).focus();
  await page.keyboard.press(nextControl);
  await expect(page.getByRole('link', { name: 'WITNESSOPS', exact: true })).toBeFocused();
  await page.keyboard.press(nextControl);
  await expect(page.getByLabel('Public hostname', { exact: true })).toBeFocused();
  await page.getByLabel('Public hostname', { exact: true }).fill('example.com');
  await page.keyboard.press(nextControl);
  await expect(page.getByRole('button', { name: 'Run free snapshot', exact: true })).toBeFocused();
  await collect(page);
  await expect(page.locator('[data-status=CHECK_ERROR]')).toContainText('Collection error');
  await expect(page.locator('[data-status=NEEDS_ATTENTION]')).toContainText('Needs attention');
  await expect(page.getByText('No score or severity ranking is assigned.', { exact: false })).toBeVisible();
  await expect(page.locator('input[type=email]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('result-mobile.png'), fullPage: true });
});

test('source download and the immutable report use the same identity and print document', async ({ page, browserName }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/check');
  await collect(page);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download source JSON' }).click();
  const download = await downloadEvent;
  const source = await readFile((await download.path())!);
  expect(createHash('sha256').update(source).digest('hex')).toBe(model.identity.sourceDigest);
  await page.getByRole('button', { name: 'Preview buyer report' }).click();
  const report = page.getByRole('article', { name: 'Derived buyer report' });
  await expect(report).toBeVisible();
  await expect(report).toContainText('Snapshot data checks');
  await expect(report).toContainText('Severity not assessed');
  await expect(report).toContainText('CHECK_ERROR');
  const before = await report.innerHTML();
  await page.getByRole('button', { name: 'Save report as PDF' }).click();
  expect(await page.evaluate(() => (window as unknown as { __snapshotPrints: number }).__snapshotPrints)).toBe(1);
  expect(await report.innerHTML()).toBe(before);
  await page.screenshot({ path: testInfo.outputPath('report-desktop.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('form', { name: 'Run an external exposure snapshot' })).not.toBeVisible();
  await expect(report).toBeVisible();
  expect(await report.innerHTML()).toBe(before);
  if (browserName === 'chromium') await page.pdf({ path: testInfo.outputPath('mock-external-snapshot.pdf'), format: 'A4', printBackground: true });
});

test('input changes clear old results immediately and duplicate submission cannot start a second request', async ({ page }) => {
  await page.goto('/check');
  await collect(page);
  await page.getByRole('button', { name: 'Preview buyer report' }).click();
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
  await expect(page.getByRole('button', { name: 'Run free snapshot', exact: true })).toBeEnabled();
});

test('invalid response cannot restore a report; clear removes results and the hostname', async ({ page }) => {
  await page.goto('/check');
  await collect(page);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByLabel('Public hostname', { exact: true })).toHaveValue('');
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
  await page.route('**/api/external-exposure', route => route.fulfill({ status: 200, json: { ...payload, model: { ...model, verification: { ...model.verification, status: 'UNSIGNED' } } } }));
  await page.getByLabel('Public hostname', { exact: true }).fill('example.com');
  await page.getByRole('button', { name: 'Run free snapshot', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Run an external exposure snapshot' }).getByRole('alert')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
});
