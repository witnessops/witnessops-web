import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOW = { permission: "allow" };

function deny(reason) {
  return {
    permission: "deny",
    user_message: `Blocked: ${reason}`,
    agent_message: `Blocked by .cursor/hooks/guard-mcp.mjs: ${reason}`,
  };
}

function blob(input) {
  return [input?.mcp_server_name, input?.command, input?.url, input?.mcp_server_url]
    .filter((value) => typeof value === "string")
    .join("\n");
}

/**
 * @param {Record<string, unknown>} input
 */
export function decideMcp(input) {
  if (!input || typeof input !== "object") {
    return deny("MCP hook input was not an object");
  }
  const text = blob(input);
  if (/desktop-commander/i.test(text) || /(^|[^a-z0-9])dc-xai([^a-z0-9]|$)/i.test(text)) {
    return deny("Desktop Commander and Dc-xai machine connectors are not allowed");
  }
  return ALLOW;
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === resolve(entry);
}

if (isDirectRun()) {
  let input;
  try {
    const raw = readFileSync(0, "utf8");
    input = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    process.stdout.write(JSON.stringify(deny("hook input was not JSON")));
    process.exit(0);
  }
  process.stdout.write(JSON.stringify(decideMcp(input)));
}
