---
name: run-witnessops-web
description: Build, run, screenshot, and smoke-test the witnessops-web Next.js app. Use when asked to run/start/launch/build/test/screenshot witnessops-web, or to verify the /verify page or /api/verify receipt-verification endpoint locally.
---

# Run witnessops-web

`witnessops-web` is the public WitnessOps site (Next.js 15 / React 19, pnpm
workspace). Its load-bearing surface is **receipt verification**: the `/verify`
page and the `/api/verify` endpoint behind it. Most PRs touch that path or the
public marketing pages.

This app is driven headless by **`.claude/skills/run-witnessops-web/driver.mjs`** —
a Node script that launches the dev server, POSTs receipt fixtures to
`/api/verify` and asserts the verdicts, and screenshots the public pages with
`chromium-browser`. That driver is the primary agent path. The human `pnpm dev`
path is below it.

> All paths below are relative to the unit root: `corpus/witnessops-web/`.
> Run every command from there.

## Prerequisites

Already present on this device (Termux/Android): Node 24, `corepack`,
`chromium-browser`, `curl`. Activate the pinned pnpm:

```bash
corepack prepare pnpm@9.15.4 --activate
```

If `chromium-browser` is missing: Termux `pkg install chromium`; Ubuntu
`apt-get install -y chromium-browser`. The driver only needs the binary on PATH.

## Build (install deps)

From the unit root:

```bash
corepack pnpm install
```

Takes ~25s from cold on this device; `sharp`/`esbuild`/`unrs-resolver` build
their native bits during postinstall and succeed. No `.next` prebuild is needed —
the driver runs the dev server.

## Run (agent path) — the driver

One command does everything: launch (if not already up), assert `/api/verify`
verdicts, screenshot `/` and `/verify`:

```bash
node .claude/skills/run-witnessops-web/driver.mjs smoke
```

Expected tail (exit 0):

```
[/api/verify] valid fixture  -> HTTP 200 verdict=valid PASS
[/api/verify] bad fixture    -> HTTP 200 verdict=invalid breach=ANCHOR_RFC3161_IMPRINT_MISMATCH PASS
verify smoke: PASS
screenshot / -> .../var/screenshots/home.png (239984 bytes)
screenshot verify -> .../var/screenshots/verify.png (177441 bytes)
smoke: PASS — open var/screenshots/{home,verify}.png to view
```

Screenshots land in `var/screenshots/`. **Open them** — a green log line is not
proof the page rendered; the PNG is.

Sub-commands (all from the unit root):

```bash
node .claude/skills/run-witnessops-web/driver.mjs up                 # start dev server, wait for ready (port 3001)
node .claude/skills/run-witnessops-web/driver.mjs verify             # POST fixtures to /api/verify, assert verdicts
node .claude/skills/run-witnessops-web/driver.mjs shot review review # screenshot any route -> var/screenshots/review.png
node .claude/skills/run-witnessops-web/driver.mjs down               # stop the dev server the driver started
```

`up` is safe to repeat — it reuses a server that's already listening.

### Direct API check (no driver)

`/api/verify` wants the receipt as a **string** under a `receipt` field — not the
raw receipt object. With the server up:

```bash
node -e 'const fs=require("fs");process.stdout.write(JSON.stringify({receipt:fs.readFileSync("apps/witnessops-web/fixtures/verify/pv-valid.json","utf8")}))' \
  | curl -s -X POST http://127.0.0.1:3001/api/verify -H 'content-type: application/json' --data @- ; echo
```

Returns `{"ok":true,...,"verdict":"valid",...}`. Fixtures live in
`apps/witnessops-web/fixtures/verify/` (`pv-valid.json`, `qv-bad-imprint.json`,
`unsupported-stage.json`).

## Run (human path)

```bash
corepack pnpm dev
```

Serves on <http://127.0.0.1:3001> and blocks until Ctrl-C. Useless for a
headless agent — it just holds the terminal; use the driver instead.

## Test

```bash
corepack pnpm test     # app unit tests + @witnessops/proof + route-parity + receipt + buyer-path smoke
```

## Gotchas

- **`/api/verify` body shape.** POST `{"receipt": "<stringified receipt JSON>"}`,
  not the receipt object. The raw receipt returns
  `400 FAILURE_INPUT_MALFORMED: "request body must be JSON with a receipt field."`
  The driver wraps it correctly; the direct-curl snippet above shows the shape.
- **Readiness ≠ first paint.** A GET on `/` forces Next to compile that route
  (several seconds cold on this device). The driver waits on a **TCP connect** to
  port 3001 (open as soon as `next-server` binds), not on an HTTP 200 — otherwise
  cold launch looks like a 90s+ hang. First real request still pays the compile.
- **Dev server reparents to init.** The driver spawns it `detached` and writes
  `var/.driver-dev.pid`; it survives the launching shell. Always stop it with
  `driver.mjs down` (it SIGTERMs the group and `pkill`s `next dev --port 3001`).
- **`pnpm` is corepack-shimmed.** There is no standalone `pnpm` on PATH — use
  `corepack pnpm ...`. `corepack prepare pnpm@9.15.4 --activate` once per machine.
- Harmless noise: every command prints `WARNING: linker: ... ld.config.txt` lines
  (Termux dynamic linker). Filter with `| grep -v linker:` if it bothers you.

## Troubleshooting

- **`dev server did not become ready`** but `curl http://127.0.0.1:3001/` later
  returns 200 → cold compile under load exceeded the wait. Re-run; the second
  launch is warm. Check `var/driver-dev.log` for the real Next output.
- **`screenshot ... failed (... bytes)`** → `chromium-browser` missing or crashed.
  Confirm `command -v chromium-browser`; the driver runs it
  `--headless --no-sandbox --disable-gpu`.
- **Port 3001 already in use** → a stray dev server. `node .claude/skills/run-witnessops-web/driver.mjs down`, then re-run.
