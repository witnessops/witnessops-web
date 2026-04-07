/**
 * WEB-008: structural parity guard between the on-disk Next.js route
 * tree and the declared HTTP-route contract in `api-contract.ts`.
 *
 * The test fails if EITHER side drifts:
 *   - a `route.ts` file exists on disk but has no matching declared
 *     entry (an "undocumented route")
 *   - a declared entry has no matching `route.ts` on disk (a "stale
 *     declaration")
 *   - a method exported by a `route.ts` file is not declared in the
 *     contract entry's `methods` array
 *   - a method declared in the contract is not exported by the
 *     `route.ts` file
 *
 * This is the exact same shape as control-plane's
 * `tests/integration/test_phase7_openapi_parity.py`, restricted to
 * what witnessops-web actually has: a TS contract source instead of
 * an OpenAPI spec.
 *
 * The walker is intentionally simple: it does a recursive readdir of
 * `app/api/`, finds every file literally named `route.ts`, derives
 * its canonical URL path from the filesystem layout (preserving
 * `[param]` segments verbatim), and statically extracts the verb
 * exports via regex. No bundler, no TS compiler, no runtime imports.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  type DeclaredEndpoint,
  type HttpMethod,
  DECLARED_API_ENDPOINTS,
} from "./api-contract";

const HTTP_VERBS: ReadonlyArray<HttpMethod> = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const VERB_EXPORT_RE = new RegExp(
  String.raw`export\s+(?:async\s+)?function\s+(${HTTP_VERBS.join("|")})\b`,
  "g",
);

interface DiscoveredRoute {
  path: string;
  methods: ReadonlyArray<HttpMethod>;
  filesystemPath: string;
}

function fsToUrlPath(relativeFsPath: string): string {
  // Strip the trailing "/route.ts"
  const withoutFile = relativeFsPath.replace(/\/route\.ts$/, "");
  // Filesystem layout already preserves [param] segments, so the
  // mapping is a literal "/" prefix.
  return "/" + withoutFile;
}

async function walkRouteFiles(rootDir: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name === "route.ts") {
        out.push(full);
      }
    }
  }

  await walk(rootDir);
  return out;
}

function extractVerbs(source: string): ReadonlyArray<HttpMethod> {
  const seen = new Set<HttpMethod>();
  for (const match of source.matchAll(VERB_EXPORT_RE)) {
    seen.add(match[1] as HttpMethod);
  }
  // Return in HTTP_VERBS order so comparisons against the declared
  // contract are deterministic.
  return HTTP_VERBS.filter((v) => seen.has(v));
}

async function discoverRoutes(): Promise<DiscoveredRoute[]> {
  // Resolve relative to the package root rather than the test file
  // location, so the test is robust to where it is invoked from.
  // The test file lives at apps/witnessops-web/src/lib/server/.
  const here = new URL(".", import.meta.url).pathname;
  // Walk up to apps/witnessops-web, then into src/app/api.
  const apiRoot = path.resolve(here, "..", "..", "app", "api");
  const files = await walkRouteFiles(apiRoot);
  const out: DiscoveredRoute[] = [];
  for (const file of files) {
    const relative = path.relative(path.resolve(here, "..", "..", "app"), file);
    // relative looks like "api/admin/intake/reject/route.ts"
    const urlPath = fsToUrlPath(relative);
    const source = await readFile(file, "utf8");
    const methods = extractVerbs(source);
    out.push({ path: urlPath, methods, filesystemPath: file });
  }
  // Stable order for deterministic failure messages.
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

function endpointKey(path: string, method: HttpMethod): string {
  return `${method} ${path}`;
}

function declaredKeys(): Set<string> {
  const out = new Set<string>();
  for (const e of DECLARED_API_ENDPOINTS) {
    for (const m of e.methods) {
      out.add(endpointKey(e.path, m));
    }
  }
  return out;
}

function discoveredKeys(routes: DiscoveredRoute[]): Set<string> {
  const out = new Set<string>();
  for (const r of routes) {
    for (const m of r.methods) {
      out.add(endpointKey(r.path, m));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("WEB-008: api-contract.ts has at least one declared endpoint", () => {
  // Defensive guard against an accidental wipe of the contract file.
  assert.ok(
    DECLARED_API_ENDPOINTS.length > 0,
    "DECLARED_API_ENDPOINTS is empty; nothing to verify",
  );
});

test("WEB-008: every route.ts on disk is declared in api-contract.ts", async () => {
  const routes = await discoverRoutes();
  const declared = declaredKeys();
  const undocumented: string[] = [];
  for (const r of routes) {
    for (const m of r.methods) {
      if (!declared.has(endpointKey(r.path, m))) {
        undocumented.push(endpointKey(r.path, m));
      }
    }
  }
  assert.deepEqual(
    undocumented,
    [],
    `Undocumented routes (add to api-contract.ts):\n  ${undocumented.join("\n  ")}`,
  );
});

test("WEB-008: every declared endpoint exists on disk", async () => {
  const routes = await discoverRoutes();
  const discovered = discoveredKeys(routes);
  const stale: string[] = [];
  for (const e of DECLARED_API_ENDPOINTS) {
    for (const m of e.methods) {
      if (!discovered.has(endpointKey(e.path, m))) {
        stale.push(endpointKey(e.path, m));
      }
    }
  }
  assert.deepEqual(
    stale,
    [],
    `Stale declarations (remove from api-contract.ts or restore the route file):\n  ${stale.join("\n  ")}`,
  );
});

test("WEB-008: every declared path is unique in api-contract.ts", () => {
  // Each path should appear exactly once. Multiple verbs on the same
  // path live inside one entry's `methods` array, not as duplicate
  // entries. This catches a maintenance footgun where two entries
  // for the same path drift apart.
  const seen = new Map<string, number>();
  for (const e of DECLARED_API_ENDPOINTS) {
    seen.set(e.path, (seen.get(e.path) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([p]) => p);
  assert.deepEqual(
    duplicates,
    [],
    `Duplicate path entries in api-contract.ts:\n  ${duplicates.join("\n  ")}`,
  );
});

test("WEB-008: every declared endpoint carries a non-empty summary", () => {
  // The summary doubles as inventory documentation; an empty one is
  // a maintenance smell.
  const missing: string[] = [];
  for (const e of DECLARED_API_ENDPOINTS) {
    if (!e.summary || !e.summary.trim()) {
      missing.push(e.path);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `Declared endpoints with empty summary:\n  ${missing.join("\n  ")}`,
  );
});

test("WEB-008: declared categories are within the closed enum", () => {
  // The TypeScript type already enforces this at compile time, but
  // a runtime check defends against `as EndpointCategory` casts in
  // future edits.
  const allowed: ReadonlySet<DeclaredEndpoint["category"]> = new Set([
    "public-claimant",
    "public-utility",
    "operator",
    "provider-webhook",
  ]);
  const offenders: string[] = [];
  for (const e of DECLARED_API_ENDPOINTS) {
    if (!allowed.has(e.category)) {
      offenders.push(`${e.path} -> ${e.category}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Declared endpoints with unknown category:\n  ${offenders.join("\n  ")}`,
  );
});
