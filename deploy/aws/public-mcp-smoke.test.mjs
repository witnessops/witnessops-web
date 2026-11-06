import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { probePublicMcp, validateBaseUrl } from "./public-mcp-smoke.mjs";

const doc = { id: "docs:evidence/receipts", title: "Receipts", url: "https://witnessops.com/docs/evidence/receipts" };
const guidance = { status: "success", answer: "Bounded guidance.", limitation: "Public guidance only.", sources: [], route: null };

async function serve(t, handle) {
  const server = createServer(handle);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}`;
}

function app({ mutate, stalled = false } = {}) {
  return async (req, res) => {
    if (stalled) return;
    if (req.url === "/api/agent/mcp") { res.writeHead(404).end(); return; }
    if (req.url === "/") { res.writeHead(200).end("website works"); return; }
    if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
    let body = "";
    for await (const chunk of req) body += chunk;
    const message = JSON.parse(body);
    const directory = req.url.endsWith("/directory");
    let result;
    if (message.method === "initialize") result = {
      protocolVersion: "2025-06-18",
      serverInfo: { name: directory ? "witnessops-public-directory" : "witnessops-public-knowledge" },
    };
    else if (message.method === "tools/list") result = {
      tools: (directory ? ["fetch", "search"] : ["ask_sovereign", "ask_witnessops", "fetch", "search"])
        .map((name) => ({ name, annotations: { readOnlyHint: true, destructiveHint: false } })),
    };
    else {
      const name = message.params.name;
      const value = name === "search" ? { results: [doc] } : name === "fetch" ? { ...doc, text: "Public document." } : guidance;
      result = name === "witnessops_acceptance_unknown_tool" ? { isError: true, content: [] } : {
        content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value,
      };
    }
    const payload = { jsonrpc: "2.0", id: message.id, result };
    if (mutate?.(req, res, message, payload)) return;
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(payload));
  };
}

test("semantic MCP probe passes both profiles and the retained private-route denial", async (t) => {
  const origin = await serve(t, app());
  const result = await probePublicMcp(origin);
  assert.equal(result.base_url, origin);
  assert.equal(result.scope, "public-mcp-http");
  assert.equal(result.checks.length, 14);
});

test("loopback acceptance uses the fixed production Host on every request", async (t) => {
  const hosts = [];
  const handler = app();
  const origin = await serve(t, (req, res) => {
    hosts.push(req.headers.host);
    if (req.headers.host !== "witnessops.com") { res.writeHead(403).end(); return; }
    return handler(req, res);
  });
  await probePublicMcp(origin);
  assert.equal(hosts.length, 14);
  assert(hosts.every((host) => host === "witnessops.com"));
});

test("non-loopback acceptance retains the target's natural Host", async (t) => {
  let headers;
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    headers = new Headers(init.headers);
    return new Response(null, { status: 503 });
  });
  await assert.rejects(probePublicMcp("https://candidate.example"), /received 503/);
  assert.equal(headers.has("host"), false);
});

test("a healthy app behind a proxy that closes /mcp fails public acceptance", async (t) => {
  const application = await serve(t, app());
  await probePublicMcp(application);
  const proxy = await serve(t, async (req, res) => {
    if (req.url.startsWith("/mcp")) { res.writeHead(404, { server: "Caddy" }).end(); return; }
    const response = await fetch(`${application}${req.url}`);
    res.writeHead(response.status).end(await response.text());
  });
  assert.equal((await fetch(`${proxy}/`)).status, 200);
  await assert.rejects(probePublicMcp(proxy), /\/mcp OPTIONS: expected HTTP 204, received 404/);
});

test("HTTP 200 HTML, malformed JSON and oversized responses cannot pass", async (t) => {
  for (const [name, contentType, body, expected] of [
    ["HTML", "text/html", "<h1>website shell</h1>", /expected JSON/],
    ["malformed", "application/json", "{", /malformed/],
    ["oversized", "application/json", JSON.stringify({ padding: "x".repeat(512 * 1024) }), /oversized/],
  ]) await t.test(name, async (t) => {
    const origin = await serve(t, app({ mutate: (_req, res) => {
      res.writeHead(200, { "content-type": contentType }).end(body); return true;
    } }));
    await assert.rejects(probePublicMcp(origin), expected);
  });
});

test("protocol, tool and corpus failures cannot hide behind HTTP 200", async (t) => {
  for (const [name, mutate, expected] of [
    ["wrong response ID", (_req, _res, _message, payload) => { payload.id = 999; }, /envelope/],
    ["wrong server", (_req, _res, message, payload) => {
      if (message.method === "initialize") payload.result.serverInfo.name = "other";
    }, /initialization/],
    ["tool error", (_req, _res, message, payload) => {
      if (message.method === "tools/call") payload.result.isError = true;
    }, /tool failed/],
    ["empty corpus", (_req, _res, message, payload) => {
      if (message.params?.name === "search") {
        payload.result.structuredContent = { results: [] };
        payload.result.content[0].text = JSON.stringify(payload.result.structuredContent);
      }
    }, /no usable bounded results/],
    ["alias drift", (_req, _res, message, payload) => {
      if (message.params?.name === "ask_witnessops") {
        payload.result.structuredContent = { ...guidance, answer: "Different answer" };
        payload.result.content[0].text = JSON.stringify(payload.result.structuredContent);
      }
    }, /alias differs/],
    ["directory widens", (req, _res, message, payload) => {
      if (req.url.endsWith("/directory") && message.params?.name === "search") {
        payload.result.structuredContent = { results: [{ ...doc, id: "docs:pricing" }] };
        payload.result.content[0].text = JSON.stringify(payload.result.structuredContent);
      }
    }, /outside its corpus/],
  ]) await t.test(name, async (t) => {
    const origin = await serve(t, app({ mutate }));
    await assert.rejects(probePublicMcp(origin), expected);
  });
});

test("probe fails within its request deadline", async (t) => {
  const origin = await serve(t, app({ stalled: true }));
  await assert.rejects(probePublicMcp(origin, { timeoutMs: 30 }), /timed out/);
});

test("probe refuses redirects without contacting the redirected host", async (t) => {
  let redirectedCalls = 0;
  const destination = await serve(t, (_req, res) => { redirectedCalls++; res.writeHead(204).end(); });
  const origin = await serve(t, (_req, res) => res.writeHead(307, { location: destination }).end());
  await assert.rejects(probePublicMcp(origin), /redirected/);
  assert.equal(redirectedCalls, 0);
});

test("CLI requires an explicit origin and rejects ambiguous targets", () => {
  for (const value of ["http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com?x=1", "https://example.com#x"])
    assert.throws(() => validateBaseUrl(value));
  assert.equal(validateBaseUrl("https://witnessops.com"), "https://witnessops.com");
  const result = spawnSync(process.execPath, [new URL("./public-mcp-smoke.mjs", import.meta.url).pathname], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /usage:.*--base-url/);
});

test("built-image and public-edge acceptance invoke the same explicit-target probe", () => {
  const runtime = readFileSync(new URL("./test-runtime-image.sh", import.meta.url), "utf8");
  assert.match(runtime, /node deploy\/aws\/public-mcp-smoke\.mjs --base-url "\$\{base\}"/);
  const workflow = readFileSync(new URL("../../.github/workflows/aws-release-reusable.yml", import.meta.url), "utf8");
  const job = workflow.split("\n  verify_production_mcp:\n")[1]?.split(/\n  \w+:\n/)[0];
  assert(job, "public MCP acceptance job missing");
  assert.match(job, /if: needs\.validate\.outputs\.operation == 'deploy-production'/);
  assert.match(job, /needs: \[validate, deploy_production\]/);
  assert.match(job, /permissions:\n      contents: read/);
  assert.match(job, /persist-credentials: false/);
  assert.match(job, /node deploy\/aws\/public-mcp-smoke\.mjs --base-url https:\/\/witnessops\.com/);
  assert.doesNotMatch(job, /id-token:|environment:|configure-aws-credentials|secrets\.|ssm |continue-on-error/);
});
