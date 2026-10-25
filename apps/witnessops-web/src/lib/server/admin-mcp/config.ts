import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { z } from "zod";

import {
  ADMIN_MCP_FLAG,
  ADMIN_MCP_SCOPES,
  ADMIN_MCP_TOKEN_CONFIG_FILE,
  CONFIG_MAX_BYTES,
  TOKEN_MAX_LIFETIME_MS,
  type AdminMcpScope,
} from "./constants";

const scopeSchema = z.string().refine(
  (value): value is AdminMcpScope =>
    (ADMIN_MCP_SCOPES as readonly string[]).includes(value),
);

const entrySchema = z
  .object({
    clientId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/),
    tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
    scopes: z.array(scopeSchema).default([]),
    issuedAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
    allowedOrigins: z
      .array(z.string().regex(/^https:\/\/[a-z0-9.-]+(?::[0-9]{1,5})?$/))
      .optional(),
    label: z.string().regex(/^[A-Za-z0-9 ._-]{1,80}$/).optional(),
  })
  .strict();

const fileSchema = z
  .object({
    tokens: z.array(entrySchema).max(32),
  })
  .strict();

export interface TokenEntry {
  clientId: string;
  tokenHash: Buffer;
  scopes: readonly AdminMcpScope[];
  issuedAt: number;
  expiresAt: number;
  allowedOrigins: readonly string[];
}

export type LoadedTokenConfig =
  | { ok: true; tokens: readonly TokenEntry[]; hmacKey: Buffer }
  | { ok: false };

export function isAdminMcpEnabled(): boolean {
  return process.env[ADMIN_MCP_FLAG] === "1";
}

function invalid(): LoadedTokenConfig {
  return { ok: false };
}

/** Re-reads the Secret file. There is no cache. A bad file refuses every caller. */
export async function loadTokenConfig(): Promise<LoadedTokenConfig> {
  const file = process.env[ADMIN_MCP_TOKEN_CONFIG_FILE]?.trim();
  if (!file) return invalid();
  let bytes: Buffer;
  try {
    bytes = await readFile(file);
  } catch {
    return invalid();
  }
  if (bytes.byteLength > CONFIG_MAX_BYTES) return invalid();
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    return invalid();
  }
  const result = fileSchema.safeParse(parsed);
  if (!result.success) return invalid();
  const seenIds = new Set<string>();
  const seenHashes = new Set<string>();
  const tokens: TokenEntry[] = [];
  for (const entry of result.data.tokens) {
    if (seenIds.has(entry.clientId) || seenHashes.has(entry.tokenHash)) return invalid();
    seenIds.add(entry.clientId);
    seenHashes.add(entry.tokenHash);
    const issuedAt = Date.parse(entry.issuedAt);
    const expiresAt = Date.parse(entry.expiresAt);
    if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) return invalid();
    if (expiresAt <= issuedAt) return invalid();
    if (expiresAt - issuedAt > TOKEN_MAX_LIFETIME_MS) return invalid();
    const scopes = entry.scopes;
    if (new Set(scopes).size !== scopes.length) return invalid();
    tokens.push({
      clientId: entry.clientId,
      tokenHash: Buffer.from(entry.tokenHash, "hex"),
      scopes,
      issuedAt,
      expiresAt,
      allowedOrigins: entry.allowedOrigins ?? [],
    });
  }
  return {
    ok: true,
    tokens,
    hmacKey: createHash("sha256").update(bytes).digest(),
  };
}
