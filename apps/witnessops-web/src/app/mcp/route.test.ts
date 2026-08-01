import assert from "node:assert/strict";
import test from "node:test";

import { OPTIONS, POST } from "./route";

function mcpRequest(body: unknown, forwardedFor: string): Request {
  return new Request("http://127.0.0.1:3001/mcp", {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "x-forwarded-for": forwardedFor,
    },
    body: JSON.stringify(body),
  });
}

test("MCP route answers CORS preflight", () => {
  const response = OPTIONS();
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.match(
    response.headers.get("access-control-allow-methods") ?? "",
    /POST/,
  );
});

test("MCP route completes initialization over Streamable HTTP", async () => {
  const response = await POST(
    mcpRequest(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "witnessops-http-test", version: "1.0.0" },
        },
      },
      "192.0.2.10",
    ),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);

  const payload = (await response.json()) as {
    result?: { serverInfo?: { name?: string } };
  };
  assert.equal(payload.result?.serverInfo?.name, "witnessops-public-knowledge");
});

test("MCP route advertises the tool list over Streamable HTTP", async () => {
  const response = await POST(
    mcpRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      },
      "192.0.2.11",
    ),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    result?: { tools?: Array<{ name?: string }> };
  };
  assert.deepEqual(
    payload.result?.tools?.map((tool) => tool.name).sort(),
    ["ask_witnessops", "fetch", "search"],
  );
});

test("MCP route rejects an oversized body without Content-Length", async () => {
  const response = await POST(
    mcpRequest(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "oversized-test", version: "1.0.0" },
          padding: "x".repeat(128 * 1024),
        },
      },
      "192.0.2.12",
    ),
  );

  assert.equal(response.status, 413);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  const payload = (await response.json()) as {
    error?: { code?: number; message?: string };
  };
  assert.equal(payload.error?.code, -32000);
  assert.match(payload.error?.message ?? "", /too large/i);
});

test("MCP route returns a JSON-RPC server error when rate limited", async () => {
  let response: Response | undefined;
  for (let index = 0; index <= 120; index += 1) {
    response = await POST(
      mcpRequest(
        { jsonrpc: "2.0", id: index, method: "tools/list", params: {} },
        "192.0.2.13",
      ),
    );
  }

  assert.equal(response?.status, 429);
  assert.ok(response?.headers.get("retry-after"));
  const payload = (await response?.json()) as {
    error?: { code?: number; message?: string };
  };
  assert.equal(payload.error?.code, -32000);
  assert.match(payload.error?.message ?? "", /rate limit/i);
});
