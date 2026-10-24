import "server-only";

import {
  InvalidRequestBodyEncodingError,
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request-body";

import {
  findEntry,
  McpPrincipal,
  originAllowed,
  parseClientId,
  readBearer,
} from "./auth";
import {
  assertAuditDirectory,
  digestArguments,
  noteAuthFailureAudit,
  writeAuditEvent,
} from "./audit";
import { isAdminMcpEnabled, loadTokenConfig, type LoadedTokenConfig } from "./config";
import {
  ADMIN_MCP_HOST,
  ADMIN_MCP_TOOLS,
  BODY_LIMIT_BYTES,
  DEFAULT_PROTOCOL_VERSION,
  PROTOCOL_VERSIONS,
  RESPONSE_LIMIT_BYTES,
  SERVER_INFO,
  TOOL_ANNOTATIONS,
  TOOL_INPUT_SCHEMA,
  type AdminMcpToolName,
} from "./constants";
import { AdminMcpDenial, denialResponse, jsonResponse, newRequestId } from "./errors";
import {
  authFailureBlocked,
  consumeClient,
  consumePreAuthIp,
  noteAuthFailure,
  releaseInFlight,
  reserveRows,
  tryAcquire,
} from "./rate-limit";
import { inspectMarkers } from "./revocation";
import { redactSerialized } from "./sanitize";
import { runNamedTool } from "./tools";

/**
 * Gate order for a caller that is under the in-memory limits:
 * flag, kill/revocation marker, body size, host, origin, bearer, tool scope.
 * Pre-auth IP and failed-auth block run after the marker check and before the
 * body is read, so a flooded or blocked address is not buffered. Under those
 * limits, body size is still decided before host, origin, and the bearer.
 * Limits are in-memory best effort and reset on process restart.
 */

export interface AdminMcpDeps {
  now: () => number;
  loadTokenConfig: () => Promise<LoadedTokenConfig>;
  beforeTool: () => Promise<void>;
}

const defaultDeps: AdminMcpDeps = {
  now: () => Date.now(),
  loadTokenConfig,
  beforeTool: async () => undefined,
};

export function handleAdminMcpMethod(_request: Request): Response {
  if (!isAdminMcpEnabled()) {
    return denialResponse(new AdminMcpDenial(404, "not_found"), newRequestId());
  }
  return denialResponse(
    new AdminMcpDenial(405, "method_not_allowed", { allow: "POST" }),
    newRequestId(),
  );
}

export async function handleAdminMcpPost(
  request: Request,
  overrides?: Partial<AdminMcpDeps>,
): Promise<Response> {
  const requestId = newRequestId();
  const deps: AdminMcpDeps = { ...defaultDeps, ...overrides };
  try {
    return await handlePost(request, requestId, deps);
  } catch (error) {
    if (error instanceof AdminMcpDenial) return denialResponse(error, requestId);
    return denialResponse(new AdminMcpDenial(503, "unavailable"), requestId);
  }
}

function rateLimited(retryAfterSeconds: number): AdminMcpDenial {
  return new AdminMcpDenial(429, "rate_limited", { "retry-after": String(retryAfterSeconds) });
}

function hostAllowed(request: Request): boolean {
  const host = request.headers.get("host")?.trim().toLowerCase() ?? "";
  if (host !== ADMIN_MCP_HOST) return false;
  const forwarded = request.headers.get("x-forwarded-host");
  if (!forwarded) return true;
  const first = forwarded.split(",")[0]?.trim().toLowerCase() ?? "";
  return first === ADMIN_MCP_HOST;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isToolName(value: string): value is AdminMcpToolName {
  return ADMIN_MCP_TOOLS.some((tool) => tool.name === value);
}

interface ParsedRpc {
  method: string;
  id: string | number | null;
  params: unknown;
  notification: boolean;
}

function parseRpc(text: string): ParsedRpc {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new AdminMcpDenial(400, "bad_request");
  }
  const record = asRecord(value);
  if (!record || Array.isArray(value) || record.jsonrpc !== "2.0" || typeof record.method !== "string") {
    throw new AdminMcpDenial(400, "bad_request");
  }
  if (record.method.length === 0 || record.method.length > 64) {
    throw new AdminMcpDenial(400, "bad_request");
  }
  const hasId = Object.hasOwn(record, "id");
  let id: string | number | null = null;
  if (hasId) {
    if (typeof record.id === "number" && Number.isSafeInteger(record.id)) id = record.id;
    else if (typeof record.id === "string" && /^[A-Za-z0-9._:-]{1,64}$/.test(record.id)) id = record.id;
    else throw new AdminMcpDenial(400, "bad_request");
  }
  return { method: record.method, id, params: record.params, notification: !hasId };
}

function knownMethod(method: string): boolean {
  return (
    method === "initialize" ||
    method === "ping" ||
    method === "tools/list" ||
    method === "tools/call" ||
    method === "notifications/initialized"
  );
}

function auditTool(rpc: ParsedRpc): string {
  if (rpc.method === "tools/call") {
    const params = asRecord(rpc.params);
    const name = params && typeof params.name === "string" ? params.name : "";
    return isToolName(name) ? name : "none";
  }
  if (knownMethod(rpc.method)) return rpc.method;
  return "none";
}

function emptyParams(params: unknown): boolean {
  if (params === undefined) return true;
  const record = asRecord(params);
  return record !== null && Object.keys(record).length === 0;
}

function negotiateVersion(params: unknown): string {
  const record = asRecord(params);
  const requested = record && typeof record.protocolVersion === "string" ? record.protocolVersion : "";
  return (PROTOCOL_VERSIONS as readonly string[]).includes(requested)
    ? requested
    : DEFAULT_PROTOCOL_VERSION;
}

function toolList(principal: McpPrincipal): unknown {
  return {
    tools: ADMIN_MCP_TOOLS.filter((tool) => principal.scopes.includes(tool.scope)).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: TOOL_INPUT_SCHEMA,
      annotations: TOOL_ANNOTATIONS,
    })),
  };
}

