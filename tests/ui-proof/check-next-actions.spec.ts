import { expect, test } from '@playwright/test';
import { externalExposureAdapter } from '../../apps/witnessops-web/src/lib/external-exposure/adapter';
import { snapshotFixture, cleanSnapshotFixture } from '../external-exposure/fixture';

test.beforeEach(async ({ page, baseURL }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
  // No unmocked collection, mail or provider request can leave this browser.
  await page.route('**/api/**', route => route.abort());
});

for (const width of [1440, 390, 320]) test(`example is accessible, synthetic and makes no collection request at ${width}px`, async ({ page }) => {
  let requests = 0;
  await page.route('**/api/external-exposure', route => { requests++; return route.abort(); });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { Object.assign(window, { copiedTask: text }); } } });
  });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/check');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your hostname. Know what to do next.');
  const example = page.getByRole('button', { name: 'See an example result' });
  await example.focus();
  await example.press('Enter');
  const result = page.getByRole('region', { name: 'Snapshot results' });
  await expect(result.getByRole('heading', { name: 'example.com', exact: true })).toBeFocused();
  await expect(result).toContainText('SYNTHETIC EXAMPLE');
  await expect(result).toContainText('No hostname was checked');
  await expect(result.getByRole('button', { name: /report|source JSON/i })).toHaveCount(0);
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
  const actions = page.getByRole('region', { name: 'Your next actions' });
  await expect(actions.locator('[data-action-status="NEEDS_ATTENTION"]')).toHaveCount(2);
  await expect(actions.locator('[data-action-status="UNDETERMINED"]')).toContainText('does not establish a configuration problem');
  await expect(actions.locator('[data-action-status="CHECK_ERROR"]')).toContainText('does not establish a configuration problem');
  await actions.getByRole('button', { name: 'Copy task for my administrator: HSTS policy', exact: true }).click();
  await expect(actions.getByText('Task copied. Nothing was sent.')).toBeVisible();
  const task = await page.evaluate(() => (window as unknown as { copiedTask: string }).copiedTask);
  expect(task).toMatch(/^SYNTHETIC EXAMPLE/);
  expect(task).toContain('Not observed — illustrative example');
  expect(task).toContain('does not authorize a change or a new check');
  expect(requests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `artifacts/ui-proof/check-next-actions/example-${width}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Use my own hostname' }).click();
  await expect(page.getByLabel('Public hostname', { exact: true })).toBeFocused();
  await expect(result).toHaveCount(0);
  expect(requests).toBe(0);
});

test('live fixture tasks keep source identity, support manual copy and clear when hostname changes', async ({ page }) => {
  const snapshot = snapshotFixture('owned.example.com');
  let requests = 0;
  await page.route('**/api/external-exposure', route => { requests++; return route.fulfill({ json: { snapshot, model: externalExposureAdapter(snapshot) } }); });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Clipboard unavailable in fixture'); } } });
  });
  await page.goto('/check');
  await page.getByRole('button', { name: 'See an example result' }).click();
  await page.getByLabel('Public hostname', { exact: true }).fill(snapshot.target);
  await expect(page.getByText('SYNTHETIC EXAMPLE', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Run free check', exact: true }).click();
  const actions = page.getByRole('region', { name: 'Your next actions' });
  await actions.getByRole('button', { name: 'Copy task for my administrator: Mock observation 2', exact: true }).click();
  const manual = page.getByRole('textbox', { name: 'Administrator task: Mock observation 2' });
  await expect(manual).toBeVisible();
  const task = await manual.inputValue();
  expect(task).toContain(snapshot.target);
  expect(task).toContain(snapshot.finished_at);
  expect(task).toContain('NEEDS_ATTENTION');
  expect(task).not.toContain('SYNTHETIC EXAMPLE');
  await expect(page.getByRole('button', { name: 'Download source JSON' })).toBeVisible();
  await page.getByRole('button', { name: 'View full report', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toContainText('Snapshot data validation');
  expect(requests).toBe(1);
  await page.getByRole('button', { name: 'See an example result' }).click();
  await expect(manual).toHaveCount(0);
  await expect(actions).not.toContainText('Clipboard unavailable');
  await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
  expect(requests).toBe(1);
  await page.getByLabel('Public hostname', { exact: true }).fill('changed.example.com');
  await expect(actions).toHaveCount(0);
  await expect(manual).toHaveCount(0);
});

test('an expected-only fixture does not invent follow-up tasks or a security verdict', async ({ page }) => {
  const snapshot = cleanSnapshotFixture();
  await page.route('**/api/external-exposure', route => route.fulfill({ json: { snapshot, model: externalExposureAdapter(snapshot) } }));
  await page.goto('/check');
  await page.getByLabel('Public hostname', { exact: true }).fill(snapshot.target);
  await page.getByRole('button', { name: 'Run free check', exact: true }).click();
  const actions = page.getByRole('region', { name: 'Your next actions' });
  await expect(actions).toContainText('No follow-up task was identified by these ten checks');
  await expect(actions).toContainText('does not establish overall security');
  await expect(actions.getByRole('button')).toHaveCount(0);
});
