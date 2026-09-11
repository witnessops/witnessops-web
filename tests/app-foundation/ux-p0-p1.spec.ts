import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { RECOMMENDED_PROFILE } from '../../apps/witnessops-app/src/lib/model';
import { canonicalSource } from '../../apps/witnessops-app/src/lib/source-digest';

for (const width of [1440, 390]) test(`P0/P1 product copy and report outcomes ${width}`, async ({ page }, info) => {
  const snapshot = JSON.parse(readFileSync(resolve('tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json'), 'utf8'));
  const run = { id: 'ee-run', assetId: 'ee-asset', createdAt: snapshot.finished_at, profile: RECOMMENDED_PROFILE, snapshot, sourceDigest: createHash('sha256').update(canonicalSource(snapshot)).digest('hex') };
  const ws = { id: 'ws', name: 'Mixed workspace', slug: 'mixed', role: 'owner', members: [], assets: [
    { id: 'ee-asset', hostname: snapshot.target, type: 'hostname', createdAt: run.createdAt },
    { id: 'linux-asset', hostname: 'server-01', type: 'linux_server', createdAt: run.createdAt },
  ], runs: [run], linuxRuns: [] };
  await page.route('**/api/**', route => {
    const req = route.request();
    if (new URL(req.url()).pathname === '/api/events' && req.method() === 'POST') {
      expect(req.postDataJSON().name).toBe('report_opened');
      return route.fulfill({ json: { recorded: true } });
    }
    expect(req.method()).toBe('GET'); // No creation, import or collection.
    return route.fulfill({ json: new URL(req.url()).pathname === '/api/workspace'
      ? { user: { id: 'owner', displayName: 'Owner' }, workspaces: [ws], workspace: ws } : [] });
  });
  await page.setViewportSize({ width, height: 1000 });
  const capture = async (name: string) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(name + '.png'), fullPage: true });
  };
  await page.goto('/');
  await expect(page.locator('.overview-stats')).toContainText('External Exposure needing attention');
  await expect(page.locator('.overview-stats dt')).not.toHaveText(['Assets', 'Need attention', 'Environment changes', 'Coverage changes']);
  await expect(page.locator('.overview-stats').getByText('External Exposure assets', { exact: true }).locator('..')).toContainText('1');
  await expect(page.getByText('server-01', { exact: true })).toBeVisible();
  await capture('overview');
  await page.goto('/assets/new');
  await expect(page.locator('main')).toContainText('Start with a public domain or hostname you are authorized to observe.');
  await expect(page.getByLabel('Public hostname', { exact: true })).toHaveAttribute('placeholder', 'example.com');
  await expect(page.locator('.check-list li')).toHaveCount(10);
  await capture('ee-add');
  await page.getByLabel('Asset type').selectOption('linux_server');
  await expect(page.locator('main')).not.toContainText('public domain');
  await expect(page.locator('main')).not.toContainText('No URL path, port or IP address');
  await expect(page.locator('main')).not.toContainText('authorize collection separately');
  await expect(page.getByLabel('Recorded Linux hostname')).toHaveAttribute('placeholder', 'ip-172-26-9-158');
  await expect(page.locator('main')).toContainText('does not run a network scan');
  await capture('linux-add');
  await page.goto('/settings');
  await expect(page.locator('main')).toContainText('External Exposure source snapshots are unsigned');
  await expect(page.locator('main')).toContainText('signed receipt and detached ZIP signature');
  await expect(page.locator('main')).toContainText('not establish host security or source-system truth');
  await expect(page.locator('main')).not.toContainText('Reports and sources are unsigned');
  await capture('settings');
  await page.goto('/assets/linux-asset');
  await expect(page.getByRole('heading', { name: 'How to get a server check' })).toBeVisible();
  await expect(page.locator('main')).toContainText('operator-assisted');
  await expect(page.getByRole('link', { name: 'Contact WitnessOps for setup help →' })).toHaveAttribute('href', /^mailto:engage@mail.witnessops.com/);
  const guidance = await page.getByRole('heading', { name: 'How to get a server check' }).boundingBox();
  const upload = await page.getByLabel('Original Proofpack ZIP').boundingBox();
  expect(guidance!.y).toBeLessThan(upload!.y);
  await capture('linux-import');
  await page.goto('/reports/ee-run');
  await expect(page.locator('main').getByText('Checks with collected evidence', { exact: true })).toBeVisible();
  await expect(page.locator('main').getByLabel('Data validation and check summary')).toContainText('determined outcomes');
  await expect(page.locator('main').getByRole('group', { name: 'Check outcomes' })).toContainText('Informational');
  await expect(page.locator('main').getByRole('group', { name: 'Check outcomes' })).toContainText('Undetermined');
  await capture('ee-report');
});
