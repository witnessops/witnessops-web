import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
export default defineConfig({
  testDir: ".", testMatch: "*.spec.ts", outputDir: join(tmpdir(), "wops-app-foundation-browser"),
  forbidOnly: Boolean(process.env.CI), retries: 0, workers: 1, timeout: 45_000, reporter: "list",
  use: { baseURL: "http://127.0.0.1:3022", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }, { name: "webkit", testIgnore: "report-pdf.spec.ts", use: { browserName: "webkit" } }],
  webServer: {
    command: "pnpm --filter @witnessops/app exec next dev --hostname 127.0.0.1 --port 3022",
    env: { WITNESSOPS_APP_BROWSER_TEST: "1", WORKOS_API_KEY: "test-only-no-network", WORKOS_CLIENT_ID: "client_browser_fixture", WORKOS_COOKIE_PASSWORD: "test-only-cookie-material-not-a-real-secret", NEXT_PUBLIC_WORKOS_REDIRECT_URI: "http://127.0.0.1:3022/callback", WORKOS_COOKIE_DOMAIN: "", WORKOS_COOKIE_SAMESITE: "lax" },
    url: "http://127.0.0.1:3022", reuseExistingServer: false, timeout: 90_000,
  },
});
