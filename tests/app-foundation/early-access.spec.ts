import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { canonicalSource } from '../../apps/witnessops-app/src/lib/source-digest';
import { RECOMMENDED_PROFILE, type Workspace, type Run, type ExternalSnapshotV1 } from '../../apps/witnessops-app/src/lib/model';

const source = JSON.parse(readFileSync(resolve('tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json'), 'utf8')) as ExternalSnapshotV1;
const runs: Run[] = [1,2].map(n => ({ id: `run-${n}`, assetId: 'asset', createdAt: `2026-09-11T12:0${n}:00.000Z`, profile: structuredClone(RECOMMENDED_PROFILE), snapshot: structuredClone(source), sourceDigest: createHash('sha256').update(canonicalSource(source)).digest('hex') }));
const workspace: Workspace = { id: 'workspace', name: 'Acme Early Access', slug: 'workspace', role: 'owner', assets: [{ id: 'asset', type: 'hostname', hostname: source.target, createdAt: runs[0].createdAt }], runs, members: [] };
async function cohort(page: Page, fail = false) {
  const decisions: Array<{ surface: string; runId: string }> = [], feedback: unknown[] = [], events: Array<{ name: string; runId: string; checkId: string | null }> = [], unexpected: string[] = [];
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/workspace' && route.request().method() === 'GET') return route.fulfill({ json: { user: { id: 'owner', displayName: 'Owner' }, workspaces: [workspace], workspace } });
    if (path === '/api/feedback') {
      if (route.request().method() === 'GET') return route.fulfill({ json: decisions });
      feedback.push(route.request().postDataJSON());
      if (fail) return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
      const { surface, runId } = route.request().postDataJSON(); decisions.push({ surface, runId });
      return route.fulfill({ status: 201, json: { surface, runId } });
    }
    if (path === '/api/events' && route.request().method() === 'POST') {
      const event = route.request().postDataJSON();
      expect(Object.keys(event).sort()).toEqual(['checkId', 'name', 'runId']);
      expect(JSON.stringify(event)).not.toContain(source.target);
      events.push(event);
      return route.fulfill({ status: fail ? 503 : 200, json: { recorded: !fail } });
    }
    unexpected.push(path); return route.abort();
  });
  return { decisions, feedback, events, unexpected };
}

