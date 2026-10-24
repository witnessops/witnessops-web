import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resetAuditForTests } from "./audit";
import { resetAdminMcpLimitsForTests } from "./rate-limit";

const ENV_KEYS = [
  "WITNESSOPS_ADMIN_MCP_ENABLED",
  "WITNESSOPS_ADMIN_MCP_TOKEN_CONFIG_FILE",
  "WITNESSOPS_ADMIN_MCP_AUDIT_DIR",
  "WITNESSOPS_ADMIN_MCP_MARKER_DIR",
  "WITNESSOPS_ADMIN_CORE_STORE_DIR",
  "WITNESSOPS_LOCAL_ADMIN_BYPASS",
] as const;

export const FIXTURE_NOW = Date.parse("2026-10-24T00:00:00.000Z");

export interface FixtureToken {
  clientId: string;
  token: string;
  hash: string;
  scopes: string[];
  issuedAt: string;
  expiresAt: string;
  allowedOrigins?: string[];
}

export interface AdminMcpFixture {
  root: string;
  token: string;
  clientId: string;
  storeDir: string;
  storeFile: string;
  auditDir: string;
  markerDir: string;
  configFile: string;
  now: number;
  cleanup: () => Promise<void>;
}

let ipSerial = 20;

export function nextIp(): string {
  ipSerial += 1;
  const third = (ipSerial >> 8) & 255;
  const fourth = ipSerial & 255;
  if (fourth === 0) return nextIp();
  return `203.0.${third}.${fourth}`;
}

export function syntheticToken(clientId: string): { token: string; hash: string } {
  const secret = randomBytes(32).toString("base64url");
  const token = `wo_mcp_${clientId}_${secret}`;
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export function defaultState(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    inboxItems: [],
    customers: [],
    productContracts: [],
    reviewRequests: [
      {
        id: "rev_1",
        state: "triage",
        proposedProductId: "sku_1",
        createdAt: "2026-10-23T00:00:00.000Z",
        updatedAt: "2026-10-23T00:00:00.000Z",
      },
    ],
    proofRuns: [],
    deliveries: [
      {
        id: "del_1",
        state: "sent",
        receiptId: "rcpt_1",
        sentAt: "2026-10-23T01:00:00.000Z",
        updatedAt: "2026-10-23T01:00:00.000Z",
      },
    ],
    receipts: [
      {
        id: "rcpt_1",
        structurallyValid: true,
        claimScope: "bounded sample",
        verifierResult: "recorded",
        updatedAt: "2026-10-23T02:00:00.000Z",
      },
    ],
    auditEvents: [],
    integrationAttempts: [],
    gmailSyncReceipts: [
      {
        syncRunId: "sync_1",
        status: "completed",
        startedAt: "2026-10-23T03:00:00.000Z",
        completedAt: "2026-10-23T03:05:00.000Z",
        counts: {
          threadsInspected: 1,
          messagesInspected: 2,
          inboxItemsCreated: 3,
          existingItemsUpdated: 4,
          noOp: 5,
          securityMessagesExcluded: 6,
          labelFailures: 7,
        },
        failures: [
          { scope: "list", retryable: true },
          { scope: "store", retryable: false },
        ],
      },
    ],
    idempotency: {},
    deliverySendReservations: {},
  };
}

export function initializeBody(): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: "1",
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "fixture", version: "0" },
    },
  });
}

export function toolCallBody(name: string, id = "1", args?: unknown): string {
  const params: Record<string, unknown> = { name };
  if (args !== undefined) params.arguments = args;
  return JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params });
}

