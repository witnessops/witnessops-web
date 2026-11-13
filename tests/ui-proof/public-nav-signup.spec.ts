import { expect, test } from '@playwright/test';
import { getWorkspaceAppUrl } from '../../apps/witnessops-web/src/lib/workspace-access';

const appUrl = getWorkspaceAppUrl();
const login = appUrl ? new URL('/login', appUrl).href : null;

for (const width of [390, 1440]) {
  test(`public navigation keeps the request, login and Docs reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });
    const nav = page.getByRole('navigation', { name: 'Primary navigation', exact: true });
    if (width < 1024) await nav.getByRole('button', { name: 'Open primary navigation' }).click();
    const account = width < 1024 ? nav.locator('[data-mobile-account-actions]') : nav;
    const cta = account.getByRole('link', { name: 'Request a break test', exact: true }).filter({ visible: true });
    await expect(cta).toHaveCount(1);
    await expect(cta).toHaveAttribute('href', '/review/request');
    await expect(cta).toBeInViewport();
    const loginLink = account.getByRole('link', { name: 'Log in', exact: true }).filter({ visible: true });
    if (login) await expect(loginLink).toHaveAttribute('href', login);
    else await expect(loginLink).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Docs', exact: true }).filter({ visible: true })).toHaveAttribute('href', '/docs');
    await expect(nav.getByRole('link', { name: 'Sign up', exact: true })).toHaveCount(0);
    for (const href of ['/pricing', '/check', '/early-access', '/about']) {
      await expect(nav.locator(`a[href="${href}"]`)).toHaveCount(0);
    }
    const scope = width < 1024 ? nav.locator('#witnessops-mobile-menu') : nav;
    await scope.getByRole('button', { name: 'The review', exact: true }).click();
    await scope.getByRole('link', { name: /^Examples/ }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/review\/sample-cases$/);
  });
}
