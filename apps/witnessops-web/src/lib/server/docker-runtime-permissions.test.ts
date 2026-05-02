import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dockerfilePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../Dockerfile",
);

test("Docker runtime keeps Next prerender/cache write targets writable for nextjs", () => {
  const dockerfile = readFileSync(dockerfilePath, "utf8");
  const userIndex = dockerfile.indexOf("USER nextjs");
  const chownIndex = dockerfile.indexOf("chown -R nextjs:nodejs");

  assert.notEqual(userIndex, -1);
  assert.notEqual(chownIndex, -1);
  assert.ok(chownIndex < userIndex);
  assert.match(dockerfile, /apps\/witnessops-web\/\.next\/cache/);
  assert.match(dockerfile, /apps\/witnessops-web\/\.next\/server\/app/);
});
