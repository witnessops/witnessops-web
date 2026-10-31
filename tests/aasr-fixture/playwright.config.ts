import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
export default defineConfig({
  testDir: '.', testMatch: 'aasr.spec.ts', workers: 1, retries: 0, forbidOnly: !!process.env.CI,
  timeout: 30_000, outputDir: join(tmpdir(), 'wops-aasr-browser'), reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3036', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    {name:'chromium', use:{browserName:'chromium',viewport:{width:1280,height:900}}},
    {name:'chromium-mobile', use:{browserName:'chromium',viewport:{width:390,height:844}}},
    {name:'webkit', use:{browserName:'webkit',viewport:{width:1280,height:900}}},
    {name:'webkit-mobile', use:{browserName:'webkit',viewport:{width:390,height:844}}},
  ],
  webServer: {
    cwd: resolve(__dirname, '../..'),
    command: 'node --import ./apps/witnessops-web/scripts/register-server-only-test-stub.mjs --import tsx tests/aasr-fixture/server.ts',
    env: {NODE_ENV:'test'}, url: 'http://127.0.0.1:3036', reuseExistingServer:false, timeout:60_000,
  },
});
