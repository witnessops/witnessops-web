import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const routeFile = path.resolve(moduleDir, "../../../app/api/agent/mcp/route.ts");

const allowedSpecifiers = new Set([
  "server-only",
  "node:crypto",
  "node:fs/promises",
  "node:path",
  "zod",
  "@witnessops/config/rate-limit",
  "@/lib/server/bounded-request-body",
]);

const bannedSource = [
  /from\s+["'][^"']*admin-core-spine["']/,
  /from\s+["'](?:node:)?(?:http|https|net|dns|child_process)["']/,
  /\bfetch\s*\(/,
  /\bmkdir(?:Sync)?\s*\(/,
  /\bgetAdminCoreState\b/,
  /\bgetAdminCoreStorePath\b/,
  /\bgetAdminCoreDashboard\b/,
  /\bsearchCoreRecords\b/,
  /\bgetAdminCoreHealth\b/,
  /\bgetGmailSyncReceipt\b/,
  /\blistGmailSyncReceipts\b/,
  /\blistReviewRequests\b/,
  /\blistDeliveries\b/,
  /\blistReceiptRecords\b/,
  /\bgetVerifiedAdminSession\b/,
  /witnessops-admin-session/,
  /\bwriteFile\s*\(/,
  /\bunlink(?:Sync)?\s*\(/,
];

function specifierOf(line: string): string | null {
  const match = /from\s+["']([^"']+)["']/.exec(line);
  return match?.[1] ?? null;
}

test("admin mcp imports stay on the explicit allowlist and do not fetch", async () => {
  const names = (await readdir(moduleDir)).filter(
    (name) => name.endsWith(".ts") && !name.includes(".test.") && !name.includes("test-support"),
  );
  const files = [...names.map((name) => path.join(moduleDir, name)), routeFile];
  assert.ok(files.length >= 8);
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const pattern of bannedSource) {
      assert.equal(pattern.test(source), false, `${path.basename(file)} matched ${pattern}`);
    }
    const specifiers = source
      .split("\n")
      .map((line) => specifierOf(line))
      .filter((value): value is string => value !== null);
    for (const specifier of specifiers) {
      const allowed = specifier.startsWith("./") || specifier.startsWith("@/") && specifier.includes("/admin-mcp/") || allowedSpecifiers.has(specifier);
      assert.equal(allowed, true, `${path.basename(file)} imports ${specifier}`);
    }
  }
});
