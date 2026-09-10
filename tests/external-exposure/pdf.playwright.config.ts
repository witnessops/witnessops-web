import { join } from 'node:path';
import { tmpdir } from 'node:os';
import base from './playwright.config';

// Full-health/CI always owns a local built server, never a caller-supplied URL.
const baseURL = 'http://127.0.0.1:3019';
export default {
  ...base,
  testMatch: 'pdf-pagination.spec.ts',
  outputDir: join(tmpdir(), 'wops-pdf-pagination'),
  forbidOnly: true,
  use: { ...base.use, baseURL },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' as const } }],
  webServer: {
    command: 'pnpm --filter witnessops-web exec next start --hostname 127.0.0.1 --port 3019',
    url: `${baseURL}/check`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
};
