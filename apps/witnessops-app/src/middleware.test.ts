import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { NextRequest, type NextFetchEvent } from "next/server";

// tsx loads this package through the CommonJS resolver, and AuthKit publishes only an ESM export.
// The stub stands in for that import so these tests can call the real middleware branches.
const require = createRequire(import.meta.url);
const nodeModule = require("node:module") as typeof import("node:module") & {
  _resolveFilename: (this: unknown, request: string, parent: NodeJS.Module, isMain: boolean, options?: { paths?: string[] }) => string;
};
const originalResolve = nodeModule._resolveFilename;
const authkitStub = fileURLToPath(new URL("./middleware-authkit-stub.cjs", import.meta.url));
nodeModule._resolveFilename = function (request, parent, isMain, options) {
  if (request === "@workos-inc/authkit-nextjs") return authkitStub;
  return originalResolve.call(this, request, parent, isMain, options);
};
after(() => {
  nodeModule._resolveFilename = originalResolve;
});

const event = undefined as unknown as NextFetchEvent;
const reportOnlyHeader = "content-security-policy-report-only";
const bypassPaths = ["/s", "/s/", "/api/shared-report", "/api/shared-report/", "/api/billing/webhook", "/api/billing/webhook/"];
const authKeys = ["WORKOS_API_KEY", "WORKOS_CLIENT_ID", "WORKOS_COOKIE_PASSWORD", "WORKOS_COOKIE_DOMAIN", "WORKOS_COOKIE_SAMESITE", "NEXT_PUBLIC_WORKOS_REDIRECT_URI"] as const;
let middleware: (request: NextRequest, fetchEvent: NextFetchEvent) => Promise<Response | undefined> | Response | undefined;

function request(url: string, host = "127.0.0.1:3020", method = "GET") {
  return new NextRequest(url, { method, headers: { host } });
}

function nonce(policy: string | null) {
  const match = policy?.match(/'nonce-([^']+)'/);
  assert.ok(match?.[1], policy ?? "missing report-only policy");
  return match[1];
}

function directive(policy: string | null, name: string) {
  assert.ok(policy);
  const found = policy.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name} `));
  assert.ok(found);
  return found;
}

async function withEnv<T>(values: Record<string, string | undefined>, run: () => Promise<T>) {
  const keys = Object.keys(values);
  const saved = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await run();
  } finally {
    for (const key of keys) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const unconfigured = Object.fromEntries(authKeys.map((key) => [key, undefined])) as Record<(typeof authKeys)[number], undefined>;
const configured = {
  WORKOS_API_KEY: "test-placeholder",
  WORKOS_CLIENT_ID: "client_test",
  WORKOS_COOKIE_PASSWORD: "non-secret-test-placeholder-32-characters",
  WORKOS_COOKIE_DOMAIN: undefined,
  WORKOS_COOKIE_SAMESITE: undefined,
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: "http://127.0.0.1:3020/callback",
};

describe("app middleware CSP branches", { concurrency: false }, () => {
  before(async () => {
    middleware = (await import("./middleware")).default;
  });

  test("report-host responses keep their own header set", async () => {
    await withEnv({ WITNESSOPS_REPORT_HOST_SUFFIX: "proof.example.test" }, async () => {
      const host = "acme-q3.proof.example.test";
      const rewrite = await middleware(request(`https://${host}/`, host), event);
      assert.ok(rewrite);
      assert.equal(rewrite.headers.get("referrer-policy"), "no-referrer");
      assert.equal(rewrite.headers.get("cache-control"), "no-store");
      assert.equal(rewrite.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
      assert.equal(rewrite.headers.get(reportOnlyHeader), null);
      assert.equal(rewrite.headers.get("x-test-authkit"), null);
      assert.match(rewrite.headers.get("x-middleware-rewrite") ?? "", /\/s$/);

      const next = await middleware(request(`https://${host}/s`, host), event);
      assert.equal(next?.headers.get("referrer-policy"), "no-referrer");
      assert.equal(next?.headers.get(reportOnlyHeader), null);
      assert.equal(next?.headers.get("x-test-authkit"), null);

      const post = await middleware(request(`https://${host}/api/shared-report`, host, "POST"), event);
      assert.equal(post?.headers.get(reportOnlyHeader), null);
      assert.equal(post?.headers.get("x-middleware-next"), "1");

      const missing = await middleware(request(`https://${host}/assets`, host), event);
      assert.equal(missing?.status, 404);
      assert.equal(missing?.headers.get("referrer-policy"), "no-referrer");
      assert.equal(await missing?.text(), "Not found");
      assert.equal(missing?.headers.get(reportOnlyHeader), null);
    });
  });

  test("invalid report host still returns only its unavailable header", async () => {
    await withEnv({ WITNESSOPS_REPORT_HOST_SUFFIX: "https://bad" }, async () => {
      const response = await middleware(request("https://acme.proof.example.test/", "acme.proof.example.test"), event);
      assert.equal(response?.status, 404);
      assert.equal(response?.headers.get("cache-control"), "no-store");
      assert.equal(response?.headers.get("referrer-policy"), null);
      assert.equal(response?.headers.get(reportOnlyHeader), null);
      assert.equal(await response?.text(), "Reporting host unavailable");
    });
  });

  test("bypass list and security.txt skip AuthKit and the report-only policy", async () => {
    await withEnv(unconfigured, async () => {
      for (const path of bypassPaths) {
        assert.equal(await middleware(request(`http://127.0.0.1:3020${path}`), event), undefined, path);
      }
      const security = await middleware(request("http://127.0.0.1:3020/.well-known/security.txt"), event);
      assert.equal(security?.headers.get("x-middleware-next"), "1");
      assert.equal(security?.headers.get(reportOnlyHeader), null);
      assert.equal(security?.headers.get("x-test-authkit"), null);
    });
  });

  test("unconfigured app responses carry a distinct report-only nonce and do not call AuthKit", async () => {
    await withEnv(unconfigured, async () => {
      const first = await middleware(request("http://127.0.0.1:3020/"), event);
      const second = await middleware(request("http://127.0.0.1:3020/assets"), event);
      assert.equal(first?.status, 503);
      assert.equal(second?.status, 503);
      const firstPolicy = first?.headers.get(reportOnlyHeader) ?? null;
      const secondPolicy = second?.headers.get(reportOnlyHeader) ?? null;
      assert.notEqual(nonce(firstPolicy), nonce(secondPolicy));
      assert.equal(first?.headers.get("content-security-policy"), null);
      assert.equal(first?.headers.get("x-test-authkit"), null);
      assert.match(directive(firstPolicy, "script-src"), /'strict-dynamic'/);
      assert.equal(directive(firstPolicy, "script-src").includes("unsafe-inline"), false);
      assert.equal(await first?.text(), "App authentication is not configured.");
    });
  });

  test("configured requests pass the nonce into AuthKit and set one report-only response header", async () => {
    await withEnv(configured, async () => {
      const response = await middleware(request("http://127.0.0.1:3020/"), event);
      assert.equal(response?.headers.get("x-test-authkit"), "1");
      const policy = response?.headers.get(reportOnlyHeader) ?? null;
      const forwarded = response?.headers.get("x-middleware-request-content-security-policy-report-only");
      assert.equal(forwarded, policy);
      assert.equal(directive(policy, "script-src").includes("unsafe-inline"), false);
      assert.match(directive(policy, "script-src"), /'nonce-/);
      assert.equal(response?.headers.get("content-security-policy"), null);
    });
  });
});
