#!/usr/bin/env node
// driver.mjs — launch + drive witnessops-web headless on Termux/Android (or any Linux).
//
// The agent harness for a web app: it (re)starts the Next dev server, drives the
// receipt-verification surface (/api/verify) the way real PRs touch it, and takes
// headless screenshots of the public pages so a change can be *seen*, not just asserted.
//
// Usage (run from anywhere; paths resolve relative to the repo root):
//   node .claude/skills/run-witnessops-web/driver.mjs up       # start dev server, wait for ready
//   node .claude/skills/run-witnessops-web/driver.mjs verify   # POST fixtures to /api/verify, assert verdicts
//   node .claude/skills/run-witnessops-web/driver.mjs shot <route> [name]   # screenshot one route
//   node .claude/skills/run-witnessops-web/driver.mjs smoke     # up + verify + screenshot home & /verify (default)
//   node .claude/skills/run-witnessops-web/driver.mjs down       # kill the dev server it started
//
// Exit code is non-zero if any assertion fails. Screenshots land in var/screenshots/.

import { spawn, spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { connect } from "node:net";

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO = join(SKILL_DIR, "..", "..", ".."); // .claude/skills/run-witnessops-web -> repo root
const APP = join(REPO, "apps", "witnessops-web");
const PORT = 3001;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = join(REPO, "var", "screenshots");
const PIDFILE = join(REPO, "var", ".driver-dev.pid");
const LOG = join(REPO, "var", "driver-dev.log");

const FIXTURES = {
  valid: join(APP, "fixtures", "verify", "pv-valid.json"),
  bad: join(APP, "fixtures", "verify", "qv-bad-imprint.json"),
};

const log = (...a) => console.log(...a);
const die = (m) => { console.error("FAIL:", m); process.exit(1); };

// Probe the TCP port, NOT an HTTP route. A GET on "/" forces Next to compile the
// route (several seconds on first hit / a loaded device) and would make readiness
// look far slower than it is. The port is open as soon as next-server binds.
function isUp() {
  return new Promise((resolve) => {
    const sock = connect(PORT, "127.0.0.1");
    const done = (v) => { sock.destroy(); resolve(v); };
    sock.setTimeout(2000);
    sock.once("connect", () => done(true));
    sock.once("timeout", () => done(false));
    sock.once("error", () => done(false));
  });
}

async function waitReady(timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isUp()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function up() {
  if (await isUp()) { log(`dev server already up at ${BASE}`); return; }
  mkdirSync(join(REPO, "var"), { recursive: true });
  log("launching: corepack pnpm --filter witnessops-web dev");
  const out = writeFileSync, _ = out; // keep linters quiet
  const fd = (await import("node:fs")).openSync(LOG, "a");
  const child = spawn("corepack", ["pnpm", "--filter", "witnessops-web", "dev"], {
    cwd: REPO, detached: true, stdio: ["ignore", fd, fd],
  });
  child.unref();
  writeFileSync(PIDFILE, String(child.pid));
  log(`spawned pid ${child.pid}, waiting for ${BASE} ...`);
  if (!(await waitReady())) die(`dev server did not become ready (see ${LOG})`);
  log(`READY at ${BASE}`);
}

function down() {
  if (!existsSync(PIDFILE)) { log("no pidfile; nothing to stop"); return; }
  const pid = Number(readFileSync(PIDFILE, "utf8").trim());
  // kill the corepack process group we started
  try { process.kill(-pid, "SIGTERM"); } catch {}
  try { process.kill(pid, "SIGTERM"); } catch {}
  spawnSync("pkill", ["-f", "next dev --port " + PORT]);
  log(`stopped dev server (pid ${pid})`);
}

async function postVerify(fixturePath) {
  const receipt = readFileSync(fixturePath, "utf8");          // raw receipt JSON ...
  const body = JSON.stringify({ receipt });                   // ... wrapped as a STRING under {receipt}
  const r = await fetch(BASE + "/api/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  return { status: r.status, json: await r.json() };
}

async function verify() {
  if (!(await isUp())) die(`server not up at ${BASE} — run 'up' first`);
  let ok = true;

  const good = await postVerify(FIXTURES.valid);
  const goodOk = good.status === 200 && good.json.ok === true && good.json.verdict === "valid";
  log(`[/api/verify] valid fixture  -> HTTP ${good.status} verdict=${good.json.verdict} ${goodOk ? "PASS" : "FAIL"}`);
  ok &&= goodOk;

  const bad = await postVerify(FIXTURES.bad);
  const badOk = bad.status === 200 && bad.json.ok === true && bad.json.verdict === "invalid"
    && bad.json.breaches?.some((b) => b.code === "ANCHOR_RFC3161_IMPRINT_MISMATCH");
  log(`[/api/verify] bad fixture    -> HTTP ${bad.status} verdict=${bad.json.verdict} breach=${bad.json.breaches?.[0]?.code} ${badOk ? "PASS" : "FAIL"}`);
  ok &&= badOk;

  if (!ok) die("verify smoke assertions failed");
  log("verify smoke: PASS");
}

function shot(route = "", name) {
  mkdirSync(SHOTS, { recursive: true });
  const file = join(SHOTS, (name || (route || "home").replace(/\//g, "_")) + ".png");
  const r = spawnSync("chromium-browser", [
    "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
    "--window-size=1280,1600",
    `--screenshot=${file}`,
    `${BASE}/${route}`,
  ], { stdio: "ignore" });
  const size = existsSync(file) ? statSync(file).size : 0;
  if (r.status !== 0 || size < 5000) die(`screenshot ${route} failed (exit ${r.status}, ${size} bytes)`);
  log(`screenshot ${route || "/"} -> ${file} (${size} bytes)`);
  return file;
}

async function smoke() {
  await up();
  await verify();
  shot("", "home");
  shot("verify", "verify");
  log("\nsmoke: PASS — open var/screenshots/{home,verify}.png to view");
}

const cmd = process.argv[2] || "smoke";
const arg1 = process.argv[3];
const arg2 = process.argv[4];
try {
  if (cmd === "up") await up();
  else if (cmd === "down") down();
  else if (cmd === "verify") await verify();
  else if (cmd === "shot") shot(arg1 ?? "", arg2);
  else if (cmd === "smoke") await smoke();
  else die(`unknown command: ${cmd}`);
} catch (e) {
  die(e?.stack || String(e));
}
