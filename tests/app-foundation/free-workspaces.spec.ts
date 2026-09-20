import { test, expect } from '@playwright/test';
import type { Workspace } from '../../apps/witnessops-app/src/lib/model';

for (const width of [1440, 390]) test(`free workspace creation, recovery and account-scoped selection at ${width}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  const workspaces: Workspace[] = [];
  let account = 'free-owner', fail = true;
  const requests: Array<{ name: string; requestId: string }> = [];
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === '/api/feedback') return route.fulfill({ json: [] });
    expect(path).toBe('/api/workspace');
    if (request.method() === 'POST') {
      const input = request.postDataJSON(); requests.push(input);
      if (fail) { fail = false; return route.fulfill({ status: 503, json: { error: 'Temporary failure. Try again.' } }); }
      const workspace: Workspace = { id: input.requestId, name: input.name, slug: input.requestId, role: 'owner', assets: [], runs: [], members: [] };
      workspaces.push(workspace);
      return route.fulfill({ status: 201, json: { user: { id: account, displayName: 'Owner' }, workspaces, workspace } });
    }
    const selected = request.headers()['x-witnessops-workspace'];
    if (account !== 'free-owner') {
      expect(selected).toBeUndefined();
      return route.fulfill({ json: { user: { id: account, displayName: 'Other' }, workspaces: [], workspace: null } });
    }
    const workspace = selected ? workspaces.find(item => item.id === selected) : workspaces.length === 1 ? workspaces[0] : null;
    return route.fulfill({ json: { user: { id: account, displayName: 'Owner' }, workspaces, workspace } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Create workspace', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Request workspace access', exact: true })).toHaveCount(0);
  await page.getByLabel('Workspace name', { exact: true }).fill('First workspace');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('Temporary failure');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'First workspace', exact: true })).toBeVisible();
  expect(requests[0]).toEqual(requests[1]);
  await page.getByRole('button', { name: 'New workspace', exact: true }).click();
  await page.getByLabel('Workspace name', { exact: true }).fill('Second workspace');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Second workspace', exact: true })).toBeVisible();
  expect(requests[2].requestId).not.toBe(requests[1].requestId);
  await page.getByLabel('Active workspace').selectOption(workspaces[0].id);
  await expect(page.getByRole('heading', { name: 'First workspace', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'First workspace', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: info.outputPath(`free-workspaces-${width}.png`), fullPage: true });
  account = 'other-account';
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Create workspace', exact: true })).toBeVisible();
});

for (const outcome of ['revoked', 'paused'] as const) test(`remembered workspace ${outcome} during restoration`, async ({ page }) => {
  const workspace: Workspace = { id: 'remembered', name: 'Removed workspace', slug: 'remembered', role: 'owner', assets: [], runs: [], members: [] };
  await page.addInitScript(() => localStorage.setItem('witnessops.workspace.free-owner', 'remembered'));
  let reads = 0;
  await page.route('**/api/**', async route => {
    expect(new URL(route.request().url()).pathname).toBe('/api/workspace');
    const selected = route.request().headers()['x-witnessops-workspace'];
    if (selected) {
      expect(selected).toBe('remembered');
      return route.fulfill(outcome === 'revoked'
        ? { status: 404, json: { error: 'Workspace not found.' } }
        : { status: 403, json: { error: 'Workspace access is paused.', code: 'EARLY_ACCESS_REQUIRED', accessState: 'paused' } });
    }
    reads++;
    return route.fulfill({ json: { user: { id: 'free-owner', displayName: 'Owner' }, workspaces: reads === 1 ? [workspace] : [], workspace: null } });
  });
  await page.goto('/');
  if (outcome === 'revoked') {
    await expect(page.getByRole('heading', { name: 'Create workspace', exact: true })).toBeVisible();
    expect(reads).toBe(2);
    expect(await page.evaluate(() => localStorage.getItem('witnessops.workspace.free-owner'))).toBeNull();
  } else {
    await expect(page.getByRole('heading', { name: /paused/i })).toBeVisible();
    expect(reads).toBe(1);
    await expect(page.getByRole('button', { name: 'Create workspace', exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole('heading', { name: 'Removed workspace', exact: true })).toHaveCount(0);
});
