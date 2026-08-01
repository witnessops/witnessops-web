import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createWitnessOpsMcpServer } from "@/lib/server/openai-app/witnessops-mcp-server";
import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 128 * 1024;
const MCP_RATE_LIMIT = { limit: 120, windowMs: 60_000 } as const;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, mcp-session-id, last-event-id, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
  "Cache-Control": "no-store",
} as const;

function jsonRpcError(
  status: number,
  code: number,
  message: string,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code, message },
      id: null,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
        ...extraHeaders,
      },
    },
  );
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function readBoundedRequestBody(
  request: Request,
): Promise<Request | null> {
  if (!request.body) return request;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
    signal: request.signal,
  });
}

async function handleMcp(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return jsonRpcError(413, -32000, "Request body is too large.");
  }

  const rateLimited = enforcePublicIntakeRateLimit(
    request,
    "mcp",
    MCP_RATE_LIMIT,
  );
  if (rateLimited) {
    return jsonRpcError(429, -32000, "Rate limit exceeded.", {
      "Retry-After": rateLimited.headers.get("retry-after") ?? "60",
    });
  }

  const boundedRequest = await readBoundedRequestBody(request);
  if (!boundedRequest) {
    return jsonRpcError(413, -32000, "Request body is too large.");
  }

  const server = createWitnessOpsMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return withCors(await transport.handleRequest(boundedRequest));
  } catch (error) {
    console.error(
      "[witnessops-mcp] request failed",
      error instanceof Error ? error.message : "unknown error",
    );
    await Promise.allSettled([transport.close(), server.close()]);
    return jsonRpcError(500, -32603, "Unable to handle MCP request.");
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export const GET = handleMcp;
export const POST = handleMcp;
export const DELETE = handleMcp;
