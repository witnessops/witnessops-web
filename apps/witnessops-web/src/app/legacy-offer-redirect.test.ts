import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const nextConfig = require("../../next.config.js") as {
  redirects?: () => Promise<
    Array<{ source: string; destination: string; permanent?: boolean }>
  >;
};

const caddySource = readFileSync(
  resolve(__dirname, "../../../../deploy/Caddyfile.witnessops-canonical-host"),
  "utf8",
);
const sbomSampleSource = readFileSync(
  resolve(
    __dirname,
    "review/sample-cases/sbom-cisa-2026-minimum-elements/page.tsx",
  ),
  "utf8",
);

test("retired access-removal URLs preserve compatibility with permanent redirects", async () => {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  const legacyRedirects = redirects.filter(({ source }) =>
    source.includes("offsec-access-removed"),
  );

  assert.deepEqual(legacyRedirects, [
    {
      source: "/catalog/offsec-access-removed",
      destination: "/catalog",
      permanent: true,
    },
    {
      source: "/pl/catalog/offsec-access-removed",
      destination: "/pl/catalog",
      permanent: true,
    },
  ]);
});

test("commercial routes with defensible replacements redirect directly", async () => {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  const bySource = new Map(redirects.map((redirect) => [redirect.source, redirect]));

  assert.deepEqual(bySource.get("/catalog/offsec"), {
    source: "/catalog/offsec",
    destination: "/catalog",
    permanent: true,
  });
  assert.deepEqual(bySource.get("/access-change-proof-run"), {
    source: "/access-change-proof-run",
    destination: "/catalog/workflows",
    permanent: true,
  });
  for (const source of [
    "/catalog/workflow-s",
    "/catalog/workflow-m",
    "/catalog/workflow-l",
    "/catalog/workflow-rerun",
  ]) {
    assert.deepEqual(bySource.get(source), {
      source,
      destination: "/catalog/workflows",
      permanent: true,
    });
  }
});

test("Caddy canonicalizes HTTP and www directly to the HTTPS apex", () => {
  assert.match(
    caddySource,
    /http:\/\/witnessops\.com, http:\/\/www\.witnessops\.com, https:\/\/www\.witnessops\.com/,
  );
  assert.match(caddySource, /redir https:\/\/witnessops\.com\{uri\} 308/);
  assert.doesNotMatch(
    caddySource,
    /witnessops\.com, www\.witnessops\.com, docs\.witnessops\.com/,
  );
});

test("public samples do not link to contained unresolved offers", () => {
  assert.doesNotMatch(sbomSampleSource, /href="\/catalog\/sbom-min-elements"/);
});
