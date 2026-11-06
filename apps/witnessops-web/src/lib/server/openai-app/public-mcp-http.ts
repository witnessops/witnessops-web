import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { enforcePublicIntakeRateLimit } from "@/lib/server/public-intake-rate-limit";

const MAX_REQUEST_BYTES = 128 * 1024;
const RATE_LIMIT = { limit: 120, windowMs: 60_000 } as const;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, mcp-session-id, last-event-id, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
  "Cache-Control": "no-store",
} as const;

const DEFAULT_LIMITS = {
  requestTimeoutMs: 15_000,
  streamTimeoutMs: 60_000,
  maxResponseBytes: 1024 * 1024,
  maxConcurrentRequests: 32,
  maxConcurrentStreams: 8,
};

class HttpFailure extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function failure(status: number, message: string, headers: HeadersInit = {}) {
  return new Response(JSON.stringify({
    jsonrpc: "2.0", error: { code: status === 500 ? -32603 : -32000, message }, id: null,
  }), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...headers } });
}

function developmentLoopback(value: string): boolean {
  return (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
    && /^(?:localhost|127\.0\.0\.1)(?::[1-9][0-9]{0,4})?$/.test(value)
    && Number(value.split(":")[1] ?? 80) <= 65535;
}

function allowedRequest(request: Request): boolean {
  // Next may use an internal URL behind the proxy. Validate the actual Host
  // when present; never let a caller's X-Forwarded-Host replace it.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (!/^(?:witnessops\.com|docs\.witnessops\.com)(?::443)?$/i.test(host)
    && !developmentLoopback(host)) return false;

  const origin = request.headers.get("origin");
  if (origin === null) return true; // Server clients normally have no Origin.
  if (["https://witnessops.com", "https://chatgpt.com"].includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.origin === origin && url.protocol === "http:" && developmentLoopback(url.host);
  } catch {
    return false;
  }
}

function abortable<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    void pending.catch(() => {});
    return Promise.reject(signal.reason);
  }
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    pending.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

async function readBytes(body: ReadableStream<Uint8Array> | null, limit: number, signal: AbortSignal, overflow: HttpFailure) {
  if (!body) return undefined;
  const reader = body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    signal.throwIfAborted();
    while (true) {
      const item = await abortable(reader.read(), signal);
      signal.throwIfAborted();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > limit) throw overflow;
      chunks.push(item.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } catch (error) {
    cancel();
    throw error;
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

/** One policy per public profile; counters are process-local, not global quotas. */
export function createPublicMcpHttpHandler(
  createServer: () => McpServer,
  namespace: string,
  overrides: Partial<typeof DEFAULT_LIMITS> = {},
) {
  const limits = { ...DEFAULT_LIMITS, ...overrides };
  let activeRequests = 0;
  let activeStreams = 0;

  function OPTIONS(request: Request): Response {
    return allowedRequest(request)
      ? new Response(null, { status: 204, headers: CORS_HEADERS })
      : failure(403, "Host or Origin is not allowed.");
  }

  async function handle(request: Request): Promise<Response> {
    if (!allowedRequest(request)) return failure(403, "Host or Origin is not allowed.");
    if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) {
      return failure(413, "Request body is too large.");
    }
    const limited = enforcePublicIntakeRateLimit(request, namespace, RATE_LIMIT);
    if (limited) return failure(429, "Rate limit exceeded.", { "Retry-After": limited.headers.get("retry-after") ?? "60" });
    if (activeRequests >= limits.maxConcurrentRequests) {
      return failure(503, "MCP capacity exceeded.", { "Retry-After": "1" });
    }

    activeRequests += 1;
    const abort = new AbortController();
    const onAbort = () => abort.abort(new HttpFailure(408, "Request cancelled."));
    request.signal.addEventListener("abort", onAbort, { once: true });
    if (request.signal.aborted) onAbort();
    let timer = setTimeout(() => abort.abort(new HttpFailure(408, "Request timed out.")), limits.requestTimeoutMs);
    let server: McpServer | undefined;
    let transport: WebStandardStreamableHTTPServerTransport | undefined;
    let streaming = false;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      clearTimeout(timer);
      request.signal.removeEventListener("abort", onAbort);
      activeRequests -= 1;
      if (streaming) activeStreams -= 1;
      // close() is idempotent; server.close also releases the attached transport.
      void Promise.allSettled([server?.close(), transport?.close()]);
    };

    try {
      const body = await readBytes(request.body, MAX_REQUEST_BYTES, abort.signal, new HttpFailure(413, "Request body is too large."));
      abort.signal.throwIfAborted();
      const bounded = new Request(request.url, {
        method: request.method, headers: request.headers, body, signal: abort.signal,
      });
      server = createServer();
      transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      await server.connect(transport);
      abort.signal.throwIfAborted();
      const response = await abortable(transport.handleRequest(bounded), abort.signal);
      const headers = new Headers(response.headers);
      for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);

      if (response.body && response.headers.get("content-type")?.includes("text/event-stream")) {
        if (activeStreams >= limits.maxConcurrentStreams) {
          void response.body.cancel().catch(() => {});
          return failure(503, "MCP stream capacity exceeded.", { "Retry-After": "1" });
        }
        streaming = true;
        activeStreams += 1;
        clearTimeout(timer);
        timer = setTimeout(() => abort.abort(new HttpFailure(408, "Stream lifetime exceeded.")), limits.streamTimeoutMs);
        const reader = response.body.getReader();
        let total = 0;
        let ended = false;
        let end: () => void;
        const finish = () => {
          if (ended) return;
          ended = true;
          abort.signal.removeEventListener("abort", end);
          void reader.cancel().catch(() => {});
          release();
        };
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            end = () => { if (!ended) { controller.close(); finish(); } };
            abort.signal.addEventListener("abort", end, { once: true });
            if (abort.signal.aborted) end();
          },
          async pull(controller) {
            try {
              const item = await reader.read();
              if (ended) return;
              if (item.done) { controller.close(); finish(); return; }
              total += item.value.byteLength;
              if (total > limits.maxResponseBytes) throw new Error("MCP stream size exceeded.");
              controller.enqueue(item.value);
            } catch {
              if (!ended) { controller.error(new Error("MCP stream ended.")); finish(); }
            }
          },
          cancel() { finish(); },
        });
        return new Response(stream, { status: response.status, headers });
      }

      const bytes = await readBytes(response.body, limits.maxResponseBytes, abort.signal, new HttpFailure(502, "MCP response is too large."));
      return new Response(bytes, { status: response.status, headers });
    } catch (error) {
      return error instanceof HttpFailure
        ? failure(error.status, error.message)
        : failure(500, "Unable to handle MCP request.");
    } finally {
      if (!streaming) release();
    }
  }

  return { handle, OPTIONS };
}
