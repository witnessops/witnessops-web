import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import type { AdminMcpScope } from "./constants";
import type { TokenEntry } from "./config";
import { AdminMcpDenial } from "./errors";

const TOKEN_PATTERN = /^wo_mcp_([a-z0-9][a-z0-9-]{0,62})_([A-Za-z0-9_-]{43})$/;
const DUMMY_HASH = createHash("sha256")
  .update("witnessops-admin-mcp-dummy-token")
  .digest();

export function equalHash(left: Buffer, right: Buffer): boolean {
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function parseClientId(token: string | null): string | null {
  if (!token) return null;
  const match = TOKEN_PATTERN.exec(token);
  return match?.[1] ?? null;
}

export function readBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);
  if (token.length === 0 || header.slice("Bearer ".length) !== token.trim()) return null;
  if (token.includes(" ")) return null;
  return token;
}

/**
 * Creatable only after a hash match. Callers outside this module cannot
 * construct one: the constructor is private.
 */
export class McpPrincipal {
  readonly clientId: string;
  readonly scopes: readonly AdminMcpScope[];

  private constructor(clientId: string, scopes: readonly AdminMcpScope[]) {
    this.clientId = clientId;
    this.scopes = Object.freeze([...scopes]);
  }

  static fromVerifiedToken(
    token: string,
    entries: readonly TokenEntry[],
    now: number,
  ): McpPrincipal | null {
    const presented = createHash("sha256").update(token).digest();
    const clientId = parseClientId(token);
    const entry = clientId ? entries.find((candidate) => candidate.clientId === clientId) : undefined;
    const stored = entry?.tokenHash ?? DUMMY_HASH;
    const match = equalHash(presented, stored);
    if (!entry || !match) return null;
    if (now < entry.issuedAt || now >= entry.expiresAt) return null;
    return new McpPrincipal(entry.clientId, entry.scopes);
  }
}

export function requireScope(principal: McpPrincipal, scope: AdminMcpScope): void {
  if (!principal.scopes.includes(scope)) {
    throw new AdminMcpDenial(403, "forbidden");
  }
}

export function originAllowed(
  origin: string | null,
  entry: TokenEntry | undefined,
): boolean {
  if (origin === null) return true;
  if (!entry) return false;
  return entry.allowedOrigins.includes(origin);
}

export function findEntry(
  entries: readonly TokenEntry[],
  clientId: string | null,
): TokenEntry | undefined {
  if (!clientId) return undefined;
  return entries.find((entry) => entry.clientId === clientId);
}
