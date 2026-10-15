/**
 * Build with the assistant flags unset, then start that build with both flags
 * set only at runtime. The routes, homepage, footer and sitemap must stay closed.
 *
 * Usage, from apps/witnessops-web:
 *   node scripts/prod-gate-curl.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PROD_GATE_PORT || "3017";
const outPath = process.env.PROD_GATE_OUT || "/opt/cursor/artifacts/prod-routes-curl-after.txt";
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
const standaloneCandidates = [
  resolve(appRoot, ".next/standalone/server.js"),
  resolve(appRoot, ".next/standalone/apps/witnessops-web/server.js"),
];
const standaloneEntry = standaloneCandidates.find((candidate) => existsSync(candidate));
if (!standaloneEntry) {
  log(`STANDALONE_MISSING ${standaloneCandidates.join(" ")}`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${lines.join("\n")}\n`);
  process.exit(1);
}
if (standaloneEntry.endsWith("/.next/standalone/server.js")) {
  log("standalone entry .next/standalone/server.js");
} else {
  log("standalone .next/standalone/server.js is not emitted: outputFileTracingRoot is the repo root");
  log(`standalone ${standaloneEntry}`);
}
log(`start HOSTNAME=0.0.0.0 runtime NEXT_PUBLIC_WO_PREVIEW=1 NEXT_PUBLIC_SOVEREIGN_RELEASE=1 port ${port}`);
const server = spawn(process.execPath, [standaloneEntry], {
  cwd: dirname(standaloneEntry),
  env: { ...startEnv, PORT: port, HOSTNAME: "0.0.0.0" },
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
  throw new Error(`standalone server did not listen\n${serverLog}`);
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
  const workflows = await fetch(`http://127.0.0.1:${port}/catalog/workflows`);
  log(`GET /catalog/workflows ${workflows.status}`);
  if (workflows.status !== 410) throw new Error(`/catalog/workflows returned ${workflows.status}`);
  const support = await fetch(`http://127.0.0.1:${port}/support`);
  const supportBody = await support.text();
  log(`GET /support ${support.status} third-offer=${supportBody.includes("AI Agent Tools")} security-mail=${supportBody.includes("security@witnessops.com")}`);
  if (support.status !== 200) throw new Error(`/support returned ${support.status}`);
  if (supportBody.includes("AI Agent Tools") || supportBody.includes("security@witnessops.com")) {
    throw new Error("/support still publishes the withdrawn offer or security@");
  }
  const why = await fetch(`http://127.0.0.1:${port}/why-witnessops`);
  const whyBody = await why.text();
  log(`GET /why-witnessops ${why.status} name=${whyBody.includes("Karol Stefanski")}`);
  if (whyBody.includes("Karol Stefanski") || whyBody.includes("linkedin.com/in/karol")) {
    throw new Error("/why-witnessops still names a person");
  }
  for (const headers of [
    { host: "localhost:3000" },
    { host: "witnessops.com", "x-forwarded-host": "witnessops.com", "x-forwarded-proto": "https" },
    { host: "0.0.0.0:3000", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" },
  ]) {
    const og = await fetch(`http://127.0.0.1:${port}/og/home`, { headers, redirect: "manual" });
    const location = og.headers.get("location") ?? "";
    log(`GET /og/home host=${headers.host} forwarded=${headers["x-forwarded-host"] ?? ""} ${og.status} location=${location}`);
    const allowed = location === "/opengraph-image" || location === "https://witnessops.com/opengraph-image";
    if (og.status !== 308 || !allowed || /localhost|0\.0\.0\.0/i.test(location)) {
      throw new Error(`/og/home location ${location}`);
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
