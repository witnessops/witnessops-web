import { test, expect } from '@playwright/test';
import { externalExposureAdapter, validateExternalSnapshot } from '../../apps/witnessops-web/src/lib/external-exposure/adapter';
import { cleanSnapshotFixture } from './fixture';
import { publicContactMailto } from '../../apps/witnessops-web/src/lib/public-contact';

for (const width of [1440, 390]) {
  test(`public Early Access page and explicit saved-baseline handoff at ${width}`, async ({ page, baseURL }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const snapshot = validateExternalSnapshot(cleanSnapshotFixture());
    const model = externalExposureAdapter(snapshot);
    let collections = 0;
    const unexpected: string[] = [], errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/external-exposure') { collections++; return route.fulfill({ json: { snapshot, model } }); }
      // Existing telemetry is allowed to remain inert; no auth-app writes occur.
      unexpected.push(path); return route.abort();
    });
    await page.goto('/check');
    const save = page.getByRole('link', { name: 'Start a saved check', exact: true });
    await expect(save).toHaveCount(0); expect(collections).toBe(0);
    await page.getByLabel('Public hostname', { exact: true }).fill(snapshot.target);
    await page.getByRole('button', { name: 'Run free check', exact: true }).click();
    await expect(save).toHaveAttribute('href', '/early-access');
    await expect(page.getByRole('region', { name: 'Save a persistent baseline' })).toContainText('not automatically imported');
    expect(collections).toBe(1);
    await save.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`check-save-${width}.png`) });
    await save.click();
    await expect(page).toHaveURL(/\/early-access$/);
    await expect(page.getByRole('heading', { name: /Keep the evidence\.\s*See what changed\./, level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request Early Access', exact: true })).toHaveAttribute('href', publicContactMailto('WitnessOps — Request Early Access'));
    await expect(page.locator('main')).toContainText('not automatically imported');
    await expect(page.locator('main')).toContainText('ten bounded observations');
    await expect(page.locator('main')).toContainText('Not a penetration test');
    expect(page.url()).not.toContain(snapshot.target);
    expect(collections).toBe(1); expect(unexpected).toEqual([]); expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath(`early-access-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test('failed public collection does not offer a saved baseline', async ({ page }) => {
  await page.route('**/api/external-exposure', route => route.fulfill({ status: 422, json: { error: { message: 'Fixture could not complete' } } }));
  await page.goto('/check');
  await page.getByLabel('Public hostname', { exact: true }).fill('example.com');
  await page.getByRole('button', { name: 'Run free check', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start a saved check', exact: true })).toHaveCount(0);
});