for (const width of [1440, 390]) {
  test(`Early Access feedback is contextual, durable and secondary at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const fixture = await cohort(page);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('.early-access-pill')).toBeVisible();
    await expect(page.getByRole('heading', { name: workspace.name })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`overview-${width}.png`) });
    await page.goto('/runs/run-1');
    const feedback = page.getByRole('complementary', { name: 'First observation feedback' });
    await expect(page.getByRole('region', { name: 'Observation summary' })).toBeVisible();
    await expect(feedback).toBeVisible();
    await expect(page.locator('.observations > li')).toHaveCount(10);
    for (const radio of await feedback.getByRole('radio').all()) {
      const box = await radio.boundingBox();
      expect(box!.width).toBeLessThanOrEqual(20);
      expect(box!.height).toBeLessThanOrEqual(20);
      expect(await radio.evaluate(node => node.closest('label')!.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    }
    await feedback.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`first-feedback-${width}.png`) });
    await feedback.getByLabel('Yes', { exact: true }).check();
    await feedback.getByLabel('What was useful or missing?', { exact: false }).fill('The evidence explained the result.');
    await feedback.getByRole('button', { name: 'Send feedback' }).click();
    await expect(feedback).toHaveCount(0);
    expect(fixture.feedback).toHaveLength(1);
    expect(fixture.decisions).toEqual([{ surface: 'first_run', runId: 'run-1' }]);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Recorded result' })).toBeVisible();
    await expect(feedback).toHaveCount(0);
    await page.goto('/runs/run-2');
    const comparison = page.getByRole('complementary', { name: 'Comparison feedback' });
    await comparison.scrollIntoViewIfNeeded();
    await expect(page.getByText('No change in comparable target observations.')).toBeVisible();
    await comparison.getByLabel('Not really', { exact: true }).check();
    await comparison.getByLabel('What would you want WitnessOps to check next?', { exact: false }).fill('More clarity about mail policy.');
    await page.screenshot({ path: info.outputPath(`comparison-feedback-${width}.png`) });
    await comparison.getByRole('button', { name: 'Send feedback' }).click();
    await expect(comparison).toHaveCount(0);
    expect(fixture.feedback).toHaveLength(2);
    await expect.poll(() => fixture.events.some(e => e.name === 'comparison_viewed' && e.runId === 'run-2')).toBe(true);
    // Ordinary re-renders (menu, feedback controls) must not emit another view.
    expect(fixture.events.filter(e => e.name === 'observation_opened' && e.runId === 'run-2')).toHaveLength(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(fixture.unexpected).toEqual([]); expect(errors).toEqual([]);
  });
}

test('feedback and telemetry failure do not block evidence, report or dismissal', async ({ page }) => {
  const fixture = await cohort(page, true);
  await page.goto('/runs/run-1');
  const feedback = page.getByRole('complementary', { name: 'First observation feedback' });
  await feedback.getByLabel('Yes', { exact: true }).check();
  await feedback.getByRole('button', { name: 'Send feedback' }).click();
  await expect(feedback.getByRole('status')).toContainText('You can continue');
  await feedback.getByRole('button', { name: 'Not now', exact: true }).click();
  await expect(feedback).toHaveCount(0);
  await page.getByRole('link', { name: 'View report', exact: true }).click();
  await expect(page.locator('main article')).toContainText(runs[0].sourceDigest);
  expect(fixture.unexpected).toEqual([]);
});

test('dismissed feedback remains dismissed after a page reload', async ({ page }) => {
  const fixture = await cohort(page);
  await page.goto('/runs/run-1');
  const feedback = page.getByRole('complementary', { name: 'First observation feedback' });
  await feedback.getByRole('button', { name: 'Not now', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Recorded result' })).toBeVisible();
  await expect(feedback).toHaveCount(0);
  expect(fixture.feedback).toEqual([{ surface: 'first_run', runId: 'run-1', response: 'dismissed', comment: null }]);
});

for (const access of ['invited', 'paused', null] as const) {
  test(`cohort access screen ${access ?? 'not enrolled'} denies product UI and requires explicit activation`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let activated = false, activations = 0;
    const other: string[] = [];
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/workspace') return route.fulfill(activated ? { json: { user: { id: 'owner' }, workspaces: [], workspace: null } } : { status: 403, json: { code: 'EARLY_ACCESS_REQUIRED', accessState: access, error: 'Early Access required' } });
      if (path === '/api/early-access' && access === 'invited') { expect(route.request().postDataJSON()).toEqual({ action: 'activate' }); activated = true; activations++; return route.fulfill({ json: { state: 'active' } }); }
      other.push(path); return route.abort();
    });
    await page.goto('/runs/known-run');
    await expect(page.getByRole('heading', { name: access === 'invited' ? 'Your workspace access is ready' : access === 'paused' ? 'Workspace access is paused' : 'Request workspace access' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Run a free check', exact: true })).toHaveAttribute('href', 'https://witnessops.com/check');
    await expect(page.locator('.run-control, .observations')).toHaveCount(0);
    expect(activations).toBe(0);
    await page.screenshot({ path: info.outputPath(`access-${access ?? 'none'}-390.png`), fullPage: true });
    if (access === 'invited') { await page.getByRole('button', { name: 'Activate workspace access' }).click(); await expect(page.getByRole('heading', { name: 'Create workspace' })).toBeVisible(); expect(activations).toBe(1); }
    else await expect(page.getByRole('button', { name: 'Activate workspace access' })).toHaveCount(0);
    expect(other).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}