export async function createAdminMcpFixture(options: {
  enabled?: string;
  scopes?: string[];
  extraTokens?: FixtureToken[];
  state?: unknown;
  createAudit?: boolean;
  createMarkers?: boolean;
  now?: number;
  allowedOrigins?: string[];
  issuedAt?: string;
  expiresAt?: string;
  clientId?: string;
  omitToken?: boolean;
  rawConfig?: unknown;
  auditDir?: string;
  markerDir?: string;
} = {}): Promise<AdminMcpFixture> {
  resetAdminMcpLimitsForTests();
  resetAuditForTests();
  const saved = new Map<string, string | undefined>();
  for (const key of ENV_KEYS) saved.set(key, process.env[key]);
  const root = await mkdtemp(path.join(os.tmpdir(), "admin-mcp-"));
  const storeDir = path.join(root, "store");
  const auditDir = options.auditDir ?? path.join(root, "audit");
  const markerDir = options.markerDir ?? path.join(root, "markers");
  const configFile = path.join(root, "tokens.json");
  await mkdir(storeDir);
  if (options.createAudit !== false && options.auditDir === undefined) await mkdir(auditDir);
  if (options.createMarkers !== false && options.markerDir === undefined) {
    await mkdir(path.join(markerDir, "revoked-mcp-clients"), { recursive: true });
  }
  const now = options.now ?? FIXTURE_NOW;
  const clientId = options.clientId ?? "reader";
  const minted = syntheticToken(clientId);
  const issuedAt = options.issuedAt ?? new Date(now - 60_000).toISOString();
  const expiresAt = options.expiresAt ?? new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString();
  const primary: FixtureToken = {
    clientId,
    token: minted.token,
    hash: minted.hash,
    scopes: options.scopes ?? [
      "health:read",
      "counts:read",
      "sync:read",
      "reviews:read",
      "deliveries:read",
      "receipts:read",
    ],
    issuedAt,
    expiresAt,
    allowedOrigins: options.allowedOrigins,
  };
  const tokens = options.omitToken ? [...(options.extraTokens ?? [])] : [primary, ...(options.extraTokens ?? [])];
  const config = options.rawConfig ?? {
    tokens: tokens.map((entry) => ({
      clientId: entry.clientId,
      tokenHash: entry.hash,
      scopes: entry.scopes,
      issuedAt: entry.issuedAt,
      expiresAt: entry.expiresAt,
      ...(entry.allowedOrigins ? { allowedOrigins: entry.allowedOrigins } : {}),
    })),
  };
  await writeFile(configFile, JSON.stringify(config));
  await writeFile(path.join(storeDir, "core-state.json"), JSON.stringify(options.state ?? defaultState()));
  process.env.WITNESSOPS_ADMIN_MCP_ENABLED = options.enabled ?? "1";
  process.env.WITNESSOPS_ADMIN_MCP_TOKEN_CONFIG_FILE = configFile;
  process.env.WITNESSOPS_ADMIN_MCP_AUDIT_DIR = auditDir;
  process.env.WITNESSOPS_ADMIN_MCP_MARKER_DIR = markerDir;
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = storeDir;
  delete process.env.WITNESSOPS_LOCAL_ADMIN_BYPASS;
  return {
    root,
    token: minted.token,
    clientId,
    storeDir,
    storeFile: path.join(storeDir, "core-state.json"),
    auditDir,
    markerDir,
    configFile,
    now,
    cleanup: async () => {
      for (const key of ENV_KEYS) {
        const value = saved.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      await rm(root, { recursive: true, force: true });
    },
  };
}

export function mcpRequest(
  fixture: AdminMcpFixture,
  init: {
    method?: string;
    token?: string | null;
    origin?: string;
    host?: string;
    forwardedHost?: string;
    ip?: string;
    body?: BodyInit | null;
    cookie?: string;
    contentType?: string | null;
  } = {},
): Request {
  const headers = new Headers();
  headers.set("host", init.host ?? "witnessops.com");
  if (init.contentType !== null) headers.set("content-type", init.contentType ?? "application/json");
  headers.set("x-forwarded-for", init.ip ?? nextIp());
  if (init.forwardedHost) headers.set("x-forwarded-host", init.forwardedHost);
  if (init.token !== null) headers.set("authorization", `Bearer ${init.token ?? fixture.token}`);
  if (init.origin) headers.set("origin", init.origin);
  if (init.cookie) headers.set("cookie", init.cookie);
  const method = init.method ?? "POST";
  const bodyless = method === "GET" || method === "HEAD";
  return new Request("https://witnessops.com/api/agent/mcp", {
    method,
    headers,
    body: bodyless ? undefined : init.body === undefined ? initializeBody() : init.body ?? undefined,
  });
}

export async function readJson(response: Response): Promise<Record<string, unknown>> {
  return await response.json() as Record<string, unknown>;
}

export function assertNoCors(response: Response): void {
  for (const [name] of response.headers) {
    if (name.toLowerCase().startsWith("access-control-")) {
      throw new Error(`unexpected CORS header ${name}`);
    }
  }
}
