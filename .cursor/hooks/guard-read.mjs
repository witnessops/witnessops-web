import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ALLOW = { permission: "allow" };
const MARKERS = [
  ".desktop-commander-device",
  ".claude-server-commander",
  ".hscli",
  ".witnessops-token-store",
];

function deny(reason) {
  return {
    permission: "deny",
    user_message: `Blocked: ${reason}`,
  };
}

export function isDeniedPath(filePath) {
  const normalized = String(filePath).replaceAll("\\", "/");
  const parts = normalized.split("/").filter((part) => part.length > 0);
  const base = parts.at(-1) ?? "";
  if (base === ".env" || base.startsWith(".env.")) return true;
  if (base.endsWith("device.json")) return true;
  return MARKERS.some((marker) => parts.includes(marker));
}

/**
 * @param {{ file_path?: unknown, attachments?: Array<{ file_path?: unknown }> }} input
 */
export function decideRead(input) {
  if (!input || typeof input !== "object") {
    return deny("read hook input was not an object");
  }
  const paths = [];
  if (typeof input.file_path === "string") paths.push(input.file_path);
  else if (input.file_path != null) return deny("file_path was not a string");
  for (const attachment of input.attachments ?? []) {
    if (typeof attachment?.file_path === "string") paths.push(attachment.file_path);
  }
  const denied = paths.find((filePath) => isDeniedPath(filePath));
  if (denied) {
    return deny(`reading ${denied} is not allowed`);
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
  process.stdout.write(JSON.stringify(decideRead(input)));
}
