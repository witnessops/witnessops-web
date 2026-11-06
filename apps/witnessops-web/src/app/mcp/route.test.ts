import assert from "node:assert/strict";
import test from "node:test";

import { DELETE, GET, OPTIONS, POST } from "./route";

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
  const response = OPTIONS(
    new Request("http://127.0.0.1:3001/mcp", { method: "OPTIONS" }),
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.match(
    response.headers.get("access-control-allow-methods") ?? "",
    /POST/,
  );
});

function guardedRequest(
  method: string,
  headers: Record<string, string> = {},
  url = "https://witnessops.com/mcp",
): Request {
  return new Request(url, {
    method,
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "x-forwarded-for": "192.0.2.35",
      ...headers,
    },
    ...(method === "POST"
      ? {
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 35,
            method: "tools/list",
            params: {},
          }),
        }
      : {}),
  });
}

test("MCP route allows public server clients without Origin and approved browser origins", async () => {
  for (const origin of [undefined, "https://witnessops.com", "https://chatgpt.com"]) {
    const response = await POST(
      guardedRequest("POST", origin ? { origin } : {}),
    );
    assert.equal(response.status, 200, origin ?? "no Origin");
    const payload = await response.json();
    assert.equal(payload.error, undefined);
    assert.equal(payload.result.tools.length, 4);
  }
});

test("MCP route rejects invalid origins on every exported HTTP method", async () => {
  const handlers = { GET, POST, DELETE, OPTIONS };
  for (const origin of [
    "https://untrusted.example",
    "https://witnessops.com.evil.example",
    "https://chatgpt.com.evil.example",
    "http://witnessops.com",
    "null",
    "not-an-origin",
    "https://user:password@witnessops.com",
    "https://witnessops.com/path",
    "https://witnessops.com?query=1",
    "https://witnessops.com#fragment",
    "https://witnessops.com https://chatgpt.com",
  ]) {
    for (const [method, handler] of Object.entries(handlers)) {
      const response = await handler(guardedRequest(method, { origin }));
      await response.body?.cancel();
      assert.equal(response.status, 403, `${method}: ${origin}`);
    }
  }
});

test("MCP route validates the actual Host rather than forwarded host claims", async () => {
  for (const host of [
    "untrusted.example",
    "witnessops.com.evil.example",
    "witnessops.com, untrusted.example",
    "user@witnessops.com",
    "https://witnessops.com",
    "witnessops.com/path",
  ]) {
    const response = await POST(
      guardedRequest("POST", {
        host,
        "x-forwarded-host": "witnessops.com",
      }),
    );
    await response.body?.cancel();
    assert.equal(response.status, 403, host);
  }
  const response = await POST(
    guardedRequest("POST", { host: "docs.witnessops.com" }),
  );
  assert.equal(response.status, 200);
  await response.body?.cancel();

  const untrustedUrl = await POST(
    guardedRequest(
      "POST",
      { "x-forwarded-host": "witnessops.com" },
      "https://untrusted.example/mcp",
    ),
  );
  await untrustedUrl.body?.cancel();
  assert.equal(untrustedUrl.status, 403);
});

test("MCP route permits loopback development clients but rejects them in production", async () => {
  for (const origin of ["http://localhost:3001", "http://127.0.0.1:3019"]) {
    const response = await POST(
      guardedRequest("POST", { origin }, "http://127.0.0.1:3001/mcp"),
    );
    assert.equal(response.status, 200, origin);
    await response.body?.cancel();
  }

  const previousNodeEnv = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  try {
    const localRequests: Record<string, string>[] = [
      { host: "127.0.0.1:3001" },
      { host: "localhost:3019" },
      { origin: "http://127.0.0.1:3001" },
      { origin: "http://localhost:3019" },
    ];
    for (const headers of localRequests) {
      const response = await POST(guardedRequest("POST", headers));
      await response.body?.cancel();
      assert.equal(response.status, 403, JSON.stringify(headers));
    }
    const response = await POST(guardedRequest("POST"));
    assert.equal(response.status, 200);
    await response.body?.cancel();
  } finally {
    Object.assign(process.env, { NODE_ENV: previousNodeEnv });
  }
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
    ["ask_sovereign", "ask_witnessops", "fetch", "search"],
  );
});

test("MCP route serves Ask Sovereign and its compatibility alias over Streamable HTTP", async () => {
  const results: unknown[] = [];
  for (const name of ["ask_sovereign", "ask_witnessops"]) {
    const response = await POST(
      mcpRequest(
        {
          jsonrpc: "2.0",
          id: 10,
          method: "tools/call",
          params: {
            name,
            arguments: { question: "I need help documenting one vendor action." },
          },
        },
        "192.0.2.14",
      ),
    );
    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      error?: unknown;
      result?: { isError?: boolean; structuredContent?: { status?: string } };
    };
    assert.equal(payload.error, undefined);
    assert.equal(payload.result?.isError, undefined);
    assert.equal(payload.result?.structuredContent?.status, "success");
    results.push(payload.result);
  }
  assert.deepEqual(results[0], results[1]);
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
