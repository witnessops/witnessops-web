import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createBundle } from '../proofpack/create-bundle';
import { verifyProofpack } from '../../apps/witnessops-web/src/lib/proofpack/verify.mjs';
import { LOCAL_AUDIT_TRUST, pinnedRegistryInput } from '../../apps/witnessops-web/src/lib/proofpack/pinned-registry';
import { execFileSync } from 'node:child_process';
const fixtures = resolve('tests/proofpack/fixtures');
const productionFixtures = resolve('tests/proofpack/production-fixtures');
const output = resolve(process.env.PROOFPACK_ARTIFACT_DIR ?? '/tmp/witnessops-bundle-browser');
const localFontPaths = new Set([
    '/fonts/inter-400.woff2', '/fonts/inter-500.woff2', '/fonts/inter-600.woff2',
    '/fonts/ibm-plex-mono-300.woff2', '/fonts/ibm-plex-mono-400.woff2', '/fonts/ibm-plex-mono-500.woff2',
]);
async function expectReportTypography(page: Page) {
    const report = page.getByRole('article', { name: 'Derived buyer report' });
    // fonts.ready/check alone succeed when no font faces exist. Require the
    // actual local faces to load as well as the inherited application stack.
    const faces = await page.evaluate(async () => {
        const loaded = await Promise.all([400, 500, 600].map(weight => document.fonts.load(`${weight} 15px "Inter"`, 'Report findings')));
        await document.fonts.ready;
        return { status: document.fonts.status, weights: loaded.map(fonts => fonts.map(font => ({ family: font.family, status: font.status }))) };
    });
    expect(faces.status).toBe('loaded');
    for (const weight of faces.weights) {
        expect(weight.length).toBeGreaterThan(0);
        expect(weight.every(font => font.family.replaceAll('"', '') === 'Inter' && font.status === 'loaded')).toBe(true);
    }
    const families = await report.locator('h1, [class*="coverTitle"], [class*="lead"], [class*="finding"] > h3').evaluateAll(elements => elements.map(element => getComputedStyle(element).fontFamily));
    expect(families.length).toBeGreaterThan(2);
    for (const family of families) expect(family.replaceAll('"', '')).toBe('Inter, system-ui, -apple-system, sans-serif');
    await expect(report.locator('[class*="chapterFooter"]').first()).toHaveCSS('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');
}
function bundleFixture(name: string) {
    const dir = resolve(['complete', 'adverse', 'partial'].includes(name) ? productionFixtures : fixtures, name);
    const filename = readdirSync(dir).find(n => n.endsWith('.zip'))!;
    const raw = { proofpack: { name: filename, bytes: readFileSync(resolve(dir, filename)) }, signature: { name: `${filename}.sig.json`, bytes: readFileSync(resolve(dir, `${filename}.sig.json`)) }, trust_registry: pinnedRegistryInput() };
    return { raw, file: { name: `${name}.proofpack`, mimeType: 'application/octet-stream', buffer: Buffer.from(createBundle(raw.proofpack.bytes, raw.signature.bytes)) } };
}
for (const name of ['complete', 'adverse', 'partial', 'tampered', 'wrong-registry'])
    test(`browser parity and local privacy: ${name}`, async ({ page, browserName }) => {
        const dir = resolve(fixtures, name), { raw, file: bundle } = bundleFixture(name), expected = await verifyProofpack(raw);
        const runtimeErrors: string[] = [];
        page.on('pageerror', error => runtimeErrors.push(error.message));
        await page.goto('/proofpack');
        await expect(page.getByRole('heading', { name: 'Open your proofpack.' })).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Primary navigation', exact: true })).toBeVisible();
        await expect(page.locator('#site-footer')).toBeVisible();
        expect(await page.locator('script[src*="witnessops-manual"]').count()).toBe(0);
        await expect(page.getByRole('button', { name: 'Ask WitnessOps' })).toHaveCount(0);
        const requests: {
            url: string;
            method: string;
        }[] = [];
        page.on('request', r => requests.push({ url: r.url(), method: r.method() }));
        await page.getByLabel('Proofpack file', { exact: true }).setInputFiles(bundle);
        await page.getByRole('button', { name: 'Verify locally', exact: true }).click();
        if (expected.status === 'valid') {
            await expect(page.getByRole('heading', { name: 'demo-host', exact: true }).first()).toBeVisible();
            await expect(page.getByText('Synthetic fixture · not customer evidence')).toBeVisible();
            const coverage = JSON.parse(readFileSync(resolve(dir, 'collection-completeness.json'), 'utf8'));
            const scope = JSON.parse(readFileSync(resolve(dir, 'scope.json'), 'utf8'));
            const completed = coverage.section_results.filter((s: { complete: boolean }) => s.complete).length;
            const gaps = coverage.section_results.filter((s: { complete: boolean }) => !s.complete);
            await expect(page.getByRole('region', { name: 'Audit summary' })).toContainText(`${completed} / ${coverage.section_results.length} complete`);
            await expect(page.getByRole('region', { name: 'Audit summary' })).toContainText('Owner decisionNot recorded');
            await expect(page.getByRole('button', { name: 'View report', exact: true })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Export buyer PDF', exact: true })).toHaveCount(1);
            const scopeToggle = page.getByRole('tabpanel').getByText('Scope from checked authority', { exact: true });
            await scopeToggle.click();
            expect(JSON.parse((await scopeToggle.locator('..').locator('pre').textContent())!)).toEqual(scope);
            for (const gap of gaps)
                await expect(page.getByRole('tabpanel').getByText(`${gap.section.replaceAll('_', ' ')}: incomplete`, { exact: true })).toBeVisible();
            if (!gaps.length)
                await expect(page.getByRole('tabpanel').getByText('No required collection gaps were recorded.')).toBeVisible();
            const findings = JSON.parse(readFileSync(resolve(dir, 'findings.json'), 'utf8')).findings;
            await page.getByRole('tab', { name: 'Summary', exact: true }).focus();
        await page.keyboard.press('ArrowRight');
        await expect(page.getByRole('tab', { name: 'Findings', exact: true })).toHaveAttribute('aria-selected', 'true');
            for (const f of findings)
                await expect(page.getByRole('tabpanel').getByRole('heading', { name: f.title, exact: true })).toBeVisible();
            await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
            await expect(page.getByRole('tabpanel').getByText('Signer', { exact: false }).first()).toBeVisible();
            for (const section of coverage.section_results)
                await expect(page.getByRole('tabpanel').locator('summary').filter({ hasText: new RegExp(`^${section.section.replaceAll('_', ' ')}\\s*${section.complete ? 'Complete' : 'Incomplete'}$`) })).toBeVisible();
            await page.getByRole('tab', { name: 'Report', exact: true }).click();
            await expect(page.getByRole('button', { name: 'View report', exact: true })).toHaveCount(0);
            await expect(page.getByRole('button', { name: 'Export buyer PDF', exact: true })).toHaveCount(1);
            await expectReportTypography(page);
            const downloadPromise = page.waitForEvent('download');
            await page.getByRole('button', { name: 'Download verification results', exact: true }).click();
            const downloaded = await downloadPromise;
            const file = await downloaded.path();
            const actual = JSON.parse(readFileSync(file!, 'utf8'));
            for (const field of ['status', 'outcome', 'proof_run_id', 'workflow_class', 'failure_states', 'verification_inputs'])
                expect(actual[field]).toEqual(expected[field]);
            expect(Object.fromEntries(Object.entries(actual.checks).map(([k, v]) => [k, (v as {
                    status: string;
                }).status]))).toEqual(Object.fromEntries(Object.entries(expected.checks).map(([k, v]) => [k, (v as {
                    status: string;
                }).status])));
            const previewHtml = await page.getByRole('article', { name: 'Derived buyer report' }).innerHTML();
            await page.evaluate(() => { window.print = () => { document.documentElement.dataset.printRequested = 'true'; }; });
            await page.getByRole('button', { name: 'Export buyer PDF', exact: true }).click();
            await expect(page.locator('html')).toHaveAttribute('data-print-requested', 'true');
            await page.emulateMedia({ media: 'print' });
            await expect(page.locator('nav[aria-label="Primary navigation"]')).not.toBeVisible();
            await expect(page.locator('#site-footer')).not.toBeVisible();
            await expectReportTypography(page);
            const printed = page.getByRole('article', { name: 'Derived buyer report' });
            expect(await printed.innerHTML()).toBe(previewHtml);
            expect(await printed.locator('[class*="chapterFooter"]').evaluateAll(elements =>
                elements.map(element => getComputedStyle(element).display !== 'none'))).toEqual([true, false, false, false, false]);
            await expect(printed.getByRole('heading', { name: 'Verification appendix', exact: true })).toBeVisible();
            const logos = printed.locator('.witnessops-mark--geometric svg');
            await expect(logos).toHaveCount(5);
            await expect(logos.first()).toHaveAttribute('viewBox', '0 0 746 427');
            await expect(logos.first().locator('g')).toHaveAttribute('fill', '#FFFFFF');
            await expect(logos.nth(1).locator('g')).toHaveAttribute('fill', '#0B0D10');
            const summary = printed.getByRole('region', { name: 'Priority findings' });
            const severityOrder = ['critical', 'high', 'medium', 'low', 'informational'];
            const priorities = [...findings].sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)).slice(0, 3);
            await expect(summary.locator('li')).toHaveCount(priorities.length);
            for (const [index, finding] of priorities.entries())
                await expect(summary.locator('li').nth(index)).toContainText(finding.title);
            const nextAction = printed.getByRole('region', { name: 'Suggested next action' });
            if (priorities.length) await expect(nextAction).toContainText(priorities[0].recommendation);
            await expect(nextAction).toContainText('No remediation is established here.');
            const summaryGaps = printed.getByRole('region', { name: 'Summary collection gaps' });
            for (const gap of gaps) await expect(summaryGaps).toContainText(gap.section.replaceAll('_', ' '));
            if (!gaps.length) await expect(summaryGaps).toContainText('No collection gaps were recorded.');
            await expect(printed).toContainText(`Collection: ${completed} / ${coverage.section_results.length} complete`);
            await expect(printed).toContainText('This report is a derived presentation of the source evidence.');
            await expect(printed).toContainText('The enclosed Local Audit package was checked against its detached signature and the production registry pinned by this verifier.');
            await expect(printed).toContainText('This derived report is not covered by the detached signature on the enclosed Local Audit package.');
            for (const gap of gaps)
                await expect(printed).toContainText(`${gap.section.replaceAll('_', ' ')}: incomplete.`);
            expect(JSON.parse((await printed.getByRole('heading', { name: 'Scope from checked authority' }).locator('+ pre').textContent())!)).toEqual(scope);
            for (const finding of findings)
                await expect(printed.getByRole('heading', { name: finding.title, exact: true })).toBeVisible();
            if (browserName === 'chromium') {
                mkdirSync(output, { recursive: true });
                await page.pdf({ path: `${output}/buyer-report-${name}.pdf`, format: 'A4', printBackground: true });
            }
            await page.emulateMedia({ media: 'screen' });
            if (name === 'adverse') {
                mkdirSync(output, { recursive: true });
                await page.emulateMedia({ media: 'print' });
                await expect(page.getByRole('heading', { name: 'Derived buyer report', exact: true })).toBeVisible();
                if (browserName === 'chromium') await page.pdf({ path: `${output}/buyer-report.pdf`, format: 'A4', printBackground: true });
                await page.emulateMedia({ media: 'screen' });
                for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
                    await page.setViewportSize(viewport);
                    await page.getByRole('tab', { name: 'Report', exact: true }).click();
                    await expect(page.getByRole('article', { name: 'Derived buyer report' })).toBeVisible();
                    await page.screenshot({ path: `${output}/report-${viewport.width}.png`, fullPage: true });
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > window.innerWidth).slice(0, 12).map(e => ({ tag: e.tagName, className: e.className, right: e.getBoundingClientRect().right, text: e.textContent?.slice(0, 70) }))))).toBe(true);
                    await page.getByRole('tab', { name: 'Summary', exact: true }).click();
                    await page.screenshot({ path: `${output}/summary-${viewport.width}.png`, fullPage: true });
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > window.innerWidth).slice(0, 12).map(e => ({ tag: e.tagName, className: e.className, right: e.getBoundingClientRect().right, text: e.textContent?.slice(0, 70) }))))).toBe(true);
                }
            }
            await page.getByRole('button', { name: 'Clear', exact: true }).click();
            await expect(page.getByRole('heading', { name: 'Open your proofpack.' })).toBeVisible();
            await expect(page.getByRole('tablist')).toHaveCount(0);
        }
        else {
            await expect(page.getByRole('heading', { name: 'Package checks did not pass', exact: true })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Export buyer PDF' })).toHaveCount(0);
            const downloadPromise = page.waitForEvent('download');
            await page.getByRole('button', { name: 'Download diagnostics', exact: true }).click();
            const downloaded = await downloadPromise;
            const actual = JSON.parse(readFileSync((await downloaded.path())!, 'utf8'));
            for (const field of ['status', 'outcome', 'failure_states', 'verification_inputs'])
                expect(actual[field]).toEqual(expected[field]);
            expect(Object.fromEntries(Object.entries(actual.checks).map(([key, check]) => [key, (check as { status: string }).status])))
                .toEqual(Object.fromEntries(Object.entries(expected.checks).map(([key, check]) => [key, (check as { status: string }).status])));
        }
        expect(requests.every(r => {
            const url = new URL(r.url);
            const localDownload = url.protocol === 'blob:' && url.origin === new URL(page.url()).origin;
            const staticAsset = url.protocol === 'http:' && url.origin === new URL(page.url()).origin && (url.pathname.startsWith('/_next/static/') || localFontPaths.has(url.pathname));
            return r.method === 'GET' && !url.search && (localDownload || staticAsset);
        }), JSON.stringify(requests)).toBe(true);
        expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
        expect(runtimeErrors).toEqual([]);
        mkdirSync(output, { recursive: true });
        writeFileSync(resolve(output, `${browserName}-${name}-network.json`), JSON.stringify({ requests, runtimeErrors }, null, 2));
    });
