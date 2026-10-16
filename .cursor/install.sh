#!/usr/bin/env bash
# Idempotent Cloud Agent install. Runs from the repository root.
# https://cursor.com/docs/cloud-agent/setup
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

corepack prepare pnpm@9.15.4 --activate
pnpm install --frozen-lockfile

# Browsers and their system libraries are baked into the image at
# PLAYWRIGHT_BROWSERS_PATH. This step only checks that cache.
# Root Playwright config and several suite configs use Chromium.
# App, funnel, hero, proofpack, and external-exposure configs also use WebKit.
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/ms-playwright}"
node <<'NODE'
const fs = require("node:fs");
const { chromium, webkit } = require("@playwright/test");
for (const browser of [chromium, webkit]) {
  const executable = browser.executablePath();
  if (!fs.existsSync(executable)) {
    console.error(`Playwright browser cache missing: ${executable}`);
    process.exit(1);
  }
  console.log(`cached ${executable}`);
}
NODE
