import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import test from "node:test";

const appRoot = resolve(__dirname, "../..");
const gateScript = resolve(appRoot, "scripts/prod-gate-curl.mjs");
const primaryStandalone = resolve(appRoot, ".next/standalone/server.js");
const secondaryStandalone = resolve(appRoot, ".next/standalone/apps/witnessops-web/server.js");

const STUB_SERVER = `'use strict';
const http = require('node:http');
const fs = require('node:fs');
const scenario = process.env.PROD_GATE_SCENARIO || 'pass';
fs.writeFileSync(
  process.env.PROD_GATE_SERVER_ENV,
  'WO=' + process.env.NEXT_PUBLIC_WO_PREVIEW + '\\nREL=' + process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE + '\\n',
);
function finish(res, status, body, extra) {
  res.writeHead(status, Object.assign({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }, extra));
  res.end(body);
}
const server = http.createServer((req, res) => {
  req.resume();
  const url = String(req.url || '/').split('?')[0];
  if (url === '/og/home') {
    let location = '/og/witnessops-home-editorial-a-2026-10.png';
    let status = 308;
    if (scenario === 'og-absolute') location = 'https://witnessops.com/og/witnessops-home-editorial-a-2026-10.png';
    if (scenario === 'og-localhost') location = 'http://localhost:3000/og/witnessops-home-editorial-a-2026-10.png';
    if (scenario === 'og-zero') location = 'http://0.0.0.0:3000/og/witnessops-home-editorial-a-2026-10.png';
    if (scenario === 'og-status') status = 200;
    if (scenario === 'og-evil' && req.headers['x-forwarded-host'] === 'evil.example') {
      location = 'https://evil.example/og/witnessops-home-editorial-a-2026-10.png';
    }
    finish(res, status, '', { location });
    return;
  }
  if (url === '/docs/assistant' || url === '/pl/docs/assistant') {
    const open = (url === '/docs/assistant' && scenario === 'assistant-open')
      || (url === '/pl/docs/assistant' && scenario === 'pl-assistant-open');
    const body = scenario === 'assistant-body' ? 'closed page mentions /docs/assistant' : 'not found';
    finish(res, open ? 200 : 404, body);
    return;
  }
  if (url === '/api/ask-witnessops') {
    const status = scenario === 'ask-404' ? 404 : scenario === 'ask-open' ? 200 : scenario === 'ask-500' ? 500 : 410;
    finish(res, status, 'closed');
    return;
  }
  if (url === '/catalog/workflows') {
    const status = scenario === 'workflows-open' ? 200 : scenario === 'workflows-404' ? 404 : 410;
    finish(res, status, 'gone');
    return;
  }
  if (url === '/support') {
    let body = 'Support engage@mail.witnessops.com';
    let status = 200;
    if (scenario === 'support-withdrawn') body = 'AI Agent Tools & Access Review';
    if (scenario === 'support-security-mail') body = 'Write security@witnessops.com';
    if (scenario === 'support-status') status = 503;
    finish(res, status, body);
    return;
  }
  if (url === '/why-witnessops') {
    let body = 'Why WitnessOps';
    if (scenario === 'why-name') body = 'Karol Stefanski founded the practice';
    if (scenario === 'why-linkedin') body = 'https://www.linkedin.com/in/karol-example';
    finish(res, 200, body);
    return;
  }
  if (url === '/' || url === '/pl' || url === '/sitemap.xml') {
    let body = url === '/sitemap.xml' ? '<urlset></urlset>' : 'home';
    if (scenario === 'home-link' && url === '/') body = '<a href="/docs/assistant">Ask</a>';
    if (scenario === 'pl-link' && url === '/pl') body = '<a href="/pl/docs/assistant">Ask</a>';
    if (scenario === 'pl-mention' && url === '/pl') body = 'see /docs/assistant';
    if (scenario === 'sitemap-mention' && url === '/sitemap.xml') body = '<loc>https://witnessops.com/docs/assistant</loc>';
    finish(res, 200, body);
    return;
  }
  finish(res, 404, 'missing');
});
server.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
server.listen(Number(process.env.PORT || '3017'), '0.0.0.0');
function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
`;

const FAKE_PNPM = `#!/bin/sh
if [ "$1" = "exec" ] && [ "$2" = "next" ] && [ "$3" = "build" ]; then
  if [ -n "\${PROD_GATE_BUILD_ENV_REPORT:-}" ]; then
    printf 'WO=%s\\nREL=%s\\n' "\${NEXT_PUBLIC_WO_PREVIEW-<unset>}" "\${NEXT_PUBLIC_SOVEREIGN_RELEASE-<unset>}" > "$PROD_GATE_BUILD_ENV_REPORT"
  fi
  echo "stub next build"
  if [ -n "\${PROD_GATE_BUILD_EXIT:-}" ]; then
    exit "$PROD_GATE_BUILD_EXIT"
  fi
  if [ "$PROD_GATE_SCENARIO" = "standalone-missing" ]; then
    exit 0
  fi
  mkdir -p "$APP_ROOT/.next/standalone"
  cp "$PROD_GATE_STUB" "$APP_ROOT/.next/standalone/server.js"
  exit 0
fi
echo "unexpected pnpm invocation: $*" >&2
exit 99
`;

