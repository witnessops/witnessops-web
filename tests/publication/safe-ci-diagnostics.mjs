// Metadata only: never upload test logs, error messages, traces or auth state.
import { lstatSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const keys = ['health', 'db', 'db_live', 'db_cli', 'db_server', 'migration', 'browser', 'parity'];
const allowed = new Set(['success', 'failure', 'cancelled', 'skipped']);
let steps;
try { steps = JSON.parse(process.env.APP_STEP_RESULTS ?? ''); } catch { /* Unknown, never success. */ }
const outcomes = Object.fromEntries(keys.map(key => [key,
  allowed.has(steps?.[key]?.outcome) ? steps[key].outcome : 'unknown',
]));
// Existing Playwright outputDir; only status and number of failed tests survive.
const browser = { availability: 'unavailable' };
try {
  const path = join(tmpdir(), 'wops-app-foundation-browser', '.last-run.json');
  const stat = lstatSync(path);
  if (stat.isFile() && !stat.isSymbolicLink() && stat.size <= 1024 * 1024) {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    if (['passed', 'failed', 'interrupted', 'timedout'].includes(data.status) && Array.isArray(data.failedTests)) {
      Object.assign(browser, { availability: 'available', status: data.status, failedTests: data.failedTests.length });
    }
  }
} catch { /* Missing/invalid result is diagnostic absence, not test success. */ }
if (!process.env.RUNNER_TEMP) throw new Error('RUNNER_TEMP is required');
const dir = join(process.env.RUNNER_TEMP, 'app-safe-diagnostics');
mkdirSync(dir, { recursive: true, mode: 0o700 });
writeFileSync(join(dir, 'summary.json'), JSON.stringify({ outcomes, browser }, null, 2) + '\n', { mode: 0o600 });
