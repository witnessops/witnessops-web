/**
 * Build with the assistant flags unset, then start that build with both flags
 * set only at runtime. The routes, homepage, footer and sitemap must stay closed.
 *
 * Usage, from apps/witnessops-web:
 *   node scripts/prod-gate-curl.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PROD_GATE_PORT || "3017";
const outPath = process.env.PROD_GATE_OUT || "/opt/cursor/artifacts/prod-gate-curl.txt";
const lines = [];

function log(line) {
  lines.push(line);
  console.log(line);
}

function run(command, args, env) {
  return new Promise((done, reject) => {
    const child = spawn(command, args, { cwd: appRoot, env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => done({ code, output }));
  });
}

const buildEnv = { ...process.env, NODE_ENV: "production" };
delete buildEnv.NEXT_PUBLIC_WO_PREVIEW;
delete buildEnv.NEXT_PUBLIC_SOVEREIGN_RELEASE;

log(`build NODE_ENV=production flags unset`);
const built = await run("pnpm", ["exec", "next", "build"], buildEnv);
log(built.output.trim().split("\n").slice(-30).join("\n"));
if (built.code !== 0) {
  log(`BUILD_EXIT ${built.code}`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${lines.join("\n")}\n`);
  process.exit(built.code ?? 1);
}

const startEnv = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_PUBLIC_WO_PREVIEW: "1",
  NEXT_PUBLIC_SOVEREIGN_RELEASE: "1",
};
log(`start runtime NEXT_PUBLIC_WO_PREVIEW=1 NEXT_PUBLIC_SOVEREIGN_RELEASE=1 port ${port}`);
const server = spawn("pnpm", ["exec", "next", "start", "-H", "127.0.0.1", "-p", port], {
  cwd: appRoot,
  env: startEnv,
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk; });
server.stderr.on("data", (chunk) => { serverLog += chunk; });

async function waitReady() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.status > 0) return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 400));
    }
  }
  throw new Error(`next start did not listen\n${serverLog}`);
}

function stop() {
  server.kill("SIGTERM");
}

try {
  await waitReady();
  const checks = [
    ["GET", "/docs/assistant"],
    ["GET", "/pl/docs/assistant"],
    ["GET", "/"],
    ["GET", "/pl"],
    ["GET", "/sitemap.xml"],
    ["POST", "/api/ask-witnessops"],
  ];
  for (const [method, path] of checks) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: method === "POST" ? { "content-type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify({ question: "What does the review cost?" }) : undefined,
    });
    const body = await response.text();
    const assistantLinks = (body.match(/href="\/docs\/assistant"|href="\/pl\/docs\/assistant"/g) || []).length;
    log(`${method} ${path} ${response.status} assistant-links=${assistantLinks} cache=${response.headers.get("cache-control") ?? ""}`);
    if (path === "/docs/assistant" || path === "/pl/docs/assistant") {
      if (response.status !== 404) throw new Error(`${path} returned ${response.status}`);
    }
    if (path === "/api/ask-witnessops") {
      if (response.status !== 410 && response.status !== 404) throw new Error(`${path} returned ${response.status}`);
    }
    if (path === "/" || path === "/pl" || path === "/sitemap.xml") {
      if (assistantLinks !== 0) throw new Error(`${path} links the assistant`);
      if (body.includes("/docs/assistant")) throw new Error(`${path} mentions /docs/assistant`);
    }
  }
  log("PROD_GATE_OK");
} catch (error) {
  log(`PROD_GATE_FAIL ${error instanceof Error ? error.message : String(error)}`);
  log(serverLog.slice(-2000));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${lines.join("\n")}\n`);
  stop();
  process.exit(1);
}
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${lines.join("\n")}\n`);
stop();
