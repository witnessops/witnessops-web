import assert from "node:assert/strict";
import fs, { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const standaloneAppRoot = path.join(
  appRoot,
  ".next/standalone/apps/witnessops-web",
);
const checkoutSourceRoots = [
  path.join(appRoot, "src"),
  path.join(repoRoot, "content"),
  path.join(repoRoot, "packages"),
];

function isWithin(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function checkoutSourcePath(value) {
  const candidate =
    value instanceof URL
      ? fileURLToPath(value)
      : typeof value === "string" || Buffer.isBuffer(value)
        ? String(value)
        : undefined;
  if (!candidate) return false;

  const absolute = path.resolve(candidate);
  return checkoutSourceRoots.some((root) => isWithin(root, absolute));
}

function blockCheckoutSourceReads() {
  const originals = new Map();
  for (const method of ["existsSync", "readFileSync", "readdirSync", "statSync"]) {
    const original = fs[method];
    originals.set(method, original);
    fs[method] = function sourceFreeFsGuard(candidate, ...args) {
      if (checkoutSourcePath(candidate)) {
        if (method === "existsSync") return false;
        throw new Error(`Standalone sitemap read checkout source: ${candidate}`);
      }
      return original.call(this, candidate, ...args);
    };
  }

  return () => {
    for (const [method, original] of originals) {
      fs[method] = original;
    }
  };
}

function assertTruthfulSitemap(xml, label) {
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset\b[^>]*>/);
  assert.match(xml, /<\/urlset>\s*$/);
  assert.match(xml, /<loc>https:\/\/witnessops\.com<\/loc>/);
  assert.match(xml, /<loc>https:\/\/witnessops\.com\/catalog<\/loc>/);
  assert.match(
    xml,
    /<loc>https:\/\/witnessops\.com\/catalog\/workflows<\/loc>/,
  );
  assert.doesNotMatch(
    xml,
    /<lastmod\b/i,
    `${label} must omit dates without an explicit modification contract`,
  );
  assert.doesNotMatch(xml, /2026-01-01T00:00:00\.000Z/);

  const openingUrls = xml.match(/<url>/g)?.length ?? 0;
  const closingUrls = xml.match(/<\/url>/g)?.length ?? 0;
  assert.ok(openingUrls > 0, `${label} must contain URL entries`);
  assert.equal(openingUrls, closingUrls, `${label} contains malformed URL entries`);
}

test("built and source-free standalone sitemaps omit invented freshness", async () => {
  const buildBody = path.join(appRoot, ".next/server/app/sitemap.xml.body");
  const standaloneBody = path.join(
    standaloneAppRoot,
    ".next/server/app/sitemap.xml.body",
  );
  const standaloneRoute = path.join(
    standaloneAppRoot,
    ".next/server/app/sitemap.xml/route.js",
  );

  assert.ok(existsSync(buildBody), "next build did not emit sitemap.xml.body");
  assert.ok(
    existsSync(standaloneBody),
    "next build did not copy the sitemap into standalone output",
  );
  assert.ok(existsSync(standaloneRoute), "standalone sitemap handler is missing");
  assert.equal(
    existsSync(path.join(standaloneAppRoot, "src/app/sitemap.ts")),
    false,
    "standalone output must exercise the source-free runtime shape",
  );

  const buildXml = readFileSync(buildBody, "utf8");
  const standaloneXml = readFileSync(standaloneBody, "utf8");
  assertTruthfulSitemap(buildXml, "build output");
  assertTruthfulSitemap(standaloneXml, "standalone prerender");
  assert.equal(standaloneXml, buildXml, "standalone prerender lost sitemap URLs");

  const previousCwd = process.cwd();
  const restoreFs = blockCheckoutSourceReads();
  try {
    process.chdir(standaloneAppRoot);
    assert.equal(
      fs.existsSync(path.join(appRoot, "src/app/sitemap.ts")),
      false,
      "source-free guard must hide checkout application sources",
    );
    const compiled = require(standaloneRoute);
    const response = await compiled.routeModule.userland.GET(
      new Request("https://witnessops.com/sitemap.xml"),
      { params: Promise.resolve({}) },
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/xml/);
    const runtimeXml = await response.text();
    assertTruthfulSitemap(runtimeXml, "standalone runtime");
    assert.equal(runtimeXml, buildXml, "source-free runtime lost sitemap URLs");
  } finally {
    restoreFs();
    process.chdir(previousCwd);
  }
});
