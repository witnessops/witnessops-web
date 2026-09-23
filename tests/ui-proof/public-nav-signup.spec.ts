import { expect, test } from '@playwright/test';

import { getWorkspaceAppUrl } from '../../apps/witnessops-web/src/lib/workspace-access';

const signup = getWorkspaceAppUrl('/signup');
const routes = ['/', '/pricing', '/catalog', '/check', '/early-access', '/docs', '/library', '/research', '/verify', '/support', '/review/request', '/catalog/workflows'];
for (const width of [390, 1440]) {
  test(`public signup stays outlined across the shell at ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      const nav = page.getByRole('navigation', { name: 'Primary navigation', exact: true });
      if (width === 390) await nav.getByRole('button', { name: 'Open primary navigation' }).click();
      if (!signup) {
        await expect(nav.getByRole('link', { name: 'Sign up', exact: true })).toHaveCount(0);
        await expect(nav.locator('[data-public-primary-cta]')).toHaveCount(0);
        continue;
      }
      const cta = nav.getByRole('link', { name: 'Sign up', exact: true }).filter({ visible: true });
      await expect(cta).toHaveCount(1);
      await expect(cta).toHaveAttribute('href', signup);
      await expect(cta).toBeInViewport();
      const style = await cta.evaluate(el => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, border: s.borderTopWidth, height: el.getBoundingClientRect().height };
      });
      expect(style.background).toBe('rgba(0, 0, 0, 0)');
      expect(parseFloat(style.border)).toBeGreaterThanOrEqual(1);
      expect(style.height).toBeGreaterThanOrEqual(44);
      if (route === '/') {
        await page.screenshot({ path: testInfo.outputPath(`nav-${width}.png`) });
        if (width === 390) await page.keyboard.press('Escape');
        const hero = page.getByRole('link', { name: 'Scope an agent review', exact: true }).first();
        await expect(hero).toBeVisible();
        expect(await hero.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
        await expect(page.locator('main').getByRole('link', { name: 'Start a free check', exact: true })).toHaveAttribute('href', '/check');
      }
    }
    // Route the configured destination locally: test navigation, never an actual signup.
    if (signup) {
    await page.context().route(signup, route => route.fulfill({ contentType: 'text/html', body: '<h1>Signup destination fixture</h1>' }));
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('navigation', { name: 'Primary navigation', exact: true }).getByRole('link', { name: 'Sign up', exact: true }).filter({ visible: true }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    expect(popup.url()).toBe(signup);
    await popup.close();
    }
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Primary navigation', exact: true });
    if (width === 390) await nav.getByRole('button', { name: 'Open primary navigation' }).click();
    await nav.getByRole('button', { name: 'Resources', exact: true }).click();
    await expect(nav.locator('a[href="/library"]:visible')).toHaveAttribute('href', '/library');
    await nav.getByRole('button', { name: 'Expert help', exact: true }).click();
    await nav.locator('a[href="/catalog"]:visible').click();
    await expect(page).toHaveURL(/\/catalog$/);
  });
}
