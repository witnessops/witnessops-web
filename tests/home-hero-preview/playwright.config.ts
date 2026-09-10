import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "hero.spec.ts",
  outputDir: join(tmpdir(), "wops-home-gap-tests"),
  timeout: 30_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.HERO_BASE_URL ?? "http://127.0.0.1:3017",
    reducedMotion: "no-preference",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
