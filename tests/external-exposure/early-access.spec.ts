import { test, expect } from '@playwright/test';
import { externalExposureAdapter, validateExternalSnapshot } from '../../apps/witnessops-web/src/lib/external-exposure/adapter';
import { cleanSnapshotFixture } from './fixture';
import { publicContactMailto } from '../../apps/witnessops-web/src/lib/public-contact';
import { EXTERNAL_ATTACK_SURFACE_OFFER } from '../../apps/witnessops-web/src/lib/commercial-truth';

for (const width of [1440, 390]) {
  test(`free check, workspace access and paid review handoff at ${width}`, async ({ page, baseURL }, info) => {
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
    const save = page.getByRole('region', { name: 'Save a persistent baseline' });
    await expect(save).toHaveCount(0); expect(collections).toBe(0);
    await page.getByLabel('Public hostname', { exact: true }).fill(snapshot.target);
    await page.getByRole('button', { name: 'Run free check', exact: true }).click();
    await expect(save).toContainText('not automatically imported');
    await expect(save).toContainText('Create an account, verify your email, then create your workspace.');
    await expect(save).not.toContainText('Workspace access requires an invitation');
    await expect(page.getByRole('button', { name: 'Download source JSON', exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Snapshot results' })).toContainText('Keep a copy before you leave.');
    const openWorkspace = save.getByRole('link', { name: 'Open workspace', exact: true });
    const appDestination = await openWorkspace.count() ? await openWorkspace.getAttribute('href') : null;
    if (appDestination) {
      const destination = new URL(appDestination);
      expect(destination.pathname).toBe('/'); expect(destination.search).toBe(''); expect(destination.hash).toBe('');
      expect(destination.href).not.toContain(snapshot.target);
    }
    expect(collections).toBe(1);
    await save.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`check-save-${width}.png`) });
    await save.getByRole('link', { name: appDestination ? 'How workspace access works →' : 'See workspace access', exact: true }).click();
    await expect(page).toHaveURL(/\/early-access$/);
    await expect(page.getByRole('heading', { name: /Keep the evidence\.\s*See what changed\./, level: 1 })).toBeVisible();
    const createAccount = page.getByRole('link', { name: 'Create an account →', exact: true });
    if (appDestination) await expect(createAccount).toHaveAttribute('href', new URL('/signup', appDestination).href);
    else await expect(createAccount).toHaveCount(0);
    const journey = page.getByRole('region', { name: 'From a free check to a useful history' });
    await expect(journey.getByRole('listitem')).toHaveCount(3);
    await expect(journey).toContainText('Create your workspace');
    await expect(journey).not.toContainText('Request workspace access');
    await expect(journey).toContainText('Checks run only when you request them.');
    if (appDestination) await expect(page.getByRole('link', { name: 'Open workspace →', exact: true })).toHaveAttribute('href', appDestination);
    else await expect(page.getByRole('link', { name: 'Open workspace →', exact: true })).toHaveCount(0);
    const review = page.getByRole('region', { name: 'Need help deciding what to fix?' });
    await expect(review).toContainText(EXTERNAL_ATTACK_SURFACE_OFFER.price.en);
    await expect(review.getByRole('link', { name: 'See the review scope →', exact: true })).toHaveAttribute('href', EXTERNAL_ATTACK_SURFACE_OFFER.route.en);
    const choices=page.getByRole('region',{name:'Choose what to check'});
    for(const name of ['External Exposure Check','One Server Security Check'])await expect(choices.getByRole('heading',{name,exact:true})).toBeVisible();
    await expect(choices).toContainText('setup is operator-assisted');
    await expect(choices.getByRole('link',{name:'Ask about Linux setup →',exact:true})).toHaveAttribute('href',publicContactMailto('WitnessOps — One Server Security Check setup'));
    await expect(choices.getByRole('link',{name:'Try the free snapshot →',exact:true})).toHaveAttribute('href','/check');
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
  await expect(page.getByRole('region', { name: 'Save a persistent baseline' })).toHaveCount(0);
});
