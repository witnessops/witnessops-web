import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import test from "node:test";

const appRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));

const polishRoutes = [
  "pl/page.tsx",
  "pl/catalog/page.tsx",
  "pl/catalog/[skuId]/page.tsx",
  "pl/docs/page.tsx",
  "pl/docs/[...slug]/page.tsx",
  "pl/review/request/page.tsx",
  "pl/support/page.tsx",
  "pl/verify/page.tsx",
  "pl/why-witnessops/page.tsx",
];

test("Polish public route files remain present in source", async () => {
  await Promise.all(
    polishRoutes.map(async (route) => {
      await assert.doesNotReject(access(resolve(appRoot, route)), route);
    }),
  );
});
