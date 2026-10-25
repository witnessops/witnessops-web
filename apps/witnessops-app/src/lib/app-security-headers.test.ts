import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, test } from "node:test";
import {
  APP_REFERRER_POLICY,
  appReportOnlyContentSecurityPolicy,
  appSecurityHeaders,
  createCspNonce,
  extendFormAction,
} from "./app-security-headers";

const require = createRequire(import.meta.url);
const { securityHeaders } = require("../../../../packages/config/next/security-headers") as {
  securityHeaders: { key: string; value: string }[];
};

function directive(policy: string, name: string) {
  const found = policy.split(";").map((part) => part.trim()).find((part) => part === name || part.startsWith(`${name} `));
  assert.ok(found, `${name} missing from ${policy}`);
  return found;
}

describe("app security headers", { concurrency: false }, () => {
  test("enforced CSP stays the shared policy plus the WorkOS form-action extension", () => {
    const shared = securityHeaders.find((header) => header.key === "Content-Security-Policy");
    assert.ok(shared);
    const headers = appSecurityHeaders();
    const enforced = headers.find((header) => header.key === "Content-Security-Policy");
    assert.ok(enforced);
    assert.equal(enforced.value, shared.value.replace("form-action 'self'", "form-action 'self' https://api.workos.com"));
    assert.match(directive(enforced.value, "script-src"), /script-src 'self' 'unsafe-inline'/);
    assert.equal(directive(enforced.value, "img-src"), "img-src 'self' data: blob: https:");
    assert.equal(enforced.value.includes("'unsafe-eval'"), process.env.NODE_ENV === "development");
    assert.equal(securityHeaders.find((header) => header.key === "Referrer-Policy")?.value, "strict-origin-when-cross-origin");
    assert.deepEqual(headers.filter((header) => header.key === "Referrer-Policy"), [
      { key: "Referrer-Policy", value: APP_REFERRER_POLICY },
    ]);
    assert.deepEqual(appSecurityHeaders(), headers);
  });

  test("app next config publishes that single Referrer-Policy", async () => {
    const config = require("../../next.config.js") as { headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> };
    const routes = await config.headers();
    assert.deepEqual(routes.map((route) => route.source), ["/:path*"]);
    assert.deepEqual(routes[0]?.headers.filter((header) => header.key === "Referrer-Policy"), [
      { key: "Referrer-Policy", value: "no-referrer" },
    ]);
    const enforced = routes[0]?.headers.find((header) => header.key === "Content-Security-Policy")?.value;
    assert.equal(enforced, appSecurityHeaders().find((header) => header.key === "Content-Security-Policy")?.value);
  });

  test("form-action extension throws when the shared directive is missing or already changed", () => {
    assert.throws(() => extendFormAction("default-src 'self'; frame-ancestors 'none'"), /form-action 'self'/);
    assert.throws(() => extendFormAction("form-action 'self' https://api.workos.com"), /found 0/);
    assert.throws(() => appSecurityHeaders([
      { key: "Content-Security-Policy", value: "default-src 'self'" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ]), /form-action 'self'/);
    assert.throws(() => appSecurityHeaders([
      { key: "Content-Security-Policy", value: "default-src 'self'; form-action 'self'" },
    ]), /found 0/);
  });

  test("report-only script-src has a fresh nonce, strict-dynamic, and no unsafe-inline", () => {
    const first = createCspNonce();
    const second = createCspNonce();
    assert.notEqual(first, second);
    const policy = appReportOnlyContentSecurityPolicy(first);
    const script = directive(policy, "script-src");
    assert.equal(script.includes("unsafe-inline"), false);
    assert.match(script, /'strict-dynamic'/);
    assert.match(script, new RegExp(`'nonce-${first.replaceAll("+", "\\+").replaceAll("/", "\\/")}'`));
    assert.equal(directive(policy, "img-src"), "img-src 'self'");
    assert.equal(directive(policy, "style-src"), "style-src 'self' 'unsafe-inline'");
    assert.equal(directive(policy, "font-src"), "font-src 'self'");
    assert.equal(directive(policy, "object-src"), "object-src 'none'");
    assert.equal(directive(policy, "base-uri"), "base-uri 'self'");
    assert.equal(directive(policy, "frame-ancestors"), "frame-ancestors 'none'");
    assert.equal(directive(policy, "form-action"), "form-action 'self' https://api.workos.com");
    assert.notEqual(directive(appReportOnlyContentSecurityPolicy(second), "script-src"), script);
    const env = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string };
    const prior = env.NODE_ENV;
    env.NODE_ENV = "development";
    try {
      const development = directive(appReportOnlyContentSecurityPolicy(first), "script-src");
      assert.match(development, /'unsafe-eval'/);
      assert.equal(development.includes("unsafe-inline"), false);
    } finally {
      if (prior === undefined) Reflect.deleteProperty(env, "NODE_ENV");
      else env.NODE_ENV = prior;
    }
    assert.equal(directive(appReportOnlyContentSecurityPolicy(first), "script-src").includes("unsafe-eval"), false);
  });
});
