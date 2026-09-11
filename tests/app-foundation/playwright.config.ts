import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
export default defineConfig({
  testDir: ".", testMatch: "*.spec.ts", outputDir: join(tmpdir(), "wops-app-foundation-browser"),
  forbidOnly: Boolean(process.env.CI), retries: 0, workers: 1, timeout: 45_000, reporter: "list",
  use: { baseURL: "http://127.0.0.1:3022", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }, { name: "webkit", use: { browserName: "webkit" } }],
  webServer: {
    command: "pnpm --filter @witnessops/app exec next dev --hostname 127.0.0.1 --port 3022",
    env: { WITNESSOPS_APP_DEV_SESSION: "1" },
    url: "http://127.0.0.1:3022", reuseExistingServer: false, timeout: 90_000,
  },
});
