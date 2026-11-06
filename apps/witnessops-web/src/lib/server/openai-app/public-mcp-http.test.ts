import assert from "node:assert/strict";
import test from "node:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createPublicMcpHttpHandler } from "./public-mcp-http";

function request(method = "tools/list", signal?: AbortSignal) {
  return new Request("http://127.0.0.1:3001/mcp", {
    method: "POST", signal,
    headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: {} }),
  });
}

function fixture() {
  let closed = 0;
  let created = 0;
  const factory = () => {
    created += 1;
    const server = new McpServer({ name: "http-budget-test", version: "1.0.0" });
    server.registerTool("fixture", { inputSchema: {} }, async () => ({ content: [{ type: "text", text: "fixture" }] }));
    const close = server.close.bind(server);
    server.close = async () => { closed += 1; await close(); };
    return server;
  };
  return { factory, closed: () => closed, created: () => created };
}

function stalledBody(signal?: AbortSignal) {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const init = {
    method: "POST", headers: { "content-type": "application/json" },
    body, signal, duplex: "half",
  } as RequestInit;
  return { request: new Request("http://127.0.0.1:3001/mcp", init), cancelled: () => cancelled };
}

test("body timeout cancels the reader before constructing an MCP server", async () => {
  const f = fixture();
  const handler = createPublicMcpHttpHandler(f.factory, "body-timeout-test", { requestTimeoutMs: 25 });
  const body = stalledBody();
  const response = await handler.handle(body.request);
  assert.equal(response.status, 408);
  assert.equal(body.cancelled(), true);
  assert.equal(f.created(), 0);
});

test("client abort cancels body reading and releases request capacity", async () => {
  const f = fixture();
  const handler = createPublicMcpHttpHandler(f.factory, "body-abort-test", { maxConcurrentRequests: 1 });
  const abort = new AbortController();
  const body = stalledBody(abort.signal);
  const pending = handler.handle(body.request);
  assert.equal((await handler.handle(request())).status, 503);
  abort.abort();
  assert.equal((await pending).status, 408);
  assert.equal(body.cancelled(), true);
  const recovered = await handler.handle(request());
  assert.equal(recovered.status, 200);
  assert.equal(f.closed(), 1);
});

test("JSON completion releases capacity without requiring client consumption", async () => {
  const f = fixture();
  const handler = createPublicMcpHttpHandler(f.factory, "json-cleanup-test", { maxConcurrentRequests: 1 });
  const first = await handler.handle(request());
  const second = await handler.handle(request());
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(f.closed(), 2);
  assert.equal((await first.json()).result.tools[0].name, "fixture");
});

test("response byte budget fails closed and closes the SDK server", async () => {
  const f = fixture();
  const handler = createPublicMcpHttpHandler(f.factory, "output-limit-test", { maxResponseBytes: 32 });
  const response = await handler.handle(request());
  assert.equal(response.status, 502);
  assert.match((await response.json()).error.message, /too large/);
  assert.equal(f.closed(), 1);
});

function streamRequest(signal?: AbortSignal) {
  return new Request("http://127.0.0.1:3001/mcp", { headers: { accept: "text/event-stream" }, signal });
}

test("SSE stays open until cancellation and its separate capacity is released", async () => {
  const f = fixture();
  const handler = createPublicMcpHttpHandler(f.factory, "sse-capacity-test", { maxConcurrentStreams: 1 });
  const first = await handler.handle(streamRequest());
  try {
    assert.equal(first.status, 200);
    assert.match(first.headers.get("content-type") ?? "", /text\/event-stream/);
    assert.equal(f.closed(), 0);
    const excess = await handler.handle(streamRequest());
    assert.equal(excess.status, 503);
    assert.equal(excess.headers.get("retry-after"), "1");
    // A held stream does not prevent ordinary JSON calls.
    assert.equal((await handler.handle(request())).status, 200);
  } finally {
    await first.body?.cancel();
  }
  const recovered = await handler.handle(streamRequest());
  assert.equal(recovered.status, 200);
  await recovered.body?.cancel();
  assert.equal(f.closed(), 4);
});

test("SSE lifetime ends an idle connection and closes the SDK server", async () => {
  const f = fixture();
  const handler = createPublicMcpHttpHandler(f.factory, "sse-timeout-test", { streamTimeoutMs: 25 });
  const response = await handler.handle(streamRequest());
  const reader = response.body!.getReader();
  assert.deepEqual(await reader.read(), { done: true, value: undefined });
  assert.equal(f.closed(), 1);
  reader.releaseLock();
});

test("request cancellation closes an SSE connection exactly once", async () => {
  const f = fixture();
  const handler = createPublicMcpHttpHandler(f.factory, "sse-abort-test");
  const abort = new AbortController();
  const response = await handler.handle(streamRequest(abort.signal));
  abort.abort();
  await response.body?.cancel();
  assert.equal(f.closed(), 1);
});

test("a stalled tool call times out, sanitizes failures and releases capacity", async () => {
  const f = fixture();
  const factory = () => {
    const server = f.factory();
    server.registerTool("stall", { inputSchema: {} }, () => new Promise(() => {}));
    return server;
  };
  const handler = createPublicMcpHttpHandler(factory, "tool-timeout-test", { requestTimeoutMs: 25, maxConcurrentRequests: 1 });
  const call = new Request("http://127.0.0.1:3001/mcp", {
    method: "POST",
    headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "stall", arguments: {} } }),
  });
  const response = await handler.handle(call);
  assert.equal(response.status, 408);
  assert.equal(f.closed(), 1);
  assert.equal((await handler.handle(request())).status, 200);
});
