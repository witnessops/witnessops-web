import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { externalExposureAdapter, validateExternalSnapshot } from '../../apps/witnessops-web/src/lib/external-exposure/adapter';
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
  await expect(page.getByRole('heading', { name: 'External Exposure Snapshot', exact: true })).toBeVisible();
  await expect(page.getByText('See what ten public checks observe about your hostname.', { exact: true })).toBeVisible();
  await expect(page.getByText('See what your company exposes publicly.', { exact: true })).toHaveCount(0);
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
  const resultRegion = page.getByRole('region', { name: 'Snapshot results' });
  expect(await resultRegion.locator('h3, details > summary').allTextContents()).toEqual([
    'What needs attention?', 'What was observed as expected?', 'Inspect expected observations',
    '1 informational observations', 'What remains unknown?', 'Full evidence', 'Source data and report details',
  ]);
  const expectedDetails = page.getByText('Inspect expected observations', { exact: true }).locator('..');
  await expect(expectedDetails).toHaveJSProperty('open', false);
  await expectedDetails.locator('summary').click();
  for (const check of snapshot.checks.filter(check => check.status === 'OBSERVED_EXPECTED'))
    await expect(expectedDetails).toContainText(check.interpretation);
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
  await expect(report).toContainText('Snapshot data validation');
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
  expect(await report.locator('[class*="chapterFooter"]').evaluateAll(elements =>
    elements.map(element => getComputedStyle(element).display !== 'none'))).toEqual([true, false, false, false, false]);
  if (browserName === 'chromium') await page.pdf({ path: testInfo.outputPath('mock-external-snapshot.pdf'), format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(await report.boundingBox()).toMatchObject({ x: 8, width: mobileWidth - 16 });
});

for (const [name, fixture, values] of [
  ['clean', cleanSnapshotFixture(), ['0', '2', '10 / 10', '0']],
  ['attention', snapshotFixture(), ['1', '1', '8 / 10', '3']],
] as const) test(`cover presents outcomes above data validation in browser and print: ${name}`, async ({ page, browserName }, testInfo) => {
  const snapshot = validateExternalSnapshot(fixture), model = externalExposureAdapter(snapshot);
  await page.route('**/api/external-exposure', route => route.fulfill({ status: 200, json: { snapshot, model } }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/check');
  await collect(page);
  await page.getByRole('button', { name: 'View full report', exact: true }).click();
  const report = page.getByRole('article', { name: 'Derived buyer report' });
  const cover = report.locator(':scope > section').first();
  const outcomes = cover.getByRole('group', { name: 'Check outcomes', exact: true });
  const validation = cover.getByLabel('Data validation and check summary', { exact: true });
  const before = await report.innerHTML();
  for (const media of ['screen', 'print'] as const) {
    await page.emulateMedia({ media });
    await expect(outcomes.locator(':scope > div > span')).toHaveText(['Needs attention', 'Informational', 'Observations completed', 'Undetermined']);
    await expect(outcomes.locator(':scope > div > strong')).toHaveText([...values]);
    await expect(validation).toContainText('Snapshot data validation: Passed.');
    await expect(validation).toContainText('These are individual results, not an overall security grade.');
    await expect(cover.locator('strong').filter({ hasText: /^Passed$/ })).toHaveCount(0);
    expect(await outcomes.locator('strong').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(
      await validation.evaluate(element => parseFloat(getComputedStyle(element).fontSize)));
    expect(await report.innerHTML()).toBe(before);
  }
  if (browserName === 'chromium') await page.pdf({ path: testInfo.outputPath(`${name}-cover.pdf`), format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await cover.screenshot({ path: testInfo.outputPath(`${name}-cover-desktop.png`) });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await cover.screenshot({ path: testInfo.outputPath(`${name}-cover-mobile.png`) });
  await expect(outcomes.locator('strong')).toHaveText([...values]);
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
  await expect(page.getByLabel('Public hostname', { exact: true })).toBeFocused();
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
  await page.route('**/api/external-exposure', route => route.fulfill({ status: 200, json: { ...payload, model: { ...model, verification: { ...model.verification, status: 'UNSIGNED' } } } }));
  await page.getByLabel('Public hostname', { exact: true }).fill('example.com');
  await page.getByRole('button', { name: 'Run free check', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Run an external exposure snapshot' }).getByRole('alert')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
});

for (const rejection of [
  { input: 'https://example.com', status: 400, error: 'Enter one public hostname, without a URL, path, port, IP address or additional fields.' },
  { input: 'unreachable.example.com', status: 422, error: 'A bounded snapshot could not be completed for this hostname. No report was generated.' },
]) test(`request rejection is readable and clears on replacement: ${rejection.status}`, async ({ page }) => {
  await page.goto('/check');
  await collect(page);
  await page.route('**/api/external-exposure', route => route.fulfill({ status: rejection.status, json: { error: rejection.error } }));
  await page.getByLabel('Public hostname', { exact: true }).fill(rejection.input);
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Run free check', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Run an external exposure snapshot' }).getByRole('alert')).toHaveText(rejection.error);
  await expect(page.getByRole('button', { name: 'Export PDF', exact: true })).toHaveCount(0);
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
  await expect(page.locator('[data-status=NEEDS_ATTENTION]')).toHaveCount(0);
  await expect(page.locator('[data-status=UNDETERMINED]')).toHaveCount(10);
  await page.getByRole('button', { name: 'View full report', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Check outcomes', exact: true }).locator('strong')).toHaveText(['0', '0', '0 / 10', '10']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Snapshot results' })).toHaveCount(0);
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
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
    const link = navigation.getByRole('link', { name: 'Free check', exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/check');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await link.click();
    await expect(page.getByRole('heading', { name: 'External Exposure Snapshot', exact: true })).toBeVisible();
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
