import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const webRoot = resolve(__dirname, "../../../..");

test("assistant notFound stays a real 404", () => {
  for (const path of [
    "src/app/loading.tsx",
    "src/app/docs/loading.tsx",
    "src/app/docs/assistant/loading.tsx",
    "src/app/pl/loading.tsx",
    "src/app/pl/docs/loading.tsx",
    "src/app/pl/docs/assistant/loading.tsx",
  ]) {
    assert.equal(existsSync(resolve(webRoot, path)), false, path);
  }
  for (const page of [
    "src/app/docs/assistant/page.tsx",
    "src/app/pl/docs/assistant/page.tsx",
  ]) {
    const source = readFileSync(resolve(webRoot, page), "utf8");
    assert.match(source, /if \(!sovereignAssistantPublished\(\)\) notFound\(\);/);
    assert.doesNotMatch(source, /Suspense/);
  }
});
