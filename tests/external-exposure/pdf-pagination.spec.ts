import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertReportPdf } from '../proofpack/report-pdf';
import { externalExposureAdapter, validateExternalSnapshot } from '../../apps/witnessops-web/src/lib/external-exposure/adapter';
import { snapshotFixture } from './fixture';
import { createBundle } from '../proofpack/create-bundle';

test.skip(({ browserName }) => browserName !== 'chromium', 'PDF generation is a Chromium capability');

// Public observations of our own hostname, downloaded unchanged after the release
// smoke. No customer material, credentials, or new network collection is involved.
const capturedBytes = readFileSync(resolve('tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json'));
const captured = validateExternalSnapshot(JSON.parse(capturedBytes.toString('utf8')));
const sourceDigest = '551ca3acf6e92029ae8ccac717ee4a960f5a78aade1820748caada9b49dfedfe';


test.beforeEach(async ({ page, baseURL }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort());
  await page.route('**/api/external-exposure', route => route.abort());
  await page.route('**/api/ask-witnessops', route => route.fulfill({ status: 204 }));
});

for (const shape of ['captured-clean', 'attention', 'long-finding'] as const) {
  test(`A4 has meaningful final content: ${shape}`, async ({ page }, info) => {
    expect(createHash('sha256').update(capturedBytes).digest('hex')).toBe(sourceDigest);
    const snapshot = shape === 'captured-clean' ? captured : snapshotFixture();
    if (shape === 'long-finding') snapshot.checks[1].interpretation = 'Long deterministic finding; no real observation. '.repeat(40);
    const model = externalExposureAdapter(validateExternalSnapshot(snapshot));
    if (shape === 'captured-clean') {
      expect(model.identity.sourceDigest).toBe(sourceDigest);
      expect(model.identity.reportId).toBe('external-20260910202549352-551ca3acf6e92029');
      expect(snapshot.checks).toHaveLength(10);
    }
    await page.route('**/api/external-exposure', route => route.fulfill({ json: { snapshot, model } }));
    await page.goto('/check');
    await page.getByLabel('Public hostname', { exact: true }).fill(snapshot.target);
    await page.getByRole('button', { name: 'Run free check', exact: true }).click();
    await page.getByRole('button', { name: 'View full report', exact: true }).click();
    await assertReportPdf(page, info);
  });
}

test('A4 Local Audit report retains meaningful final content', async ({ page }, info) => {
  const dir = resolve('tests/proofpack/production-fixtures/complete');
  const name = readdirSync(dir).find(name => name.endsWith('.zip'))!;
  const bundle = createBundle(readFileSync(resolve(dir, name)), readFileSync(resolve(dir, `${name}.sig.json`)));
  await page.goto('/proofpack');
  await page.getByLabel('Proofpack file', { exact: true }).setInputFiles({ name: 'complete.proofpack', mimeType: 'application/octet-stream', buffer: Buffer.from(bundle) });
  await page.getByRole('button', { name: 'Verify locally', exact: true }).click();
  await page.getByRole('button', { name: 'View report', exact: true }).click();
  await assertReportPdf(page, info);
});
