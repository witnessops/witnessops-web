import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../../public/witnessops-analytics.js", import.meta.url), "utf8");
function load(href: string, existing = false, referrer = "") {
  const scripts: { type?: string; src?: string; dataset: Record<string, string> }[] = [];
  runInNewContext(source, { URL, window: { location: { href } }, document: {
    referrer, addEventListener: () => {},
    querySelector: () => existing ? {} : null,
    createElement: () => ({ dataset: {} }),
    head: { appendChild: (script: typeof scripts[number]) => scripts.push(script) },
  } });
  return scripts;
}
test("public production documents load the existing site beacon once with SPA collection off", () => {
  for (const path of ["/", "/pricing", "/docs/install", "/support", "/privacy"]) {
    const scripts = load(`https://witnessops.com${path}`);
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].src, "https://static.cloudflareinsights.com/beacon.min.js");
    assert.equal(JSON.parse(scripts[0].dataset.cfBeacon).spa, false);
  }
  assert.equal(load("https://www.witnessops.com/").length, 1);
  assert.equal(load("https://witnessops.com/", true).length, 0);
});
test("private, tool, query-bearing, unknown and non-production documents never load a beacon", () => {
  for (const path of ["/admin", "/admin/login", "/api/admin/workos/callback?code=secret", "/check", "/proofpack", "/verify", "/package/private-id", "/assessment/private-id", "/review/request", "/review/request/confirmed", "/new-private-route", "/?email=private", "/#token"]) {
    assert.equal(load(`https://witnessops.com${path}`).length, 0, path);
  }
  for (const origin of ["http://127.0.0.1:3030", "http://192.168.1.241:3001", "https://app.witnessops.com", "https://preview.witnessops.com", "http://witnessops.com"]) {
    assert.equal(load(`${origin}/`).length, 0, origin);
  }
});

test("private and query-bearing referrers do not leave via a public-page beacon", () => {
  for (const referrer of ["https://witnessops.com/package/private-id", "https://witnessops.com/admin", "https://witnessops.com/?email=private"]) {
    assert.equal(load("https://witnessops.com/", false, referrer).length, 0);
  }
  assert.equal(load("https://witnessops.com/", false, "https://witnessops.com/pricing").length, 1);
});
