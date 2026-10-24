import "server-only";

import { stat } from "node:fs/promises";
import path from "node:path";

import { ADMIN_MCP_MARKER_DIR } from "./constants";
import { parseClientId, readBearer } from "./auth";

export type MarkerDecision =
  | { kind: "ok" }
  | { kind: "unavailable" }
  | { kind: "revoked" };

async function isDirectory(directory: string): Promise<boolean> {
  try {
    return (await stat(directory)).isDirectory();
  } catch {
    return false;
  }
}

async function exists(file: string): Promise<boolean | null> {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    return null;
  }
}

function inside(root: string, target: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(target);
  return resolved === resolvedRoot || resolved.startsWith(`${resolvedRoot}${path.sep}`);
}

/**
 * Kill switch and per-client revocation. A missing directory denies every
 * caller. This function does not read the token Secret.
 */
export async function inspectMarkers(request: Request): Promise<MarkerDecision> {
  const root = process.env[ADMIN_MCP_MARKER_DIR]?.trim();
  if (!root || !(await isDirectory(root))) return { kind: "unavailable" };
  const revokedDir = path.join(root, "revoked-mcp-clients");
  if (!inside(root, revokedDir) || !(await isDirectory(revokedDir))) {
    return { kind: "unavailable" };
  }
  const disabled = path.join(root, "mcp-disabled");
  if (!inside(root, disabled)) return { kind: "unavailable" };
  const killed = await exists(disabled);
  if (killed === null || killed) return { kind: "unavailable" };

  const clientId = parseClientId(readBearer(request));
  if (!clientId) return { kind: "ok" };
  const marker = path.join(revokedDir, clientId);
  if (!inside(revokedDir, marker)) return { kind: "revoked" };
  const revoked = await exists(marker);
  if (revoked === null) return { kind: "unavailable" };
  if (revoked) return { kind: "revoked" };
  return { kind: "ok" };
}
