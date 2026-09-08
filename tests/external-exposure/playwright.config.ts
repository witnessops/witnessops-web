import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: '*.spec.ts', outputDir: process.env.EXTERNAL_CHECK_TEST_OUTPUT ?? '/private/tmp/wops-external-exposure-browser',
  timeout: 30_000, fullyParallel: false, workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: process.env.EXTERNAL_CHECK_BASE_URL ?? 'http://127.0.0.1:3012', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
});
