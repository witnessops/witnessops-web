import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

import { GET } from "./route";

const PUBLIC_IMAGE = "https://witnessops.com/opengraph-image";

test("retired home OG route redirects permanently and stays off the Edge runtime", () => {
  const source = readFileSync(resolve(__dirname, "route.tsx"), "utf-8");

  assert.doesNotMatch(source, /export\s+const\s+runtime\s*=\s*["']edge["']/);
  assert.match(source, /NextResponse\.redirect\(/);
  assert.match(source, /["']\/opengraph-image["']/);
  assert.match(source, /\b308\b/);
  assert.doesNotMatch(source, /ImageResponse/);
  assert.doesNotMatch(source, /request\.url/);
});

test("the Open Graph redirect ignores Host and X-Forwarded-Host", () => {
  const cases = [
    new Request("http://127.0.0.1:3000/og/home"),
    new Request("http://localhost:3000/og/home", { headers: { host: "witnessops.com" } }),
    new Request("http://localhost:3000/og/home", {
      headers: {
        host: "localhost:3000",
        "x-forwarded-host": "witnessops.com",
        "x-forwarded-proto": "https",
      },
    }),
    new Request("http://evil.example/og/home", {
      headers: {
        host: "evil.example",
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "http",
      },
    }),
  ];

  for (const request of cases) {
    assert.ok(request.headers.get("host") !== null || new URL(request.url).host.length > 0);
    const response = GET();
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), PUBLIC_IMAGE);
    assert.equal(response.headers.get("location")?.includes(new URL(request.url).host), false);
  }
});

function filesUnder(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".next")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) filesUnder(path, out);
    else out.push(path);
  }
  return out;
}

test("no page references /og/home", () => {
  const roots = [
    resolve(__dirname, "../../.."),
    resolve(__dirname, "../../../../../../content"),
  ];
  const hits: string[] = [];
  for (const root of roots) {
    for (const file of filesUnder(root)) {
      if (file.endsWith(`${join("og", "home", "route.test.ts")}`)) continue;
      if (!/\.(ts|tsx|js|jsx|css|yaml|yml|json|md|mdx)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      if (text.includes("/og/home")) hits.push(file);
    }
  }
  assert.deepEqual(hits, []);
});
