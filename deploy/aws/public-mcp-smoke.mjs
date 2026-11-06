#!/usr/bin/env node
// Explicit-target, read-only public MCP acceptance. No credentials or SDK install.
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const PROTOCOL_VERSION = "2025-06-18";
const MAX_RESPONSE_BYTES = 512 * 1024;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const DIRECTORY_IDS = new Set([
  "docs:evidence",
  "docs:evidence/receipts",
  "docs:evidence/receipt-spec",
  "docs:how-it-works/verification",
]);

export function validateBaseUrl(value) {
  const url = new URL(value);
  assert(!url.username && !url.password && !url.search && !url.hash && url.pathname === "/",
    "base URL must be an origin without credentials, path, query or fragment");
  assert(url.protocol === "https:" || (url.protocol === "http:" &&
    LOOPBACK_HOSTS.has(url.hostname)),
  "base URL requires HTTPS, except for explicit loopback tests");
  return url.origin;
}

// Native fetch ignores Host overrides. Use a real HTTP request only for the
// explicit loopback image target, retaining production's canonical Host check.
function requestLoopback(url, init) {
  return new Promise((resolve, reject) => {
    const send = new URL(url).protocol === "https:" ? httpsRequest : httpRequest;
    const request = send(url, init, (response) => {
      const status = response.statusCode;
      if (status >= 300 && status < 400) {
        response.destroy();
        reject(new Error("redirected"));
        return;
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        for (const item of Array.isArray(value) ? value : [value]) {
          if (item !== undefined) headers.append(name, item);
        }
      }
      const noBody = status === 204 || status === 304;
      if (noBody) response.resume();
      resolve(new Response(noBody ? null : Readable.toWeb(response), { status, headers }));
    });
    request.on("error", reject);
    request.end(init.body);
  });
}

