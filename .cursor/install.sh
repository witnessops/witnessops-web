#!/usr/bin/env bash
# Idempotent Cloud Agent install. Runs from the repository root.
# https://cursor.com/docs/cloud-agent/setup
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

corepack prepare pnpm@9.15.4 --activate
pnpm install --frozen-lockfile

# Root Playwright config and several suite configs use Chromium.
# App, funnel, hero, proofpack, and external-exposure configs also use WebKit.
pnpm exec playwright install --with-deps chromium webkit