type GateCase = {
  name: string;
  scenario: string;
  buildExit?: string;
  removeStandalone?: boolean;
  code: number;
  includes: string[];
  excludes?: string[];
};

const cases: GateCase[] = [
  {
    name: "closed production responses pass",
    scenario: "pass",
    code: 0,
    includes: [
      "standalone entry .next/standalone/server.js",
      "GET /docs/assistant 404",
      "GET /pl/docs/assistant 404",
      "GET / 200 assistant-links=0",
      "GET /pl 200 assistant-links=0",
      "GET /sitemap.xml 200 assistant-links=0",
      "POST /api/ask-witnessops 410",
      "GET /catalog/workflows 410",
      "GET /support 200 third-offer=false security-mail=false",
      "GET /why-witnessops 200 name=false",
      "GET /og/home host=localhost:3000 forwarded= 308 location=/og/witnessops-home-editorial-a-2026-10.png",
      "GET /og/home host=witnessops.com forwarded=witnessops.com 308 location=/og/witnessops-home-editorial-a-2026-10.png",
      "GET /og/home host=0.0.0.0:3000 forwarded=evil.example 308 location=/og/witnessops-home-editorial-a-2026-10.png",
      "PROD_GATE_OK",
    ],
    excludes: ["PROD_GATE_FAIL"],
  },
  {
    name: "absolute editorial OG location passes",
    scenario: "og-absolute",
    code: 0,
    includes: [
      "location=https://witnessops.com/og/witnessops-home-editorial-a-2026-10.png",
      "PROD_GATE_OK",
    ],
    excludes: ["PROD_GATE_FAIL"],
  },
  {
    name: "ask route 404 passes",
    scenario: "ask-404",
    code: 0,
    includes: ["POST /api/ask-witnessops 404", "PROD_GATE_OK"],
    excludes: ["PROD_GATE_FAIL"],
  },
  {
    name: "assistant 404 body is not scanned",
    scenario: "assistant-body",
    code: 0,
    includes: ["GET /docs/assistant 404", "PROD_GATE_OK"],
    excludes: ["PROD_GATE_FAIL"],
  },
  {
    name: "open assistant fails",
    scenario: "assistant-open",
    code: 1,
    includes: ["PROD_GATE_FAIL /docs/assistant returned 200"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "open Polish assistant fails",
    scenario: "pl-assistant-open",
    code: 1,
    includes: ["PROD_GATE_FAIL /pl/docs/assistant returned 200"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "open ask route fails",
    scenario: "ask-open",
    code: 1,
    includes: ["PROD_GATE_FAIL /api/ask-witnessops returned 200"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "ask 500 fails",
    scenario: "ask-500",
    code: 1,
    includes: ["PROD_GATE_FAIL /api/ask-witnessops returned 500"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "homepage assistant link fails",
    scenario: "home-link",
    code: 1,
    includes: ["PROD_GATE_FAIL / links the assistant"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "Polish assistant link fails",
    scenario: "pl-link",
    code: 1,
    includes: ["PROD_GATE_FAIL /pl links the assistant"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "Polish page mentioning the assistant fails",
    scenario: "pl-mention",
    code: 1,
    includes: ["PROD_GATE_FAIL /pl mentions /docs/assistant"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "sitemap mentioning the assistant fails",
    scenario: "sitemap-mention",
    code: 1,
    includes: ["PROD_GATE_FAIL /sitemap.xml mentions /docs/assistant"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "open workflows catalogue fails",
    scenario: "workflows-open",
    code: 1,
    includes: ["PROD_GATE_FAIL /catalog/workflows returned 200"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "workflows 404 fails",
    scenario: "workflows-404",
    code: 1,
    includes: ["PROD_GATE_FAIL /catalog/workflows returned 404"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "support withdrawn offer fails",
    scenario: "support-withdrawn",
    code: 1,
    includes: ["PROD_GATE_FAIL /support still publishes the withdrawn offer or security@"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "support security mailbox fails",
    scenario: "support-security-mail",
    code: 1,
    includes: ["third-offer=false security-mail=true", "PROD_GATE_FAIL /support still publishes the withdrawn offer or security@"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "support non-200 fails",
    scenario: "support-status",
    code: 1,
    includes: ["PROD_GATE_FAIL /support returned 503"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "named person on why page fails",
    scenario: "why-name",
    code: 1,
    includes: ["name=true", "PROD_GATE_FAIL /why-witnessops still names a person"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "linkedin profile on why page fails",
    scenario: "why-linkedin",
    code: 1,
    includes: ["PROD_GATE_FAIL /why-witnessops still names a person"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "localhost OG location fails",
    scenario: "og-localhost",
    code: 1,
    includes: ["PROD_GATE_FAIL /og/home location http://localhost:3000/og/witnessops-home-editorial-a-2026-10.png"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "unspecified bind address in OG location fails",
    scenario: "og-zero",
    code: 1,
    includes: ["PROD_GATE_FAIL /og/home location http://0.0.0.0:3000/og/witnessops-home-editorial-a-2026-10.png"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "non-permanent OG status fails",
    scenario: "og-status",
    code: 1,
    includes: ["GET /og/home host=localhost:3000 forwarded= 200", "PROD_GATE_FAIL /og/home location"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "forwarded host OG location fails",
    scenario: "og-evil",
    code: 1,
    includes: ["PROD_GATE_FAIL /og/home location https://evil.example/og/witnessops-home-editorial-a-2026-10.png"],
    excludes: ["PROD_GATE_OK"],
  },
  {
    name: "build failure stops before the server starts",
    scenario: "pass",
    buildExit: "4",
    code: 4,
    includes: ["BUILD_EXIT 4"],
    excludes: ["PROD_GATE_OK", "PROD_GATE_FAIL", "start HOSTNAME="],
  },
  {
    name: "missing standalone server fails closed",
    scenario: "standalone-missing",
    removeStandalone: true,
    code: 1,
    includes: ["STANDALONE_MISSING"],
    excludes: ["PROD_GATE_OK", "PROD_GATE_FAIL", "start HOSTNAME="],
  },
];

function freePort(): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? rejectPort(error) : resolvePort(port)));
    });
  });
}

function snapshot(file: string, backup: string): boolean {
  if (!existsSync(file)) return false;
  mkdirSync(dirname(backup), { recursive: true });
  copyFileSync(file, backup);
  return true;
}

function restore(file: string, backup: string, existed: boolean) {
  if (existed) {
    mkdirSync(dirname(file), { recursive: true });
    copyFileSync(backup, file);
    return;
  }
  if (existsSync(file)) unlinkSync(file);
}

function runGate(env: NodeJS.ProcessEnv): Promise<{ code: number | null; output: string }> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [gateScript], {
      cwd: appRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", rejectRun);
    child.on("close", (code) => resolveRun({ code, output }));
  });
}

test("prod gate pass and fail logic runs against a local stub", { timeout: 120_000 }, async () => {
  const work = mkdtempSync(join(tmpdir(), "prod-gate-"));
  const binDir = join(work, "bin");
  const stubPath = join(work, "stub-server.js");
  const pnpmPath = join(binDir, "pnpm");
  mkdirSync(binDir);
  writeFileSync(stubPath, STUB_SERVER);
  writeFileSync(pnpmPath, FAKE_PNPM);
  chmodSync(pnpmPath, 0o755);

  const primaryBackup = join(work, "primary-server.js");
  const secondaryBackup = join(work, "secondary-server.js");
  const primaryExisted = snapshot(primaryStandalone, primaryBackup);
  const secondaryExisted = snapshot(secondaryStandalone, secondaryBackup);
  const basePort = await freePort();

  try {
    for (const [index, item] of cases.entries()) {
      const outPath = join(work, `out-${index}.txt`);
      const buildReport = join(work, `build-env-${index}.txt`);
      const serverReport = join(work, `server-env-${index}.txt`);
      if (item.removeStandalone) {
        if (existsSync(primaryStandalone)) unlinkSync(primaryStandalone);
        if (existsSync(secondaryStandalone)) unlinkSync(secondaryStandalone);
      }
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        PATH: `${binDir}${delimiter}${process.env.PATH ?? ""}`,
        APP_ROOT: appRoot,
        PROD_GATE_PORT: String(basePort + index),
        PROD_GATE_OUT: outPath,
        PROD_GATE_SCENARIO: item.scenario,
        PROD_GATE_STUB: stubPath,
        PROD_GATE_BUILD_ENV_REPORT: buildReport,
        PROD_GATE_SERVER_ENV: serverReport,
        NEXT_PUBLIC_WO_PREVIEW: "1",
        NEXT_PUBLIC_SOVEREIGN_RELEASE: "1",
      };
      delete env.NODE_OPTIONS;
      delete env.PROD_GATE_BUILD_EXIT;
      if (item.buildExit) env.PROD_GATE_BUILD_EXIT = item.buildExit;

      const result = await runGate(env);
      const written = existsSync(outPath) ? readFileSync(outPath, "utf8") : "";
      const detail = `${item.name}\nexit ${result.code}\n${result.output}`;
      assert.equal(result.code, item.code, detail);
      for (const needle of item.includes) {
        assert.equal(result.output.includes(needle), true, `${item.name} missing ${needle}\n${result.output}`);
        assert.equal(written.includes(needle), true, `${item.name} report missing ${needle}\n${written}`);
      }
      for (const needle of item.excludes ?? []) {
        assert.equal(result.output.includes(needle), false, `${item.name} unexpectedly had ${needle}\n${result.output}`);
      }
      const buildEnv = readFileSync(buildReport, "utf8");
      assert.equal(buildEnv, "WO=<unset>\nREL=<unset>\n", item.name);
      if (item.code === 0) {
        assert.equal(readFileSync(serverReport, "utf8"), "WO=1\nREL=1\n", item.name);
      }
    }
  } finally {
    restore(primaryStandalone, primaryBackup, primaryExisted);
    restore(secondaryStandalone, secondaryBackup, secondaryExisted);
  }
});