async function perform(
  rpc: ParsedRpc,
  principal: McpPrincipal,
  now: number,
): Promise<{ status: number; serialized: string; ids: string[]; redactions: number; rows: number }> {
  if (rpc.method === "notifications/initialized") {
    return { status: 202, serialized: "", ids: [], redactions: 0, rows: 0 };
  }
  if (rpc.notification) throw new AdminMcpDenial(400, "bad_request");
  if (rpc.method === "initialize") {
    const result = {
      protocolVersion: negotiateVersion(rpc.params),
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
    };
    return {
      status: 200,
      serialized: JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result }),
      ids: [],
      redactions: 0,
      rows: 0,
    };
  }
  if (rpc.method === "ping") {
    if (!emptyParams(rpc.params)) throw new AdminMcpDenial(400, "bad_request");
    return {
      status: 200,
      serialized: JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result: {} }),
      ids: [],
      redactions: 0,
      rows: 0,
    };
  }
  if (rpc.method === "tools/list") {
    if (!emptyParams(rpc.params)) throw new AdminMcpDenial(400, "bad_request");
    return {
      status: 200,
      serialized: JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result: toolList(principal) }),
      ids: [],
      redactions: 0,
      rows: 0,
    };
  }
  if (rpc.method === "tools/call") {
    const params = asRecord(rpc.params);
    const name = params && typeof params.name === "string" ? params.name : "";
    if (!isToolName(name)) throw new AdminMcpDenial(400, "bad_request");
    if (params && Object.hasOwn(params, "arguments") && !emptyParams(params.arguments)) {
      throw new AdminMcpDenial(400, "bad_request");
    }
    const tool = await runNamedTool(name, principal, now);
    const result = {
      content: [{ type: "text", text: JSON.stringify(tool.body) }],
      structuredContent: tool.body,
      isError: false,
    };
    return {
      status: 200,
      serialized: JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result }),
      ids: tool.returnedIds,
      redactions: tool.redactions,
      rows: tool.rows,
    };
  }
  throw new AdminMcpDenial(400, "bad_request");
}