test('one-file intake shows independent trust and rejects stale reports on valid-invalid-valid transitions', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/proofpack');
    await expect(page.getByRole('navigation', { name: 'Primary navigation', exact: true })).toBeVisible();
    await expect(page.locator('#site-footer')).toBeVisible();
    expect(await page.evaluate(async () => {
        const inter = await document.fonts.load('400 16px Inter');
        await document.fonts.ready;
        return inter.length > 0 && inter.every(font => font.family.replaceAll('"', '') === 'Inter' && font.status === 'loaded')
            && getComputedStyle(document.querySelector('main h1')!).fontFamily.includes('Inter');
    })).toBe(true);
    const menu = page.getByRole('button', { name: 'Open primary navigation', exact: true });
    await menu.click();
    await expect(page.getByRole('link', { name: 'Services', exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
    await expect(page.locator('input[type=file]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Verify locally', exact: true })).toBeDisabled();
    await expect(page.getByRole('tab', { name: 'Report', exact: true })).toHaveCount(0);
    await expect(page.getByText(`${LOCAL_AUDIT_TRUST.name} · v1`, { exact: true })).toBeVisible();
    await expect(page.getByText(`sha256:${LOCAL_AUDIT_TRUST.sha256.slice(0, 16)}…`, { exact: true })).toBeVisible();
    await expect(page.getByText(`sha256:${LOCAL_AUDIT_TRUST.sha256}`, { exact: true })).not.toBeVisible();
    await page.getByText('Verification details', { exact: true }).click();
    await expect(page.getByText(`sha256:${LOCAL_AUDIT_TRUST.sha256}`, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const chooser = page.getByLabel('Proofpack file', { exact: true });
    const valid = bundleFixture('complete').file;
    await chooser.setInputFiles(valid);
    await page.getByRole('button', { name: 'Verify locally', exact: true }).click();
    await page.getByRole('button', { name: 'View report', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Report', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('article', { name: 'Derived buyer report' })).toBeVisible();
    const { raw } = bundleFixture('complete');
    const signature = JSON.parse(raw.signature.bytes.toString()); signature.signature = '0'.repeat(128);
    const invalid = { name: 'invalid-signature.proofpack', mimeType: 'application/octet-stream', buffer: Buffer.from(createBundle(raw.proofpack.bytes, Buffer.from(JSON.stringify(signature)))) };
    await chooser.setInputFiles(invalid);
    await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Export buyer PDF' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Verify locally', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Package checks did not pass' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
    await chooser.setInputFiles({ name: 'malformed.proofpack', mimeType: 'application/octet-stream', buffer: Buffer.from('not an archive') });
    await expect(page.getByRole('heading', { name: 'Package checks did not pass' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Verify locally', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Malformed Proofpack archive');
    await chooser.setInputFiles(valid);
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'Verify locally', exact: true }).click();
    await page.getByRole('tab', { name: 'Report', exact: true }).click();
    await expect(page.getByRole('article', { name: 'Derived buyer report' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByRole('article', { name: 'Derived buyer report' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Verify locally', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Choose Proofpack', exact: true }).focus();
    const nextControl = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    await page.keyboard.press(nextControl);
    await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeFocused();
    await page.keyboard.press(nextControl);
    await expect(page.getByText('Verification details', { exact: true })).toBeFocused();
});

for (const name of ['complete', 'synthetic']) test(`Adapter independence through actual report CSS and PDF: ${name}`, async ({ page, browserName }) => {
    const html = execFileSync(process.execPath, ['--import', 'tsx', 'apps/witnessops-web/src/lib/proofpack/test-support/render-fixture.tsx', name], {
        encoding: 'utf8', env: { ...process.env, TSX_TSCONFIG_PATH: resolve('apps/witnessops-web/tsconfig.test.json') },
    });
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.setContent(html);
    const report = page.getByRole('article', { name: 'Derived buyer report' });
    await expect(report).toBeVisible();
    await expectReportTypography(page);
    await expect(report).toContainText(name === 'synthetic' ? 'demo-target' : 'demo-host');
    await expect(report.getByRole('heading', { name: 'Verification appendix', exact: true })).toBeVisible();
    if (name === 'synthetic') {
        await expect(report).toContainText('3 total · 1 passed · 1 need attention · 0 informational · 1 undetermined');
        await expect(report).toContainText('fixture value: disabled');
        await expect(report).toContainText('Runtime state was not collected.');
        await expect(report).toContainText('No runtime input was supplied.');
        await expect(report).toContainText('7d8cd850418f270a97f45505a3ff636297d0b5eea623ee4a2d8b8621c72d292b');
        await expect(report).not.toContainText('Local Audit');
        await expect(report).not.toContainText('Linux');
        await expect(report).not.toContainText(/\b(?:local\s+audit|your\s+audit|trusted\s+registry|signed\s+package|original\s+proofpack\s+signature|required\s+collection)\b/i);
        await expect(report).toContainText(/report\s+at\s+a\s+glance/i);
        await expect(report).toContainText(/verification\s+and\s+provenance/i);
        await expect(report).toContainText(/source\s+artifacts/i);
        await expect(report).toContainText(/collection\s+coverage/i);
    }
    const screenContent = await report.textContent();
    for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.emulateMedia({ media: 'print' });
    await expectReportTypography(page);
    expect(await report.textContent()).toBe(screenContent);
    if (browserName === 'chromium') {
        mkdirSync(output, { recursive: true });
        await page.pdf({ path: `${output}/model-${name}.pdf`, format: 'A4', printBackground: true });
    }
    expect(requests).toEqual([]);
});

for (const variant of ['mixed', 'only']) test(`Unassessed severity stays separate in browser and print: ${variant}`, async ({ page, browserName }) => {
    const name = `synthetic-unassessed-${variant}`;
    const html = execFileSync(process.execPath, ['--import', 'tsx', 'apps/witnessops-web/src/lib/proofpack/test-support/render-fixture.tsx', name], {
        encoding: 'utf8', env: { ...process.env, TSX_TSCONFIG_PATH: resolve('apps/witnessops-web/tsconfig.test.json') },
    });
    const requests: string[] = [], runtimeErrors: string[] = [];
    page.on('request', request => requests.push(request.url()));
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.setContent(html);
    const report = page.getByRole('article', { name: 'Derived buyer report' });
    await expect(report).toBeVisible();
    await expectReportTypography(page);
    await expect(report.getByRole('region', { name: 'Unassessed findings', exact: true })).toContainText('not severity-ranked');
    const findingCards = report.locator('section.finding');
    const nullCards = findingCards.filter({ has: page.locator('.findingMeta').getByText('Severity not assessed', { exact: true }) });
    await expect(nullCards).toHaveCount(variant === 'mixed' ? 1 : 2);
    await expect(report.getByRole('region', { name: 'Unassessed findings', exact: true }).locator('strong')).toHaveText(await nullCards.locator('h3').allTextContents());
    await expect(nullCards.locator('[data-severity]')).toHaveCount(0);
    await expect(report.locator('[data-severity="informational"], [data-severity="null"]')).toHaveCount(0);
    const priorities = report.getByRole('region', { name: 'Priority findings', exact: true });
    if (variant === 'mixed') {
        await expect(priorities.locator('li strong')).toHaveText(['High severity fixture finding', 'Medium severity fixture finding', 'Low severity fixture finding']);
        await expect(priorities).not.toContainText('First fixture finding has no severity assessment');
        await expect(report.getByRole('region', { name: 'Suggested next action', exact: true })).toContainText('Review the high severity fixture comparison first.');
    } else {
        await expect(priorities).toHaveCount(0);
        await expect(report).not.toContainText('No findings were recorded');
        await expect(report.getByRole('region', { name: 'Suggested next action', exact: true })).toContainText('Their severity has not been assessed.');
        await expect(nullCards.nth(1).locator('.findingMeta')).toContainText('informational');
    }
    const screenHtml = await report.innerHTML();
    for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.emulateMedia({ media: 'print' });
    await expectReportTypography(page);
    expect(await report.innerHTML()).toBe(screenHtml);
    await expect(nullCards.first()).toBeVisible();
    await expect(report.getByRole('heading', { name: 'Verification appendix', exact: true })).toBeVisible();
    if (browserName === 'chromium') {
        mkdirSync(output, { recursive: true });
        await page.pdf({ path: `${output}/model-${name}.pdf`, format: 'A4', printBackground: true });
    }
    expect(requests).toEqual([]);
    expect(runtimeErrors).toEqual([]);
});
