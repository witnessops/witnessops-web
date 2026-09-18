import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { DECLARED_APP_ENDPOINTS, DECLARED_APP_AUTH_ROUTES } from "./api-contract";

const verbs = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
function exportedMethods(source: string) {
  const named = new RegExp(`export\\s+(?:async\\s+)?function\\s+(${verbs.join("|")})\\b`, "g");
  const assigned = new RegExp(`export\\s+const\\s+(${verbs.join("|")})\\s*=`, "g");
  return [...new Set([...source.matchAll(named), ...source.matchAll(assigned)].map(match => match[1]))].sort();
}

test("API parity scanner recognizes function and const HTTP exports without treating runtime config as handlers", () => {
  assert.deepEqual(exportedMethods('export const runtime = "nodejs"; export const POST = handler; export async function DELETE() {} export function GET() {}'), ["DELETE", "GET", "POST"]);
});

test("all app API route files and methods exactly match the declared authenticated contract", async () => {
  const root = fileURLToPath(new URL("../app/", import.meta.url));
  const actual: Array<{ path: string; methods: string[] }> = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && entry.name === "route.ts") {
        const methods = exportedMethods(await readFile(file, "utf8"));
        assert.ok(methods.length, `Route ${file} must declare at least one recognizable handler`);
        actual.push({ path: `/${path.relative(root, file).replace(/\/route\.ts$/, "").split(path.sep).join("/")}`, methods });
      }
    }
  }
  await walk(root);
  const declared = [...DECLARED_APP_ENDPOINTS, ...DECLARED_APP_AUTH_ROUTES].map(endpoint => ({ path: endpoint.path, methods: [...endpoint.methods].sort() }));
  assert.equal(new Set(declared.map(endpoint => endpoint.path)).size, declared.length);
  for (const endpoint of DECLARED_APP_ENDPOINTS) assert.ok(endpoint.summary.trim());
  const byPath = (a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path);
  assert.deepEqual(actual.sort(byPath), declared.sort(byPath));
  assert.deepEqual(actual.map(endpoint => endpoint.path).sort(), ["/api/assets", "/api/cli/authorize", "/api/cli/login", "/api/cli/poll", "/api/cli/server-check-capture", "/api/cli/server-checks", "/api/cli/session", "/api/early-access", "/api/events", "/api/feedback", "/api/linux-checks", "/api/runs", "/api/workspace", "/callback", "/cli/login", "/login", "/signup"]);
});