export async function probePublicMcp(baseUrl, { timeoutMs = 10_000 } = {}) {
  const origin = validateBaseUrl(baseUrl);
  const loopback = LOOPBACK_HOSTS.has(new URL(origin).hostname);
  assert(Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 30_000,
    "timeout must be between 1 and 30000 ms");
  const checks = [];
  let id = 0;

  async function request(path, init, expectedStatus, label, json = false) {
    let response;
    try {
      response = await (loopback ? requestLoopback : fetch)(`${origin}${path}`, {
        ...init, redirect: "error", signal: AbortSignal.timeout(timeoutMs),
        // Exercise the production host boundary when the exact image is local.
        headers: { ...init.headers, ...(loopback ? { host: "witnessops.com" } : {}) },
      });
    } catch {
      throw new Error(`${label}: request failed, redirected or timed out`);
    }
    if (response.status !== expectedStatus) {
      await response.body?.cancel();
      throw new Error(`${label}: expected HTTP ${expectedStatus}, received ${response.status}`);
    }
    if (!json) {
      await response.body?.cancel();
      checks.push(label);
      return;
    }
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "")) {
      await response.body?.cancel();
      throw new Error(`${label}: expected JSON response`);
    }
    const reader = response.body?.getReader();
    assert(reader, `${label}: missing response body`);
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) throw new Error("response too large");
        chunks.push(value);
      }
      const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
      checks.push(label);
      return payload;
    } catch {
      await reader.cancel().catch(() => {});
      throw new Error(`${label}: malformed, oversized or incomplete JSON response`);
    } finally {
      reader.releaseLock();
    }
  }

  async function rpc(path, method, params, label) {
    const requestId = ++id;
    const payload = await request(path, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-protocol-version": PROTOCOL_VERSION,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params }),
    }, 200, label, true);
    assert(payload.jsonrpc === "2.0" && payload.id === requestId, `${label}: invalid JSON-RPC envelope`);
    return payload;
  }

  async function call(path, name, args) {
    const label = `${path} ${name}`;
    const payload = await rpc(path, "tools/call", { name, arguments: args }, label);
    assert(!payload.error && payload.result && !payload.result.isError, `${label}: tool failed`);
    const result = payload.result;
    assert(result.structuredContent && Array.isArray(result.content), `${label}: missing structured result`);
    assert.equal(result.content.length, 1, `${label}: unexpected content blocks`);
    assert.equal(result.content[0].type, "text", `${label}: expected text compatibility result`);
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent,
      `${label}: text and structured results differ`);
    return result.structuredContent;
  }

  function document(item, directory) {
    assert(item && typeof item.id === "string" && typeof item.title === "string" && item.title.trim(),
      "invalid public document identity");
    const url = new URL(item.url);
    assert(url.origin === "https://witnessops.com" && /^\/docs(?:\/|$)/.test(url.pathname) &&
      !url.username && !url.password && !url.hash && !url.search, "invalid canonical document URL");
    if (directory) assert(DIRECTORY_IDS.has(item.id), "directory exposed a document outside its corpus");
  }

  for (const [path, name, tools] of [
    ["/mcp", "witnessops-public-knowledge", ["ask_sovereign", "ask_witnessops", "fetch", "search"]],
    ["/mcp/directory", "witnessops-public-directory", ["fetch", "search"]],
  ]) {
    await request(path, { method: "OPTIONS" }, 204, `${path} OPTIONS`);
    const initialized = await rpc(path, "initialize", {
      protocolVersion: PROTOCOL_VERSION, capabilities: {},
      clientInfo: { name: "witnessops-release-acceptance", version: "1.0.0" },
    }, `${path} initialize`);
    assert(!initialized.error && initialized.result?.serverInfo?.name === name &&
      initialized.result?.protocolVersion === PROTOCOL_VERSION, `${path}: wrong initialization result`);
    const listed = await rpc(path, "tools/list", {}, `${path} tools/list`);
    assert(!listed.error && Array.isArray(listed.result?.tools), `${path}: missing tool inventory`);
    assert.deepEqual(listed.result.tools.map((tool) => tool.name).sort(), tools, `${path}: unexpected tool inventory`);
    for (const tool of listed.result.tools) {
      assert(tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint === false,
        `${path}: tool is not declared read-only`);
    }
    const searched = await call(path, "search", { query: "verification receipts" });
    assert(Array.isArray(searched.results) && searched.results.length > 0 && searched.results.length <= 10,
      `${path}: search returned no usable bounded results`);
    for (const item of searched.results) document(item, path.endsWith("/directory"));
    const selected = searched.results[0];
    const fetched = await call(path, "fetch", { id: selected.id });
    document(fetched, path.endsWith("/directory"));
    assert(fetched.id === selected.id && fetched.url === selected.url &&
      typeof fetched.text === "string" && fetched.text.trim(), `${path}: fetch does not match selected document`);
  }

  const question = "I need help documenting one vendor action.";
  const guidance = await call("/mcp", "ask_sovereign", { question });
  assert(guidance.status === "success" && typeof guidance.answer === "string" && guidance.answer.trim() &&
    typeof guidance.limitation === "string" && guidance.limitation.includes("Public guidance only"),
  "Ask Sovereign lost its bounded guidance result");
  assert.deepEqual(await call("/mcp", "ask_witnessops", { question }), guidance,
    "Ask Sovereign compatibility alias differs");
  const unknown = await rpc("/mcp", "tools/call", { name: "witnessops_acceptance_unknown_tool", arguments: {} },
    "/mcp unknown tool rejection");
  assert(unknown.error || unknown.result?.isError === true, "unknown tool unexpectedly succeeded");
  await request("/api/agent/mcp", { method: "GET" }, 404, "private MCP disabled");
  return { scope: "public-mcp-http", base_url: origin, protocol_version: PROTOCOL_VERSION,
    observed_at: new Date().toISOString(), checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assert(process.argv.length === 4 && process.argv[2] === "--base-url",
      "usage: node deploy/aws/public-mcp-smoke.mjs --base-url ORIGIN");
    process.stdout.write(`${JSON.stringify(await probePublicMcp(process.argv[3]), null, 2)}\n`);
  } catch (error) {
    console.error(`PUBLIC_MCP_ACCEPTANCE_FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}
