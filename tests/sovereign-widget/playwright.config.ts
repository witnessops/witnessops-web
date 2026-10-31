import { defineConfig } from "@playwright/test";

// Development simulation/connection coverage. Production chat is checked by
// tests/ui-proof/production-chat.spec.ts against the release build. Stop website
// dev/build first: this fixture owns the same .next directory during acceptance.
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  outputDir: "../../artifacts/sovereign-widget",
  timeout: 45_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3012",
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined,
  },
  webServer: {
    command: "pnpm --filter witnessops-web exec next dev --hostname 127.0.0.1 --port 3012",
    url: "http://127.0.0.1:3012",
    env: { NEXT_PUBLIC_WO_PREVIEW: "1", NEXT_TELEMETRY_DISABLED: "1", OPENAI_API_KEY: "" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