async function dispatch(
  text: string,
  principal: McpPrincipal,
  hmacKey: Buffer,
  requestId: string,
  deps: AdminMcpDeps,
): Promise<Response> {
  const rpc = parseRpc(text);
  if (!knownMethod(rpc.method)) throw new AdminMcpDenial(400, "bad_request");
  await assertAuditDirectory();
  const now = deps.now();
  const tool = auditTool(rpc);
  const argsDigest = digestArguments(hmacKey, rpc.params ?? {});
  await writeAuditEvent(
    {
      kind: "intent",
      requestId,
      clientId: principal.clientId,
      tool,
      resultCode: "started",
      argsDigest,
    },
    now,
  );
  await deps.beforeTool();

  let performed: Awaited<ReturnType<typeof perform>> | null = null;
  let denial: AdminMcpDenial | null = null;
  let resultCode = "ok";
  try {
    performed = await perform(rpc, principal, now);
  } catch (error) {
    if (error instanceof AdminMcpDenial) {
      denial = error;
      resultCode = error.code === "forbidden" ? "forbidden" : error.code === "bad_request" ? "bad_request" : "unavailable";
    } else if (error instanceof Error && error.message === "output") {
      denial = new AdminMcpDenial(503, "unavailable");
      resultCode = "tool_error";
    } else {
      denial = new AdminMcpDenial(503, "unavailable");
      resultCode = "tool_error";
    }
  }

  let redactions = performed?.redactions ?? 0;
  let bytes = 0;
  if (performed && performed.status === 200) {
    const scanned = redactSerialized(performed.serialized);
    if (scanned.redactions > 0) {
      redactions += scanned.redactions;
      try {
        JSON.parse(scanned.text);
        performed = { ...performed, serialized: scanned.text };
      } catch {
        denial = new AdminMcpDenial(503, "unavailable");
        resultCode = "tool_error";
        performed = null;
      }
    }
  }
  if (performed) bytes = Buffer.byteLength(performed.serialized);
  if (performed && bytes > RESPONSE_LIMIT_BYTES) {
    denial = new AdminMcpDenial(503, "unavailable");
    resultCode = "response_too_large";
    performed = null;
  }
  if (performed && performed.rows > 0 && !reserveRows(principal.clientId, performed.rows, now)) {
    denial = rateLimited(60);
    resultCode = "budget_exceeded";
    performed = null;
  }

  try {
    await writeAuditEvent(
      {
        kind: "outcome",
        requestId,
        clientId: principal.clientId,
        tool,
        resultCode,
        argsDigest,
        returnedIds: performed?.ids ?? [],
        bytes,
        redactions,
      },
      deps.now(),
    );
  } catch {
    throw new AdminMcpDenial(503, "unavailable");
  }
  if (denial) throw denial;
  if (!performed) throw new AdminMcpDenial(503, "unavailable");
  if (performed.status === 202) {
    return new Response(null, {
      status: 202,
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-request-id": requestId,
      },
    });
  }
  return jsonResponse(200, performed.serialized, requestId);
}

async function handlePost(request: Request, requestId: string, deps: AdminMcpDeps): Promise<Response> {
  if (!isAdminMcpEnabled()) return denialResponse(new AdminMcpDenial(404, "not_found"), requestId);
  const marker = await inspectMarkers(request);
  if (marker.kind === "unavailable") throw new AdminMcpDenial(503, "unavailable");
  if (marker.kind === "revoked") throw new AdminMcpDenial(401, "unauthorized");

  const ipLimit = consumePreAuthIp(request);
  if (!ipLimit.ok) throw rateLimited(ipLimit.retryAfterSeconds);
  const now = deps.now();
  const blocked = authFailureBlocked(request, now);
  if (!blocked.ok) throw rateLimited(blocked.retryAfterSeconds);

  let text = "";
  try {
    text = await readBoundedRequestText(request, BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) throw new AdminMcpDenial(413, "payload_too_large");
    if (error instanceof InvalidRequestBodyEncodingError) throw new AdminMcpDenial(400, "bad_request");
    throw new AdminMcpDenial(400, "bad_request");
  }
  if (!hostAllowed(request)) throw new AdminMcpDenial(403, "host_rejected");

  const config = await deps.loadTokenConfig();
  const origin = request.headers.has("origin") ? request.headers.get("origin") : null;
  const bearer = readBearer(request);
  const entry = config.ok ? findEntry(config.tokens, parseClientId(bearer)) : undefined;
  if (!originAllowed(origin, entry)) throw new AdminMcpDenial(403, "origin_rejected");

  const principal = config.ok && bearer
    ? McpPrincipal.fromVerifiedToken(bearer, config.tokens, now)
    : null;
  if (!principal || !config.ok) {
    noteAuthFailure(request, now);
    try {
      await noteAuthFailureAudit(now);
    } catch {
      // A failed auth summary must not change the generic 401 or include a path.
    }
    throw new AdminMcpDenial(401, "unauthorized");
  }

  const clientLimit = consumeClient(principal.clientId);
  if (!clientLimit.ok) throw rateLimited(clientLimit.retryAfterSeconds);
  if (!tryAcquire(principal.clientId)) throw rateLimited(1);
  try {
    return await dispatch(text, principal, config.hmacKey, requestId, deps);
  } finally {
    releaseInFlight(principal.clientId);
  }
}
