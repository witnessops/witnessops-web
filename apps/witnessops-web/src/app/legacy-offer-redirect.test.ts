import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const nextConfig = require("../../next.config.js") as {
  redirects?: () => Promise<
    Array<{ source: string; destination: string; permanent?: boolean }>
  >;
};

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
