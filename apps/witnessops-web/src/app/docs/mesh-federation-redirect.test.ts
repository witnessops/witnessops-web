import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  getCanonicalDocSlug,
  getDocHref,
  getLegacyDocRedirectSlug,
  listDocPages,
} from "@witnessops/content/docs";
import { getDocsSidebar } from "@witnessops/content/sidebar";
import { getDocsSitemapEntries } from "@witnessops/content/sitemap";

const docsPage = readFileSync(resolve(__dirname, "[...slug]/page.tsx"), "utf8");
const securitySystemsIndex = readFileSync(
  resolve(
    __dirname,
    "../../../../../content/witnessops/docs/security-systems/index.mdx",
  ),
  "utf8",
);

test("Mesh Federation docs URL uses the established legacy redirect to Security Systems", () => {
  assert.match(docsPage, /getLegacyDocRedirectSlug/);
  assert.match(docsPage, /permanentRedirect\(pub\(redirectSlug\)\)/);
  const meshSlug = ["security-systems", "mesh-federation-and-vmesh"];
  assert.deepEqual(getLegacyDocRedirectSlug("witnessops", meshSlug), [
    "security-systems",
  ]);
  assert.deepEqual(getCanonicalDocSlug("witnessops", meshSlug), [
    "security-systems",
  ]);
  assert.equal(getDocHref(["security-systems"]), "/docs/security-systems");
});

test("Security Systems buyer index does not link Mesh Federation or VaultMesh", () => {
  assert.doesNotMatch(securitySystemsIndex, /mesh-federation-and-vmesh/);
  assert.doesNotMatch(securitySystemsIndex, /Mesh Federation/);
  assert.doesNotMatch(securitySystemsIndex, /VaultMesh/);
});

test("Mesh Federation is unpublished from the public docs corpus, sitemap, and sidebar", async () => {
  const meshPath = "security-systems/mesh-federation-and-vmesh";
  const pages = await listDocPages("witnessops");
  assert.equal(
    pages.some((page) => page.slug.join("/") === meshPath),
    false,
  );

  const sitemap = await getDocsSitemapEntries("witnessops");
  assert.equal(
    sitemap.some((entry) => entry.url.includes(meshPath)),
    false,
  );

  const sidebar = await getDocsSidebar("witnessops");
  const hrefs = sidebar.flatMap((section) => section.items.map((item) => item.href));
  assert.equal(
    hrefs.some((href) => href.includes("mesh-federation-and-vmesh")),
    false,
  );

  assert.ok(
    existsSync(
      resolve(
        __dirname,
        "../../../../../content/witnessops/docs/security-systems/mesh-federation-and-vmesh.mdx",
      ),
    ),
    "draft Mesh Federation page must remain on disk for operator/boundary tests",
  );
});
