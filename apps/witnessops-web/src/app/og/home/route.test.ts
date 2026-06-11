import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("home OG image route does not opt into Edge runtime", () => {
  const source = readFileSync(resolve(__dirname, "route.tsx"), "utf-8");

  assert.doesNotMatch(
    source,
    /export\s+const\s+runtime\s*=\s*["']edge["']/,
    "The static home OG image route should stay on the default runtime so Next can avoid the Edge static-generation warning.",
  );
});
