import "server-only";

/** Phase 1 is inert unless this variable is exactly "1". */
export const ADMIN_MCP_FLAG = "WITNESSOPS_ADMIN_MCP_ENABLED";

/** File-mounted token Secret. Re-read on every request. Never an env value. */
export const ADMIN_MCP_TOKEN_CONFIG_FILE = "WITNESSOPS_ADMIN_MCP_TOKEN_CONFIG_FILE";

/**
 * Audit directory. Request handlers never create it. A missing directory
 * denies every tool call.
 */
export const ADMIN_MCP_AUDIT_DIR = "WITNESSOPS_ADMIN_MCP_AUDIT_DIR";

/**
 * Marker directory. Must already exist. Contains `mcp-disabled` and
 * `revoked-mcp-clients/<client>`. Request handlers never create it.
 */
export const ADMIN_MCP_MARKER_DIR = "WITNESSOPS_ADMIN_MCP_MARKER_DIR";

export const ADMIN_MCP_HOST = "witnessops.com";

export const ADMIN_MCP_SCOPES = [
  "health:read",
  "counts:read",
  "sync:read",
  "reviews:read",
  "deliveries:read",
  "receipts:read",
] as const;

export type AdminMcpScope = (typeof ADMIN_MCP_SCOPES)[number];

export const ADMIN_MCP_TOOLS = [
  {
    name: "health_get",
    scope: "health:read",
    description:
      "Reports enum component state and the latest Gmail sync state. No detail text.",
  },
  {
    name: "dashboard_counts",
    scope: "counts:read",
    description: "Reports collection counts only.",
  },
  {
    name: "sync_runs_list",
    scope: "sync:read",
    description:
      "Lists sync run ids, status, times, counts, failure scope, and failure counts.",
  },
  {
    name: "review_requests_list",
    scope: "reviews:read",
    description: "Lists review request ids, state, age, and product id.",
  },
  {
    name: "deliveries_list",
    scope: "deliveries:read",
    description: "Lists delivery ids, state, receipt presence, and sent status.",
  },
  {
    name: "receipts_list",
    scope: "receipts:read",
    description:
      "Lists receipt ids, structural validity, claim-scope presence, and verifier-result presence.",
  },
] as const;

export type AdminMcpToolName = (typeof ADMIN_MCP_TOOLS)[number]["name"];

export const ADMIN_MCP_TOOL_NAMES = ADMIN_MCP_TOOLS.map((tool) => tool.name);

export const BODY_LIMIT_BYTES = 128 * 1024;
export const RESPONSE_LIMIT_BYTES = 64 * 1024;
export const ROW_LIMIT = 50;
export const DAILY_ROW_BUDGET = 2000;
export const PRE_AUTH_IP_LIMIT = 120;
export const PRE_AUTH_WINDOW_MS = 60_000;
export const AUTH_FAILURE_LIMIT = 10;
export const AUTH_FAILURE_WINDOW_MS = 5 * 60_000;
export const AUTH_FAILURE_BLOCK_MS = 15 * 60_000;
export const CLIENT_LIMIT = 30;
export const CLIENT_WINDOW_MS = 60_000;
export const MAX_IN_FLIGHT = 2;
export const TOKEN_MAX_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const TOKEN_DEFAULT_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;
export const CONFIG_MAX_BYTES = 64 * 1024;
export const STORE_MAX_BYTES = 32 * 1024 * 1024;
export const AUDIT_FILE_MAX_BYTES = 1024 * 1024;
/** Operator retention. Request handlers do not delete audit files. */
export const AUDIT_RETENTION_DAYS = 90;

export const PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07",
] as const;

export const DEFAULT_PROTOCOL_VERSION = "2025-03-26";

export const SERVER_INFO = {
  name: "witnessops-admin-mcp",
  version: "1",
} as const;

export const TOOL_INPUT_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

export const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;
